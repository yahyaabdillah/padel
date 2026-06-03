"use client";

import React, { useState } from "react";
import { initials } from "./format";

interface EngageAvatarProps {
  src?: string;
  name: string;
  size?: number;
  className?: string;
  ring?: boolean;
}

/**
 * Avatar that gracefully falls back to gradient initials when the image is
 * missing — many dummy avatar paths may not exist as assets.
 */
const EngageAvatar: React.FC<EngageAvatarProps> = ({
  src,
  name,
  size = 40,
  className = "",
  ring = false,
}) => {
  const [errored, setErrored] = useState(false);
  const dim = { width: size, height: size };
  const ringCls = ring
    ? "ring-2 ring-[var(--color-primary)]/30 ring-offset-2 ring-offset-[var(--surface-card)]"
    : "";

  if (!src || errored) {
    return (
      <span
        style={dim}
        className={`inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] font-semibold text-white ${ringCls} ${className}`}
      >
        <span style={{ fontSize: size * 0.38 }}>{initials(name)}</span>
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      width={size}
      height={size}
      style={dim}
      onError={() => setErrored(true)}
      className={`shrink-0 rounded-full object-cover ${ringCls} ${className}`}
    />
  );
};

export default EngageAvatar;
