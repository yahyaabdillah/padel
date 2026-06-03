"use client";

import React, { useMemo, useState } from "react";
import { ShoppingCart, Boxes } from "lucide-react";
import PageScaffold from "@/components/club-engage/PageScaffold";
import { formatIDR } from "@/components/club-engage/format";
import Card from "@/components/ui/card/Card";
import Button from "@/components/ui/button/Button";
import Tabs from "@/components/ui/tabs/Tabs";
import { ModalDialog } from "@/components/ui/modal";
import EmptyState from "@/components/ui/feedback/EmptyState";
import { useToast } from "@/components/ui/toast/ToastContext";
import { useRole } from "@/context/RoleContext";
import PromoReferralInput from "@/components/shared/PromoReferralInput";
import ProductManagementPanel from "@/components/pos/ProductManagementPanel";
import ProductFormDrawer from "@/components/pos/ProductFormDrawer";
import {
  products as seedProducts,
  productCategories,
  paymentMethods,
  isProductActive,
  type Product,
  type ProductCategory,
  type PaymentMethod,
} from "@/data/padel/engage/products";

interface CartLine {
  product: Product;
  qty: number;
}

interface Receipt {
  no: string;
  lines: CartLine[];
  subtotal: number;
  discount: number;
  promoCode?: string;
  tax: number;
  total: number;
  method: PaymentMethod;
  paid: number;
  change: number;
  time: string;
}

const TAX_RATE = 0.11;

