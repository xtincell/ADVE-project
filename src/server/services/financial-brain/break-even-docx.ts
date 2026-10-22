import JSZip from "jszip";
import { JSDOM } from "jsdom";
import sharp from "sharp";
import template from "./templates/break-even-v1.json";
import type { SourcedBreakEvenDocument } from "./break-even-source";

const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const xml = (v: unknown) => String(v).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const n = (v: number | null | undefined) => typeof v === "number" && Number.isFinite(v)
  ? new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(v) : "À chiffrer";

export function breakEvenChartSvg(doc: SourcedBreakEvenDocument): string | null {
  if (!doc.chart.length) return null;
  const maxX = Math.max(...doc.chart.map(p => p.units)), maxY = Math.max(...doc.chart.flatMap(p => [p.cost, p.revenue]), 1);
  const x = (v: number) => 135 + v / maxX * 800, y = (v: number) => 420 - v / maxY * 340;
  const path = (key: "cost" | "revenue") => doc.chart.map((p, i) => `${i ? "L" : "M"}${x(p.units)},${y(p[key])}`).join(" ");
  const ticks = Array.from({ length: 5 }, (_, i) => {
    const vx = maxX * i / 4, vy = maxY * i / 4;
    return `<line x1="135" y1="${y(vy)}" x2="935" y2="${y(vy)}" stroke="#dddddd"/><text x="120" y="${y(vy) + 7}" text-anchor="end">${xml(n(vy))}</text><text x="${x(vx)}" y="452" text-anchor="middle">${xml(n(vx))}</text>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="520" viewBox="0 0 1000 520"><rect width="1000" height="520" fill="white"/><g font-family="Arial,sans-serif" font-size="20" fill="#222222"><text x="135" y="33">Montants / mois (${xml(doc.model.currency)} ${xml(doc.model.taxBasis)})</text>${ticks}<path d="M135 70V420H945" stroke="#222222" fill="none"/><path d="${path("revenue")}" stroke="#cf4c41" stroke-width="4" fill="none"/><path d="${path("cost")}" stroke="#222222" stroke-width="4" fill="none"/><text x="135" y="493" fill="#cf4c41">Chiffre d’affaires</text><text x="375" y="493">Coûts totaux</text><text x="950" y="493" text-anchor="end">Unités / mois</text></g></svg>`;
}

/** Fill the retained FIN-06 modular template. All other template ZIP parts
 * remain intact; the graph and documentary annex are explicit additions. */
export async function exportBreakEvenDocx(doc: SourcedBreakEvenDocument, generatedAt: Date): Promise<Buffer> {
  const zip = await JSZip.loadAsync(Buffer.from(template.base64, "base64"));
  const part = zip.file("word/document.xml");
  if (!part) throw new Error("Modèle financier Word indisponible.");
  const dom = new JSDOM(await part.async("string"), { contentType: "application/xml" });
  const d = dom.window.document;
  const ref = (id: string) => `[S${doc.evidence.findIndex(e => e.sourceId === id) + 1}]`;
  const refs = (values: typeof doc.model.fixedCosts) => [...new Set(values.flatMap(v => v.sources.map(s => ref(s.sourceId))))].join(", ") || "Hypothèse explicite";
  const base = doc.scenarios[0]!;
  const values: Record<string, string> = {
    "meta.brand": doc.brand, "meta.period": "Mensuelle · " + doc.model.scope,
    "meta.state": doc.state === "INCOMPLETE" ? "Données incomplètes : aucun seuil certifié" : "Scénario documenté, à valider",
    "meta.cohort": doc.model.payer, "meta.currency_tax": `${doc.model.currency} · ${doc.model.taxBasis}`,
    "meta.author_date": `La Fusée · ${generatedAt.toLocaleDateString("fr-FR")}`,
    "breakeven.unit": `${doc.model.unit} · ${doc.model.payer}`, "breakeven.unit.source": "Périmètre du modèle [S1]",
    "breakeven.price": n(base.price), "breakeven.price.source": refs([{ ...doc.model.price, label: "Prix" }]),
    "breakeven.variable": n(base.variable), "breakeven.variable.source": refs(doc.model.variableCosts),
    "breakeven.fixed": n(base.fixed), "breakeven.fixed.source": refs(doc.model.fixedCosts),
    "breakeven.contribution": n(doc.base.contributionMargin), "breakeven.contribution.source": "P − CV · calcul",
    "breakeven.rate": doc.base.contributionMarginRatio === null ? "À calculer" : n(doc.base.contributionMarginRatio * 100) + " %",
    "breakeven.rate.source": "(P − CV) / P · calcul",
    "breakeven.units": doc.base.status === "NO_FINITE_BREAK_EVEN" ? "Pas de seuil fini" : n(doc.base.breakEvenUnits),
    "breakeven.units.source": "CF / (P − CV), arrondi au supérieur",
    "breakeven.revenue": n(doc.base.breakEvenRevenue), "breakeven.revenue.source": "CF / taux décimal · calcul",
    "scenario.1.name": doc.scenarios[1]!.label, "scenario.1.assumption": "Prix × 0,80 ; autres coûts inchangés",
    "scenario.1.result": n(doc.scenarios[1]!.analysis.breakEvenUnits) + " unités / mois",
    "scenario.2.name": doc.scenarios[2]!.label, "scenario.2.assumption": "Charges fixes × 0,70 ; autres entrées inchangées",
    "scenario.2.result": n(doc.scenarios[2]!.analysis.breakEvenUnits) + " unités / mois",
    "timing.opening_units": doc.model.growth ? `${n(doc.model.growth.initialUnits)} en M${doc.model.growth.firstMonth}` : "Non chiffré",
    "timing.opening_units.source": "Hypothèse du modèle [S1]",
    "timing.growth": doc.model.growth ? `${n(doc.model.growth.monthlyIncrease)} unités supplémentaires par mois` : "Non chiffrée",
    "timing.growth.source": "Projection, pas de ventes prouvées",
    "timing.threshold_date": doc.firstProfitableMonth === null ? "Non déterminable" : `M${doc.firstProfitableMonth}`,
    "timing.threshold_date.source": doc.delayNote,
    "timing.cash_balance": "Non calculé : calendrier d’encaissements et de décaissements requis",
    "timing.cash_balance.source": "Le seuil économique ne prouve pas la trésorerie disponible",
    "breakeven.decision": doc.missing.length ? `À chiffrer : ${doc.missing.join(" ; ")}. Aucun zéro supposé.`
      : `Seuil conditionnel au périmètre déclaré. CA à unités entières : ${n(doc.base.revenueAtWholeUnits)} ${doc.model.currency}/mois. ${doc.model.exclusions.join(" ; ")}`,
  };
  for (const control of Array.from(d.getElementsByTagNameNS(W, "sdt"))) {
    const key = control.getElementsByTagNameNS(W, "tag")[0]?.getAttributeNS(W, "val");
    if (!key || !(key in values)) throw new Error(`Champ financier Word non raccordé : ${key ?? "sans clé"}`);
    const ts = Array.from(control.getElementsByTagNameNS(W, "t"));
    if (ts[0]) ts[0].textContent = values[key]!;
    for (const t of ts.slice(1)) t.textContent = "";
  }
  const text = (node: Element) => Array.from(node.getElementsByTagNameNS(W, "t")).map(t => t.textContent ?? "").join("");
  const setText = (node: Element, value: string) => { const ts = Array.from(node.getElementsByTagNameNS(W, "t")); if (ts[0]) ts[0].textContent = value; for (const t of ts.slice(1)) t.textContent = ""; };
  const tables = Array.from(d.getElementsByTagNameNS(W, "tbl"));
  const sensitivity = tables.find(t => text(t).includes("FreshBox") || text(t).includes("Prix moins 20 pour cent"));
  if (sensitivity) for (const [i, tr] of Array.from(sensitivity.getElementsByTagNameNS(W, "tr")).slice(1).entries()) {
    const s = doc.scenarios[i]; if (!s) continue;
    const vals = [s.label, n(s.price), n(s.variable), n(s.fixed), n(s.analysis.breakEvenUnits)];
    Array.from(tr.getElementsByTagNameNS(W, "tc")).forEach((cell, col) => setText(cell, vals[col] ?? ""));
  }
  for (const p of Array.from(d.getElementsByTagNameNS(W, "p"))) {
    const t = text(p);
    if (t.startsWith("Exemple pédagogique FreshBox")) setText(p, `Sensibilité du scénario ${doc.model.title}. Une hypothèse varie à la fois ; même devise, même base, même période.`);
    if (t.startsWith("Correction de l’exemple source")) setText(p, `Les unités indivisibles sont arrondies au supérieur. Le seuil théorique de CA et le CA des unités entières sont distincts.`);
    if (t.startsWith("Dans l’exemple : M0")) setText(p, doc.delayNote);
    if (t.includes("Pour SPAWT, ne pas compter")) setText(p, `Si P ≤ 0, si P − CV ≤ 0 ou si une donnée manque, aucun seuil exploitable n’est calculé. Le payeur et l’unité sont ceux du modèle ; l’audience, les prospects et les visites ne sont pas des clients acquis.`);
    if (t === "Graphique à produire") setText(p, "Représentation du seuil");
    if (t.startsWith("Axe horizontal")) setText(p, "Les courbes du scénario sont présentées en annexe. Axe horizontal : unités mensuelles ; axe vertical : montants dans la devise et la base retenues. Aucun graphique commercial n’est produit si les données sont insuffisantes.");
    if (t.startsWith("Références  C2")) setText(p, "Formulaire adapté de l’exercice Catalyse Module 5 remis par le dirigeant. Les pièces du calcul sont identifiées [S1…] dans l’annexe documentaire.");
  }
  const body = d.getElementsByTagNameNS(W, "body")[0]!;
  const append = (fragment: string) => {
    const wrapper = new JSDOM(`<root xmlns:w="${W}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${fragment}</root>`, { contentType: "application/xml" });
    for (const child of Array.from(wrapper.window.document.documentElement.childNodes)) body.insertBefore(d.importNode(child, true), body.getElementsByTagNameNS(W, "sectPr")[0] ?? null);
  };
  const para = (t: string, bold = false) => `<w:p><w:pPr><w:spacing w:after="120"/></w:pPr><w:r>${bold ? "<w:rPr><w:b/></w:rPr>" : ""}<w:t xml:space="preserve">${xml(t)}</w:t></w:r></w:p>`;
  append('<w:p><w:r><w:br w:type="page"/></w:r></w:p>' + para("Courbes du scénario et traçabilité", true));
  const svg = breakEvenChartSvg(doc);
  if (svg) {
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    zip.file("word/media/break-even.png", png);
    const relPart = zip.file("word/_rels/document.xml.rels");
    const rels = relPart ? await relPart.async("string") : '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
    zip.file("word/_rels/document.xml.rels", rels.replace("</Relationships>", '<Relationship Id="rIdBreakEvenChart" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/break-even.png"/></Relationships>'));
    const ct = await zip.file("[Content_Types].xml")!.async("string");
    if (!ct.includes('Extension="png"')) zip.file("[Content_Types].xml", ct.replace("</Types>", '<Default Extension="png" ContentType="image/png"/></Types>'));
    append('<w:p><w:r><w:drawing><wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><wp:extent cx="5700000" cy="2964000"/><wp:docPr id="9001" name="Seuil de rentabilité" descr="Courbes des revenus et coûts du scénario mensuel"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="break-even.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdBreakEvenChart"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="5700000" cy="2964000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>');
    append(para(`Revenus = P × q ; coûts totaux = CF + CV × q. Le croisement correspond au seuil théorique ; les clients indivisibles sont arrondis au supérieur.`));
  } else append(para("Graphique non produit : les données ne permettent pas de calculer un seuil fini."));
  append(para("Hypothèses et exclusions", true));
  for (const t of [...doc.model.assumptions, ...doc.model.exclusions]) append(para("• " + t));
  append(para("Détail des entrées", true));
  for (const amount of [{ ...doc.model.price, label: "Prix unitaire" }, ...doc.model.fixedCosts, ...doc.model.variableCosts]) {
    append(para(`${amount.label} : ${n(amount.value)} · ${amount.qualification === "HISTORICAL" ? "historique" : amount.qualification === "ASSUMPTION" ? "hypothèse" : "sourcé"}. ${amount.note}`));
    for (const source of amount.sources) append(para(`${ref(source.sourceId)} ${source.locator}`));
  }
  append(para("Éditions documentaires utilisées", true));
  for (const [i, e] of doc.evidence.entries()) append(para(`[S${i + 1}] ${e.fileName} · ${e.document?.label ?? "version conservée"}${e.historical ? " · archive" : ""}. Référence ${e.sourceId} ; empreinte ${e.contentHash}.`));
  append(para(`Édition de la fiche : ${generatedAt.toISOString()}. Modèle ${template.version}. Les pièces et les éditions antérieures restent conservées.`));
  zip.file("word/document.xml", dom.serialize());
  dom.window.close();
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}
