"use client";

import { Star } from "lucide-react";
import { ScrollAnimate } from "@/components/landing/scroll-animate";

const testimonials = [
  {
    quote:
      "Korva replaced three different analytics tools we were paying for. The AI query engine alone saves our team hours every week.",
    name: "Sarah Chen",
    role: "Head of Growth",
    company: "NovaBrand Co.",
  },
  {
    quote:
      "We connected our Shopify store and had actionable insights within minutes. The anomaly alerts caught a pricing error that would have cost us thousands.",
    name: "Marcus Johnson",
    role: "Founder & CEO",
    company: "UrbanThread",
  },
  {
    quote:
      "The weekly AI-generated reports are a game changer. Our entire team understands the data now, not just the analysts.",
    name: "Emily Rodriguez",
    role: "VP of Operations",
    company: "FreshCart",
  },
];

export function TestimonialsSection() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-[1200px] px-6">
        <ScrollAnimate>
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground">
              Loved by Data-Driven Teams
            </h2>
            <p className="mt-3 text-base text-secondary">
              See what our customers have to say about Korva.
            </p>
          </div>
        </ScrollAnimate>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <ScrollAnimate key={t.name} delay={i * 120}>
              <div className="h-full rounded-2xl border border-border bg-surface p-8 transition-all hover:-translate-y-0.5 hover:shadow-lg">
                {/* Stars */}
                <div className="mb-4 flex gap-1">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star
                      key={j}
                      className="h-4 w-4 fill-warning text-warning"
                    />
                  ))}
                </div>

                {/* Quote */}
                <p className="mb-6 text-sm leading-relaxed text-secondary">
                  &ldquo;{t.quote}&rdquo;
                </p>

                {/* Author */}
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {t.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {t.name}
                    </p>
                    <p className="text-xs text-muted">
                      {t.role}, {t.company}
                    </p>
                  </div>
                </div>
              </div>
            </ScrollAnimate>
          ))}
        </div>
      </div>
    </section>
  );
}
