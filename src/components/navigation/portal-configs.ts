import {
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
} from "lucide-react";
import type { NavGroup } from "./types";

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
    title: "Marque",
    items: [
      { href: "/cockpit/brand/identity", label: "Identite", icon: Fingerprint },
      { href: "/cockpit/brand/rtis", label: "RTIS", icon: Shield },
      { href: "/cockpit/brand/rtis/synthese", label: "Synthese", icon: Brain },
      { href: "/cockpit/brand/proposition", label: "Proposition", icon: FileText },
      { href: "/cockpit/brand/guidelines", label: "Guidelines", icon: BookOpen },
      { href: "/cockpit/brand/assets", label: "Assets", icon: Image },
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
  {
    title: "",
    items: [
      { href: "/console", label: "Ecosysteme", icon: Globe },
    ],
  },
  {
    title: "L'Oracle",
    divisionColor: "var(--color-division-oracle)",
    items: [
      { href: "/console/oracle/clients", label: "Clients", icon: Building },
      { href: "/console/oracle/ingestion", label: "Ingestion IA", icon: Brain },
      { href: "/console/oracle/diagnostics", label: "Diagnostics", icon: Stethoscope },
      { href: "/console/oracle/intake", label: "Pipeline Intake", icon: Filter },
      { href: "/console/oracle/boot", label: "Boot Sequence", icon: Rocket },
    ],
  },
  {
    title: "Le Signal",
    divisionColor: "var(--color-division-signal)",
    items: [
      { href: "/console/signal/intelligence", label: "Intelligence", icon: Brain },
      { href: "/console/signal/signals", label: "Signaux", icon: Radio },
      { href: "/console/signal/knowledge", label: "Knowledge Graph", icon: Network },
      { href: "/console/signal/market", label: "Marche", icon: TrendingUp },
      { href: "/console/signal/tarsis", label: "Tarsis", icon: Crosshair },
      { href: "/console/signal/attribution", label: "Attribution", icon: GitBranch },
    ],
  },
  {
    title: "L'Arene",
    divisionColor: "var(--color-division-arene)",
    items: [
      { href: "/console/arene/guild", label: "Guilde", icon: Shield },
      { href: "/console/arene/matching", label: "Matching", icon: Shuffle },
      { href: "/console/arene/orgs", label: "Organisations", icon: Building2 },
      { href: "/console/arene/club", label: "Club", icon: UsersRound },
      { href: "/console/arene/events", label: "Evenements", icon: CalendarDays },
    ],
  },
  {
    title: "La Fusee",
    divisionColor: "var(--color-division-fusee)",
    items: [
      { href: "/console/fusee/missions", label: "Missions", icon: Target },
      { href: "/console/fusee/campaigns", label: "Campagnes", icon: Megaphone },
      { href: "/console/fusee/drivers", label: "Drivers", icon: Layers },
      { href: "/console/fusee/glory", label: "Glory", icon: Trophy },
      { href: "/console/fusee/social", label: "Social", icon: Share2 },
      { href: "/console/fusee/pr", label: "PR", icon: Newspaper },
      { href: "/console/fusee/media", label: "Media", icon: Film },
      { href: "/console/fusee/interventions", label: "Interventions", icon: Zap },
      { href: "/console/fusee/scheduler", label: "Scheduler", icon: Clock },
    ],
  },
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
    ],
  },
  {
    title: "L'Academie",
    divisionColor: "var(--color-division-academie)",
    items: [
      { href: "/console/academie", label: "Vue d'ensemble", icon: GraduationCap },
      { href: "/console/academie/courses", label: "Formations", icon: BookOpen },
      { href: "/console/academie/certifications", label: "Certifications", icon: Award },
      { href: "/console/academie/boutique", label: "Boutique", icon: ShoppingBag },
      { href: "/console/academie/content", label: "Contenu", icon: FileText },
    ],
  },
  {
    title: "Ecosysteme",
    divisionColor: "var(--color-division-oracle)",
    items: [
      { href: "/console/ecosystem", label: "Vue d'ensemble", icon: Globe },
      { href: "/console/ecosystem/operators", label: "Operateurs", icon: Building2 },
      { href: "/console/ecosystem/metrics", label: "Metriques", icon: BarChart3 },
      { href: "/console/ecosystem/scoring", label: "Score /200", icon: Activity },
    ],
  },
  {
    title: "Config",
    items: [
      { href: "/console/config", label: "Parametres", icon: Settings },
      { href: "/console/config/thresholds", label: "Seuils", icon: Radar },
      { href: "/console/config/templates", label: "Templates", icon: Layers },
      { href: "/console/config/system", label: "Systeme", icon: Rocket },
      { href: "/console/config/integrations", label: "Integrations", icon: Plug },
    ],
  },
  {
    title: "",
    items: [
      { href: "/console/messages", label: "Messages", icon: MessageSquare },
    ],
  },
];
