"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import * as Lucide from "lucide-react";

export type IconName = keyof typeof Lucide;

export interface IconProps extends Omit<React.SVGAttributes<SVGSVGElement>, "name"> {
  name: IconName;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  mirrorOnRtl?: boolean;
  label?: string;
}

const SIZE: Record<NonNullable<IconProps["size"]>, number> = {
  xs: 12, sm: 14, md: 16, lg: 20, xl: 24,
};

export const Icon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ name, size = "md", className, mirrorOnRtl, label, ...props }, ref) => {
    const Cmp = Lucide[name] as React.ComponentType<React.SVGAttributes<SVGSVGElement> & { size?: number; ref?: React.Ref<SVGSVGElement> }> | undefined;
    if (!Cmp) {
      console.warn(`[Icon] unknown name "${name}"`);
      return null;
    }
    return (
      <Cmp
        ref={ref}
        size={SIZE[size]}
        className={cn(mirrorOnRtl && "rtl:scale-x-[-1]", className)}
        aria-hidden={label ? undefined : "true"}
        aria-label={label}
        {...props}
      />
    );
  },
);
Icon.displayName = "Icon";
