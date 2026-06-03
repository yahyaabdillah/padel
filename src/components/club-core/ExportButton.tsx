"use client";

import React from "react";
import Button from "@/components/ui/button/Button";
import { useToast } from "@/components/ui/toast/ToastContext";

interface ExportButtonProps {
  label?: string;
  filename?: string;
  variant?: "primary" | "outline" | "ghost";
}

const DownloadIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" />
  </svg>
);

/** Dummy export — shows a toast (no real file generated). */
const ExportButton: React.FC<ExportButtonProps> = ({
  label = "Export CSV",
  filename = "padelhub-export.csv",
  variant = "outline",
}) => {
  const toast = useToast();
  return (
    <Button
      variant={variant}
      size="sm"
      startIcon={<DownloadIcon />}
      onClick={() => toast.success(`Preparing ${filename}…`, "Export queued")}
    >
      {label}
    </Button>
  );
};

export default ExportButton;
