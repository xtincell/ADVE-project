import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { BrandAsset } from "@prisma/client";
import {
  ExternalLink,
  FileText,
  Hexagon,
  Image as ImageIcon,
  Palette,
  Plus,
  Type,
  Vault,
} from "lucide-react";
import { readSession } from "@/lib/session";
import { getBrandForSession } from "@/server/brand";
import { ASSET_KIND_LABELS, listBrandAssets } from "@/server/vault";
import {
  readColorValue,
  readLinkValue,
  readTypoValue,
  type VaultAssetKind,
} from "@/domain/guidelines";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { AssetStatusButton, VaultAssetForm, type AssetFormValues } from "./asset-forms";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Coffre de marque" };

/**
 * Coffre de marque — port de `legacy/(cockpit)/cockpit/brand/assets` sur la
 * table v7 `BrandAsset` (tranche 4) : les actifs d'identité STRUCTURÉS —
 * logos, palette, typographies, documents, images — saisis par l'opérateur,
 * versionnés, audités. Pas de stockage binaire cette vague (résidu honnête :
 * les liens font foi, l'upload viendra) ; la charte /app/guidelines se
 * dérive de ce coffre à la lecture.
 */

type SectionDef = {
  kind: VaultAssetKind;
  icon: React.ReactNode;
  description: string;
  emptyDescription: string;
};

/** Titres de section (pluriels FR corrects). */
const SECTION_TITLES: Record<VaultAssetKind, string> = {
  LOGO: "Logos",
  COULEUR: "Couleurs",
  TYPO: "Typographies",
  DOCUMENT: "Documents",
  IMAGE: "Images",
};

const SECTIONS: SectionDef[] = [
  {
    kind: "LOGO",
    icon: <Hexagon />,
    description: "Les versions officielles du logo — chacune avec son lien et sa règle d'usage.",
    emptyDescription:
      "Aucun logo dans le coffre. Ajoutez chaque version officielle (principal, monochrome, favicon) avec son lien.",
  },
  {
    kind: "COULEUR",
    icon: <Palette />,
    description: "La palette officielle — chaque couleur avec son code hex et son rôle.",
    emptyDescription:
      "Aucune couleur dans le coffre. Ajoutez la palette officielle — la pastille se rend depuis le code hex déclaré.",
  },
  {
    kind: "TYPO",
    icon: <Type />,
    description: "Les familles typographiques de la marque, avec leur usage.",
    emptyDescription:
      "Aucune typographie dans le coffre. Déclarez les familles officielles (titres, texte courant) et leur usage.",
  },
  {
    kind: "DOCUMENT",
    icon: <FileText />,
    description: "Les documents de référence (chartes, gabarits) — en lien, l'upload viendra.",
    emptyDescription:
      "Aucun document dans le coffre. Ajoutez vos références (charte PDF, gabarits) par lien — l'upload de fichiers arrive dans une prochaine vague.",
  },
  {
    kind: "IMAGE",
    icon: <ImageIcon />,
    description: "Les visuels de référence de la marque — en lien, l'upload viendra.",
    emptyDescription:
      "Aucune image dans le coffre. Ajoutez vos visuels de référence par lien — l'upload de fichiers arrive dans une prochaine vague.",
  },
];

/** Préremplissage du formulaire de correction depuis la ligne persistée. */
function toFormValues(asset: BrandAsset): AssetFormValues {
  const color = readColorValue(asset.value);
  const typo = readTypoValue(asset.value);
  const link = readLinkValue(asset.value);
  return {
    id: asset.id,
    name: asset.name,
    hex: color.hex ?? "",
    role: color.role ?? "",
    usage: typo.usage ?? "",
    url: (asset.kind === "TYPO" ? typo.url : link.url) ?? "",
    note: link.note ?? "",
  };
}

function AssetLink({ url }: { url: string | null }) {
  if (url === null) {
    return <p className="text-sm text-smoke-2">Aucun lien — l&apos;upload viendra (résidu assumé).</p>;
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex max-w-full items-center gap-1.5 text-sm text-coral underline-offset-4 hover:underline"
    >
      <ExternalLink aria-hidden className="size-3.5 shrink-0" />
      <span className="truncate">{url}</span>
    </a>
  );
}

