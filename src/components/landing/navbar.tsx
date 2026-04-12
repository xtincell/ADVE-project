"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Rocket, Menu, X } from "lucide-react";
import { GlowButton } from "./shared/glow-button";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Methode", href: "#methode" },
  { label: "Score ADVE", href: "#score" },
  { label: "NETERU", href: "#neteru" },
  { label: "Tarifs", href: "#tarifs" },
  { label: "FAQ", href: "#faq" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <>
      <nav
        className={cn(
          "fixed top-0 left-0 right-0 z-[var(--z-topbar)] transition-all duration-300",
          scrolled
            ? "bg-background/90 backdrop-blur-xl border-b border-border-subtle shadow-sm"
            : "bg-transparent",
        )}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-violet-700 transition-transform group-hover:scale-105">
              <Rocket className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-foreground">
              La Fusee
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden items-center gap-8 lg:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="relative text-sm text-foreground-secondary transition-colors hover:text-foreground after:absolute after:bottom-[-4px] after:left-1/2 after:h-[2px] after:w-0 after:bg-primary after:transition-all after:duration-300 after:-translate-x-1/2 hover:after:w-full"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden items-center gap-3 lg:flex">
            <Link
              href="/login"
              className="text-sm text-foreground-secondary transition-colors hover:text-foreground"
            >
              Connexion
            </Link>
            <GlowButton href="/intake" size="sm" icon={false}>
              Diagnostic Gratuit
            </GlowButton>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-foreground-secondary hover:bg-card-hover lg:hidden"
            aria-label="Menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile overlay menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[calc(var(--z-topbar)-1)] flex flex-col items-center justify-center gap-8 bg-background/98 backdrop-blur-xl lg:hidden">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="text-2xl font-semibold text-foreground transition-colors hover:text-primary"
            >
              {link.label}
            </a>
          ))}
          <div className="mt-4 flex flex-col items-center gap-4">
            <GlowButton href="/intake" size="lg" onClick={() => setMobileOpen(false)}>
              Diagnostic Gratuit
            </GlowButton>
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="text-sm text-foreground-secondary hover:text-foreground"
            >
              Se connecter
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
