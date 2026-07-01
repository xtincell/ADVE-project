import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Field label rendered above the control. */
  label?: string;
  /** Leading icon (search glass, mail…). */
  icon?: React.ReactNode;
  /** Trailing node (clear ✕, unit…). */
  trailing?: React.ReactNode;
  /** Helper / error text below the field. */
  hint?: string;
  /** Error styling. */
  error?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  icon?: React.ReactNode;
  hint?: string;
  error?: boolean;
}

/** Text input with label, optional icons, focus ring + error state. */
export function Input(props: InputProps): JSX.Element;
/** Native select styled to match Input, with a chevron. */
export function Select(props: SelectProps): JSX.Element;
