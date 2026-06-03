// PadelHub — Pro-shop POS dummy data: products + rentals.

export type ProductCategory =
  | "Rackets"
  | "Balls"
  | "Grips"
  | "Apparel"
  | "Drinks"
  | "Rental";

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  brand?: string;
  price: number; // IDR
  stock: number; // -1 = unlimited (rentals / drinks restocked)
  /** emoji used as a lightweight product visual (no asset deps) */
  emoji: string;
  sku: string;
  /** for rentals: charged per hour */
  perHour?: boolean;
  popular?: boolean;
  /** sellable / shown in storefront. Undefined is treated as active. */
  active?: boolean;
  /** optional product image as data URL */
  image?: string;
}

/** Stock at or below this (and not unlimited) shows a low-stock warning. */
export const LOW_STOCK_THRESHOLD = 5;

/** True when a tracked product is running low (excludes unlimited -1). */
export function isLowStock(stock: number, threshold = LOW_STOCK_THRESHOLD): boolean {
  return stock !== -1 && stock > 0 && stock <= threshold;
}

/** Active unless explicitly set to false. */
export function isProductActive(p: Pick<Product, "active">): boolean {
  return p.active !== false;
}

export const products: Product[] = [
  // Rackets
  { id: "rk-01", name: "Bullpadel Vertex 04", category: "Rackets", brand: "Bullpadel", price: 4_350_000, stock: 6, emoji: "🎾", sku: "BP-VTX04", popular: true },
  { id: "rk-02", name: "Nox AT10 Genius", category: "Rackets", brand: "Nox", price: 3_900_000, stock: 4, emoji: "🎾", sku: "NX-AT10" },
  { id: "rk-03", name: "Adidas Metalbone 3.3", category: "Rackets", brand: "Adidas", price: 4_100_000, stock: 3, emoji: "🎾", sku: "AD-MB33" },
  { id: "rk-04", name: "Head Delta Pro", category: "Rackets", brand: "Head", price: 3_250_000, stock: 0, emoji: "🎾", sku: "HD-DLP" },

  // Balls
  { id: "bl-01", name: "Head Padel Pro (tube 3)", category: "Balls", brand: "Head", price: 95_000, stock: 48, emoji: "🥎", sku: "HD-PP3", popular: true },
  { id: "bl-02", name: "Wilson Padel X3", category: "Balls", brand: "Wilson", price: 88_000, stock: 60, emoji: "🥎", sku: "WL-X3" },
  { id: "bl-03", name: "Bullpadel Premium (tube 3)", category: "Balls", brand: "Bullpadel", price: 99_000, stock: 30, emoji: "🥎", sku: "BP-PRM" },

  // Grips
  { id: "gr-01", name: "Overgrip Pack (x3)", category: "Grips", brand: "Wilson", price: 75_000, stock: 80, emoji: "🧤", sku: "WL-OG3", popular: true },
  { id: "gr-02", name: "Comfort Overgrip", category: "Grips", brand: "Head", price: 30_000, stock: 120, emoji: "🧤", sku: "HD-OG1" },
  { id: "gr-03", name: "Anti-Slip Tacky Grip", category: "Grips", brand: "Nox", price: 45_000, stock: 65, emoji: "🧤", sku: "NX-AST" },

  // Apparel
  { id: "ap-01", name: "SmashCourt Dri-Fit Tee", category: "Apparel", brand: "SmashCourt", price: 220_000, stock: 25, emoji: "👕", sku: "SC-TEE" },
  { id: "ap-02", name: "Performance Cap", category: "Apparel", brand: "SmashCourt", price: 150_000, stock: 18, emoji: "🧢", sku: "SC-CAP" },
  { id: "ap-03", name: "Sport Socks (pair)", category: "Apparel", brand: "Nike", price: 90_000, stock: 40, emoji: "🧦", sku: "NK-SCK" },

  // Drinks
  { id: "dr-01", name: "Isotonic Sports Drink", category: "Drinks", price: 25_000, stock: -1, emoji: "🥤", sku: "DR-ISO", popular: true },
  { id: "dr-02", name: "Mineral Water 600ml", category: "Drinks", price: 10_000, stock: -1, emoji: "💧", sku: "DR-WTR" },
  { id: "dr-03", name: "Cold Brew Coffee", category: "Drinks", price: 35_000, stock: -1, emoji: "☕", sku: "DR-CFE" },
  { id: "dr-04", name: "Protein Shake", category: "Drinks", price: 40_000, stock: -1, emoji: "🥛", sku: "DR-PRO" },

  // Rentals
  { id: "rn-01", name: "Court Rental (peak)", category: "Rental", price: 350_000, stock: -1, emoji: "🏟️", sku: "RN-CRTP", perHour: true, popular: true },
  { id: "rn-02", name: "Court Rental (off-peak)", category: "Rental", price: 220_000, stock: -1, emoji: "🏟️", sku: "RN-CRTO", perHour: true },
  { id: "rn-03", name: "Racket Rental", category: "Rental", price: 50_000, stock: -1, emoji: "🎾", sku: "RN-RKT", perHour: true },
  { id: "rn-04", name: "Ball Basket Rental", category: "Rental", price: 60_000, stock: -1, emoji: "🧺", sku: "RN-BSK", perHour: true },
];

export const productCategories: ProductCategory[] = [
  "Rackets",
  "Balls",
  "Grips",
  "Apparel",
  "Drinks",
  "Rental",
];

export const categoryMeta: Record<ProductCategory, { emoji: string }> = {
  Rackets: { emoji: "🎾" },
  Balls: { emoji: "🥎" },
  Grips: { emoji: "🧤" },
  Apparel: { emoji: "👕" },
  Drinks: { emoji: "🥤" },
  Rental: { emoji: "🏟️" },
};

/** Recent POS sales feed (today). */
export interface RecentSale {
  id: string;
  receiptNo: string;
  items: number;
  total: number;
  method: "Cash" | "Card" | "QRIS" | "Wallet";
  cashier: string;
  time: string;
}

export const recentSales: RecentSale[] = [
  { id: "sal-01", receiptNo: "RCP-20260602-014", items: 3, total: 285_000, method: "QRIS", cashier: "Budi Santoso", time: "14:32" },
  { id: "sal-02", receiptNo: "RCP-20260602-013", items: 1, total: 4_350_000, method: "Card", cashier: "Budi Santoso", time: "13:05" },
  { id: "sal-03", receiptNo: "RCP-20260602-012", items: 2, total: 120_000, method: "Cash", cashier: "Budi Santoso", time: "12:18" },
  { id: "sal-04", receiptNo: "RCP-20260602-011", items: 4, total: 410_000, method: "Wallet", cashier: "Budi Santoso", time: "11:47" },
];

export const paymentMethods = ["Cash", "Card", "QRIS", "Wallet"] as const;
export type PaymentMethod = (typeof paymentMethods)[number];

/** Generate a unique product id (local/dummy only). */
export function makeProductId(): string {
  return `pr-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4)
    .toString(36)
    .padStart(3, "0")}`;
}

/** Derive a fallback SKU from a product name when the cashier leaves it blank. */
export function deriveSku(name: string): string {
  const slug = name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 10);
  return `SKU-${slug || "ITEM"}-${Math.floor(Math.random() * 900) + 100}`;
}
