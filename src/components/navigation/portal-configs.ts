import {
  Gauge,
  Mail,
  LayoutDashboard,
  Target,
  Megaphone,
  FileText,
  MessageCircle,
  Fingerprint,
  BookOpen,
  Image,
  BarChart3,
  Activity,
  TrendingUp,
  Send,
  GitBranch,
  Inbox,
  PlayCircle,
  Users,
  CheckCircle,
  Eye,
  BarChart2,
  Route,
  Radar,
  Coins,
  Calendar,
  Receipt,
  Tags,
  Layers,
  GraduationCap,
  Shield,
  CalendarDays,
  Globe,
  Building,
  Stethoscope,
  Filter,
  Rocket,
  Brain,
  Radio,
  Network,
  Shuffle,
  Building2,
  DollarSign,
  GitPullRequest,
  MessageSquare,
  Trophy,
  Share2,
  Newspaper,
  Search,
  Film,
  Zap,
  Clock,
  FileBarChart,
  Lock,
  FileSignature,
  CreditCard,
  Crosshair,
  Award,
  ShoppingBag,
  Settings,
  Plug,
  UsersRound,
  Lightbulb,
  Sparkles,
} from "lucide-react";
import type { NavGroup } from "./types";
import { PILLAR_METADATA } from "@/domain";

/**
 * Nav Cockpit — arbre founder (lot 10, audit UX 2026-07-11 §B).
 *
 * 20 items / 6 groupes orientés jobs founder (voir ma marque / recevoir mes
 * livrables / suivre mon activité / comprendre mon marché / gérer mon
 * compte). Les surfaces de PRODUCTION (Operations Center, Forge, Séquences,
 * Brief→Actions, Missions, Portfolio, éditeur ADVE, RTIS legacy, Trend
 * Tracker, apogee-maintenance) sortent de la nav founder : leurs routes
 * restent joignables mais sont gardées par <OperatorSurface> (lot 12).
 *
 * Les 8 pages piliers ne bougent pas d'URL — elles s'atteignent via les 2
 * hubs « Fondation » / « Stratégie » et allument leur hub via
 * `activePrefixes`. « L'Oracle » reste nommé ainsi : c'est un nom de
 * livrable VENDU (KB UPgraders §1), pas une fuite de vocabulaire interne.
 */
