/**
 * État retourné par les server actions de formulaire (useActionState).
 * null = état initial (aucune soumission). Messages en français, prêts à
 * afficher — jamais de code technique côté UI.
 */
export type FormState = {
  /** Erreur globale du formulaire (credentials invalides, email pris…). */
  formError?: string;
  /** Erreurs par champ (sortie Zod aplatie), clé = attribut `name` du champ. */
  fieldErrors?: Record<string, string[] | undefined>;
} | null;
