"use client";

import { useState, useEffect, type ReactNode } from "react";
import { Lock, ArrowRight } from "lucide-react";
import type { Plan } from "@/lib/supabase/types";
import type { Feature } from "@/lib/utils/permissions";

interface PlanGateProps {
  requiredPlan: Plan;
  feature: Feature;
  featureLabel?: string;
  children: ReactNode;
}

const PLAN_LABELS: Record<Plan, string> = {
  free: "Free",
  starter: "Starter",
  growth: "Growth",
  scale: "Scale",
};

/**
 * Wraps children and shows an upgrade prompt if the user's plan is insufficient.
 * Fetches the user's plan client-side from the subscription check endpoint.
 */
export function PlanGate({
  requiredPlan,
  feature,
  featureLabel,
  children,
}: PlanGateProps) {
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkAccess() {
      try {
        const res = await fetch(
          `/api/plan-check?feature=${encodeURIComponent(feature)}`
        );
        if (res.ok) {
          const data = await res.json();
          setAllowed(data.allowed);
        } else {
          // If the endpoint doesn't exist or errors, allow by default
          setAllowed(true);
        }
      } catch {
        setAllowed(true);
      }
    }
    checkAccess();
  }, [feature]);

  // Loading state — show nothing while checking
  if (allowed === null) {
    return null;
  }

  // Access granted
  if (allowed) {
    return <>{children}</>;
  }

  // Access denied — show upgrade prompt
  const label = featureLabel ?? feature.replace(/_/g, " ");

  return (
    <div className="rounded-xl border-2 border-dashed border-border bg-surface p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
        <Lock className="h-6 w-6 text-primary" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-foreground capitalize">
        {label}
      </h3>
      <p className="mt-2 text-sm text-muted">
        This feature requires the{" "}
        <span className="font-semibold text-primary">
          {PLAN_LABELS[requiredPlan]}
        </span>{" "}
        plan or higher. Upgrade to unlock {label.toLowerCase()} and more.
      </p>
      <a
        href="/settings?tab=billing"
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
      >
        Upgrade Plan
        <ArrowRight className="h-4 w-4" />
      </a>
    </div>
  );
}
