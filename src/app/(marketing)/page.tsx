import Link from "next/link";
import Image from "next/image";
import {
  Cloud,
  Shield,
  Code2,
  BarChart3,
  Clock,
  Users,
  Link as LinkIcon,
  Sparkles,
  ChevronRight,
  Check,
} from "lucide-react";
import { Navbar } from "@/components/landing/navbar";
import { TypingDemo } from "@/components/landing/typing-demo";
import { TestimonialsSection } from "@/components/landing/testimonials-section";
import { FAQSection } from "@/components/landing/faq-section";
import { ScrollAnimate } from "@/components/landing/scroll-animate";

const steps = [
  {
    number: 1,
    title: "Connect Your Data",
    description:
      "Link your databases, cloud storage, or SaaS tools in one click with pre-built connectors. OAuth-based — no credentials stored.",
    time: "~30 seconds",
    icon: LinkIcon,
  },
  {
    number: 2,
    title: "AI Analyzes Automatically",
    description:
      "Korva ingests, normalizes, and runs AI-powered analysis — anomaly detection, trend identification, and forecasting — without writing a single line of code.",
    time: "~2 minutes",
    icon: Sparkles,
  },
  {
    number: 3,
    title: "Get Insights & Monetize",
    description:
      "Receive actionable reports, ask questions in plain English, and unlock revenue from your data with AI-generated recommendations.",
    time: "~2 minutes",
    icon: BarChart3,
  },
];

const features = [
  {
    title: "Multi-Cloud Native",
    description:
      "Query across AWS, GCP, and Azure from one interface. No data movement needed.",
    icon: Cloud,
  },
  {
    title: "Enterprise Security",
    description:
      "SOC 2 Type II compliant. AES-256 encryption, row-level security, and full audit trails.",
    icon: Shield,
  },
  {
    title: "SQL, Python & AI",
    description:
      "Run SQL queries, Python notebooks, and AI models side by side on the same data.",
    icon: Code2,
  },
  {
    title: "Auto Reports",
    description:
      "AI-generated weekly reports with plain-English insights delivered to your inbox.",
    icon: BarChart3,
  },
  {
    title: "Real-Time Sync",
    description:
      "Webhook-driven ingestion keeps your analytics warehouse updated in near real-time.",
    icon: Clock,
  },
  {
    title: "Team Collaboration",
    description:
      "Shared dashboards, role-based access, and Slack/email alerts for your whole team.",
    icon: Users,
  },
];

const plans = [
  {
    name: "Starter",
    description:
      "For individuals and small teams getting started with data analytics.",
    price: 49,
    features: [
      "1 connected store",
      "1,000 orders/month",
      "50 AI queries/month",
      "Weekly email reports",
      "Email support",
    ],
    cta: "Start Free Trial",
    popular: false,
  },
  {
    name: "Growth",
    description:
      "For growing teams that need deeper analytics and more power.",
    price: 149,
    features: [
      "3 connected stores",
      "10,000 orders/month",
      "Unlimited AI queries",
      "Daily reports + anomaly alerts",
      "Revenue forecasting",
      "Priority support",
    ],
    cta: "Start Free Trial",
    popular: true,
  },
  {
    name: "Scale",
    description:
      "For enterprises that need full power, API access, and compliance.",
    price: 299,
    features: [
      "Everything in Growth",
      "Unlimited stores & orders",
      "Custom report builder",
      "Full API access",
      "Up to 10 team seats",
      "SOC 2 + SSO + SLA",
    ],
    cta: "Start Free Trial",
    popular: false,
  },
];

