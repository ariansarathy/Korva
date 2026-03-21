import Link from "next/link";
import Image from "next/image";

export default function PrivacyPage() {
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
        <h1 className="text-3xl font-bold text-foreground">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted">Last updated: March 2026</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-secondary">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">1. Information We Collect</h2>
            <p>
              We collect information you provide directly (name, email, payment information) and data from your
              connected e-commerce platforms (orders, products, customer data). We also collect usage data such as
              pages visited, features used, and AI queries made.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">2. How We Use Your Information</h2>
            <p>
              We use your information to provide and improve our analytics services, generate insights and reports,
              process payments, send notifications you&apos;ve opted into, and communicate about your account.
              Store data is processed solely for analytics purposes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">3. Data Security</h2>
            <p>
              We implement industry-standard security measures to protect your data. Store access tokens are encrypted
              at rest. Customer email addresses are hashed before storage. All data is transmitted over encrypted
              connections (TLS/SSL).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">4. Data Sharing</h2>
            <p>
              We do not sell your personal or business data to third parties. We may share data with service providers
              who assist in operating our platform (payment processors, email services, hosting providers), subject
              to confidentiality agreements.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">5. AI Processing</h2>
            <p>
              When you use our AI query feature, your questions and relevant store data are processed by our AI
              provider (Anthropic) to generate responses. We do not use your data to train AI models. AI queries
              and responses are logged for debugging and improving the service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">6. Data Retention</h2>
            <p>
              We retain your data for as long as your account is active. When you delete your account, we remove
              all associated data within 30 days. Aggregated, anonymized analytics may be retained for service
              improvement purposes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">7. Your Rights</h2>
            <p>
              You have the right to access, correct, or delete your personal data. You can export your data at any
              time through the Settings page. You may disconnect your store and revoke our access to your platform
              data at any time.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">8. Cookies</h2>
            <p>
              We use essential cookies for authentication and session management. We do not use third-party tracking
              cookies. You can manage cookie preferences through your browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">9. Contact</h2>
            <p>
              For privacy-related inquiries, contact us at privacy@korva.ai.
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
