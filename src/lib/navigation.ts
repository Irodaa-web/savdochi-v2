import { ClipboardList, LayoutGrid, LayoutDashboard, MessageSquare, Package, ShoppingCart, Users, Warehouse, type LucideIcon } from "lucide-react";
import type { Dictionary } from "@/i18n/dictionaries/uz";
import type { Role } from "@/lib/auth/token";

export type NavItem = { href: string; label: keyof Dictionary["nav"]; Icon: LucideIcon };

/** Yuqori menyu — har bir rol uchun faqat 3–4 ta asosiy bo'lim. */
export const mainNav: Record<Role, NavItem[]> = {
  buyer: [
    { href: "/catalog", label: "catalog", Icon: LayoutGrid },
    { href: "/orders", label: "orders", Icon: ClipboardList },
    { href: "/stock", label: "stock", Icon: Warehouse },
    { href: "/partners", label: "partners", Icon: Users },
  ],
  seller: [
    { href: "/dashboard", label: "dashboard", Icon: LayoutDashboard },
    { href: "/products", label: "products", Icon: Package },
    { href: "/orders", label: "orders", Icon: ClipboardList },
    { href: "/partners", label: "clients", Icon: Users },
  ],
};

/** Telefondagi pastki tablar — 4 ta. */
export const mobileTabs: Record<Role, NavItem[]> = {
  buyer: [
    { href: "/catalog", label: "catalog", Icon: LayoutGrid },
    { href: "/orders", label: "orders", Icon: ClipboardList },
    { href: "/cart", label: "cart", Icon: ShoppingCart },
    { href: "/chat", label: "chat", Icon: MessageSquare },
  ],
  seller: [
    { href: "/dashboard", label: "dashboard", Icon: LayoutDashboard },
    { href: "/products", label: "products", Icon: Package },
    { href: "/orders", label: "orders", Icon: ClipboardList },
    { href: "/chat", label: "chat", Icon: MessageSquare },
  ],
};

export const homePath: Record<Role, string> = { buyer: "/catalog", seller: "/dashboard" };