export default function POSPage() {
  const toast = useToast();
  const { currentUser } = useRole();

  // ── Master product list (lives in page state; persists across tab switches) ──
  const [productList, setProductList] = useState<Product[]>(seedProducts);

  const [tab, setTab] = useState<"sell" | "manage">("sell");

  // ── Sell tab state ──
  const [category, setCategory] = useState<"All" | ProductCategory>("All");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [method, setMethod] = useState<PaymentMethod>("QRIS");
  const [paid, setPaid] = useState("");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  // ── Promo (POS scope) ──
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoCode, setPromoCode] = useState("");

  // ── Product management drawer ──
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  const lowStockCount = useMemo(
    () => productList.filter((p) => p.stock !== -1 && p.stock > 0 && p.stock <= 5).length,
    [productList],
  );

  // Sellable = active only.
  const sellable = useMemo(() => productList.filter(isProductActive), [productList]);

  const filtered = useMemo(() => {
    return sellable.filter((p) => {
      const matchCat = category === "All" || p.category === category;
      const q = search.toLowerCase();
      const matchSearch = !search || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [sellable, category, search]);

  // ── Cart ops ──
  const addToCart = (product: Product) => {
    if (product.stock === 0) {
      toast.error("Out of stock.");
      return;
    }
    setCart((prev) => {
      const found = prev.find((l) => l.product.id === product.id);
      if (found) {
        if (product.stock !== -1 && found.qty >= product.stock) {
          toast.warning("No more stock available.");
          return prev;
        }
        return prev.map((l) => (l.product.id === product.id ? { ...l, qty: l.qty + 1 } : l));
      }
      return [...prev, { product, qty: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((l) => (l.product.id === id ? { ...l, qty: l.qty + delta } : l))
        .filter((l) => l.qty > 0),
    );
  };

  const removeLine = (id: string) => setCart((prev) => prev.filter((l) => l.product.id !== id));

  const subtotal = cart.reduce((s, l) => s + l.product.price * l.qty, 0);
  const discount = Math.min(promoDiscount, subtotal);
  const taxedBase = subtotal - discount;
  const tax = Math.round(taxedBase * TAX_RATE);
  const total = taxedBase + tax;
  const itemCount = cart.reduce((s, l) => s + l.qty, 0);

  const openCheckout = () => {
    setPromoDiscount(0);
    setPromoCode("");
    setCheckoutOpen(true);
  };

  const handleCheckout = () => {
    const paidNum = method === "Cash" ? parseInt(paid.replace(/\D/g, ""), 10) || 0 : total;
    if (method === "Cash" && paidNum < total) {
      toast.warning("Cash received is less than total.");
      return;
    }
    const now = new Date();
    const r: Receipt = {
      no: `RCP-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(Math.floor(Math.random() * 900) + 100)}`,
      lines: cart,
      subtotal,
      discount,
      promoCode: discount > 0 ? promoCode : undefined,
      tax,
      total,
      method,
      paid: paidNum,
      change: Math.max(0, paidNum - total),
      time: now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
    };

    // Decrement tracked stock for sold lines.
    setProductList((prev) =>
      prev.map((p) => {
        const line = cart.find((l) => l.product.id === p.id);
        if (!line || p.stock === -1) return p;
        return { ...p, stock: Math.max(0, p.stock - line.qty) };
      }),
    );

    setReceipt(r);
    setCheckoutOpen(false);
    setCart([]);
    setPaid("");
    setPromoDiscount(0);
    setPromoCode("");
    toast.success(`Sale completed · ${formatIDR(total)}`);
  };

  // ── Product management ops ──
  const handleAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const handleEdit = (p: Product) => {
    setEditing(p);
    setFormOpen(true);
  };

  const handleSubmitProduct = (product: Product) => {
    setProductList((prev) => {
      const exists = prev.some((p) => p.id === product.id);
      return exists ? prev.map((p) => (p.id === product.id ? product : p)) : [product, ...prev];
    });
    toast.success(editing ? "Product updated." : "Product added.");
  };

  const handleRestock = (id: string, qty: number) => {
    setProductList((prev) =>
      prev.map((p) => (p.id === id && p.stock !== -1 ? { ...p, stock: p.stock + qty } : p)),
    );
    toast.success(`Restocked +${qty}.`);
  };

  const handleToggleActive = (id: string) => {
    setProductList((prev) =>
      prev.map((p) => (p.id === id ? { ...p, active: isProductActive(p) ? false : true } : p)),
    );
  };

  const cartPanel = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[var(--border-light)] px-4 py-3">
        <h3 className="flex items-center gap-2 font-semibold text-[var(--text-heading)]">
          <ShoppingCart className="h-5 w-5" /> Current Sale
        </h3>
        {cart.length > 0 && (
          <button onClick={() => setCart([])} className="text-xs font-medium text-rose-500 hover:underline">
            Clear
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar p-3">
        {cart.length === 0 ? (
          <EmptyState title="Cart is empty" description="Tap products on the left to add them to the sale." />
        ) : (
          <div className="space-y-2">
            {cart.map((l) => (
              <div key={l.product.id} className="flex items-center gap-2 rounded-xl bg-[var(--surface-muted)] p-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--surface-card)] text-lg">{l.product.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-[var(--text-heading)]">{l.product.name}</p>
                  <p className="text-[11px] text-[var(--text-caption)]">{formatIDR(l.product.price)}{l.product.perHour ? "/hr" : ""}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => updateQty(l.product.id, -1)} className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--surface-card)] text-[var(--text-body)] hover:bg-[var(--color-primary-light)]">−</button>
                  <span className="w-5 text-center text-xs font-semibold text-[var(--text-heading)]">{l.qty}</span>
                  <button onClick={() => updateQty(l.product.id, 1)} className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--surface-card)] text-[var(--text-body)] hover:bg-[var(--color-primary-light)]">+</button>
                  <button onClick={() => removeLine(l.product.id)} className="ml-1 text-rose-400 hover:text-rose-500">✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-[var(--border-light)] p-4">
        <div className="space-y-1 text-sm">
          <div className="flex justify-between text-[var(--text-caption)]"><span>Subtotal</span><span>{formatIDR(subtotal)}</span></div>
          <div className="flex justify-between text-[var(--text-caption)]"><span>Tax (11%)</span><span>{formatIDR(tax)}</span></div>
          <div className="flex justify-between border-t border-[var(--border-light)] pt-1.5 text-base font-bold text-[var(--text-heading)]"><span>Total</span><span>{formatIDR(total)}</span></div>
        </div>
        <Button variant="primary" fullWidth sheen glow className="mt-3" disabled={cart.length === 0} onClick={openCheckout}>
          Checkout · {itemCount} item{itemCount !== 1 ? "s" : ""}
        </Button>
      </div>
    </div>
  );

  return (
    <PageScaffold
      title="Pro Shop POS"
      subtitle="Sell rackets, balls, grips, drinks and court/equipment rentals — and manage your shop inventory."
      requireAny={["pos.view"]}
    >
      <div className="mb-5">
        <Tabs
          variant="segment"
          value={tab}
          onChange={(v) => setTab(v as "sell" | "manage")}
          items={[
            { value: "sell", label: "Sell", icon: <ShoppingCart className="h-4 w-4" /> },
            {
              value: "manage",
              label: "Products",
              icon: <Boxes className="h-4 w-4" />,
              badge: lowStockCount > 0 ? lowStockCount : undefined,
            },
          ]}
        />
      </div>

      {tab === "sell" ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Products */}
          <div className="lg:col-span-2">
            <Card padding="md">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search product or SKU…"
                  className="h-10 w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] px-3.5 text-sm text-[var(--text-body)] outline-none transition-colors focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 sm:max-w-xs"
                />
              </div>
              <div className="mb-4 flex flex-wrap gap-2">
                {(["All", ...productCategories] as const).map((c) => (
                  <Button key={c} variant="chip" size="sm" active={category === c} onClick={() => setCategory(c)}>
                    {c}
                  </Button>
                ))}
              </div>

              {filtered.length === 0 ? (
                <EmptyState title="No products found" description="Try a different category or search term." />
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                  {filtered.map((p) => {
                    const oos = p.stock === 0;
                    return (
                      <button
                        key={p.id}
                        disabled={oos}
                        onClick={() => addToCart(p)}
                        className={`group relative flex flex-col rounded-2xl border p-3 text-left transition-all ${
                          oos
                            ? "cursor-not-allowed border-[var(--border-light)] opacity-50"
                            : "border-[var(--border-default)] hover:-translate-y-0.5 hover:border-[var(--color-primary)] hover:shadow-theme-md"
                        }`}
                      >
                        {p.popular && !oos && (
                          <span className="absolute right-2 top-2 rounded-full bg-[var(--color-accent)] px-1.5 py-0.5 text-[9px] font-bold text-[#3a5314]">HOT</span>
                        )}
                        <span className="mb-2 flex h-14 items-center justify-center rounded-xl bg-[var(--surface-muted)] text-3xl">{p.emoji}</span>
                        <p className="line-clamp-2 text-xs font-medium leading-snug text-[var(--text-heading)]">{p.name}</p>
                        <p className="mt-auto pt-1.5 text-sm font-bold text-[var(--color-primary)]">
                          {formatIDR(p.price)}{p.perHour ? <span className="text-[10px] font-normal text-[var(--text-muted)]">/hr</span> : ""}
                        </p>
                        <p className="text-[10px] text-[var(--text-muted)]">
                          {oos ? "Out of stock" : p.stock === -1 ? "In stock" : `${p.stock} left`}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

          {/* Cart */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)]" style={{ minHeight: 420 }}>
              {cartPanel}
            </div>
          </div>
        </div>
      ) : (
        <Card padding="md">
          <ProductManagementPanel
            products={productList}
            onAdd={handleAdd}
            onEdit={handleEdit}
            onRestock={handleRestock}
            onToggleActive={handleToggleActive}
          />
        </Card>
      )}

      {/* Add / Edit product drawer */}
      <ProductFormDrawer
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        editing={editing}
        onSubmit={handleSubmitProduct}
      />

      {/* Checkout modal */}
      <ModalDialog
        isOpen={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        title="Checkout"
        description={`${itemCount} item(s) · ${formatIDR(total)}`}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCheckoutOpen(false)}>Cancel</Button>
            <Button variant="primary" sheen onClick={handleCheckout}>Complete Sale</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium text-[var(--text-body)]">Payment method</p>
            <div className="grid grid-cols-2 gap-2">
              {paymentMethods.map((m) => (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  className={`rounded-xl border-2 px-3 py-2.5 text-sm font-semibold transition-all ${
                    method === m
                      ? "border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)]"
                      : "border-[var(--border-default)] text-[var(--text-caption)] hover:border-[var(--color-primary)]/50"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Promo + referral (POS scope) */}
          <div className="rounded-xl border border-[var(--border-light)] p-3">
            <PromoReferralInput
              scope="pos"
              amount={subtotal}
              onChange={(s) => {
                setPromoDiscount(s.discount);
                setPromoCode(s.promoCode);
              }}
            />
          </div>

          {method === "Cash" && (
            <div>
              <p className="mb-2 text-sm font-medium text-[var(--text-body)]">Cash received</p>
              <input
                value={paid}
                onChange={(e) => setPaid(e.target.value)}
                placeholder={formatIDR(total)}
                inputMode="numeric"
                className="h-11 w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] px-3.5 text-sm font-semibold text-[var(--text-heading)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {[total, 100_000, 200_000, 500_000].map((amt, i) => (
                  <button key={i} onClick={() => setPaid(String(amt))} className="rounded-lg bg-[var(--surface-muted)] px-3 py-1.5 text-xs font-medium text-[var(--text-body)] hover:bg-[var(--color-primary-light)]">
                    {i === 0 ? "Exact" : formatIDR(amt, true)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-xl bg-[var(--surface-muted)] p-3 text-sm">
            <div className="flex justify-between text-[var(--text-caption)]"><span>Subtotal</span><span>{formatIDR(subtotal)}</span></div>
            {discount > 0 && (
              <div className="flex justify-between font-medium text-brand-600 dark:text-brand-400">
                <span>Promo{promoCode ? ` (${promoCode})` : ""}</span>
                <span>−{formatIDR(discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-[var(--text-caption)]"><span>Tax (11%)</span><span>{formatIDR(tax)}</span></div>
            <div className="mt-1 flex justify-between border-t border-[var(--border-default)] pt-1 text-base font-bold text-[var(--text-heading)]"><span>Total</span><span>{formatIDR(total)}</span></div>
          </div>
        </div>
      </ModalDialog>

      {/* Receipt modal */}
      <ModalDialog
        isOpen={!!receipt}
        onClose={() => setReceipt(null)}
        title="Receipt"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setReceipt(null)}>Close</Button>
            <Button variant="primary" onClick={() => { toast.info("Receipt sent to printer (dummy)."); setReceipt(null); }}>Print</Button>
          </div>
        }
      >
        {receipt && (
          <div className="space-y-3 font-mono text-sm">
            <div className="text-center">
              <p className="text-base font-bold text-[var(--text-heading)]">SmashCourt Pro Shop</p>
              <p className="text-xs text-[var(--text-caption)]">Jl. Senopati No. 88, Jakarta</p>
            </div>
            <div className="flex justify-between border-y border-dashed border-[var(--border-default)] py-2 text-xs text-[var(--text-caption)]">
              <span>{receipt.no}</span>
              <span>{receipt.time}</span>
            </div>
            <div className="space-y-1.5">
              {receipt.lines.map((l) => (
                <div key={l.product.id} className="flex justify-between text-[var(--text-body)]">
                  <span className="truncate pr-2">{l.qty}× {l.product.name}</span>
                  <span className="shrink-0">{formatIDR(l.product.price * l.qty)}</span>
                </div>
              ))}
            </div>
            <div className="space-y-1 border-t border-dashed border-[var(--border-default)] pt-2 text-[var(--text-caption)]">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatIDR(receipt.subtotal)}</span></div>
              {receipt.discount > 0 && (
                <div className="flex justify-between text-brand-600 dark:text-brand-400">
                  <span>Promo{receipt.promoCode ? ` (${receipt.promoCode})` : ""}</span>
                  <span>−{formatIDR(receipt.discount)}</span>
                </div>
              )}
              <div className="flex justify-between"><span>Tax 11%</span><span>{formatIDR(receipt.tax)}</span></div>
              <div className="flex justify-between text-base font-bold text-[var(--text-heading)]"><span>TOTAL</span><span>{formatIDR(receipt.total)}</span></div>
              <div className="flex justify-between pt-1"><span>{receipt.method}</span><span>{formatIDR(receipt.paid)}</span></div>
              {receipt.method === "Cash" && <div className="flex justify-between"><span>Change</span><span>{formatIDR(receipt.change)}</span></div>}
            </div>
            <p className="pt-2 text-center text-xs text-[var(--text-muted)]">Cashier: {currentUser.name} · Thank you! 🎾</p>
          </div>
        )}
      </ModalDialog>
    </PageScaffold>
  );
}
