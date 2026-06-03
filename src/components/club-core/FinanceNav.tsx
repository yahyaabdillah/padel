"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/finance", label: "Transactions" },
  { href: "/finance/invoices", label: "Invoices" },
  { href: "/finance/reports", label: "Reports" },
];

const FinanceNav: React.FC = () => {
  const pathname = usePathname();
  return (
    <div className="mb-5 inline-flex rounded-xl bg-gray-100 p-1 dark:bg-white/5">
      {links.map((l) => {
        const active = pathname === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            className={[
              "rounded-lg px-4 py-2 text-sm font-medium transition-all",
              active
                ? "bg-white text-brand-600 shadow-theme-xs dark:bg-gray-800 dark:text-brand-400"
                : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200",
            ].join(" ")}
          >
            {l.label}
          </Link>
        );
      })}
    </div>
  );
};

export default FinanceNav;
