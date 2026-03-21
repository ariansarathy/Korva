"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 border-b border-border/50 backdrop-blur-xl transition-shadow ${
        scrolled ? "shadow-sm" : ""
      }`}
      style={{ background: "rgba(250, 248, 245, 0.85)" }}
    >
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6">
        <Link href="/" className="flex items-center">
          <Image
            src="/logo.png"
            alt="Korva AI"
            width={44}
            height={44}
            className="rounded-md"
          />
        </Link>

        {/* Desktop Nav */}
        <ul className="hidden items-center gap-8 md:flex">
          <li>
            <a
              href="#how-it-works"
              className="text-sm font-medium text-secondary transition-colors hover:text-foreground"
            >
              How It Works
            </a>
          </li>
          <li>
            <a
              href="#ai-demo"
              className="text-sm font-medium text-secondary transition-colors hover:text-foreground"
            >
              AI Demo
            </a>
          </li>
          <li>
            <a
              href="#pricing"
              className="text-sm font-medium text-secondary transition-colors hover:text-foreground"
            >
              Pricing
            </a>
          </li>
        </ul>

        <div className="hidden items-center gap-4 md:flex">
          <Link
            href="/login"
            className="text-sm font-medium text-secondary transition-colors hover:text-primary"
          >
            Log In
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            Get Started
          </Link>
        </div>

        {/* Mobile Toggle */}
        <button
          className="md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? (
            <X className="h-5 w-5 text-foreground" />
          ) : (
            <Menu className="h-5 w-5 text-foreground" />
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="border-t border-border bg-surface px-6 py-4 md:hidden">
          <ul className="space-y-3">
            <li>
              <a
                href="#how-it-works"
                className="block text-sm font-medium text-foreground"
                onClick={() => setMobileOpen(false)}
              >
                How It Works
              </a>
            </li>
            <li>
              <a
                href="#ai-demo"
                className="block text-sm font-medium text-foreground"
                onClick={() => setMobileOpen(false)}
              >
                AI Demo
              </a>
            </li>
            <li>
              <a
                href="#pricing"
                className="block text-sm font-medium text-foreground"
                onClick={() => setMobileOpen(false)}
              >
                Pricing
              </a>
            </li>
          </ul>
          <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4">
            <Link href="/login" className="text-sm font-medium text-foreground">
              Log In
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-primary px-5 py-2.5 text-center text-sm font-semibold text-white"
            >
              Get Started
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
