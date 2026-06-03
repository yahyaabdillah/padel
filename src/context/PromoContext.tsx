"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNotifications } from "@/context/NotificationContext";
import type { MemberTier } from "@/data/padel/club/members";
import {
  seedEnginePromos,
  type ApplyResult,
  type EnginePromo,
  type PromoScope,
} from "@/data/padel/engage/promo-engine";

/* Promo engine store (dummy, no backend). Seeded with EnginePromo rows,
 * persisted to localStorage. Drives the real apply/validate flow consumed by
 * <PromoReferralInput> across every transaction surface. Mounted between the
 * Notification and FormBuilder providers so createPromo() can broadcast a
 * dummy notification when notify=true. */

const STORAGE_KEY = "padelhub-promo-engine-v1";

// Demo "today" — keep in sync with the project currentDate.
const TODAY_ISO = "2026-06-02";

type PromoContextType = {
  promos: EnginePromo[];
  createPromo: (p: Omit<EnginePromo, "id">) => EnginePromo;
  updatePromo: (id: string, patch: Partial<Omit<EnginePromo, "id">>) => void;
  togglePromo: (id: string) => void;
  deletePromo: (id: string) => void;
  getByCode: (code: string) => EnginePromo | undefined;
  applyPromo: (a: {
    code: string;
    scope: PromoScope;
    amount: number;
    tier?: MemberTier;
  }) => ApplyResult;
};

const PromoContext = createContext<PromoContextType | undefined>(undefined);

export const usePromos = () => {
  const ctx = useContext(PromoContext);
  if (!ctx) throw new Error("usePromos must be used within a PromoProvider");
  return ctx;
};

const genId = () =>
  `eng-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

const fail = (amount: number, reason: string): ApplyResult => ({
  ok: false,
  discount: 0,
  finalAmount: amount,
  reason,
});

export const PromoProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { push } = useNotifications();
  const [promos, setPromos] = useState<EnginePromo[]>(() => [
    ...seedEnginePromos,
  ]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as EnginePromo[];
        if (Array.isArray(parsed) && parsed.length) setPromos(parsed);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const persist = useCallback((next: EnginePromo[]) => {
    if (typeof window !== "undefined")
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const commit = useCallback(
    (updater: (prev: EnginePromo[]) => EnginePromo[]) => {
      setPromos((prev) => {
        const next = updater(prev);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const createPromo = useCallback<PromoContextType["createPromo"]>(
    (p) => {
      const created: EnginePromo = { ...p, id: genId() };
      commit((prev) => [created, ...prev]);
      if (p.notify) {
        push({
          type: "payment",
          title: "Promo broadcast",
          message: `Kode ${p.code} kini aktif — ${p.name}.`,
        });
      }
      return created;
    },
    [commit, push],
  );

  const updatePromo = useCallback<PromoContextType["updatePromo"]>(
    (id, patch) => {
      commit((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      );
    },
    [commit],
  );

  const togglePromo = useCallback<PromoContextType["togglePromo"]>(
    (id) => {
      commit((prev) =>
        prev.map((p) => (p.id === id ? { ...p, active: !p.active } : p)),
      );
    },
    [commit],
  );

  const deletePromo = useCallback<PromoContextType["deletePromo"]>(
    (id) => {
      commit((prev) => prev.filter((p) => p.id !== id));
    },
    [commit],
  );

  const getByCode = useCallback<PromoContextType["getByCode"]>(
    (code) => {
      const norm = code.trim().toUpperCase();
      return promos.find((p) => p.code.toUpperCase() === norm);
    },
    [promos],
  );

  const applyPromo = useCallback<PromoContextType["applyPromo"]>(
    ({ code, scope, amount, tier }) => {
      const trimmed = code.trim();
      if (!trimmed) return fail(amount, "Masukkan kode promo.");

      const promo = getByCode(trimmed);
      // 1. exists
      if (!promo) return fail(amount, "Kode promo tidak ditemukan.");
      // 2. active
      if (!promo.active) return fail(amount, "Promo sedang nonaktif.");
      // 3. date window
      if (TODAY_ISO < promo.validFrom)
        return fail(amount, `Promo berlaku mulai ${promo.validFrom}.`);
      if (TODAY_ISO > promo.validTo)
        return fail(amount, "Promo sudah kedaluwarsa.");
      // 4. scope
      if (!promo.appliesTo.includes(scope))
        return fail(amount, "Promo tidak berlaku untuk transaksi ini.");
      // 5. audience tier
      if (promo.audience !== "all") {
        if (!tier || !promo.audience.includes(tier))
          return fail(amount, "Promo khusus tier member tertentu.");
      }
      // 6. minimum spend
      if (promo.minSpend != null && amount < promo.minSpend)
        return fail(
          amount,
          `Minimal transaksi Rp${promo.minSpend.toLocaleString("id-ID")}.`,
        );

      // 7. compute discount
      let discount =
        promo.type === "percent"
          ? Math.round((amount * promo.value) / 100)
          : Math.min(promo.value, amount);
      if (promo.maxDiscount != null) discount = Math.min(discount, promo.maxDiscount);
      discount = Math.min(discount, amount);

      return {
        ok: true,
        discount,
        finalAmount: amount - discount,
        code: promo.code,
        reason: `Promo ${promo.code} diterapkan.`,
      };
    },
    [getByCode],
  );

  const value = useMemo<PromoContextType>(
    () => ({
      promos,
      createPromo,
      updatePromo,
      togglePromo,
      deletePromo,
      getByCode,
      applyPromo,
    }),
    [
      promos,
      createPromo,
      updatePromo,
      togglePromo,
      deletePromo,
      getByCode,
      applyPromo,
    ],
  );

  return (
    <PromoContext.Provider value={value}>{children}</PromoContext.Provider>
  );
};
