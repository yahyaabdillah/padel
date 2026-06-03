"use client";

import React, { ReactNode } from "react";

interface ProductCardProps {
  image?: string;
  imageAlt?: string;
  title: string;
  category?: string;
  price: string;
  oldPrice?: string;
  badge?: { label: string; color?: "primary" | "emerald" | "error" | "amber" };
  rating?: number;
  stock?: number;
  action?: ReactNode;
  onClick?: () => void;
  className?: string;
}

const badgeColors = {
  primary: "bg-[var(--color-primary-light)] text-[var(--color-primary)]",
  emerald: "bg-[var(--color-emerald-light)] text-[var(--color-emerald)]",
  error: "bg-[rgba(239,68,68,0.12)] text-[#ef4444]",
  amber: "bg-[rgba(245,158,11,0.12)] text-[#f59e0b]",
};

const ProductCard: React.FC<ProductCardProps> = ({
  image,
  imageAlt,
  title,
  category,
  price,
  oldPrice,
  badge,
  rating,
  stock,
  action,
  onClick,
  className = "",
}) => {
  return (
    <div
      onClick={onClick}
      className={[
        "group relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] transition-all duration-300",
        "hover:border-[var(--color-primary)]/40 hover:shadow-theme-lg",
        onClick ? "cursor-pointer hover:-translate-y-1" : "",
        className,
      ].join(" ")}
    >
      {/* Image */}
      <div className="relative aspect-square w-full overflow-hidden bg-[var(--surface-muted)]">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={imageAlt || title} className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[var(--text-muted)]">
            <svg className="h-12 w-12 transition-transform duration-500 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          </div>
        )}
        {/* gradient overlay saat hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        {badge && (
          <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-semibold shadow-theme-sm backdrop-blur-sm ${badgeColors[badge.color || "primary"]}`}>
            {badge.label}
          </span>
        )}
        {typeof stock === "number" && stock <= 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-[1px]">
            <span className="rounded-full bg-[#ef4444] px-3 py-1 text-xs font-semibold text-white">Habis</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {category && <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">{category}</p>}
        <h3 className="line-clamp-2 text-sm font-semibold text-[var(--text-heading)] transition-colors group-hover:text-[var(--color-primary)]">{title}</h3>

        {typeof rating === "number" && (
          <div className="mt-1.5 flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <svg key={i} className={`h-3.5 w-3.5 ${i < Math.round(rating) ? "text-[#f59e0b]" : "text-[var(--border-strong)]"}`} fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
            ))}
            <span className="ml-1 text-[10px] text-[var(--text-muted)]">{rating.toFixed(1)}</span>
          </div>
        )}

        <div className="mt-2 flex items-end justify-between gap-2">
          <div>
            <p className="text-base font-bold text-[var(--color-primary)]">{price}</p>
            {oldPrice && <p className="text-xs text-[var(--text-muted)] line-through">{oldPrice}</p>}
          </div>
          {typeof stock === "number" && stock > 0 && (
            <span className="text-[10px] text-[var(--text-muted)]">Stok: {stock}</span>
          )}
        </div>

        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  );
};

export default ProductCard;