export const cockpitNavGroups: NavGroup[] = [
  {
    title: "",
    items: [
      {
        href: "/cockpit", label: "Tableau de bord", labelKey: "nav.dashboard",
        icon: LayoutDashboard, mobileTab: true,
        activePrefixes: ["/cockpit/new"],
      },
    ],
  },
  {
    title: "Ma marque",
    titleKey: "nav.group.marque",
    items: [
      {
        href: "/cockpit/brand/fondation", label: "Fondation", sublabel: "Les 4 piliers fondateurs",
        labelKey: "nav.fondation", sublabelKey: "nav.fondation.sub",
        icon: Fingerprint, mobileTab: true,
        activePrefixes: [
          "/cockpit/brand/identity",
          "/cockpit/brand/positioning",
          "/cockpit/brand/offer",
          "/cockpit/brand/engagement",
          "/cockpit/brand/edit",
        ],
      },
      {
        href: "/cockpit/brand/strategie", label: "Stratégie", sublabel: "Du diagnostic au plan",
        labelKey: "nav.strategie", sublabelKey: "nav.strategie.sub",
        icon: Route,
        activePrefixes: [
          "/cockpit/brand/diagnostic",
          "/cockpit/brand/market",
          "/cockpit/brand/potential",
          "/cockpit/brand/roadmap",
          "/cockpit/brand/rtis",
          "/cockpit/brand/strategy",
        ],
      },
      { href: "/cockpit/brand/notoria", label: "Recommandations", sublabel: "Moteur de recommandation", labelKey: "nav.notoria", sublabelKey: "nav.notoria.sub", icon: Sparkles },
      { href: "/cockpit/brand/jehuty", label: "La Gazette", sublabel: "Veille & signaux", labelKey: "nav.jehuty", sublabelKey: "nav.jehuty.sub", icon: Newspaper },
    ],
  },
  {
    title: "Mes livrables",
    titleKey: "nav.group.livrables",
    items: [
      {
        href: "/cockpit/brand/proposition", label: "L'Oracle", sublabel: "Votre stratégie complète",
        labelKey: "nav.proposition", sublabelKey: "nav.proposition.sub", icon: FileSignature,
      },
      {
        href: "/cockpit/brand/deliverables", label: "Livrables", sublabel: "Chartes · Assets · Exports",
        labelKey: "nav.livrables", sublabelKey: "nav.livrables.sub", icon: FileText,
        activePrefixes: ["/cockpit/brand/guidelines", "/cockpit/brand/assets"],
      },
      {
        href: "/cockpit/brand/sources", label: "Sources", sublabel: "Vos documents & données",
        labelKey: "nav.sources", sublabelKey: "nav.sources.sub", icon: Layers,
      },
    ],
  },
  {
    title: "Mon activité",
    titleKey: "nav.group.activite",
    items: [
      {
        href: "/cockpit/operate/center", label: "Suivi du jour", sublabel: "Votre activité aujourd'hui",
        labelKey: "nav.operations", sublabelKey: "nav.operations.sub", icon: Gauge,
      },
      {
        href: "/cockpit/operate/campaigns", label: "Campagnes", sublabel: "Suivi de vos campagnes",
        labelKey: "nav.campagnes", sublabelKey: "nav.campagnes.sub",
        icon: Megaphone, mobileTab: true,
        activePrefixes: ["/cockpit/operate/briefs"],
      },
      {
        href: "/cockpit/operate/calendar", label: "Calendrier", sublabel: "Lancements & actions",
        labelKey: "nav.calendrier", sublabelKey: "nav.calendrier.sub", icon: CalendarDays,
        activePrefixes: ["/cockpit/operate/roadmap"],
      },
      {
        href: "/cockpit/operate/inbox", label: "Boîte de réception", sublabel: "Commentaires & messages reçus",
        labelKey: "nav.inbox", sublabelKey: "nav.inbox.sub", icon: Inbox,
      },
      {
        href: "/cockpit/operate/publish", label: "Publier", sublabel: "Publier sur vos réseaux",
        labelKey: "nav.publier", sublabelKey: "nav.publier.sub", icon: Send,
      },
      {
        href: "/cockpit/operate/tracker", label: "Résultats", sublabel: "Performance des campagnes",
        labelKey: "nav.resultats", sublabelKey: "nav.resultats.sub", icon: Activity,
      },
      {
        href: "/cockpit/operate/newsletter", label: "Newsletter", sublabel: "Vos envois & abonnés",
        labelKey: "nav.newsletter", sublabelKey: "nav.newsletter.sub", icon: Mail,
      },
      {
        href: "/cockpit/operate/requests", label: "Demandes", sublabel: "Demandes à votre équipe",
        labelKey: "nav.demandes", sublabelKey: "nav.demandes.sub", icon: MessageCircle,
      },
    ],
  },
  {
    title: "Mon marché",
    titleKey: "nav.group.marche",
    items: [
      {
        href: "/cockpit/intelligence/overton", label: "Radar sectoriel", sublabel: "Votre position dans le secteur",
        labelKey: "nav.overton", sublabelKey: "nav.overton.sub", icon: Radar,
      },
      {
        href: "/cockpit/intelligence/market-studies", label: "Études de marché", sublabel: "Vos études ingérées",
        labelKey: "nav.market-studies", sublabelKey: "nav.market-studies.sub", icon: Search,
      },
      {
        href: "/cockpit/intelligence/social", label: "Performance sociale", sublabel: "Vos réseaux en chiffres réels",
        labelKey: "nav.social-perf", sublabelKey: "nav.social-perf.sub", icon: TrendingUp,
      },
      {
        href: "/cockpit/intelligence/community", label: "Communauté", sublabel: "Superfans & engagement",
        labelKey: "nav.communaute", sublabelKey: "nav.communaute.sub", icon: Users,
      },
      {
        href: "/cockpit/insights/reports", label: "Rapports & analyses", sublabel: "Santé · Benchmarks · Attribution",
        labelKey: "nav.rapports", sublabelKey: "nav.rapports.sub", icon: BarChart3,
        activePrefixes: [
          "/cockpit/insights/diagnostics",
          "/cockpit/insights/benchmarks",
          "/cockpit/insights/attribution",
          "/cockpit/insights/apogee-maintenance",
        ],
      },
    ],
  },
  {
    title: "Mon compte",
    titleKey: "nav.group.compte",
    items: [
      { href: "/cockpit/settings/connections", label: "Connexions", sublabel: "Réseaux · Boutique · Comptes", labelKey: "nav.connexions", sublabelKey: "nav.connexions.sub", icon: Plug },
      { href: "/cockpit/settings/billing", label: "Abonnement", labelKey: "nav.abonnement", icon: CreditCard },
      { href: "/cockpit/settings", label: "Réglages", labelKey: "nav.reglages", icon: Settings },
    ],
  },
  {
    title: "",
    items: [
      { href: "/cockpit/messages", label: "Messages", labelKey: "nav.messages", icon: MessageSquare, mobileTab: true },
    ],
  },
];

