/**
 * Statut de la colonne `IntentEmission.status` d'une émission INVOKE_GLORY_TOOL,
 * d'après le statut du résultat de l'outil.
 *
 * La clôture écrivait `result.status` et `completedAt` sans la colonne : les
 * émissions terminées restaient PENDING. Le contrôle SLO ne compte comme erreur
 * que `status = FAILED`, et le balayage des émissions abandonnées ne vise que
 * `completedAt` nul : un outil échoué passait donc pour réussi.
 *
 * Un résultat différé (identifiants absents) ou à saisir à la main n'est ni un
 * succès ni une panne : DOWNGRADED.
 */
export type ToolEmissionStatus = "OK" | "FAILED" | "DOWNGRADED";

export function toolEmissionStatus(resultStatus: unknown): ToolEmissionStatus {
  if (resultStatus === "OK" || resultStatus === "COMPLETED") return "OK";
  if (resultStatus === "FAILED") return "FAILED";
  return "DOWNGRADED";
}