/** Corps d'une carte selon le kind (pastille couleur, usage typo, lien). */
function AssetBody({ asset }: { asset: BrandAsset }) {
  if (asset.kind === "COULEUR") {
    const { hex, role } = readColorValue(asset.value);
    return (
      <div className="space-y-2">
        {hex !== null ? (
          <div
            className="h-14 w-full rounded-md border border-line"
            style={{ backgroundColor: hex }}
            role="img"
            aria-label={`Pastille ${asset.name} ${hex}`}
          />
        ) : (
          <div className="flex h-14 w-full items-center justify-center rounded-md border border-dashed border-line text-xs text-smoke-2">
            hex illisible
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {hex !== null ? <span className="font-mono text-sm text-sand">{hex}</span> : null}
          {role !== null ? <Badge variant="inverse">{role}</Badge> : null}
        </div>
      </div>
    );
  }
  if (asset.kind === "TYPO") {
    const { usage, url } = readTypoValue(asset.value);
    return (
      <div className="space-y-1.5">
        {usage !== null ? (
          <p className="text-sm text-sand">{usage}</p>
        ) : (
          <p className="text-sm text-smoke-2">Usage non déclaré.</p>
        )}
        {url !== null ? <AssetLink url={url} /> : null}
      </div>
    );
  }
  const { url, note } = readLinkValue(asset.value);
  return (
    <div className="space-y-1.5">
      <AssetLink url={url} />
      {note !== null ? <p className="text-sm text-sand">{note}</p> : null}
      {asset.fileRef !== null ? (
        <p className="text-xs text-smoke-2">Fichier référencé : {asset.fileRef}</p>
      ) : null}
    </div>
  );
}

function AssetCard({ asset }: { asset: BrandAsset }) {
  return (
    <article className="rounded-lg border border-line bg-ink-2 p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-base font-semibold text-bone">{asset.name}</h3>
        <span className="shrink-0 text-[11px] font-bold uppercase tracking-wider text-smoke-2">
          v{asset.version}
        </span>
      </div>
      <div className="mt-3">
        <AssetBody asset={asset} />
      </div>
      <details className="mt-3 border-t border-line pt-3">
        <summary className="cursor-pointer select-none text-sm font-medium text-sand transition-colors hover:text-bone">
          Corriger ou archiver
        </summary>
        <div className="mt-4 space-y-3">
          <VaultAssetForm kind={asset.kind as VaultAssetKind} asset={toFormValues(asset)} />
          <AssetStatusButton assetId={asset.id} to="archive" />
        </div>
      </details>
    </article>
  );
}

export default async function VaultPage() {
  const session = await readSession();
  if (!session) redirect("/connexion?next=/app/vault");

  const brand = await getBrandForSession(session);
  if (!brand) {
    return (
      <div className="space-y-8">
        <header className="space-y-1">
          <p className="eyebrow text-coral">Livrables</p>
          <h1 className="font-display text-3xl font-semibold">Coffre de marque</h1>
        </header>
        <EmptyState
          icon={<Vault />}
          title="Aucune marque dans cet espace"
          description="Le coffre range les actifs d'identité d'une marque — commencez par le diagnostic gratuit."
        >
          <Link href="/intake" className={buttonVariants({ variant: "primary", size: "md" })}>
            Commencer le diagnostic
          </Link>
        </EmptyState>
      </div>
    );
  }

  const grouped = await listBrandAssets(brand.id);
  const activeTotal = Object.values(grouped).reduce(
    (sum, rows) => sum + rows.filter((row) => row.status === "ACTIVE").length,
    0,
  );

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <p className="eyebrow text-coral">Livrables</p>
        <h1 className="font-display text-3xl font-semibold">Coffre de marque — {brand.name}</h1>
        <p className="max-w-2xl text-sm text-sand">
          Les actifs d&apos;identité de votre marque, structurés et audités : logos, palette,
          typographies, documents et images de référence. Chaque ajout, correction ou archivage
          laisse une trace. La <Link href="/app/guidelines" className="text-coral underline-offset-4 hover:underline">charte de marque</Link>{" "}
          se dérive de ce coffre en direct — {activeTotal} asset{activeTotal > 1 ? "s" : ""} actif{activeTotal > 1 ? "s" : ""} aujourd&apos;hui.
        </p>
        <p className="max-w-2xl text-xs text-smoke-2">
          Pas de stockage de fichiers cette vague — les liens font foi, l&apos;upload arrive dans
          une prochaine vague (résidu assumé, jamais masqué).
        </p>
      </header>

      {SECTIONS.map((section) => {
        const rows = grouped[section.kind];
        const active = rows.filter((row) => row.status === "ACTIVE");
        const archived = rows.filter((row) => row.status === "ARCHIVED");
        const label = ASSET_KIND_LABELS[section.kind];
        const isColor = section.kind === "COULEUR";

        return (
          <section key={section.kind} className="space-y-4" aria-label={`Section ${label}`}>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sand [&_svg]:size-5" aria-hidden>
                {section.icon}
              </span>
              <h2 className="font-display text-xl font-semibold">{SECTION_TITLES[section.kind]}</h2>
              <Badge variant={active.length > 0 ? "gold" : "outline"}>
                {active.length} actif{active.length > 1 ? "s" : ""}
              </Badge>
            </div>
            <p className="max-w-2xl text-sm text-smoke-2">{section.description}</p>

            {active.length === 0 ? (
              <EmptyState
                icon={section.icon}
                title={`Aucun asset « ${label.toLowerCase()} »`}
                description={section.emptyDescription}
                className="py-10"
              />
            ) : (
              <div
                className={
                  isColor
                    ? "grid grid-cols-1 gap-bento sm:grid-cols-2 lg:grid-cols-3"
                    : "grid grid-cols-1 gap-bento sm:grid-cols-2"
                }
              >
                {active.map((asset) => (
                  <AssetCard key={asset.id} asset={asset} />
                ))}
              </div>
            )}

            <details className="rounded-lg border border-dashed border-line bg-ink-0/70 p-4">
              <summary className="flex cursor-pointer select-none items-center gap-2 text-sm font-semibold text-sand transition-colors hover:text-bone [&_svg]:size-4">
                <Plus aria-hidden />
                Ajouter — {label.toLowerCase()}
              </summary>
              <div className="mt-4">
                <VaultAssetForm kind={section.kind} />
              </div>
            </details>

            {archived.length > 0 ? (
              <details className="rounded-lg border border-line/60 bg-ink-0/40 p-4">
                <summary className="cursor-pointer select-none text-sm font-medium text-smoke-2 transition-colors hover:text-sand">
                  Archivé{archived.length > 1 ? "s" : ""} ({archived.length}) — hors charte, rien
                  n&apos;est effacé
                </summary>
                <ul className="mt-3 space-y-2">
                  {archived.map((asset) => (
                    <li
                      key={asset.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line/60 px-3 py-2"
                    >
                      <span className="text-sm text-smoke-2">
                        {asset.name}{" "}
                        <span className="text-[11px] uppercase tracking-wider">v{asset.version}</span>
                      </span>
                      <AssetStatusButton assetId={asset.id} to="restore" />
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
