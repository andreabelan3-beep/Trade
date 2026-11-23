import {
  LayoutDashboard,
  Users,
  Package,
  Tags,
  Truck,
  ClipboardList,
  FileText,
  Warehouse,
  CalendarClock,
  BarChart3,
  Settings,
  type LucideIcon,
} from "lucide-react";
import type { Permessi } from "@/lib/session";

export type NavItem = {
  to:
    | "/cruscotto"
    | "/ddt"
    | "/ordini"
    | "/offerte"
    | "/magazzino"
    | "/articoli"
    | "/listini"
    | "/anagrafiche"
    | "/scadenzario"
    | "/analisi"
    | "/impostazioni";
  label: string;
  icon: LucideIcon;
  visible?: (p: Permessi) => boolean;
};

const documenti = (p: Permessi) => p.gestire_vendite || p.gestire_acquisti || p.gestire_magazzino;

export const NAV: NavItem[] = [
  { to: "/cruscotto", label: "Cruscotto", icon: LayoutDashboard },
  { to: "/ddt", label: "DDT", icon: Truck, visible: documenti },
  { to: "/ordini", label: "Ordini", icon: ClipboardList, visible: documenti },
  { to: "/offerte", label: "Offerte", icon: FileText, visible: (p) => p.gestire_vendite },
  { to: "/magazzino", label: "Magazzino", icon: Warehouse },
  { to: "/articoli", label: "Articoli", icon: Package },
  { to: "/listini", label: "Listini", icon: Tags },
  { to: "/anagrafiche", label: "Clienti e fornitori", icon: Users },
  { to: "/scadenzario", label: "Scadenzario", icon: CalendarClock, visible: (p) => p.vedere_scadenzario },
  { to: "/analisi", label: "Analisi", icon: BarChart3, visible: (p) => p.vedere_analisi },
  { to: "/impostazioni", label: "Impostazioni", icon: Settings },
];

/** Nella barra in basso del telefono; il resto sotto "Altro". */
export const MOBILE_MAIN: NavItem["to"][] = ["/cruscotto", "/ddt", "/ordini", "/magazzino"];
