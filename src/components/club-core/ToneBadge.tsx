"use client";

import React from "react";
import Badge from "@/components/ui/badge/Badge";

// Maps the semantic "tone" strings used across club data meta objects to the
// Badge color palette. Keeps page code declarative.
type Tone =
  | "success"
  | "warning"
  | "error"
  | "info"
  | "neutral"
  | "primary"
  | "secondary";

const toneToColor: Record<
  Tone,
  "primary" | "secondary" | "success" | "error" | "warning" | "info" | "neutral"
> = {
  success: "success",
  warning: "warning",
  error: "error",
  info: "info",
  neutral: "neutral",
  primary: "primary",
  secondary: "secondary",
};

interface ToneBadgeProps {
  tone: Tone;
  children: React.ReactNode;
  variant?: "light" | "solid" | "outline";
  size?: "sm" | "md";
  dot?: boolean;
}

const ToneBadge: React.FC<ToneBadgeProps> = ({
  tone,
  children,
  variant = "light",
  size = "sm",
  dot = false,
}) => (
  <Badge color={toneToColor[tone]} variant={variant} size={size} dot={dot}>
    {children}
  </Badge>
);

export default ToneBadge;
