"use client";

import React from "react";

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";
type AvatarStatus = "online" | "offline" | "busy" | "away";

interface AvatarProps {
  src?: string;
  name?: string;
  size?: AvatarSize;
  status?: AvatarStatus;
  className?: string;
}

const sizeMap: Record<AvatarSize, string> = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-lg",
};

const statusColor: Record<AvatarStatus, string> = {
  online: "bg-emerald-500",
  offline: "bg-slate-400",
  busy: "bg-red-500",
  away: "bg-amber-500",
};

function initials(name?: string) {
  if (!name) return "?";
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export const Avatar: React.FC<AvatarProps> = ({ src, name, size = "md", status, className = "" }) => {
  return (
    <span className={`relative inline-flex shrink-0 ${className}`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name || "avatar"} className={`${sizeMap[size]} rounded-full object-cover`} />
      ) : (
        <span className={`${sizeMap[size]} flex items-center justify-center rounded-full bg-[var(--color-primary-light)] font-semibold text-[var(--color-primary)]`}>
          {initials(name)}
        </span>
      )}
      {status && (
        <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-[var(--surface-card)] ${statusColor[status]}`} />
      )}
    </span>
  );
};

interface AvatarGroupProps {
  avatars: { src?: string; name?: string }[];
  max?: number;
  size?: AvatarSize;
  className?: string;
}

export const AvatarGroup: React.FC<AvatarGroupProps> = ({ avatars, max = 4, size = "md", className = "" }) => {
  const shown = avatars.slice(0, max);
  const rest = avatars.length - max;
  return (
    <div className={`flex items-center -space-x-2 ${className}`}>
      {shown.map((a, i) => (
        <span key={i} className="rounded-full ring-2 ring-[var(--surface-card)]">
          <Avatar src={a.src} name={a.name} size={size} />
        </span>
      ))}
      {rest > 0 && (
        <span className={`${sizeMap[size]} flex items-center justify-center rounded-full bg-[var(--surface-muted)] font-semibold text-[var(--text-caption)] ring-2 ring-[var(--surface-card)]`}>
          +{rest}
        </span>
      )}
    </div>
  );
};

export default Avatar;
