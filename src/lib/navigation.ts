import { Apple, BadgeCheck, Ban, BrickWall, Building2, ChartColumn, CircleCheck, CircleDot, CircleX, ClipboardList, Cpu, CreditCard, Crown, CupSoda, FileSpreadsheet, Heart, Home, LayoutDashboard, LayoutGrid, LifeBuoy, List, ListChecks, type LucideIcon, MessageSquare, Package, PackageCheck, PackagePlus, ScrollText, Search, Shapes, ShoppingCart, Sparkles, SprayCan, Store, Truck, Users, Wallet, Warehouse } from "lucide-react";
import type { Dictionary } from "@/i18n/dictionaries/uz";
import type { Role } from "@/lib/auth/token";
import type { CategoryCode } from "@/lib/catalog";
import type { OrderStatus } from "@/lib/orders";

/** Ichki sahifaga havola. `hint` bo'lsa — katta ko'rinishda (belgi + nom + izoh), bo'lmasa ixcham. */
export type NavLink = { href: string; Icon: LucideIcon; label: (t: Dictionary) => string; hint?: (t: Dictionary) => string };
export type NavSection = { title: (t: Dictionary) => string; links: NavLink[]; columns?: 1 | 2 };
export type NavItem = { href: string; label: keyof Dictionary["nav"]; Icon: LucideIcon; menu?: NavSection[] };

const STATUS_ICONS: Record<OrderStatus, LucideIcon> = { new: Sparkles, confirmed: CircleCheck, shipped: Truck, delivered: PackageCheck, cancelled: CircleX };
export const CATEGORY_ICONS: Record<CategoryCode, LucideIcon> = { food: Apple, drinks: CupSoda, household: SprayCan, construction: BrickWall, electronics: Cpu, other: Shapes };

const orderStatuses: NavSection = {
  title: (t) => t.navMenu.byStatus,
  columns: 2,
  links: [
    { href: "/orders?status=open", Icon: CircleDot, label: (t) => t.orders.open },
    ...(Object.keys(STATUS_ICONS) as OrderStatus[]).map((s) => ({ href: `/orders?status=${s}`, Icon: STATUS_ICONS[s], label: (t: Dictionary) => t.orderStatus[s] })),
    { href: "/orders", Icon: List, label: (t) => t.catalog.all },
  ],
};

const debts: NavLink = { href: "/debts", Icon: Wallet, label: (t) => t.header.debts, hint: (t) => t.navMenu.debtsHint };
const chat: NavLink = { href: "/chat", Icon: MessageSquare, label: (t) => t.nav.chat, hint: (t) => t.navMenu.chatHint };

