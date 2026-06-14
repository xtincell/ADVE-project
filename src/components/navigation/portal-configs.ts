import {
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

export const cockpitNavGroups: NavGroup[] = [
  {
    title: "",
    items: [
      { href: "/cockpit", label: "Tableau de bord", icon: LayoutDashboard },
    ],
  },
  {
    title: "Operations",
    items: [
      { href: "/cockpit/operate/missions", label: "Missions", icon: Target },
      { href: "/cockpit/operate/campaigns", label: "Campagnes", icon: Megaphone },
      { href: "/cockpit/operate/briefs", label: "Briefs", icon: FileText },
      { href: "/cockpit/operate/requests", label: "Demandes", icon: MessageCircle },
    ],
  },
  {
    // ADVE — Fondation. Labels dérivés de PILLAR_METADATA (slug "pillar-a" …)
    // pour une seule source de vérité ; format "Nom (Lettre)" + rôle en sous-titre.
    title: "Marque — Fondation",
    titleKey: "nav.group.fondation",
    items: [
      { href: "/cockpit/brand/identity", label: `${PILLAR_METADATA.A.displayName} (A)`, sublabel: PILLAR_METADATA.A.role, pillarSlug: "pillar-a", icon: Fingerprint },
      { href: "/cockpit/brand/positioning", label: `${PILLAR_METADATA.D.displayName} (D)`, sublabel: PILLAR_METADATA.D.role, pillarSlug: "pillar-d", icon: Target },
      { href: "/cockpit/brand/offer", label: `${PILLAR_METADATA.V.displayName} (V)`, sublabel: PILLAR_METADATA.V.role, pillarSlug: "pillar-v", icon: Tags },
      { href: "/cockpit/brand/engagement", label: `${PILLAR_METADATA.E.displayName} (E)`, sublabel: PILLAR_METADATA.E.role, pillarSlug: "pillar-e", icon: Users },
    ],
  },
  {
    // RTIS — Stratégie. Ordre canon : R → T s'exécutent, PUIS Jehuty (organe
    // de presse) + Notoria (moteur de reco) coordonnent les recommandations
    // qui impactent I puis S.
    title: "Marque — Strategie",
    titleKey: "nav.group.strategie",
    items: [
      { href: "/cockpit/brand/diagnostic", label: `${PILLAR_METADATA.R.displayName} (R)`, sublabel: PILLAR_METADATA.R.role, pillarSlug: "pillar-r", icon: Shield },
      { href: "/cockpit/brand/market", label: `${PILLAR_METADATA.T.displayName} (T)`, sublabel: PILLAR_METADATA.T.role, pillarSlug: "pillar-t", icon: TrendingUp },
      { href: "/cockpit/brand/jehuty", label: "Jehuty", sublabel: "Organe de presse", labelKey: "nav.jehuty", sublabelKey: "nav.jehuty.sub", icon: Newspaper },
      { href: "/cockpit/brand/notoria", label: "Notoria", sublabel: "Moteur de recommandation", labelKey: "nav.notoria", sublabelKey: "nav.notoria.sub", icon: Sparkles },
      { href: "/cockpit/brand/potential", label: `${PILLAR_METADATA.I.displayName} (I)`, sublabel: PILLAR_METADATA.I.role, pillarSlug: "pillar-i", icon: Rocket },
      { href: "/cockpit/brand/roadmap", label: `${PILLAR_METADATA.S.displayName} (S)`, sublabel: PILLAR_METADATA.S.role, pillarSlug: "pillar-s", icon: Route },
    ],
  },
  {
    title: "Livrables & Sources",
    items: [
      { href: "/cockpit/brand/proposition", label: "L'Oracle", icon: Brain },
      { href: "/cockpit/brand/deliverables", label: "Mes Livrables", icon: FileText },
      { href: "/cockpit/brand/guidelines", label: "Guidelines", icon: BookOpen },
      { href: "/cockpit/brand/assets", label: "Assets", icon: Image },
      { href: "/cockpit/brand/sources", label: "Sources", icon: Layers },
    ],
  },
  {
    title: "Insights",
    items: [
      { href: "/cockpit/insights/reports", label: "Rapports", icon: BarChart3 },
      { href: "/cockpit/insights/diagnostics", label: "Diagnostics", icon: Activity },
      { href: "/cockpit/insights/benchmarks", label: "Benchmarks", icon: TrendingUp },
      { href: "/cockpit/insights/attribution", label: "Attribution", icon: GitBranch },
    ],
  },
  {
    // Phase 23 Epic 7 Story 7.7 — durable path to the sectoral Overton surface.
    title: "Intelligence",
    items: [
      { href: "/cockpit/intelligence/overton", label: "Overton sectoriel", icon: Radar },
    ],
  },
  {
    title: "",
    items: [
      { href: "/cockpit/messages", label: "Messages", icon: MessageSquare },
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
      { href: "/console/seshat/attribution", label: "Attribution", icon: GitBranch },
    ],
  },
  // ── ANUBIS — Comms, CRM, Credentials, API Billing (Vague 10) ─────────
  {
    title: "Anubis",
    divisionColor: "var(--color-division-anubis)",
    items: [
      { href: "/console/anubis/crm", label: "CRM & Newsletter", icon: Mail },
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
      { href: "/console/socle/market-costs", label: "Couts marche", icon: FileBarChart },
      { href: "/console/socle/transactions", label: "Transactions", icon: Receipt },
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
