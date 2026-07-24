/**
 * listSchemaLeafPaths / findEmptyLeafPaths — l'inventaire canonique des feuilles
 * de schema qui rend visibles les champs vides EN PROFONDEUR (sous-clés d'objets
 * imbriqués, ex. `prophecy.pioneers`). Avant, la notoria ne regardait que le
 * premier niveau → « la notoria ignore les champs vides ». Pur, sans DB.
 */
import { describe, it, expect } from "vitest";
import { listSchemaLeafPaths, findEmptyLeafPaths, findEmptyArrayCellPaths, buildExampleFromZod, getFieldZod } from "@/lib/types/pillar-maturity-contracts";
import { PILLAR_SCHEMAS } from "@/lib/types/pillar-schemas";

describe("listSchemaLeafPaths — descend les objets, s'arrête aux tableaux", () => {
  it("pilier A : descend prophecy (union object|string) + ikigai jusqu'aux feuilles", () => {
    const paths = listSchemaLeafPaths("a").map((l) => l.path);
    // Branche objet de l'union `prophecy` descendue → feuilles atteignables.
    expect(paths).toContain("prophecy.worldTransformed");
    expect(paths).toContain("prophecy.pioneers");
    // ikigai (objet) descendu.
    expect(paths.some((p) => p.startsWith("ikigai."))).toBe(true);
    // Scalaire top-level présent tel quel.
    expect(paths).toContain("secteur");
    // Jamais l'objet parent nu comme feuille (il est descendu).
    expect(paths).not.toContain("prophecy");
  });

  it("pilier V : un tableau est une FEUILLE (pas descendu par cellule)", () => {
    const leaves = listSchemaLeafPaths("v");
    const cat = leaves.find((l) => l.path === "produitsCatalogue");
    expect(cat).toBeDefined();
    expect(cat!.isArray).toBe(true);
    // Aucune descente `produitsCatalogue.<x>` — la profondeur par cellule vit
    // dans array_items_complete / expandArrayItemRequirements.
    expect(leaves.every((l) => !l.path.startsWith("produitsCatalogue."))).toBe(true);
  });

  it("respecte le plafond de profondeur", () => {
    const leaves = listSchemaLeafPaths("a", 3);
    expect(leaves.every((l) => l.path.split(".").length <= 3)).toBe(true);
    expect(leaves.length).toBeGreaterThan(0);
  });

  it("topKey = première clé du chemin", () => {
    const leaves = listSchemaLeafPaths("a");
    const pioneers = leaves.find((l) => l.path === "prophecy.pioneers");
    expect(pioneers!.topKey).toBe("prophecy");
  });
});

describe("findEmptyLeafPaths — vides réels, anti-fabrication", () => {
  it("détecte une sous-feuille vide, ignore la sous-feuille remplie (objet partiel)", () => {
    const empty = findEmptyLeafPaths("a", { prophecy: { worldTransformed: "un monde X" } }).map((l) => l.path);
    expect(empty).toContain("prophecy.pioneers"); // vide → cible
    expect(empty).not.toContain("prophecy.worldTransformed"); // rempli → pas cible
  });

  it("saute une union rendue en forme string legacy (valeur complète)", () => {
    const empty = findEmptyLeafPaths("a", { prophecy: "récit narratif complet en une phrase" }).map((l) => l.path);
    // On ne descend PAS dans une string : aucune feuille `prophecy.*`.
    expect(empty.some((p) => p.startsWith("prophecy."))).toBe(false);
  });

  it("exclut les champs NEEDS_HUMAN (donnée réelle jamais inférée — ex. traction)", () => {
    // traction EST un champ objet du pilier T → ses feuilles existent dans l'inventaire…
    expect(listSchemaLeafPaths("t").some((l) => l.topKey === "traction")).toBe(true);
    // …mais findEmptyLeafPaths ne les propose JAMAIS au remplissage automatique.
    expect(findEmptyLeafPaths("t", {}).some((l) => l.topKey === "traction")).toBe(false);
  });

  it("un pilier A vide → sous-feuilles inférables listées (mais pas les objets nus)", () => {
    const empty = findEmptyLeafPaths("a", {}).map((l) => l.path);
    expect(empty).toContain("prophecy.worldTransformed");
    expect(empty).toContain("secteur");
  });

  it("union `array|object` en forme TABLEAU remplie → pas de faux vide (audit adversarial)", () => {
    // hierarchieCommunautaire = union([array(ladder), object]) : unwrapZod descend
    // la branche objet, mais un contenu stocké en forme TABLEAU (échelle remplie)
    // ne doit PAS voir ses feuilles-objet listées comme vides à drafter.
    const arrayForm = { hierarchieCommunautaire: [{ level: "SPECTATEUR" }, { level: "AMBASSADEUR" }] };
    const empty = findEmptyLeafPaths("a", arrayForm).map((l) => l.path);
    expect(empty.some((p) => p.startsWith("hierarchieCommunautaire."))).toBe(false);
  });

  it("champ COMPLETE_OPTIONAL (`v.productSystem`, ADR-0170) jamais proposé au remplissage", () => {
    // Il EXISTE dans l'inventaire brut…
    expect(listSchemaLeafPaths("v").some((l) => l.topKey === "productSystem")).toBe(true);
    // …mais findEmptyLeafPaths ne le propose JAMAIS (pas de fabrication d'un « Système
    // Palais » qu'un produit n'a pas — même exclusion que le contrat COMPLETE).
    expect(findEmptyLeafPaths("v", {}).some((l) => l.topKey === "productSystem")).toBe(false);
  });
});

