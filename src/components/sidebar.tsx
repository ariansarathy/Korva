"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Sparkles,
  FileText,
  Package,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Bookmark,
  ChevronDown,
  Store,
  Plus,
} from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Ask Korva",
    href: "/ask",
    icon: Sparkles,
  },
  {
    label: "Analytics",
    href: "/analytics",
    icon: TrendingUp,
  },
  {
    label: "Reports",
    href: "/reports",
    icon: FileText,
  },
  {
    label: "Products",
    href: "/products",
    icon: Package,
  },
  {
    label: "Customers",
    href: "/customers",
    icon: Users,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

interface SavedQueryItem {
  id: string;
  name: string;
  question: string;
}

interface StoreInfo {
  id: string;
  name: string;
  platform: string;
}

const PLATFORM_ICONS: Record<string, string> = {
  shopify: "🟢",
  woocommerce: "🟣",
  amazon: "🟠",
};

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [savedQueries, setSavedQueries] = useState<SavedQueryItem[]>([]);
  const [stores, setStores] = useState<StoreInfo[]>([]);
  const [activeStore, setActiveStore] = useState<StoreInfo | null>(null);
  const [showStoreSwitcher, setShowStoreSwitcher] = useState(false);
  const storeSwitcherRef = useRef<HTMLDivElement>(null);

  // Initialize from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("sidebar-collapsed");
    if (stored === "true") {
      setCollapsed(true);
    }
  }, []);

  // Fetch stores
  const fetchStores = useCallback(async () => {
    try {
      const [storesRes, activeRes] = await Promise.all([
        fetch("/api/stores"),
        fetch("/api/stores/active"),
      ]);

      if (storesRes.ok) {
        const data = await storesRes.json();
        setStores(data.stores ?? []);
      }

      if (activeRes.ok) {
        const data = await activeRes.json();
        setActiveStore(data.store ?? null);
      }
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  // Close store switcher on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        storeSwitcherRef.current &&
        !storeSwitcherRef.current.contains(e.target as Node)
      ) {
        setShowStoreSwitcher(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function switchStore(storeId: string) {
    try {
      const res = await fetch("/api/stores/active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store_id: storeId }),
      });
      if (res.ok) {
        const data = await res.json();
        setActiveStore(data.store ?? null);
        setShowStoreSwitcher(false);
        router.refresh();
      }
    } catch {
      // Silently fail
    }
  }

  // Fetch saved queries for sidebar
  const fetchSavedQueries = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/saved-queries");
      if (res.ok) {
        const data = await res.json();
        setSavedQueries((data.queries ?? []).slice(0, 3));
      }
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    fetchSavedQueries();
  }, [fetchSavedQueries]);

  // Persist collapse state
  function handleToggle() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("sidebar-collapsed", String(next));
  }

  return (
    <aside
      className={`flex h-screen flex-col border-r border-border bg-surface transition-all duration-200 ${
        collapsed ? "w-[68px]" : "w-[240px]"
      }`}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-border px-4">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <Image
            src="/logo.png"
            alt="Korva"
            width={32}
            height={32}
            className="rounded-md"
          />
          {!collapsed && (
            <span className="text-lg font-bold text-foreground">Korva</span>
          )}
        </Link>
      </div>

      {/* Store Switcher — only shown when user has 2+ stores */}
      {stores.length >= 2 && (
        <div className="border-b border-border px-3 py-2" ref={storeSwitcherRef}>
          <div className="relative">
            <button
              onClick={() => !collapsed && setShowStoreSwitcher(!showStoreSwitcher)}
              className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-surface-hover ${
                collapsed ? "justify-center" : ""
              }`}
              title={collapsed ? activeStore?.name ?? "Switch store" : undefined}
            >
              <Store className="h-4 w-4 shrink-0 text-muted" />
              {!collapsed && (
                <>
                  <span className="flex-1 truncate text-left text-xs font-medium text-foreground">
                    {activeStore?.name ?? "Select store"}
                  </span>
                  <span className="text-[10px] text-muted">
                    {PLATFORM_ICONS[activeStore?.platform ?? ""] ?? ""}
                  </span>
                  <ChevronDown className="h-3 w-3 shrink-0 text-muted" />
                </>
              )}
            </button>

            {showStoreSwitcher && !collapsed && (
              <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-lg border border-border bg-surface py-1 shadow-lg">
                {stores.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => switchStore(s.id)}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-xs transition-colors hover:bg-surface-hover ${
                      s.id === activeStore?.id
                        ? "font-medium text-primary"
                        : "text-foreground"
                    }`}
                  >
                    <span>{PLATFORM_ICONS[s.platform] ?? "🔵"}</span>
                    <span className="truncate">{s.name}</span>
                  </button>
                ))}
                <div className="border-t border-border mt-1 pt-1">
                  <Link
                    href="/onboarding"
                    className="flex w-full items-center gap-2 px-3 py-2 text-xs text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
                    onClick={() => setShowStoreSwitcher(false)}
                  >
                    <Plus className="h-3 w-3" />
                    Add Store
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          const isAskKorva = item.href === "/ask";

          return (
            <div key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-secondary hover:bg-surface-hover hover:text-foreground"
                } ${collapsed ? "justify-center" : ""}`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>

              {/* Saved queries sub-items under Ask Korva */}
              {isAskKorva && !collapsed && savedQueries.length > 0 && (
                <div className="ml-8 mt-1 space-y-0.5">
                  {savedQueries.map((sq) => (
                    <Link
                      key={sq.id}
                      href={`/ask?q=${encodeURIComponent(sq.question)}`}
                      className="flex items-center gap-2 rounded-md px-2 py-1 text-xs text-muted transition-colors hover:text-foreground hover:bg-surface-hover"
                      title={sq.name}
                    >
                      <Bookmark className="h-3 w-3 shrink-0" />
                      <span className="truncate">{sq.name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-border px-3 py-3">
        <button
          onClick={handleToggle}
          className="flex w-full items-center justify-center rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
