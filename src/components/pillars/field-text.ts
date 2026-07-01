/**
 * Pré-remplissage d'édition — pur TS. Convertit la valeur courante d'un
 * champ en texte de textarea, SANS PERTE SILENCIEUSE : ce que l'opérateur
 * voit dans la zone d'édition est exactement ce qui sera réécrit au save
 * (les items structurés apparaissent en JSON — les modifier les remplace
 * par la ligne saisie, en toute connaissance de cause).
 */
import type { FieldDef } from "@/domain/pillar-fields";

function itemToLine(item: unknown): string {
  if (typeof item === "string") return item;
  if (typeof item === "number" || typeof item === "boolean") return String(item);
  return JSON.stringify(item);
}

/** Valeur courante → texte d'édition (listes : une entrée par ligne). */
export function fieldValueToText(field: FieldDef, value: unknown): string {
  if (value === null || value === undefined) return "";
  if (field.type === "liste") {
    if (Array.isArray(value)) return value.map(itemToLine).join("\n");
    return JSON.stringify(value);
  }
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}
