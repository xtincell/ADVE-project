"use client";

import { AlertTriangle, Info, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Modal } from "./modal";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info";
  className?: string;
}

const VARIANT_CONFIG = {
  danger: {
    icon: AlertCircle,
    iconBg: "bg-red-400/15",
    iconColor: "text-red-400",
    button: "bg-red-600 hover:bg-red-700 text-white",
  },
  warning: {
    icon: AlertTriangle,
    iconBg: "bg-amber-400/15",
    iconColor: "text-amber-400",
    button: "bg-amber-600 hover:bg-amber-700 text-white",
  },
  info: {
    icon: Info,
    iconBg: "bg-blue-400/15",
    iconColor: "text-blue-400",
    button: "bg-blue-600 hover:bg-blue-700 text-white",
  },
} as const;

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  variant = "danger",
  className,
}: ConfirmDialogProps) {
  const config = VARIANT_CONFIG[variant];
  const Icon = config.icon;

  return (
    <Modal open={open} onClose={onClose} size="sm" className={className}>
      <div className="flex flex-col items-center text-center">
        <div className={cn("rounded-full p-3", config.iconBg)}>
          <Icon className={cn("h-6 w-6", config.iconColor)} />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
        <p className="mt-2 text-sm text-zinc-400">{message}</p>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
        >
          {cancelLabel}
        </button>
        <button
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className={cn(
            "flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
            config.button,
          )}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
