"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  BookOpen,
  CandlestickChart,
  Globe,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  UserRound,
  X,
} from "lucide-react";
import { signOut } from "next-auth/react";

import { LogoMark, Logo } from "@/components/brand/logo";
import { TickerStrip } from "@/components/dashboard/ticker-strip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useUi } from "@/store/ui";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, exact: true },
  { label: "Charts", href: "/dashboard/charts", icon: CandlestickChart },
  { label: "Markets", href: "/dashboard/markets", icon: Globe },
  { label: "Journal", href: "/dashboard/journal", icon: BookOpen },
  { label: "Watchlist", href: "/dashboard/watchlist", icon: ListChecks },
  { label: "Alerts", href: "/dashboard/alerts", icon: Bell },
];

const FOOTER_ITEMS = [
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
  { label: "Account", href: "/dashboard/account", icon: UserRound },
];

interface ShellUser {
  name: string;
  email: string;
  image: string | null;
}

function NavLink({
  item,
  collapsed,
  onNavigate,
}: {
  item: {
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    exact?: boolean;
  };
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
  const Icon = item.icon;

  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200",
        active
          ? "bg-brand-violet/12 text-foreground"
          : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
        collapsed && "justify-center px-0"
      )}
    >
      {active ? (
        <motion.span
          layoutId="nav-indicator"
          className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-gradient-to-b from-brand-blue to-brand-lilac"
          transition={{ type: "spring", stiffness: 400, damping: 34 }}
        />
      ) : null}
      <Icon
        className={cn(
          "size-[18px] shrink-0 transition-colors",
          active ? "text-brand-lilac" : "text-muted-foreground group-hover:text-foreground"
        )}
      />
      {!collapsed ? <span>{item.label}</span> : null}
    </Link>
  );

  if (!collapsed) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

function SidebarContent({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex h-full flex-col">
        <div className={cn("flex h-16 items-center px-4", collapsed && "justify-center px-0")}>
          <Link href="/dashboard" aria-label="ConfluentX dashboard">
            {collapsed ? <LogoMark className="size-7" /> : <Logo markClassName="size-7" />}
          </Link>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.href} item={item} collapsed={collapsed} onNavigate={onNavigate} />
          ))}
        </nav>

        <div className="space-y-1 border-t border-white/5 px-3 py-4">
          {FOOTER_ITEMS.map((item) => (
            <NavLink key={item.href} item={item} collapsed={collapsed} onNavigate={onNavigate} />
          ))}
          <button
            onClick={() => void signOut({ callbackUrl: "/" })}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-all duration-200 hover:bg-destructive/10 hover:text-destructive",
              collapsed && "justify-center px-0"
            )}
          >
            <LogOut className="size-[18px] shrink-0" />
            {!collapsed ? <span>Logout</span> : null}
          </button>
        </div>
      </div>
    </TooltipProvider>
  );
}

export function DashboardShell({
  user,
  children,
}: {
  user: ShellUser;
  children: React.ReactNode;
}) {
  const { sidebarCollapsed, toggleSidebar } = useUi();
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex min-h-dvh bg-background">
      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: sidebarCollapsed ? 68 : 232 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="sticky top-0 z-40 hidden h-dvh shrink-0 border-r border-white/6 bg-surface/60 backdrop-blur-xl lg:block"
      >
        <SidebarContent collapsed={sidebarCollapsed} />
      </motion.aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-y-0 left-0 z-50 w-60 border-r border-white/8 bg-surface lg:hidden"
            >
              <button
                className="absolute right-3 top-5 rounded-lg p-1.5 text-muted-foreground hover:bg-white/5"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                <X className="size-4" />
              </button>
              <SidebarContent collapsed={false} onNavigate={() => setMobileOpen(false)} />
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 border-b border-white/6 bg-background/70 backdrop-blur-xl">
          <div className="flex h-14 items-center gap-3 px-4">
            <Button
              variant="ghost"
              size="icon-sm"
              className="lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="hidden lg:inline-flex"
              onClick={toggleSidebar}
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
            </Button>

            <div className="min-w-0 flex-1 overflow-hidden">
              <TickerStrip />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="rounded-full ring-2 ring-transparent transition-all hover:ring-brand-violet/50 focus:outline-none focus-visible:ring-brand-violet"
                  aria-label="Account menu"
                >
                  <Avatar className="size-8">
                    {user.image ? <AvatarImage src={user.image} alt={user.name} /> : null}
                    <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="text-sm font-medium text-foreground">{user.name}</div>
                  <div className="text-xs font-normal text-muted-foreground">{user.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/account">
                    <UserRound />
                    Account
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings">
                    <Settings />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => void signOut({ callbackUrl: "/" })}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
