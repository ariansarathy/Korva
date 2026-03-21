"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Bell,
  ChevronDown,
  LogOut,
  User,
  CreditCard,
  AlertTriangle,
  Package,
  BarChart3,
  Mail,
  CheckCheck,
  Store,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/shared/theme-toggle";

interface TopBarProps {
  userEmail?: string | null;
  userName?: string | null;
}

interface Notification {
  id: string;
  type: string;
  subject: string | null;
  channel: string;
  status: string;
  is_read: boolean;
  sent_at: string;
}

const periods = [
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "Last 90 days", value: "90d" },
  { label: "Last 12 months", value: "12mo" },
];

const notificationIcons: Record<string, typeof AlertTriangle> = {
  anomaly_alert: AlertTriangle,
  inventory_alert: Package,
  weekly_digest: BarChart3,
  report: Mail,
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function TopBar({ userEmail, userName }: TopBarProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const currentPeriod = searchParams.get("period") ?? "30d";
  const [showPeriodMenu, setShowPeriodMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeStoreName, setActiveStoreName] = useState<string | null>(null);

  const periodRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Fetch active store name
  useEffect(() => {
    async function fetchActiveStore() {
      try {
        const res = await fetch("/api/stores/active");
        if (res.ok) {
          const data = await res.json();
          setActiveStoreName(data.store?.name ?? null);
        }
      } catch {
        // Silently fail
      }
    }
    fetchActiveStore();
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/unread");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications ?? []);
        setUnreadCount(data.notifications?.length ?? 0);
      }
    } catch {
      // Silently fail — notification fetch is non-critical
    }
  }, []);

  // Fetch on mount and every 60 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        periodRef.current &&
        !periodRef.current.contains(event.target as Node)
      ) {
        setShowPeriodMenu(false);
      }
      if (userRef.current && !userRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (
        notifRef.current &&
        !notifRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handlePeriodChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", value);
    router.push(`${pathname}?${params.toString()}`);
    setShowPeriodMenu(false);
  }

  async function handleMarkAllRead() {
    try {
      await fetch("/api/notifications/unread", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      setNotifications([]);
      setUnreadCount(0);
    } catch {
      // Silently fail
    }
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const selectedPeriod = periods.find((p) => p.value === currentPeriod);
  const initials = userName
    ? userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : userEmail
      ? userEmail[0].toUpperCase()
      : "U";

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-surface px-6">
      <div className="flex items-center gap-4">
        {/* Active Store Badge */}
        {activeStoreName && (
          <div className="flex items-center gap-1.5 rounded-lg bg-primary/5 px-2.5 py-1.5 text-xs font-medium text-primary">
            <Store className="h-3.5 w-3.5" />
            <span className="max-w-[120px] truncate">{activeStoreName}</span>
          </div>
        )}

        {/* Period Selector */}
        <div className="relative" ref={periodRef}>
          <button
            onClick={() => setShowPeriodMenu(!showPeriodMenu)}
            className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
          >
            {selectedPeriod?.label ?? "Last 30 days"}
            <ChevronDown className="h-3.5 w-3.5 text-muted" />
          </button>
          {showPeriodMenu && (
            <div className="absolute left-0 top-full mt-1 z-50 w-44 rounded-lg border border-border bg-surface py-1 shadow-lg">
              {periods.map((p) => (
                <button
                  key={p.value}
                  onClick={() => handlePeriodChange(p.value)}
                  className={`flex w-full items-center px-3 py-2 text-sm transition-colors hover:bg-surface-hover ${
                    currentPeriod === p.value
                      ? "font-medium text-primary"
                      : "text-foreground"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative rounded-lg p-2 text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
            aria-label="Notifications"
          >
            <Bell className="h-[18px] w-[18px]" />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-1 z-50 w-80 rounded-lg border border-border bg-surface shadow-lg">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <h3 className="text-sm font-semibold text-foreground">
                  Notifications
                </h3>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary-hover"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <Bell className="mx-auto h-8 w-8 text-muted/50" />
                    <p className="mt-2 text-sm text-muted">
                      No new notifications
                    </p>
                  </div>
                ) : (
                  notifications.map((notif) => {
                    const Icon =
                      notificationIcons[notif.type] ?? Bell;
                    return (
                      <div
                        key={notif.id}
                        className="flex items-start gap-3 border-b border-border/50 px-4 py-3 transition-colors hover:bg-surface-hover last:border-0"
                      >
                        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <Icon className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">
                            {notif.subject ?? notif.type.replace(/_/g, " ")}
                          </p>
                          <p className="text-xs text-muted">
                            {timeAgo(notif.sent_at)} &bull; via{" "}
                            {notif.channel}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* User menu */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-surface-hover"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
              {initials}
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-muted" />
          </button>
          {showUserMenu && (
            <div className="absolute right-0 top-full mt-1 z-50 w-56 rounded-lg border border-border bg-surface py-1 shadow-lg">
              <div className="border-b border-border px-3 py-2">
                <p className="text-sm font-medium text-foreground">
                  {userName || "User"}
                </p>
                <p className="text-xs text-muted">{userEmail}</p>
              </div>
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  router.push("/settings");
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground transition-colors hover:bg-surface-hover"
              >
                <User className="h-4 w-4 text-muted" />
                Account settings
              </button>
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  router.push("/settings?tab=billing");
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground transition-colors hover:bg-surface-hover"
              >
                <CreditCard className="h-4 w-4 text-muted" />
                Billing
              </button>
              <div className="border-t border-border">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-danger transition-colors hover:bg-surface-hover"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