const integrations = [
  "Shopify",
  "WooCommerce",
  "Amazon",
  "PostgreSQL",
  "Snowflake",
  "BigQuery",
  "Stripe",
  "Google Analytics",
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Navbar />

      {/* ===== HERO ===== */}
      <section
        className="relative pb-24 pt-36"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% -20%, rgba(139,101,68,0.08) 0%, transparent 70%), linear-gradient(180deg, #FAF8F5 0%, #F5F0EB 100%)",
        }}
      >
        {/* Decorative blurred orbs */}
        <div
          className="pointer-events-none absolute left-1/4 top-20 h-72 w-72 rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, #C4956A 0%, transparent 70%)" }}
        />
        <div
          className="pointer-events-none absolute right-1/4 top-48 h-56 w-56 rounded-full opacity-15 blur-3xl"
          style={{ background: "radial-gradient(circle, #D4A056 0%, transparent 70%)" }}
        />

        <div className="mx-auto max-w-[1200px] px-6">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            {/* Left */}
            <div>
              <ScrollAnimate>
                <div className="mb-5 inline-flex items-center rounded-full bg-primary/8 px-4 py-1.5 text-xs font-semibold tracking-wide text-primary">
                  AI-Powered E-Commerce Analytics
                </div>
              </ScrollAnimate>
              <ScrollAnimate delay={100}>
                <h1 className="text-[3.2rem] font-extrabold leading-[1.12] tracking-tight text-foreground">
                  Your e-commerce data,{" "}
                  <span className="animate-gradient-text bg-gradient-to-r from-primary via-[#C4956A] to-[#D4A056] bg-clip-text text-transparent">
                    finally understood
                  </span>
                </h1>
              </ScrollAnimate>
              <ScrollAnimate delay={200}>
                <p className="mt-5 max-w-lg text-lg leading-relaxed text-secondary">
                  Connect your store, get instant AI-powered insights, and grow
                  faster. No technical expertise required.
                </p>
              </ScrollAnimate>
              <ScrollAnimate delay={300}>
                <div className="mt-8 flex gap-3">
                  <Link
                    href="/signup"
                    className="inline-flex items-center rounded-lg bg-primary px-7 py-3 text-sm font-semibold text-white transition-all hover:bg-primary-hover hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(139,101,68,0.35)]"
                  >
                    Start Free Trial
                  </Link>
                  <a
                    href="#ai-demo"
                    className="inline-flex items-center rounded-lg border border-border px-7 py-3 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
                  >
                    See Demo
                  </a>
                </div>
              </ScrollAnimate>
              <ScrollAnimate delay={400}>
                <div className="mt-10 flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {["#8B6544", "#C4956A", "#10B981", "#D4A056"].map((c, i) => (
                      <div
                        key={i}
                        className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white"
                        style={{ background: c }}
                      >
                        {["S", "A", "M", "R"][i]}
                      </div>
                    ))}
                  </div>
                  <span className="text-sm text-secondary">
                    Trusted by <strong className="text-foreground">2,400+</strong>{" "}
                    data teams worldwide
                  </span>
                </div>
              </ScrollAnimate>
            </div>

            {/* Right — Dashboard mock with floating animation */}
            <ScrollAnimate delay={200}>
              <div className="flex justify-end">
                <div className="animate-float w-full max-w-[520px] overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl animate-pulse-glow">
                  <div className="flex items-center gap-3 border-b border-border bg-surface-hover px-4 py-3">
                    <div className="flex gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#EF4444]" />
                      <span className="h-2.5 w-2.5 rounded-full bg-[#D4A056]" />
                      <span className="h-2.5 w-2.5 rounded-full bg-[#10B981]" />
                    </div>
                    <span className="text-xs font-medium text-muted">
                      Korva Dashboard
                    </span>
                  </div>
                  <div className="p-5">
                    <div className="mb-5 grid grid-cols-3 gap-3">
                      {[
                        { label: "Revenue", value: "$48.2K", change: "+23%" },
                        { label: "Orders", value: "1,284", change: "+18%" },
                        { label: "Avg Order", value: "$37.50", change: "+5%" },
                      ].map((kpi) => (
                        <div
                          key={kpi.label}
                          className="rounded-lg bg-surface-hover p-3"
                        >
                          <p className="text-[10px] font-medium uppercase tracking-wider text-muted">
                            {kpi.label}
                          </p>
                          <p className="mt-1 text-lg font-bold text-foreground">
                            {kpi.value}
                          </p>
                          <p className="text-xs font-semibold text-success">
                            {kpi.change}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="rounded-lg bg-surface-hover p-3">
                      <svg viewBox="0 0 400 120" className="w-full">
                        <defs>
                          <linearGradient
                            id="cg"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#8B6544"
                              stopOpacity="0.25"
                            />
                            <stop
                              offset="100%"
                              stopColor="#8B6544"
                              stopOpacity="0"
                            />
                          </linearGradient>
                        </defs>
                        <path
                          d="M0,90 C30,85 60,70 100,60 C140,50 170,65 200,45 C230,25 260,35 300,20 C340,10 370,15 400,5 L400,120 L0,120 Z"
                          fill="url(#cg)"
                        />
                        <path
                          d="M0,90 C30,85 60,70 100,60 C140,50 170,65 200,45 C230,25 260,35 300,20 C340,10 370,15 400,5"
                          fill="none"
                          stroke="#8B6544"
                          strokeWidth="2.5"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollAnimate>
          </div>
        </div>
      </section>

      {/* ===== INTEGRATIONS TICKER ===== */}
      <section className="border-b border-border py-10 overflow-hidden">
        <p className="mb-5 text-center text-xs font-medium uppercase tracking-widest text-muted">
          Works with your existing stack
        </p>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-background to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-background to-transparent" />
          <div className="animate-ticker flex w-max gap-4">
            {[...integrations, ...integrations].map((name, i) => (
              <span
                key={`${name}-${i}`}
                className="shrink-0 rounded-full border border-border bg-surface px-6 py-2.5 text-sm font-medium text-secondary transition-colors hover:border-primary hover:text-primary"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section id="how-it-works" className="bg-dark py-24">
        <div className="mx-auto max-w-[1200px] px-6">
          <ScrollAnimate>
            <div className="mb-16 text-center">
              <h2 className="text-3xl font-extrabold tracking-tight text-white">
                How It Works
              </h2>
              <p className="mt-3 text-base text-muted">
                Go from zero to insights in under 5 minutes. No infrastructure to
                manage.
              </p>
            </div>
          </ScrollAnimate>
          <div className="flex flex-col items-center gap-6 md:flex-row md:items-start md:justify-center">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <ScrollAnimate key={step.number} delay={i * 150}>
                  <div className="flex items-start gap-0">
                    <div className="relative max-w-[320px] rounded-2xl border border-border-dark bg-dark-card p-8 transition-all hover:-translate-y-1 hover:border-primary hover:shadow-[0_8px_30px_rgba(139,101,68,0.15)]">
                      <div className="absolute -top-3.5 left-7 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                        {step.number}
                      </div>
                      <div className="mb-5 text-primary">
                        <Icon className="h-10 w-10" />
                      </div>
                      <h3 className="mb-3 text-lg font-bold text-white">
                        {step.title}
                      </h3>
                      <p className="mb-5 text-sm leading-relaxed text-muted">
                        {step.description}
                      </p>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
                        <Clock className="h-3 w-3" />
                        {step.time}
                      </span>
                    </div>
                    {i < steps.length - 1 && (
                      <div className="hidden items-center px-4 pt-20 md:flex">
                        <ChevronRight className="h-5 w-5 text-border-dark" />
                      </div>
                    )}
                  </div>
                </ScrollAnimate>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== AI DEMO ===== */}
      <section id="ai-demo" className="py-24">
        <div className="mx-auto max-w-[1200px] px-6">
          <ScrollAnimate>
            <div className="mb-16 text-center">
              <h2 className="text-3xl font-extrabold tracking-tight text-foreground">
                Ask Your Data Anything
              </h2>
              <p className="mt-3 text-base text-secondary">
                Type a question in plain English. Korva translates it to SQL, runs
                it across your clouds, and returns a visual answer in seconds.
              </p>
            </div>
          </ScrollAnimate>
          <ScrollAnimate delay={150}>
            <div className="mx-auto max-w-[900px] overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
              <div className="flex items-center gap-3 border-b border-border bg-surface-hover px-5 py-3.5">
                <div className="flex gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#EF4444]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#D4A056]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#10B981]" />
                </div>
                <span className="text-xs font-medium text-muted">
                  Korva AI Query Engine
                </span>
              </div>
              <div className="p-6">
                <TypingDemo />
              </div>
            </div>
          </ScrollAnimate>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section className="bg-surface py-24">
        <div className="mx-auto max-w-[1200px] px-6">
          <ScrollAnimate>
            <div className="mb-16 text-center">
              <h2 className="text-3xl font-extrabold tracking-tight text-foreground">
                Built for Modern Data Teams
              </h2>
              <p className="mt-3 text-base text-secondary">
                Everything you need to go from raw data to revenue.
              </p>
            </div>
          </ScrollAnimate>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <ScrollAnimate key={feature.title} delay={i * 80}>
                  <div className="h-full rounded-xl border border-border bg-surface p-8 transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-lg">
                    <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/8 text-primary">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h4 className="mb-2 font-bold text-foreground">
                      {feature.title}
                    </h4>
                    <p className="text-sm leading-relaxed text-secondary">
                      {feature.description}
                    </p>
                  </div>
                </ScrollAnimate>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== TESTIMONIALS ===== */}
      <TestimonialsSection />

      {/* ===== PRICING ===== */}
      <section id="pricing" className="py-24">
        <div className="mx-auto max-w-[1200px] px-6">
          <ScrollAnimate>
            <div className="mb-16 text-center">
              <h2 className="text-3xl font-extrabold tracking-tight text-foreground">
                Simple, Transparent Pricing
              </h2>
              <p className="mt-3 text-base text-secondary">
                Start free. Scale as you grow. No hidden fees.
              </p>
            </div>
          </ScrollAnimate>
          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-3">
            {plans.map((plan, i) => (
              <ScrollAnimate key={plan.name} delay={i * 120}>
                <div
                  className={`relative h-full rounded-2xl border p-8 transition-all hover:-translate-y-0.5 ${
                    plan.popular
                      ? "border-2 border-primary shadow-2xl md:scale-[1.03]"
                      : "border-border bg-surface hover:shadow-lg"
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-bold text-white">
                      Most Popular
                    </div>
                  )}
                  <p className="text-lg font-bold text-foreground">{plan.name}</p>
                  <p className="mt-2 text-sm text-secondary">{plan.description}</p>
                  <div className="my-6 flex items-baseline gap-0.5">
                    <span className="text-xl font-bold text-foreground">$</span>
                    <span className="text-5xl font-extrabold tracking-tight text-foreground">
                      {plan.price}
                    </span>
                    <span className="ml-1 text-sm text-muted">/month</span>
                  </div>
                  <Link
                    href="/signup"
                    className={`block w-full rounded-lg py-2.5 text-center text-sm font-semibold transition-colors ${
                      plan.popular
                        ? "bg-primary text-white hover:bg-primary-hover"
                        : "border border-border text-foreground hover:border-primary hover:text-primary"
                    }`}
                  >
                    {plan.cta}
                  </Link>
                  <ul className="mt-6 space-y-3">
                    {plan.features.map((f) => (
                      <li
                        key={f}
                        className="flex items-center gap-2.5 text-sm text-secondary"
                      >
                        <Check className="h-4 w-4 shrink-0 text-success" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </ScrollAnimate>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <FAQSection />

      {/* ===== CTA ===== */}
      <section className="bg-surface py-20">
        <div className="mx-auto max-w-[1200px] px-6">
          <ScrollAnimate>
            <div
              className="relative overflow-hidden rounded-2xl px-12 py-20 text-center"
              style={{
                background:
                  "linear-gradient(135deg, #1C1210 0%, #2D1F17 50%, #3D2B1F 100%)",
              }}
            >
              {/* Decorative glow */}
              <div
                className="pointer-events-none absolute left-1/2 top-0 h-40 w-96 -translate-x-1/2 rounded-full opacity-30 blur-3xl"
                style={{ background: "radial-gradient(circle, #C4956A 0%, transparent 70%)" }}
              />
              <h2 className="relative text-3xl font-extrabold text-white">
                Ready to Unlock Your Data?
              </h2>
              <p className="relative mx-auto mt-4 max-w-lg text-base text-muted">
                Join 2,400+ teams using Korva to turn raw data into revenue. Start
                your free 14-day trial — no credit card required.
              </p>
              <Link
                href="/signup"
                className="relative mt-8 inline-flex items-center rounded-lg bg-primary px-8 py-3.5 text-sm font-semibold text-white transition-all hover:bg-primary-hover hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(139,101,68,0.4)]"
              >
                Get Started Free
              </Link>
            </div>
          </ScrollAnimate>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-border-dark bg-dark py-16">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="mb-12 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2 lg:col-span-1">
              <Image
                src="/logo.png"
                alt="Korva AI"
                width={48}
                height={48}
                className="mb-4 rounded-lg"
              />
              <p className="max-w-[280px] text-sm leading-relaxed text-muted">
                AI-powered analytics for e-commerce businesses. Connect, analyze,
                and grow.
              </p>
            </div>
            {[
              {
                title: "Product",
                links: [
                  { label: "How It Works", href: "#how-it-works" },
                  { label: "AI Demo", href: "#ai-demo" },
                  { label: "Pricing", href: "#pricing" },
                  { label: "Documentation", href: "#" },
                ],
              },
              {
                title: "Company",
                links: [
                  { label: "About", href: "#" },
                  { label: "Blog", href: "#" },
                  { label: "Careers", href: "#" },
                  { label: "Contact", href: "#" },
                ],
              },
              {
                title: "Legal",
                links: [
                  { label: "Privacy Policy", href: "#" },
                  { label: "Terms of Service", href: "#" },
                  { label: "Security", href: "#" },
                  { label: "GDPR", href: "#" },
                ],
              },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-white">
                  {col.title}
                </h4>
                <ul className="space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="text-sm text-muted transition-colors hover:text-primary"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-border-dark pt-8 text-center">
            <p className="text-xs text-muted">
              &copy; 2026 Korva AI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