/** Yuqori menyu — har bir rol uchun 3–4 ta asosiy bo'lim; ichki sahifalar ochiladigan menyuda. */
export const mainNav: Record<Role, NavItem[]> = {
  buyer: [
    {
      href: "/catalog",
      label: "catalog",
      Icon: LayoutGrid,
      menu: [
        {
          title: (t) => t.navMenu.views,
          links: [
            { href: "/catalog", Icon: Building2, label: (t) => t.navMenu.companies, hint: (t) => t.navMenu.companiesHint },
            { href: "/catalog?view=products", Icon: LayoutGrid, label: (t) => t.navMenu.products, hint: (t) => t.navMenu.productsHint },
            { href: "/favorites", Icon: Heart, label: (t) => t.favorites.title, hint: (t) => t.navMenu.favoritesHint },
          ],
        },
        {
          title: (t) => t.navMenu.categories,
          columns: 2,
          links: (Object.keys(CATEGORY_ICONS) as CategoryCode[]).map((c) => ({ href: `/catalog?category=${c}`, Icon: CATEGORY_ICONS[c], label: (t: Dictionary) => t.categories[c] })),
        },
      ],
    },
    {
      href: "/orders",
      label: "orders",
      Icon: ClipboardList,
      menu: [
        orderStatuses,
        {
          title: (t) => t.navMenu.shopping,
          links: [{ href: "/cart", Icon: ShoppingCart, label: (t) => t.nav.cart, hint: (t) => t.navMenu.cartHint }, debts],
        },
      ],
    },
    { href: "/stock", label: "stock", Icon: Warehouse },
    {
      href: "/partners",
      label: "partners",
      Icon: Users,
      menu: [
        {
          title: (t) => t.navMenu.people,
          links: [
            { href: "/partners", Icon: Users, label: (t) => t.nav.partners, hint: (t) => t.navMenu.partnersHint },
            { href: "/catalog", Icon: Search, label: (t) => t.navMenu.findSuppliers, hint: (t) => t.navMenu.findSuppliersHint },
            debts,
            chat,
          ],
        },
      ],
    },
  ],
  seller: [
    {
      href: "/dashboard",
      label: "dashboard",
      Icon: LayoutDashboard,
      menu: [
        {
          title: (t) => t.navMenu.report,
          links: [
            { href: "/dashboard?days=7", Icon: ChartColumn, label: (t) => t.navMenu.days7, hint: (t) => t.navMenu.reportHint },
            { href: "/dashboard?days=30", Icon: ChartColumn, label: (t) => t.navMenu.days30, hint: (t) => t.navMenu.reportHint },
            { href: "/dashboard?days=90", Icon: ChartColumn, label: (t) => t.navMenu.days90, hint: (t) => t.navMenu.reportHint },
          ],
        },
        {
          title: (t) => t.navMenu.money,
          links: [debts, { href: "/profile#online-pay", Icon: CreditCard, label: (t) => t.header.payments, hint: (t) => t.navMenu.paymentsHint }],
        },
      ],
    },
    {
      href: "/products",
      label: "products",
      Icon: Package,
      menu: [
        {
          title: (t) => t.navMenu.manage,
          links: [
            { href: "/products", Icon: Package, label: (t) => t.navMenu.allProducts, hint: (t) => t.navMenu.allProductsHint },
            { href: "/products/new", Icon: PackagePlus, label: (t) => t.products.add, hint: (t) => t.navMenu.newProductHint },
            { href: "/products/import", Icon: FileSpreadsheet, label: (t) => t.products.importButton, hint: (t) => t.navMenu.importHint },
          ],
        },
      ],
    },
    { href: "/orders", label: "orders", Icon: ClipboardList, menu: [orderStatuses] },
    {
      href: "/partners",
      label: "clients",
      Icon: Users,
      menu: [
        {
          title: (t) => t.navMenu.people,
          links: [{ href: "/partners", Icon: Users, label: (t) => t.nav.clients, hint: (t) => t.navMenu.clientsHint }, debts, chat],
        },
      ],
    },
  ],
};

/** Sidebar bandi: belgi, nom, raqamli belgi (savat/chat/buyurtmalar) va ochiladigan ichki sahifalar. */
export type SideItem = { href: string; Icon: LucideIcon; label: (t: Dictionary) => string; badge?: "cart" | "chats" | "orders" | "tickets"; children?: NavLink[]; exact?: boolean };
export type SideGroup = { title: (t: Dictionary) => string; items: SideItem[] };

const menuLinks = (role: Role, href: string): NavLink[] => mainNav[role].find((i) => i.href === href)?.menu?.flatMap((s) => s.links) ?? [];

/**
 * Sidebar: barcha bo'limlar guruhlarga ajratilgan — foydalanuvchi platformaning hamma imkoniyatini bir joyda ko'radi.
 * Ichki sahifalar yuqori menyudagi bilan bir xil (mainNav), shuning uchun ro'yxat bitta joyda yuritiladi.
 */
