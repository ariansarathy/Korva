"use client";

import { useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Sparkles,
  FileText,
  Package,
  Users,
  Settings,
  TrendingUp,
  Search,
  Command,
  ArrowRight,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface PaletteItem {
  id: string;
  label: string;
  section: string;
  icon: ReactNode;
  action: () => void;
  keywords?: string;
}

/* ------------------------------------------------------------------ */
/*  Static nav items                                                    */
/* ------------------------------------------------------------------ */

const navIcon = "h-4 w-4 text-muted";

function buildNavItems(navigate: (href: string) => void): PaletteItem[] {
  return [
    {
      id: "nav-dashboard",
      label: "Dashboard",
      section: "Navigation",
      icon: <LayoutDashboard className={navIcon} />,
      action: () => navigate("/dashboard"),
      keywords: "home overview kpis",
    },
    {
      id: "nav-ask",
      label: "Ask Korva",
      section: "Navigation",
      icon: <Sparkles className={navIcon} />,
      action: () => navigate("/ask"),
      keywords: "ai query question",
    },
    {
      id: "nav-analytics",
      label: "Analytics",
      section: "Navigation",
      icon: <TrendingUp className={navIcon} />,
      action: () => navigate("/analytics"),
      keywords: "charts trends data",
    },
    {
      id: "nav-reports",
      label: "Reports",
      section: "Navigation",
      icon: <FileText className={navIcon} />,
      action: () => navigate("/reports"),
      keywords: "weekly digest",
    },
    {
      id: "nav-products",
      label: "Products",
      section: "Navigation",
      icon: <Package className={navIcon} />,
      action: () => navigate("/products"),
      keywords: "inventory sku",
    },
    {
      id: "nav-customers",
      label: "Customers",
      section: "Navigation",
      icon: <Users className={navIcon} />,
      action: () => navigate("/customers"),
      keywords: "segment vip churned",
    },
    {
      id: "nav-settings",
      label: "Settings",
      section: "Navigation",
      icon: <Settings className={navIcon} />,
      action: () => navigate("/settings"),
      keywords: "account billing team api keys",
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  Search helpers                                                      */
/* ------------------------------------------------------------------ */

interface SearchResult {
  id: string;
  name: string;
  type: "product" | "customer";
}

async function searchEntities(
  query: string
): Promise<PaletteItem[]> {
  if (query.length < 2) return [];

  const items: PaletteItem[] = [];

  try {
    const [productsRes, customersRes] = await Promise.all([
      fetch(`/api/products/paginated?search=${encodeURIComponent(query)}&limit=4`),
      fetch(`/api/customers?search=${encodeURIComponent(query)}&limit=4`),
    ]);

    if (productsRes.ok) {
      const data = await productsRes.json();
      const products: SearchResult[] = (data.products ?? []).map(
        (p: { id: string; title: string }) => ({
          id: p.id,
          name: p.title,
          type: "product" as const,
        })
      );
      items.push(
        ...products.map((p) => ({
          id: `product-${p.id}`,
          label: p.name,
          section: "Products",
          icon: <Package className={navIcon} />,
          action: () => {
            window.location.href = `/products/${p.id}`;
          },
        }))
      );
    }

    if (customersRes.ok) {
      const data = await customersRes.json();
      const customers: SearchResult[] = (data.customers ?? []).map(
        (c: { id: string; first_name: string | null; last_name: string | null }) => ({
          id: c.id,
          name:
            [c.first_name, c.last_name].filter(Boolean).join(" ") || "Anonymous",
          type: "customer" as const,
        })
      );
      items.push(
        ...customers.map((c) => ({
          id: `customer-${c.id}`,
          label: c.name,
          section: "Customers",
          icon: <Users className={navIcon} />,
          action: () => {
            window.location.href = `/customers/${c.id}`;
          },
        }))
      );
    }
  } catch {
    // Silently fail — search is best-effort
  }

  return items;
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchResults, setSearchResults] = useState<PaletteItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const navigate = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router]
  );

  const navItems = buildNavItems(navigate);

  // Filter nav items by query
  const filteredNav = query
    ? navItems.filter((item) => {
        const searchStr =
          `${item.label} ${item.keywords ?? ""}`.toLowerCase();
        return query
          .toLowerCase()
          .split(/\s+/)
          .every((word) => searchStr.includes(word));
      })
    : navItems;

  const allItems = [...filteredNav, ...searchResults];

  // Debounced entity search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      const results = await searchEntities(query);
      setSearchResults(results);
      setIsSearching(false);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Reset selection when items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, searchResults.length]);

  // Keyboard shortcut to open
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setSearchResults([]);
      setSelectedIndex(0);
      // Small delay for portal render
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Keyboard navigation inside palette
  function handleInputKeyDown(e: React.KeyboardEvent) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, allItems.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (allItems[selectedIndex]) {
          allItems[selectedIndex].action();
          setOpen(false);
        }
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        break;
    }
  }

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const selected = listRef.current.querySelector("[data-selected='true']");
    if (selected) {
      selected.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  if (!open) return null;

  // Group items by section
  const grouped: Record<string, PaletteItem[]> = {};
  for (const item of allItems) {
    if (!grouped[item.section]) grouped[item.section] = [];
    grouped[item.section].push(item);
  }

  let runningIndex = 0;

  const portal = (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Palette */}
      <div className="fixed inset-0 z-[101] flex items-start justify-center pt-[20vh]">
        <div className="w-full max-w-lg rounded-xl border border-border bg-surface shadow-2xl">
          {/* Search input */}
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <Search className="h-4 w-4 shrink-0 text-muted" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Search pages, products, customers..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted outline-none"
            />
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted">
              <Command className="h-2.5 w-2.5" />K
            </kbd>
          </div>

          {/* Results */}
          <div ref={listRef} className="max-h-72 overflow-y-auto p-2">
            {allItems.length === 0 ? (
              <div className="px-3 py-8 text-center text-sm text-muted">
                {isSearching
                  ? "Searching..."
                  : query
                    ? "No results found"
                    : "Start typing to search"}
              </div>
            ) : (
              Object.entries(grouped).map(([section, items]) => (
                <div key={section}>
                  <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted">
                    {section}
                  </p>
                  {items.map((item) => {
                    const itemIndex = runningIndex++;
                    const isSelected = itemIndex === selectedIndex;
                    return (
                      <button
                        key={item.id}
                        data-selected={isSelected}
                        onClick={() => {
                          item.action();
                          setOpen(false);
                        }}
                        onMouseEnter={() => setSelectedIndex(itemIndex)}
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                          isSelected
                            ? "bg-primary/10 text-primary"
                            : "text-foreground hover:bg-surface-hover"
                        }`}
                      >
                        {item.icon}
                        <span className="flex-1 truncate text-left">
                          {item.label}
                        </span>
                        {isSelected && (
                          <ArrowRight className="h-3.5 w-3.5 text-primary" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
            {isSearching && allItems.length > 0 && (
              <p className="px-3 py-2 text-center text-xs text-muted">
                Searching for more results...
              </p>
            )}
          </div>

          {/* Footer hint */}
          <div className="flex items-center gap-4 border-t border-border px-4 py-2 text-[10px] text-muted">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-background px-1 py-0.5 font-medium">
                ↑↓
              </kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-background px-1 py-0.5 font-medium">
                ↵
              </kbd>
              Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-background px-1 py-0.5 font-medium">
                esc
              </kbd>
              Close
            </span>
          </div>
        </div>
      </div>
    </>
  );

  return typeof document !== "undefined"
    ? createPortal(portal, document.body)
    : null;
}