describe("findEmptyArrayCellPaths — cellules de tableau vides, QUALITATIF only (anti-fabrication)", () => {
  it("pilier V : cellules vides de la matrice produit détectées, remplies exclues, NOMBRE exclu", () => {
    const v = { produitsCatalogue: [{ nom: "Spawter Gold", categorie: "SERVICE_PREMIUM", gainClientConcret: "x", gainClientAbstrait: "y", coutMarqueConcret: 500 }] };
    const cells = findEmptyArrayCellPaths("v", v).map((c) => c.path);
    // Cellules qualitatives vides → cibles.
    expect(cells).toContain("produitsCatalogue[0].gainMarqueConcret");
    expect(cells).toContain("produitsCatalogue[0].coutClientConcret");
    // Cellule remplie → PAS une cible.
    expect(cells).not.toContain("produitsCatalogue[0].gainClientConcret");
    // Nombre (coutMarqueConcret = currency) → JAMAIS fabriqué.
    expect(cells.some((p) => p.includes("coutMarqueConcret"))).toBe(false);
    // Clé technique (id/skuRef) → jamais fabriquée.
    expect(cells.some((p) => p.endsWith(".id") || p.endsWith(".skuRef"))).toBe(false);
  });

  it("pilier D : sous-champs de persona qualitatifs détectés, `.age` (nombre) exclu, items EXISTANTS only", () => {
    const d = { personas: [{ name: "Betsy", motivations: ["badge doré"] }, { name: "Awa", motivations: ["gratis"] }] };
    const cells = findEmptyArrayCellPaths("d", d).map((c) => c.path);
    expect(cells).toContain("personas[0].lifestyle");
    expect(cells).toContain("personas[0].jobsToBeDone"); // array-of-strings qualitatif
    expect(cells.some((p) => p.includes(".age"))).toBe(false); // nombre
    expect(cells.some((p) => p.startsWith("personas[2]"))).toBe(false); // seulement 2 items existants
    expect(cells.some((p) => p === "personas[0].motivations")).toBe(false); // déjà rempli
  });

  it("tableau absent / vide → aucune cellule (jamais fabriquer un item)", () => {
    expect(findEmptyArrayCellPaths("v", {})).toEqual([]);
    expect(findEmptyArrayCellPaths("v", { produitsCatalogue: [] })).toEqual([]);
  });

  it("scalarKind présent sur chaque feuille de l'inventaire", () => {
    const leaves = listSchemaLeafPaths("v");
    expect(leaves.every((l) => typeof l.scalarKind === "string")).toBe(true);
    const cat = leaves.find((l) => l.path === "produitsCatalogue");
    expect(cat!.scalarKind).toBe("array");
  });
});

describe("shape PROFONDE équipant la notoria (buildExampleFromZod / getFieldZod)", () => {
  it("buildExampleFromZod expose l'arborescence imbriquée avec ses sous-clés (pas un type plat)", () => {
    // Ce que le prompt notoria montre désormais au LLM : la SHAPE, pas « prophecy: object ».
    const ex = buildExampleFromZod(PILLAR_SCHEMAS.A) as Record<string, unknown>;
    expect(typeof ex.prophecy).toBe("object");
    expect(Object.keys(ex.prophecy as object)).toContain("pioneers");
  });

  it("getFieldZod valide une feuille imbriquée (chemin `prophecy.pioneers`)", () => {
    const zod = getFieldZod("a", "prophecy.pioneers") as { safeParse?: (v: unknown) => { success: boolean } } | null;
    expect(typeof zod?.safeParse).toBe("function");
    expect(zod?.safeParse?.("les pionniers de la cause")?.success).toBe(true);
  });

  it("getFieldZod valide une cellule de matrice (chemin `produitsCatalogue[0].gainClientConcret`)", () => {
    const zod = getFieldZod("v", "produitsCatalogue[0].gainClientConcret") as { safeParse?: (v: unknown) => { success: boolean } } | null;
    expect(typeof zod?.safeParse).toBe("function");
  });
});