export const creatorNavGroups: NavGroup[] = [
  {
    title: "",
    items: [
      { href: "/creator", label: "Tableau de bord", icon: LayoutDashboard },
    ],
  },
  {
    title: "Missions",
    items: [
      { href: "/creator/missions/available", label: "Disponibles", icon: Inbox },
      { href: "/creator/missions/active", label: "En cours", icon: PlayCircle },
      { href: "/creator/missions/collab", label: "Collaboratives", icon: Users },
      { href: "/creator/proposals", label: "Propositions", icon: Lightbulb },
    ],
  },
  {
    title: "Qualite",
    items: [
      { href: "/creator/qc/submitted", label: "Soumissions", icon: CheckCircle },
      { href: "/creator/qc/peer", label: "Peer Review", icon: Eye, minTier: "COMPAGNON" },
    ],
  },
  {
    title: "Progression",
    items: [
      { href: "/creator/progress/metrics", label: "Metriques", icon: BarChart2, minTier: "COMPAGNON" },
      { href: "/creator/progress/path", label: "Parcours", icon: Route },
      { href: "/creator/progress/strengths", label: "Forces", icon: Radar, minTier: "COMPAGNON" },
    ],
  },
  {
    title: "Gains",
    items: [
      { href: "/creator/earnings/missions", label: "Missions", icon: Coins },
      { href: "/creator/earnings/history", label: "Historique", icon: Calendar, minTier: "COMPAGNON" },
      { href: "/creator/earnings/invoices", label: "Factures", icon: Receipt, minTier: "COMPAGNON" },
    ],
  },
  {
    title: "Profil",
    items: [
      { href: "/creator/profile/skills", label: "Competences", icon: Tags },
      { href: "/creator/profile/drivers", label: "Drivers", icon: Layers },
      { href: "/creator/profile/portfolio", label: "Portfolio", icon: Image },
    ],
  },
  {
    title: "Apprendre",
    items: [
      { href: "/creator/learn/adve", label: "ADVE", icon: GraduationCap },
      { href: "/creator/learn/drivers", label: "Drivers", icon: BookOpen },
      { href: "/creator/learn/cases", label: "Cas", icon: FileText },
    ],
  },
  {
    title: "Communaute",
    items: [
      { href: "/creator/community/guild", label: "Guilde", icon: Shield },
      { href: "/creator/community/events", label: "Evenements", icon: CalendarDays },
    ],
  },
  {
    title: "",
    items: [
      { href: "/creator/messages", label: "Messages", icon: MessageSquare },
    ],
  },
];

