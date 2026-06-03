"use client";

import React, { useMemo, useState } from "react";
import { Plus, Pencil, PackagePlus, Search, AlertTriangle } from "lucide-react";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import Switch from "@/components/ui/switch/Switch";
import EmptyState from "@/components/ui/feedback/EmptyState";
import { formatIDR } from "@/components/club-engage/format";
import {
  productCategories,
  isLowStock,
  isProductActive,
  LOW_STOCK_THRESHOLD,
  type Product,
  type ProductCategory,
} from "@/data/padel/engage/products";

/* Product management surface (a tab on /pos). Owns no state of its own beyond
 * local filters + the restock-amount input; all mutations are lifted to the
 * page via callbacks so the list persists in one place. */

interface ProductManagementPanelProps {
  products: Product[];
  onAdd: () => void;
  onEdit: (p: Product) => void;
  onRestock: (id: string, qty: number) => void;
  onToggleActive: (id: string) => void;
}

const RESTOCK_PRESETS = [5, 10, 25];

const ProductManagementPanel: React.FC<ProductManagementPanelProps> = ({
  products,
  onAdd,
  onEdit,
  onRestock,
  onToggleActive,
}) => {
  const [category, setCategory] = useState<"All" | ProductCategory>("All");
  const [search, setSearch] = useState("");
  const [restockFor, setRestockFor] = useState<string | null>(null);
  const [restockQty, setRestockQty] = useState("");

  const lowStockCount = useMemo(
    () => products.filter((p) => isLowStock(p.stock)).length,
    [products],
  );

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchCat = category === "All" || p.category === category;
      const q = search.toLowerCase();
      const matchSearch =
        !search ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [products, category, search]);

  const commitRestock = (id: string) => {
    const qty = parseInt(restockQty.replace(/\D/g, ""), 10) || 0;
    if (qty > 0) onRestock(id, qty);
    setRestockFor(null);
    setRestockQty("");
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search product or SKU…"
            className="h-10 w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] pl-9 pr-3.5 text-sm text-[var(--text-body)] outline-none transition-colors focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
          />
        </div>
        <div className="flex items-center gap-2">
          {lowStockCount > 0 && (
            <Badge color="warning" variant="light" startIcon={<AlertTriangle className="h-3.5 w-3.5" />}>
              {lowStockCount} low stock
            </Badge>
          )}
          <Button variant="primary" size="sm" sheen startIcon={<Plus className="h-4 w-4" />} onClick={onAdd}>
            Add Product
          </Button>
        </div>
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap gap-2">
        {(["All", ...productCategories] as const).map((c) => (
          <Button key={c} variant="chip" size="sm" active={category === c} onClick={() => setCategory(c)}>
            {c}
          </Button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState title="No products found" description="Try a different category or search term, or add a new product." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--border-default)]">
          {/* Header row (md+) */}
          <div className="hidden grid-cols-[1.6fr_0.8fr_0.9fr_1.5fr_0.7fr] gap-3 border-b border-[var(--border-light)] bg-[var(--surface-muted)] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-caption)] md:grid">
            <span>Product</span>
            <span>Price</span>
            <span>Stock</span>
            <span>Restock</span>
            <span className="text-right">Active</span>
          </div>

          <div className="divide-y divide-[var(--border-light)]">
            {filtered.map((p) => {
              const low = isLowStock(p.stock);
              const oos = p.stock === 0;
              const active = isProductActive(p);
              const unlimited = p.stock === -1;
              return (
                <div
                  key={p.id}
                  className={`grid grid-cols-2 items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--surface-muted)]/50 md:grid-cols-[1.6fr_0.8fr_0.9fr_1.5fr_0.7fr] ${
                    active ? "" : "opacity-60"
                  }`}
                >
                  {/* Product */}
                  <div className="col-span-2 flex min-w-0 items-center gap-3 md:col-span-1">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-muted)] text-xl">
                      {p.emoji}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--text-heading)]">{p.name}</p>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        {p.category} · {p.sku}
                      </p>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="text-sm font-semibold text-[var(--text-heading)]">
                    {formatIDR(p.price)}
                    {p.perHour && <span className="text-[10px] font-normal text-[var(--text-muted)]">/hr</span>}
                  </div>

                  {/* Stock */}
                  <div>
                    {unlimited ? (
                      <Badge color="info" variant="light" size="sm">∞ Unlimited</Badge>
                    ) : oos ? (
                      <Badge color="error" variant="light" size="sm">Out of stock</Badge>
                    ) : low ? (
                      <Badge color="warning" variant="light" size="sm" dot>
                        {p.stock} left
                      </Badge>
                    ) : (
                      <Badge color="success" variant="light" size="sm">{p.stock} in stock</Badge>
                    )}
                  </div>

                  {/* Restock */}
                  <div>
                    {unlimited ? (
                      <span className="text-xs text-[var(--text-muted)]">—</span>
                    ) : restockFor === p.id ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          autoFocus
                          value={restockQty}
                          onChange={(e) => setRestockQty(e.target.value.replace(/\D/g, ""))}
                          onKeyDown={(e) => e.key === "Enter" && commitRestock(p.id)}
                          placeholder="+qty"
                          inputMode="numeric"
                          className="h-8 w-16 rounded-lg border border-[var(--border-default)] bg-[var(--surface-card)] px-2 text-xs font-semibold text-[var(--text-heading)] outline-none focus:border-[var(--color-primary)]"
                        />
                        {RESTOCK_PRESETS.map((n) => (
                          <button
                            key={n}
                            onClick={() => setRestockQty(String(n))}
                            className="rounded-md bg-[var(--surface-muted)] px-1.5 py-1 text-[11px] font-medium text-[var(--text-body)] hover:bg-[var(--color-primary-light)]"
                          >
                            {n}
                          </button>
                        ))}
                        <Button variant="primary" size="sm" onClick={() => commitRestock(p.id)}>Add</Button>
                        <button
                          onClick={() => { setRestockFor(null); setRestockQty(""); }}
                          className="text-[var(--text-muted)] hover:text-[var(--text-heading)]"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        startIcon={<PackagePlus className="h-3.5 w-3.5" />}
                        onClick={() => { setRestockFor(p.id); setRestockQty(""); }}
                      >
                        Restock
                      </Button>
                    )}
                  </div>

                  {/* Active + edit */}
                  <div className="col-span-2 flex items-center justify-end gap-3 md:col-span-1">
                    <button
                      onClick={() => onEdit(p)}
                      aria-label="Edit product"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-caption)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--color-primary)]"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <Switch checked={active} onChange={() => onToggleActive(p.id)} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p className="text-xs text-[var(--text-muted)]">
        Items at or below {LOW_STOCK_THRESHOLD} units show a low-stock warning. Inactive products are hidden from the Sell tab.
      </p>
    </div>
  );
};

export default ProductManagementPanel;
