"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_ROUTES } from "@/lib/generated/app-routes";

interface Breadcrumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: Breadcrumb[];
  badge?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  badge,
  children,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("space-y-1", className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1 text-sm text-foreground-muted">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5" />}
              {/* Ne linkifier que les crumbs résolvant vers une vraie page : un
                  href de conteneur de section sans page index (ex /console/governance)
                  produit un 404 au clic. Même garde que navigation/breadcrumb.tsx. */}
              {crumb.href && APP_ROUTES.has(crumb.href) ? (
                <Link
                  href={crumb.href}
                  className="transition-colors hover:text-foreground-secondary"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-foreground-secondary">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}

      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-white">
            {title}
            {badge}
          </h1>
          {description && (
            <p className="text-sm text-foreground-secondary">{description}</p>
          )}
        </div>
        {children && (
          <div className="flex shrink-0 items-center gap-2">{children}</div>
        )}
      </div>
    </div>
  );
}
