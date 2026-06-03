"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Package, Hash, Tag, Boxes, Coins } from "lucide-react";
import Drawer from "@/components/ui/drawer/Drawer";
import Button from "@/components/ui/button/Button";
import TextInput from "@/components/ui/input/TextInput";
import Select from "@/components/ui/select/Select";
import Dropzone, { type DropzoneFile } from "@/components/ui/dropzone/Dropzone";
import {
  productCategories as seedCategories,
  categoryMeta,
  deriveSku,
  makeProductId,
  type Product,
  type ProductCategory,
} from "@/data/padel/engage/products";

/* Add / Edit product sheet. Five fields (name, category, price, stock, sku) →
 * MEDIUM input count → Drawer per the mandatory UI/UX rule. Emits a complete
 * Product up to the page, which owns the products list state. */

interface ProductFormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  /** when set, the drawer is in edit mode and pre-fills from this product */
  editing?: Product | null;
  onSubmit: (product: Product) => void;
}

interface FormState {
  name: string;
  category: ProductCategory;
  price: string;
  stock: string;
  sku: string;
  perHour: boolean;
  imageUrl: string;
}

const emptyForm: FormState = {
  name: "",
  category: "Rackets",
  price: "",
  stock: "",
  sku: "",
  perHour: false,
  imageUrl: "",
};

const digits = (v: string) => v.replace(/\D/g, "");

const ProductFormDrawer: React.FC<ProductFormDrawerProps> = ({
  isOpen,
  onClose,
  editing,
  onSubmit,
}) => {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [touched, setTouched] = useState(false);
  const [productCategories, setProductCategories] = useState<string[]>([...seedCategories]);

  // Sync form with editing target each time the drawer opens.
  useEffect(() => {
    if (!isOpen) return;
    setTouched(false);
    if (editing) {
      setForm({
        name: editing.name,
        category: editing.category,
        price: String(editing.price),
        stock: editing.stock === -1 ? "" : String(editing.stock),
        sku: editing.sku,
        perHour: !!editing.perHour,
        imageUrl: editing.image ?? "",
      });
    } else {
      setForm(emptyForm);
    }
  }, [isOpen, editing]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const priceNum = parseInt(digits(form.price), 10) || 0;
  const nameInvalid = touched && form.name.trim().length === 0;
  const priceInvalid = touched && priceNum <= 0;

  const unlimited = form.category === "Drinks" || form.category === "Rental";
  const stockNum = unlimited ? -1 : parseInt(digits(form.stock), 10) || 0;

  const handleImageDrop = useCallback((files: DropzoneFile[]) => {
    const file = files[0];
    if (!file) {
      set("imageUrl", "");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      set("imageUrl", reader.result as string);
    };
    reader.readAsDataURL(file.file);
  }, []);

  const handleSubmit = () => {
    setTouched(true);
    if (form.name.trim().length === 0 || priceNum <= 0) return;

    const base: Product = {
      id: editing?.id ?? makeProductId(),
      name: form.name.trim(),
      category: form.category,
      price: priceNum,
      stock: stockNum,
      emoji: editing?.emoji ?? categoryMeta[form.category].emoji,
      sku: form.sku.trim() || editing?.sku || deriveSku(form.name),
      perHour: form.perHour || undefined,
      popular: editing?.popular,
      active: editing?.active ?? true,
      image: form.imageUrl || undefined,
    };
    onSubmit(base);
    onClose();
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={editing ? "Edit Product" : "Add Product"}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" sheen onClick={handleSubmit}>
            {editing ? "Save Changes" : "Add Product"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <TextInput
          label="Product name"
          required
          placeholder="e.g. Bullpadel Vertex 04"
          value={form.name}
          startIcon={<Package className="h-4 w-4" />}
          error={nameInvalid}
          errorText="Product name is required"
          onChange={(v) => set("name", v)}
          hint="Nama produk yang tampil di katalog POS"
        />

        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--text-body)]">
            Product Image
          </label>
          <Dropzone
            title="Drop product image here"
            description="or click to browse (max 1 image)"
            multiple={false}
            validation={{ accept: ["image/png", "image/jpeg", "image/webp"], maxFiles: 1, maxSizeMB: 5 }}
            onFilesChange={handleImageDrop}
          />
          {form.imageUrl && (
            <div className="mt-2 flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={form.imageUrl}
                alt="Product preview"
                className="h-16 w-16 rounded-xl border border-[var(--border-default)] object-cover"
              />
              <button
                type="button"
                onClick={() => set("imageUrl", "")}
                className="text-xs text-red-500 hover:underline"
              >
                Remove
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--text-body)]">
            Category
          </label>
          <Select
            options={productCategories.map((c) => ({
              value: c,
              label: `${categoryMeta[c as ProductCategory]?.emoji ?? "📦"}  ${c}`,
            }))}
            value={form.category}
            searchable
            addable
            onAddOption={(label) => {
              setProductCategories((prev) => [...prev, label]);
              set("category", label as ProductCategory);
            }}
            onChange={(v) => set("category", v as ProductCategory)}
          />
          {unlimited && (
            <p className="mt-1.5 text-xs text-[var(--text-caption)]">
              {form.category} items are stock-unlimited (restocked on demand).
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <TextInput
            label="Price (IDR)"
            required
            placeholder="0"
            value={form.price ? Number(digits(form.price)).toLocaleString("id-ID") : ""}
            startIcon={<Coins className="h-4 w-4" />}
            error={priceInvalid}
            errorText="Enter a price"
            onChange={(v) => set("price", digits(v))}
            hint="Harga jual per item dalam Rupiah"
          />
          <TextInput
            label={unlimited ? "Stock (∞)" : "Initial stock"}
            placeholder={unlimited ? "Unlimited" : "0"}
            value={unlimited ? "" : form.stock}
            disabled={unlimited}
            startIcon={<Boxes className="h-4 w-4" />}
            onChange={(v) => set("stock", digits(v))}
            hint={unlimited ? "Stok otomatis tidak terbatas" : "Jumlah stok awal tersedia"}
          />
        </div>

        <TextInput
          label="SKU (optional)"
          placeholder="auto-generated if blank"
          value={form.sku}
          startIcon={<Hash className="h-4 w-4" />}
          onChange={(v) => set("sku", v.toUpperCase())}
          hint="Kode internal produk (otomatis jika kosong)"
        />

        {form.category === "Rental" && (
          <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-muted)] px-3.5 py-3">
            <input
              type="checkbox"
              checked={form.perHour}
              onChange={(e) => set("perHour", e.target.checked)}
              className="h-4 w-4 accent-[var(--color-primary)]"
            />
            <span className="flex items-center gap-1.5 text-sm text-[var(--text-body)]">
              <Tag className="h-4 w-4 text-[var(--text-muted)]" /> Charged per hour
            </span>
          </label>
        )}
      </div>
    </Drawer>
  );
};

export default ProductFormDrawer;
