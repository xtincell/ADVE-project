import Link from "next/link";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

interface GlowButtonProps {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "ghost" | "gradient";
  size?: "sm" | "md" | "lg";
  icon?: boolean;
  className?: string;
  onClick?: () => void;
}

const variants = {
  primary:
    "bg-gradient-to-r from-violet-600 to-violet-700 text-white shadow-lg shadow-violet-900/30 hover:from-violet-500 hover:to-violet-600 hover:shadow-violet-900/50 hover:scale-[1.02]",
  ghost:
    "border border-white/10 bg-white/5 text-zinc-300 hover:border-white/20 hover:bg-white/10 hover:text-white",
  gradient:
    "bg-gradient-to-r from-violet-600 to-emerald-600 text-white shadow-lg shadow-violet-900/20 hover:from-violet-500 hover:to-emerald-500 hover:shadow-violet-900/40 hover:scale-[1.02]",
};

const sizes = {
  sm: "px-5 py-2.5 text-sm rounded-lg gap-2",
  md: "px-8 py-3.5 text-base rounded-xl gap-2",
  lg: "px-10 py-4 text-lg rounded-xl gap-2.5",
};

export function GlowButton({
  href,
  children,
  variant = "primary",
  size = "md",
  icon = true,
  className,
  onClick,
}: GlowButtonProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "inline-flex items-center font-semibold transition-all duration-300",
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {children}
      {icon && <ArrowRight className="h-4 w-4" />}
    </Link>
  );
}