export const agencyNavGroups: NavGroup[] = [
  {
    title: "",
    items: [
      { href: "/agency", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "Clients",
    divisionColor: "var(--color-division-oracle)",
    items: [
      { href: "/agency/clients", label: "Clients", icon: Building },
      { href: "/agency/intake", label: "Pipeline Intake", icon: Filter },
    ],
  },
  {
    title: "Operations",
    divisionColor: "var(--color-division-fusee)",
    items: [
      { href: "/agency/campaigns", label: "Campagnes", icon: Megaphone },
      { href: "/agency/missions", label: "Missions", icon: Target },
    ],
  },
  {
    title: "Intelligence",
    divisionColor: "var(--color-division-signal)",
    items: [
      { href: "/agency/signals", label: "Signaux", icon: Radio },
      { href: "/agency/knowledge", label: "Knowledge Graph", icon: Network },
    ],
  },
  {
    title: "Financier",
    divisionColor: "var(--color-division-socle)",
    items: [
      { href: "/agency/revenue", label: "Revenus", icon: DollarSign },
      { href: "/agency/commissions", label: "Commissions", icon: Coins },
      { href: "/agency/contracts", label: "Contrats", icon: FileSignature },
    ],
  },
  {
    title: "",
    items: [
      { href: "/agency/messages", label: "Messages", icon: MessageSquare },
    ],
  },
];

export const consoleNavGroups: NavGroup[] = [
  // ── Home ──────────────────────────────────────────────────────────────
  {
    title: "",
    items: [
      { href: "/console", label: "Industry OS", icon: Globe },
    ],
  },
  // ── MARQUES — Brand Instances + Intake ────────────────────────────────
  {
    title: "Marques",
    divisionColor: "var(--color-division-oracle)",
    items: [
      { href: "/console/strategy-portfolio/brands", label: "Brand Instances", icon: Building },
      { href: "/console/strategy-operations/intake", label: "Intake", icon: Inbox },
    ],
  },
  // ── MESTOR — Decisions, Plans, Insights, Recommendations ─────────────
  {
    title: "Mestor",
    divisionColor: "var(--color-division-mestor)",
    items: [
      { href: "/console/mestor", label: "Tableau de bord", icon: Brain },
      { href: "/console/mestor/plans", label: "Plans", icon: GitPullRequest },
      { href: "/console/mestor/recos", label: "Recommandations", icon: Lightbulb },
      { href: "/console/mestor/insights", label: "Insights", icon: Zap },
    ],
  },
  // ── ARTEMIS — Skill Tree, Vault, Tools, Missions, Campaigns ──────────
  {
    title: "Artemis",
    divisionColor: "var(--color-division-artemis)",
    items: [
      { href: "/console/artemis", label: "Tableau de bord", icon: Target },
      { href: "/console/artemis/skill-tree", label: "Skill Tree", icon: Network },
      { href: "/console/artemis/vault", label: "Vault", icon: Lock },
      { href: "/console/oracle/compilation", label: "Compilation Oracle", icon: Brain },
      { href: "/console/artemis/tools", label: "Outils GLORY", icon: Trophy },
      { href: "/console/artemis/oracle-catalog", label: "Catalogue Oracle", sublabel: "35 sections", icon: BookOpen },
      { href: "/console/artemis/missions", label: "Missions", icon: Crosshair },
      { href: "/console/artemis/campaigns", label: "Campagnes", icon: Megaphone },
      { href: "/console/artemis/drivers", label: "Drivers", icon: Layers },
      { href: "/console/artemis/social", label: "Social", icon: Share2 },
      { href: "/console/artemis/scheduler", label: "Scheduler", icon: Clock },
      { href: "/console/artemis/pr", label: "PR", icon: Newspaper },
      { href: "/console/artemis/media", label: "Media", icon: Film },
      { href: "/console/artemis/interventions", label: "Interventions", icon: Zap },
    ],
  },
  // ── SESHAT — Signals, Tarsis, Intelligence, Knowledge ────────────────
  {
    title: "Seshat",
    divisionColor: "var(--color-division-seshat)",
    items: [
      { href: "/console/seshat/jehuty", label: "Jehuty", icon: Newspaper },
      { href: "/console/seshat/intelligence", label: "Intelligence", icon: Brain },
      { href: "/console/seshat/signals", label: "Signaux", icon: Radio },
      { href: "/console/seshat/search", label: "Recherche sémantique", icon: Search },
      { href: "/console/seshat/knowledge", label: "Knowledge Graph", icon: Network },
      { href: "/console/seshat/market", label: "Marche", icon: TrendingUp },
      { href: "/console/seshat/tarsis", label: "Tarsis", icon: Radar },
      { href: "/console/seshat/argos", label: "Argos (Hunter)", icon: Crosshair },
      { href: "/console/seshat/marketplace", label: "Marketplace", icon: Building2 },
      { href: "/console/seshat/attribution", label: "Attribution", icon: GitBranch },
    ],
  },
  // ── ANUBIS — Comms, CRM, Credentials, API Billing (Vague 10) ─────────
  {
    title: "Anubis",
    divisionColor: "var(--color-division-anubis)",
    items: [
      { href: "/console/anubis/crm", label: "CRM & Newsletter", icon: Mail },
      { href: "/console/anubis/blog", label: "Blog — Notes de cabinet", icon: FileText },
      { href: "/console/anubis/credentials", label: "Credentials Vault", icon: Lock },
      { href: "/console/anubis/api-billing", label: "API Billing", icon: CreditCard },
      { href: "/console/anubis/notifications", label: "Notifications", icon: Radio },
    ],
  },
  // ── L'ARENE — Guild, Matching, Community, Academie ───────────────────
  {
    title: "L'Arene",
    divisionColor: "var(--color-division-arene)",
    items: [
      { href: "/console/arene/guild", label: "Guilde", icon: Shield },
      { href: "/console/arene/missions-guilde", label: "Missions Guilde", icon: Megaphone },
      { href: "/console/arene/matching", label: "Matching", icon: Shuffle },
      { href: "/console/arene/orgs", label: "Organisations", icon: Building2 },
      { href: "/console/arene/club", label: "Club", icon: UsersRound },
      { href: "/console/arene/events", label: "Evenements", icon: CalendarDays },
      { href: "/console/arene/academie", label: "Academie", icon: GraduationCap },
    ],
  },
  // ── LE SOCLE — Finance, Ecosystem, Operators ─────────────────────────
  {
    title: "Le Socle",
    divisionColor: "var(--color-division-socle)",
    items: [
      { href: "/console/socle/revenue", label: "Revenus", icon: DollarSign },
      { href: "/console/socle/commissions", label: "Commissions", icon: Coins },
      { href: "/console/socle/pipeline", label: "Pipeline", icon: GitPullRequest },
      { href: "/console/socle/value-reports", label: "Value Reports", icon: FileBarChart },
      { href: "/console/socle/escrow", label: "Escrow", icon: Lock },
      { href: "/console/socle/contracts", label: "Contrats", icon: FileSignature },
      { href: "/console/socle/invoices", label: "Factures", icon: CreditCard },
      { href: "/console/socle/pricing", label: "Pricing & Providers", icon: Tags },
      { href: "/console/socle/manual-subscriptions", label: "Abonnements manuels", icon: MessageSquare },
      { href: "/console/socle/market-costs", label: "Couts marche", icon: FileBarChart },
      { href: "/console/socle/transactions", label: "Transactions", icon: Receipt },
      { href: "/console/socle/prod-ops", label: "Ops production", icon: Rocket },
      { href: "/console/ecosystem", label: "Ecosysteme", icon: Globe },
      { href: "/console/ecosystem/operators", label: "Operateurs", icon: Building2 },
      { href: "/console/ecosystem/metrics", label: "Metriques", icon: BarChart3 },
      { href: "/console/ecosystem/scoring", label: "Score /200", icon: Activity },
    ],
  },
  // ── OPÉRATIONS & GOUVERNANCE (Vague 7/10) ────────────────────────────
  {
    title: "Operations",
    items: [
      { href: "/console/operations", label: "Traque operationnelle", icon: Activity },
      { href: "/console/governance/accounts", label: "Comptes & roles", icon: Shield },
      { href: "/console/governance/canon-sync", label: "Canon UPgraders", icon: Rocket },
    ],
  },
  // ── Config ───────────────────────────────────────────────────────────
  {
    title: "Config",
    items: [
      { href: "/console/config", label: "Parametres", icon: Settings },
      { href: "/console/config/thresholds", label: "Seuils", icon: Radar },
      { href: "/console/config/templates", label: "Templates", icon: Layers },
      { href: "/console/config/system", label: "Systeme", icon: Rocket },
      { href: "/console/config/integrations", label: "Integrations", icon: Plug },
      { href: "/console/config/variables", label: "Variables ADVERTIS", icon: Layers },
    ],
  },
  {
    title: "",
    items: [
      { href: "/console/messages", label: "Messages", icon: MessageSquare },
    ],
  },
];
