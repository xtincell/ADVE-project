"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface SectionWrapperProps {
  id: string;
  number: string;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  accentColor?: string;
}

export function SectionWrapper({
  id,
  number,
  title,
  children,
  defaultOpen = true,
  accentColor = "rgb(232, 75, 34)",
}: SectionWrapperProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section id={id} className="print-break">
      <button
        onClick={() => setOpen(!open)}
        className="group flex w-full items-center gap-4 py-6 text-left no-print"
      >
        <span
          className="text-4xl font-bold"
          style={{ color: accentColor }}
        >
          {number}
        </span>
        <div className="flex-1">
          <h2 className="text-xl font-bold uppercase tracking-wide text-foreground">
            {title}
          </h2>
          <div
            className="mt-1 h-0.5 w-full"
            style={{ background: `linear-gradient(to right, ${accentColor}, transparent)` }}
          />
        </div>
        <ChevronDown
          className={`h-5 w-5 text-foreground-muted transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Print always shows content */}
      <div
        className={`overflow-hidden transition-all duration-300 ${
          open ? "max-h-[10000px] opacity-100" : "max-h-0 opacity-0 print:max-h-none print:opacity-100"
        }`}
      >
        <div className="pb-8 pl-16">{children}</div>
      </div>
    </section>
  );
}
