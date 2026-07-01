import { z } from "zod";
import { createTRPCRouter, operatorProcedure, protectedProcedure } from "../init";
import { db } from "@/lib/db";

export const newsletterRouter = createTRPCRouter({
  // ── Subscribers (CRM Contacts with NEWSLETTER source/tag) ─────────────────

  subscribersList: protectedProcedure
    .input(
      z.object({
        strategyId: z.string().optional(),
        tag: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      return db.crmContact.findMany({
        where: {
          newsletterOptIn: true,
          ...(input.strategyId ? { strategyId: input.strategyId } : {}),
          ...(input.tag ? { tags: { has: input.tag } } : {}),
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  subscribersAdd: operatorProcedure
    .input(
      z.object({
        email: z.string().email(),
        name: z.string().optional(),
        tags: z.array(z.string()).default([]),
        strategyId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const canonicalTags = Array.from(new Set(["NEWSLETTER_SUBSCRIBER", ...input.tags]));
      
      return db.crmContact.upsert({
        where: { email: input.email },
        create: {
          email: input.email,
          name: input.name ?? null,
          source: "NEWSLETTER",
          newsletterOptIn: true,
          subscribedAt: new Date(),
          tags: canonicalTags,
          strategyId: input.strategyId ?? null,
        },
        update: {
          name: input.name ?? undefined,
          newsletterOptIn: true,
          subscribedAt: new Date(),
          tags: {
            set: canonicalTags,
          },
          strategyId: input.strategyId ?? undefined,
        },
      });
    }),

  subscribersBulkImport: operatorProcedure
    .input(
      z.object({
        csv: z.string(),
        strategyId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Split lines and parse basic email,name CSV structure
      const lines = input.csv.split(/\r?\n/);
      const imported: string[] = [];
      
      for (const line of lines) {
        if (!line.trim()) continue;
        const [emailRaw, nameRaw] = line.split(",");
        const email = emailRaw?.trim().toLowerCase();
        const name = nameRaw?.trim() || null;
        
        // Simple regex check
        if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          await db.crmContact.upsert({
            where: { email },
            create: {
              email,
              name,
              source: "NEWSLETTER",
              newsletterOptIn: true,
              subscribedAt: new Date(),
              tags: ["NEWSLETTER_SUBSCRIBER"],
              strategyId: input.strategyId ?? null,
            },
            update: {
              name: name ?? undefined,
              newsletterOptIn: true,
              subscribedAt: new Date(),
              strategyId: input.strategyId ?? undefined,
            },
          });
          imported.push(email);
        }
      }
      
      return { count: imported.length, imported };
    }),

  // ── Newsletter Campaigns ──────────────────────────────────────────────────

  newslettersCreate: operatorProcedure
    .input(
      z.object({
        subject: z.string().min(1),
        content: z.string().min(1),
        strategyId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return db.newsletterCampaign.create({
        data: {
          subject: input.subject,
          bodyHtml: input.content,
          bodyMjml: input.content, // Fallback MJML as same content
          status: "DRAFT",
        },
      });
    }),

  newslettersSend: operatorProcedure
    .input(
      z.object({
        newsletterId: z.string(),
        strategyId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const campaign = await db.newsletterCampaign.findUniqueOrThrow({
        where: { id: input.newsletterId },
      });

      if (campaign.status === "SENT") {
        throw new Error("Newsletter has already been sent.");
      }

      // Fetch all eligible opt-in subscribers
      const recipients = await db.crmContact.findMany({
        where: {
          newsletterOptIn: true,
          unsubscribedAt: null,
          ...(input.strategyId ? { strategyId: input.strategyId } : {}),
        },
      });

      if (recipients.length === 0) {
        return db.newsletterCampaign.update({
          where: { id: input.newsletterId },
          data: {
            status: "SENT",
            sentAt: new Date(),
            recipientCount: 0,
            sentCount: 0,
            failedCount: 0,
          },
        });
      }

      // Update state to SENDING
      await db.newsletterCampaign.update({
        where: { id: input.newsletterId },
        data: { status: "SENDING", recipientCount: recipients.length },
      });

      let sentCount = 0;
      let failedCount = 0;

      // Broadcast simulated or integrated emails
      for (const recipient of recipients) {
        try {
          await db.crmMessage.create({
            data: {
              contactId: recipient.id,
              direction: "OUT",
              channel: "EMAIL",
              subject: campaign.subject,
              body: campaign.bodyHtml ?? "",
              status: "SENT",
              provider: "ANUBIS",
              sentBy: ctx.session.user.id,
              campaignId: campaign.id,
            },
          });
          sentCount++;
        } catch (e) {
          failedCount++;
          console.error(`Failed to send email to contact ${recipient.id}`, e);
        }
      }

      // Mark campaign as SENT
      return db.newsletterCampaign.update({
        where: { id: input.newsletterId },
        data: {
          status: "SENT",
          sentAt: new Date(),
          sentCount,
          failedCount,
        },
      });
    }),

  newslettersList: protectedProcedure
    .input(z.object({ limit: z.number().default(50) }).optional())
    .query(async ({ input }) => {
      return db.newsletterCampaign.findMany({
        orderBy: { createdAt: "desc" },
        take: input?.limit ?? 50,
      });
    }),

  newslettersStats: protectedProcedure
    .input(z.object({ newsletterId: z.string() }))
    .query(async ({ input }) => {
      const campaign = await db.newsletterCampaign.findUniqueOrThrow({
        where: { id: input.newsletterId },
      });

      const messages = await db.crmMessage.findMany({
        where: { campaignId: input.newsletterId },
        include: {
          contact: { select: { email: true, name: true } },
        },
      });

      return {
        campaign,
        messages: messages.map((m) => ({
          id: m.id,
          recipient: m.contact.email,
          name: m.contact.name,
          status: m.status,
          sentAt: m.createdAt,
        })),
      };
    }),
});