export const sidebarNav: Record<Role, SideGroup[]> = {
  seller: [
    {
      title: (t) => t.navMenu.groupMain,
      items: [
        { href: "/dashboard", Icon: LayoutDashboard, label: (t) => t.nav.dashboard, children: menuLinks("seller", "/dashboard").filter((l) => l.href.startsWith("/dashboard")) },
        { href: "/analytics", Icon: ChartColumn, label: (t) => t.navMenu.analytics },
        { href: "/orders", Icon: ClipboardList, label: (t) => t.nav.orders, badge: "orders" }, // holat filtrlari buyurtmalar sahifasida
        { href: "/products", Icon: Package, label: (t) => t.nav.products, children: menuLinks("seller", "/products") },
      ],
    },
    {
      title: (t) => t.navMenu.groupClients,
      items: [
        { href: "/partners", Icon: Users, label: (t) => t.nav.clients },
        { href: "/debts", Icon: Wallet, label: (t) => t.header.debts },
        { href: "/profile#online-pay", Icon: CreditCard, label: (t) => t.header.payments },
        { href: "/billing", Icon: Crown, label: (t) => t.plans.title },
      ],
    },
    {
      title: (t) => t.navMenu.groupMarket,
      items: [
        { href: "/catalog", Icon: LayoutGrid, label: (t) => t.nav.catalog },
        { href: "/chat", Icon: MessageSquare, label: (t) => t.nav.chat, badge: "chats" },
      ],
    },
  ],
  buyer: [
    {
      title: (t) => t.navMenu.groupMain,
      items: [
        { href: "/", Icon: Home, label: (t) => t.nav.dashboard },
        // Katalog — oddiy havola: kompaniya/mahsulot ko'rinishi va kategoriyalar katalog sahifasining o'zida tanlanadi.
        { href: "/catalog", Icon: LayoutGrid, label: (t) => t.nav.catalog },
        { href: "/cart", Icon: ShoppingCart, label: (t) => t.nav.cart, badge: "cart" },
        { href: "/orders", Icon: ClipboardList, label: (t) => t.nav.orders, badge: "orders" }, // holat filtrlari buyurtmalar sahifasida
        { href: "/lists", Icon: ListChecks, label: (t) => t.navMenu.lists },
      ],
    },
    {
      title: (t) => t.navMenu.groupStock,
      items: [
        { href: "/stock", Icon: Warehouse, label: (t) => t.nav.stock },
        { href: "/analytics", Icon: ChartColumn, label: (t) => t.navMenu.spending },
        { href: "/debts", Icon: Wallet, label: (t) => t.header.debts },
        { href: "/favorites", Icon: Heart, label: (t) => t.favorites.title },
      ],
    },
    {
      title: (t) => t.navMenu.groupContact,
      items: [
        { href: "/partners", Icon: Users, label: (t) => t.nav.partners },
        { href: "/chat", Icon: MessageSquare, label: (t) => t.nav.chat, badge: "chats" },
      ],
    },
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

/** Administrator menyusi: faqat boshqaruv (admin savdo qilmaydi). */
export const adminNav: SideGroup[] = [
  {
    title: (t) => t.adminNav.group,
    items: [
      { href: "/admin", Icon: LayoutDashboard, label: (t) => t.adminNav.overview, exact: true },
      {
        href: "/admin/users",
        Icon: Users,
        label: (t) => t.adminNav.users,
        children: [
          { href: "/admin/users?role=seller", Icon: Building2, label: (t) => t.admin.sellers },
          { href: "/admin/users?role=buyer", Icon: Store, label: (t) => t.admin.buyers },
          { href: "/admin/users?status=pending", Icon: BadgeCheck, label: (t) => t.admin.pending },
          { href: "/admin/users?status=blocked", Icon: Ban, label: (t) => t.admin.blocked },
        ],
      },
      { href: "/admin/products", Icon: Package, label: (t) => t.adminNav.products },
      { href: "/admin/orders", Icon: ClipboardList, label: (t) => t.adminNav.orders },
      { href: "/admin/tickets", Icon: LifeBuoy, label: (t) => t.adminNav.tickets, badge: "tickets" },
      { href: "/admin/audit", Icon: ScrollText, label: (t) => t.adminNav.audit },
    ],
  },
];

/** Telefondagi pastki panel — administrator uchun. */
export const adminTabs: { href: string; Icon: LucideIcon; label: (t: Dictionary) => string; badge?: "tickets" }[] = [
  { href: "/admin", Icon: LayoutDashboard, label: (t) => t.adminNav.overview },
  { href: "/admin/users", Icon: Users, label: (t) => t.adminNav.users },
  { href: "/admin/tickets", Icon: LifeBuoy, label: (t) => t.adminNav.tickets, badge: "tickets" },
  { href: "/admin/audit", Icon: ScrollText, label: (t) => t.adminNav.audit },
];
