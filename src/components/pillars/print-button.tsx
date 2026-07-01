"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * « Le PDF, c'est l'impression navigateur » — honnête et zéro dépendance.
 * Masqué à l'impression (print:hidden posé par le parent ou ici).
 */
export function PrintButton() {
  return (
    <Button onClick={() => window.print()} className="print:hidden">
      <Printer aria-hidden />
      Imprimer / Enregistrer en PDF
    </Button>
  );
}
