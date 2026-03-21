import Link from "next/link";
import Image from "next/image";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="Korva" width={32} height={32} className="rounded-md" />
            <span className="text-lg font-bold text-foreground">Korva</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-secondary hover:text-foreground">
              Sign In
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="text-3xl font-bold text-foreground">Terms of Service</h1>
        <p className="mt-2 text-sm text-muted">Last updated: March 2026</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-secondary">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">1. Acceptance of Terms</h2>
            <p>
              By accessing and using Korva (&quot;Service&quot;), you accept and agree to be bound by the terms and
              provisions of this agreement. If you do not agree to these terms, please do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">2. Description of Service</h2>
            <p>
              Korva is an AI-powered e-commerce analytics platform that connects to your online store to provide
              insights, reports, and data analysis. The Service includes data synchronization, AI-powered querying,
              automated reporting, and analytics features.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">3. User Accounts</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials and for all activities
              that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">4. Data Usage</h2>
            <p>
              When you connect your e-commerce store, you grant us permission to access and process your store data
              (orders, products, customers) for the purpose of providing analytics services. We do not sell your data
              to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">5. Billing and Payments</h2>
            <p>
              Paid plans are billed monthly or annually in advance. You may cancel your subscription at any time.
              Refunds are handled according to our refund policy. Usage limits are enforced per billing cycle.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">6. Limitation of Liability</h2>
            <p>
              Korva shall not be liable for any indirect, incidental, special, consequential, or punitive damages
              resulting from your use of or inability to use the Service. Our total liability is limited to the
              amount paid by you in the twelve months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">7. Changes to Terms</h2>
            <p>
              We reserve the right to modify these terms at any time. We will notify users of material changes via
              email or through the Service. Continued use of the Service after changes constitutes acceptance of
              the modified terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">8. Contact</h2>
            <p>
              If you have questions about these Terms, please contact us at support@korva.ai.
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-surface py-8">
        <div className="mx-auto max-w-4xl px-6 text-center text-xs text-muted">
          <div className="flex items-center justify-center gap-4">
            <Link href="/terms" className="hover:text-foreground">Terms</Link>
            <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
          </div>
          <p className="mt-2">&copy; 2026 Korva. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
