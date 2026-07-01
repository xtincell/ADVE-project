// Centralized sector + country option lists used by the intake form,
// payment routing, and any admin filter UIs. Adding "WK" Wakanda here also
// extends CinetPay routing automatically (see CINETPAY_COUNTRIES below).

export const INTAKE_SECTORS = [
  { value: "FMCG", label: "FMCG (grande consommation)" },
  { value: "AGRO", label: "Agro-industrie & agriculture" },
  { value: "FOOD", label: "Alimentation & boissons" },
  { value: "MODE", label: "Mode & beauté" },
  { value: "RETAIL", label: "Retail & distribution" },
  { value: "TECH", label: "Tech & startup" },
  { value: "TELECOM", label: "Télécom & opérateurs" },
  { value: "MEDIA", label: "Média & édition" },
  { value: "CULTURE", label: "Culture & créativité" },
  { value: "TOURISME", label: "Tourisme & hôtellerie" },
  { value: "BANQUE", label: "Banque, finance & fintech" },
  { value: "ASSURANCE", label: "Assurance" },
  { value: "IMMOBILIER", label: "Immobilier & construction" },
  { value: "BTP", label: "BTP & infrastructure" },
  { value: "ENERGIE", label: "Énergie & utilities" },
  { value: "LOGISTIQUE", label: "Transport & logistique" },
  { value: "SANTE", label: "Santé & pharma" },
  { value: "EDUCATION", label: "Éducation & formation" },
  { value: "CONSEIL", label: "Conseil & services pro" },
  { value: "SERVICES", label: "Services aux particuliers" },
  { value: "B2B", label: "B2B / industrie" },
  { value: "ONG", label: "ONG, impact & associatif" },
  { value: "PUBLIC", label: "Secteur public & institution" },
  { value: "AUTRE", label: "Autre" },
] as const;

export const INTAKE_SECTOR_VALUES = INTAKE_SECTORS.map((s) => s.value);
export type IntakeSector = (typeof INTAKE_SECTORS)[number]["value"];

// Countries — ISO-2 codes. WK = Wakanda (fictional, for the demo universe).
// Order: francophone Africa first, then anglophone Africa, then international.
export const INTAKE_COUNTRIES = [
  { value: "CM", label: "Cameroun" },
  { value: "CI", label: "Côte d'Ivoire" },
  { value: "SN", label: "Sénégal" },
  { value: "GA", label: "Gabon" },
  { value: "CG", label: "Congo" },
  { value: "CD", label: "RD Congo" },
  { value: "BF", label: "Burkina Faso" },
  { value: "ML", label: "Mali" },
  { value: "TG", label: "Togo" },
  { value: "BJ", label: "Bénin" },
  { value: "NE", label: "Niger" },
  { value: "TD", label: "Tchad" },
  { value: "MA", label: "Maroc" },
  { value: "TN", label: "Tunisie" },
  { value: "DZ", label: "Algérie" },
  { value: "EG", label: "Égypte" },
  { value: "NG", label: "Nigeria" },
  { value: "GH", label: "Ghana" },
  { value: "KE", label: "Kenya" },
  { value: "ZA", label: "Afrique du Sud" },
  { value: "RW", label: "Rwanda" },
  { value: "ET", label: "Éthiopie" },
  { value: "WK", label: "Wakanda" },
  { value: "FR", label: "France" },
  { value: "BE", label: "Belgique" },
  { value: "CH", label: "Suisse" },
  { value: "CA", label: "Canada" },
  { value: "US", label: "États-Unis" },
  { value: "GB", label: "Royaume-Uni" },
  { value: "AUTRE", label: "Autre" },
] as const;

export const INTAKE_COUNTRY_VALUES = INTAKE_COUNTRIES.map((c) => c.value);
export type IntakeCountry = (typeof INTAKE_COUNTRIES)[number]["value"];

// Countries routed through CinetPay (FCFA / mobile money). All others go to Stripe (EUR).
// Wakanda included so the demo dataset routes through CinetPay end-to-end.
export const CINETPAY_COUNTRIES: readonly string[] = [
  "CM", "CI", "SN", "GA", "CG", "CD", "BF", "ML", "TG", "BJ", "NE", "TD", "WK",
];

export function isCinetPayCountry(country: string | null | undefined): boolean {
  return !!country && CINETPAY_COUNTRIES.includes(country);
}
