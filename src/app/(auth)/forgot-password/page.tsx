"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Loader2, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!email.trim()) {
      setError("Please enter your email address.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${window.location.origin}/login`,
      }
    );

    if (resetError) {
      setError(resetError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 text-center">
          <Link href="/">
            <Image
              src="/logo.png"
              alt="Korva"
              width={48}
              height={48}
              className="mx-auto mb-4 rounded-lg"
            />
          </Link>
          <h1 className="text-2xl font-bold text-foreground">
            Reset your password
          </h1>
          <p className="mt-1 text-sm text-secondary">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        {success ? (
          <div className="rounded-xl border border-border bg-surface p-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
              <Mail className="h-6 w-6 text-success" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              Check your email
            </h2>
            <p className="mt-2 text-sm text-secondary">
              If an account exists with {email}, you&apos;ll receive a password
              reset link shortly.
            </p>
            <Link
              href="/login"
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary-hover"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
                {error}
              </div>
            )}

            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Send Reset Link
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-muted">
              <Link
                href="/login"
                className="inline-flex items-center gap-1 font-medium text-primary hover:text-primary-hover"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
