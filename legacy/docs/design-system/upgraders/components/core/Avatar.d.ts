import React from "react";

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Image URL. Falls back to initials when absent. */
  src?: string;
  /** Full name — drives initials + alt text. */
  name?: string;
  /** Preset size or an explicit pixel number. */
  size?: "xs" | "sm" | "md" | "lg" | "xl" | number;
  /** Presence dot. */
  status?: "online" | "busy" | "offline";
  /** Rouge focus ring (selected / current user). */
  ring?: boolean;
}

export interface AvatarGroupProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Avatar prop objects, rendered as an overlapping stack. */
  avatars: AvatarProps[];
  /** Max shown before a "+N" chip. */
  max?: number;
  size?: AvatarProps["size"];
}

/** Circular avatar with initials fallback + presence dot. */
export function Avatar(props: AvatarProps): JSX.Element;
/** Overlapping avatar stack with a "+N" overflow chip. */
export function AvatarGroup(props: AvatarGroupProps): JSX.Element;
