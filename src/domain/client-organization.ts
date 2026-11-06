import { z } from "zod";

export const ClientStatus = z.enum([
  "ACTIVE",
  "PROSPECT",
  "REFERENCE",
  "ARCHIVED",
]);
export const OrganizationKind = z.enum([
  "UNSPECIFIED",
  "INTERNATIONAL_GROUP",
  "REGIONAL_OFFICE",
  "GROUP_SUBSIDIARY",
]);
export const OrganizationLabels: Record<
  z.infer<typeof OrganizationKind>,
  string
> = {
  UNSPECIFIED: "Organisation",
  INTERNATIONAL_GROUP: "Groupe international",
  REGIONAL_OFFICE: "Bureau régional",
  GROUP_SUBSIDIARY: "Filiale du groupe",
};
export const OrganizationSources = z
  .array(
    z
      .object({
        id: z.string().trim().min(1).max(240),
        type: z.enum(["USER_DECLARATION", "OFFICIAL_WEB_READ", "DOCUMENT"]),
        statement: z.string().trim().min(1).max(2000),
        scope: z.string().trim().min(1).max(1000),
        url: z
          .url({ protocol: /^https?$/ })
          .refine((raw) => {
            const url = new URL(raw);
            return !url.username && !url.password;
          }, "Lien sans identifiants attendu.")
          .optional(),
        readAt: z.iso.date().optional(),
        contentHash: z
          .string()
          .regex(/^[a-f0-9]{64}$/)
          .optional(),
      })
      .strict(),
  )
  .min(1)
  .max(30);
export const organizationFields = {
  organizationKind: OrganizationKind.optional(),
  organizationKey: z
    .string()
    .regex(/^[a-z0-9][a-z0-9-]*$/)
    .max(140)
    .optional(),
  parentClientId: z.string().min(1).nullable().optional(),
  organizationSourceRefs: OrganizationSources.optional(),
};
