import React from "react";

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  /** Controlled on/off. */
  checked?: boolean;
  /** Inline label to the right of the track. */
  label?: string;
  disabled?: boolean;
}

/** Toggle switch (rouge when on) — settings, theme Sombre/Clair, opt-ins. */
export function Switch(props: SwitchProps): JSX.Element;
