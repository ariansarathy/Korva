"use client";

import { useState, useEffect, useRef } from "react";
import { Sparkles } from "lucide-react";

const QUERY = "Show me revenue breakdown by pricing tier for the last 6 months";

export function TypingDemo() {
  const [displayText, setDisplayText] = useState("");
  const [showResponse, setShowResponse] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasStarted) {
          setHasStarted(true);
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, [hasStarted]);

  useEffect(() => {
    if (!hasStarted) return;

    let idx = 0;
    const timer = setInterval(() => {
      if (idx < QUERY.length) {
        setDisplayText(QUERY.slice(0, idx + 1));
        idx++;
      } else {
        clearInterval(timer);
        setTimeout(() => setShowResponse(true), 400);
      }
    }, 35);

    return () => clearInterval(timer);
  }, [hasStarted]);

  return (
    <div ref={sectionRef}>
      {/* Query Bar */}
      <div className="mb-6 flex items-center gap-3 rounded-xl border border-border bg-surface-hover px-5 py-3.5">
        <Sparkles className="h-5 w-5 shrink-0 text-primary" />
        <span className="text-sm font-medium text-foreground">{displayText}</span>
        <span className="animate-pulse text-primary">|</span>
      </div>

      {/* Response */}
      <div
        className={`space-y-6 transition-all duration-500 ${
          showResponse
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-3"
        }`}
      >
        {/* AI Text */}
        <div className="flex gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-[#C4956A] text-xs font-bold text-white">
            AI
          </div>
          <div className="text-sm leading-relaxed text-foreground">
            <p>
              <strong>Revenue grew 34% month-over-month</strong>, driven
              primarily by the <em>Enterprise</em> tier which saw a 52%
              increase. The <em>Growth</em> tier remained stable (+8%), while{" "}
              <em>Starter</em> declined slightly (-3%).
            </p>
            <div className="mt-3 rounded-lg border-l-[3px] border-primary bg-primary/5 px-3 py-2.5 text-[13px] text-primary">
              <strong>Recommendation:</strong> Consider expanding the Enterprise
              sales team — this segment shows the highest growth velocity and LTV.
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="rounded-xl border border-border bg-surface-hover p-5">
          <p className="mb-4 text-xs font-semibold text-foreground">
            Monthly Revenue by Tier
          </p>
          <div className="flex items-end gap-3" style={{ height: 160 }}>
            {[
              { month: "Jan", starter: 25, growth: 30, enterprise: 15 },
              { month: "Feb", starter: 27, growth: 32, enterprise: 20 },
              { month: "Mar", starter: 24, growth: 35, enterprise: 28 },
              { month: "Apr", starter: 26, growth: 33, enterprise: 35 },
              { month: "May", starter: 23, growth: 36, enterprise: 45 },
              { month: "Jun", starter: 22, growth: 38, enterprise: 58 },
            ].map((d) => (
              <div key={d.month} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex w-full max-w-[40px] flex-col-reverse gap-[2px]">
                  <div
                    className="w-full rounded-sm bg-muted"
                    style={{ height: `${d.starter * 1.3}px` }}
                  />
                  <div
                    className="w-full rounded-sm bg-[#C4956A]"
                    style={{ height: `${d.growth * 1.3}px` }}
                  />
                  <div
                    className={`w-full rounded-t-sm ${
                      d.month === "Jun"
                        ? "bg-gradient-to-b from-primary to-[#6E4F35] shadow-[0_0_12px_rgba(139,101,68,0.3)]"
                        : "bg-primary"
                    }`}
                    style={{ height: `${d.enterprise * 1.3}px` }}
                  />
                </div>
                <span className="text-[11px] text-muted">{d.month}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-center gap-5">
            <span className="flex items-center gap-1.5 text-[11px] text-muted">
              <span className="h-2.5 w-2.5 rounded-sm bg-muted" /> Starter
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-muted">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#C4956A]" /> Growth
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-muted">
              <span className="h-2.5 w-2.5 rounded-sm bg-primary" /> Enterprise
            </span>
          </div>
        </div>

        {/* SQL */}
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="flex items-center justify-between border-b border-border bg-surface-hover px-4 py-2">
            <span className="text-xs font-semibold text-muted">
              Generated SQL
            </span>
            <button className="rounded-md border border-border px-2.5 py-1 text-[11px] font-medium text-muted transition-colors hover:border-primary hover:text-primary">
              Copy
            </button>
          </div>
          <pre className="overflow-x-auto bg-dark p-4">
            <code className="font-mono text-xs leading-relaxed text-[#e2e8f0]">
{`SELECT
  DATE_TRUNC('month', created_at) AS month,
  pricing_tier,
  SUM(revenue) AS total_revenue
FROM subscriptions
WHERE created_at >= NOW() - INTERVAL '6 months'
GROUP BY month, pricing_tier
ORDER BY month ASC;`}
            </code>
          </pre>
        </div>
      </div>
    </div>
  );
}
