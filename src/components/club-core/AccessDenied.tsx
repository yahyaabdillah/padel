// PadelHub — server-rendered "Access Denied" panel. Shown by gated pages when
// the current role lacks view access (resolved server-side, before any data is
// fetched). No "use client" — safe to render from a Server Component.

import React from "react";
import { ShieldIcon } from "@/icons/gym-icons";

export default function AccessDenied({ menuLabel }: { menuLabel?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
        <ShieldIcon className="h-7 w-7" />
      </div>
      <h1 className="mt-5 text-xl font-semibold text-gray-900 dark:text-white">
        Akses Ditolak
      </h1>
      <p className="mx-auto mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">
        Role Anda tidak memiliki izin untuk membuka
        {menuLabel ? ` "${menuLabel}"` : " halaman ini"}. Hubungi admin untuk
        meminta akses.
      </p>
    </div>
  );
}
