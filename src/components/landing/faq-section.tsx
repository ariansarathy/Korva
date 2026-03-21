"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "How does the 14-day free trial work?",
    answer:
      "Sign up with your email, connect your first store, and get full access to all Growth plan features for 14 days. No credit card required. At the end of the trial, choose the plan that fits your needs or downgrade to the free tier.",
  },
  {
    question: "What e-commerce platforms do you support?",
    answer:
      "We currently support Shopify, WooCommerce, and Amazon. Each integration uses OAuth, so you never share your store credentials with us. More platforms are added regularly based on customer demand.",
  },
  {
    question: "Is my data secure?",
    answer:
      "Absolutely. All data is encrypted at rest (AES-256) and in transit (TLS 1.3). We use row-level security in our database so each tenant can only access their own data. Our infrastructure runs on SOC 2 Type II-compliant providers.",
  },
  {
    question: "How does the AI query engine work?",
    answer:
      "Type a question in plain English like 'What were my top-selling products last month?' Korva translates your question to a database query, runs it against your data, and returns the answer with charts and tables — no SQL knowledge needed.",
  },
  {
    question: "Can I invite my team?",
    answer:
      "Yes! The Scale plan supports up to 10 team seats with role-based access control. Invite team members by email, assign viewer or editor roles, and collaborate on dashboards and reports.",
  },
  {
    question: "What happens if I exceed my plan limits?",
    answer:
      "We'll notify you when you're approaching your order or query limits. You won't lose any data — we simply pause new imports until the next billing cycle or you upgrade your plan.",
  },
  {
    question: "Do you offer custom enterprise plans?",
    answer:
      "Yes. For teams that need custom integrations, dedicated support, SLAs, or volume pricing, reach out to our sales team and we'll build a plan that fits your requirements.",
  },
  {
    question: "Can I export my data?",
    answer:
      "You can export dashboards, reports, and raw data as CSV or PDF at any time. Your data is yours — we never lock you in. The data export feature is available on all plans.",
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="py-24">
      <div className="mx-auto max-w-[800px] px-6">
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground">
            Frequently Asked Questions
          </h2>
          <p className="mt-3 text-base text-secondary">
            Everything you need to know about Korva.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className="rounded-xl border border-border bg-surface transition-shadow hover:shadow-sm"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="flex w-full items-center justify-between px-6 py-4 text-left"
                >
                  <span className="pr-4 text-sm font-semibold text-foreground">
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-muted transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <div
                  className={`overflow-hidden transition-all duration-200 ${
                    isOpen ? "max-h-96 pb-4" : "max-h-0"
                  }`}
                >
                  <p className="px-6 text-sm leading-relaxed text-secondary">
                    {faq.answer}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
