"use client";

import React, { useState, ReactNode } from "react";
import Link from "next/link";
import { twMerge } from "tailwind-merge";

export type SidebarChild = {
  label: string;
  href?: string;
  badge?: string | number;
  children?: SidebarChild[]; // grandchild
};

export type SidebarItem = {
  label: string;
  href?: string;
  icon?: ReactNode;
  badge?: string | number;
  children?: SidebarChild[];
};

export type SidebarGroup = {
  title?: string;
  items: SidebarItem[];
  /** render the group as a collapsible accordion (LAINNYA pattern) */
  collapsible?: boolean;
  /** initial open state for a collapsible group */
  defaultOpen?: boolean;
};

interface SidebarProps {
  groups: SidebarGroup[];
  activePath?: string;
  collapsed?: boolean;
  logo?: ReactNode;
  footer?: ReactNode;
  onNavigate?: (href: string) => void;
  className?: string;
}

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg className={`h-4 w-4 shrink-0 transition-transform duration-200 ${open ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

function isActive(path = "", href?: string) {
  if (!href) return false;
  if (href === "/") return path === "/";
  return path === href || path.startsWith(href + "/");
}

function hasActiveDescendant(path: string, children?: SidebarChild[]): boolean {
  if (!children) return false;
  return children.some((c) => isActive(path, c.href) || hasActiveDescendant(path, c.children));
}

function itemHasActive(path: string, item: SidebarItem): boolean {
  return isActive(path, item.href) || hasActiveDescendant(path, item.children);
}

function groupHasActive(path: string, items: SidebarItem[]): boolean {
  return items.some((i) => itemHasActive(path, i));
}

// ── Badge kecil ──
const MiniBadge = ({ value }: { value: string | number }) => (
  <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-primary-light)] px-1.5 text-[10px] font-semibold text-[var(--color-primary)]">
    {value}
  </span>
);

// ── Grandchild / Child renderer ──
const ChildNode: React.FC<{
  node: SidebarChild;
  path: string;
  depth: number;
  onNavigate?: (href: string) => void;
}> = ({ node, path, depth, onNavigate }) => {
  const active = isActive(path, node.href);
  const hasKids = !!node.children?.length;
  const [open, setOpen] = useState(hasActiveDescendant(path, node.children));

  if (hasKids) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={[
            "flex w-full items-center gap-2 rounded-lg py-2 pr-2.5 text-sm transition-colors",
            "text-[var(--text-caption)] hover:bg-[var(--sidebar-item-hover-bg,var(--surface-muted))] hover:text-[var(--text-heading)]",
          ].join(" ")}
          style={{ paddingLeft: `${depth * 14 + 12}px` }}
        >
          <span className="truncate">{node.label}</span>
          <span className="ml-auto"><ChevronIcon open={open} /></span>
        </button>
        {open && (
          <div className="mt-0.5 space-y-0.5">
            {node.children!.map((c, i) => (
              <ChildNode key={i} node={c} path={path} depth={depth + 1} onNavigate={onNavigate} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      href={node.href || "#"}
      onClick={() => node.href && onNavigate?.(node.href)}
      className={[
        "flex items-center gap-2 rounded-lg py-2 pr-2.5 text-sm transition-colors",
        active
          ? "bg-[var(--color-primary-light)] font-medium text-[var(--color-primary)]"
          : "text-[var(--text-caption)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-heading)]",
      ].join(" ")}
      style={{ paddingLeft: `${depth * 14 + 12}px` }}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${active ? "bg-[var(--color-primary)]" : "bg-[var(--border-strong)]"}`} />
      <span className="truncate">{node.label}</span>
      {node.badge !== undefined && <MiniBadge value={node.badge} />}
    </Link>
  );
};

// ── Top-level item ──
const ItemNode: React.FC<{
  item: SidebarItem;
  path: string;
  collapsed: boolean;
  onNavigate?: (href: string) => void;
}> = ({ item, path, collapsed, onNavigate }) => {
  const hasKids = !!item.children?.length;
  const active = isActive(path, item.href) || hasActiveDescendant(path, item.children);
  const [open, setOpen] = useState(hasActiveDescendant(path, item.children));

  const baseRow =
    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors";

  if (hasKids && !collapsed) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={[
            baseRow,
            active
              ? "bg-[var(--color-primary-light)] text-[var(--color-primary)]"
              : "text-[var(--text-body)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-heading)]",
          ].join(" ")}
        >
          {item.icon && <span className="shrink-0">{item.icon}</span>}
          <span className="truncate">{item.label}</span>
          {item.badge !== undefined && <MiniBadge value={item.badge} />}
          <span className={item.badge !== undefined ? "ml-1" : "ml-auto"}><ChevronIcon open={open} /></span>
        </button>
        {open && (
          <div className="mt-1 space-y-0.5">
            {item.children!.map((c, i) => (
              <ChildNode key={i} node={c} path={path} depth={1} onNavigate={onNavigate} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // leaf / collapsed
  return (
    <Link
      href={item.href || "#"}
      onClick={() => item.href && onNavigate?.(item.href)}
      title={collapsed ? item.label : undefined}
      className={[
        baseRow,
        collapsed ? "justify-center" : "",
        active
          ? "bg-[var(--color-primary-light)] text-[var(--color-primary)]"
          : "text-[var(--text-body)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-heading)]",
      ].join(" ")}
    >
      {item.icon && <span className="shrink-0">{item.icon}</span>}
      {!collapsed && <span className="truncate">{item.label}</span>}
      {!collapsed && item.badge !== undefined && <MiniBadge value={item.badge} />}
    </Link>
  );
};

const GroupGridIcon = () => (
  <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 5.5A1.5 1.5 0 015.5 4h3A1.5 1.5 0 0110 5.5v3A1.5 1.5 0 018.5 10h-3A1.5 1.5 0 014 8.5v-3zM14 5.5A1.5 1.5 0 0115.5 4h3A1.5 1.5 0 0120 5.5v3A1.5 1.5 0 0118.5 10h-3A1.5 1.5 0 0114 8.5v-3zM4 15.5A1.5 1.5 0 015.5 14h3A1.5 1.5 0 0110 15.5v3A1.5 1.5 0 018.5 20h-3A1.5 1.5 0 014 18.5v-3zM14 15.5A1.5 1.5 0 0115.5 14h3a1.5 1.5 0 011.5 1.5v3a1.5 1.5 0 01-1.5 1.5h-3a1.5 1.5 0 01-1.5-1.5v-3z" />
  </svg>
);

// Collapsible "LAINNYA"-style group: a toggle row whose chevron expands the
// group's items into an indented accordion. Auto-opens if a descendant is active.
const CollapsibleGroup: React.FC<{
  group: SidebarGroup;
  path: string;
  collapsed: boolean;
  onNavigate?: (href: string) => void;
}> = ({ group, path, collapsed, onNavigate }) => {
  const active = groupHasActive(path, group.items);
  const [open, setOpen] = useState(group.defaultOpen ?? false);
  const isOpen = open || active;

  if (collapsed) {
    // Collapsed rail: drop the header chrome, show the icons inline.
    return (
      <div className="space-y-1">
        {group.items.map((item, ii) => (
          <ItemNode key={ii} item={item} path={path} collapsed={collapsed} onNavigate={onNavigate} />
        ))}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={[
          "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
          active || isOpen
            ? "bg-[var(--color-primary-light)] text-[var(--color-primary)]"
            : "text-[var(--text-body)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-heading)]",
        ].join(" ")}
      >
        <GroupGridIcon />
        <span className="truncate">{group.title ?? "Lainnya"}</span>
        <span className="ml-auto"><ChevronIcon open={isOpen} /></span>
      </button>
      {isOpen && (
        <div className="mt-1 ml-3 space-y-1 border-l border-[var(--border-light)] pl-2">
          {group.items.map((item, ii) => (
            <ItemNode key={ii} item={item} path={path} collapsed={collapsed} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </div>
  );
};

const Sidebar: React.FC<SidebarProps> = ({
  groups,
  activePath = "",
  collapsed = false,
  logo,
  footer,
  onNavigate,
  className = "",
}) => {
  return (
    <aside
      className={twMerge(
        "flex h-full flex-col bg-[var(--sidebar-bg,var(--surface-card))] transition-all duration-300",
        collapsed ? "w-[84px]" : "w-[260px]",
        className,
      )}
    >
      {logo && (
        <div className={`flex h-16 items-center px-4 ${collapsed ? "justify-center" : ""}`}>{logo}</div>
      )}

      <nav className="flex-1 overflow-y-auto custom-scrollbar px-3 py-4">
        <div className="space-y-6">
          {groups.map((group, gi) => {
            if (group.collapsible) {
              return (
                <div key={gi}>
                  {group.title && !collapsed && (
                    <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                      {group.title}
                    </p>
                  )}
                  <CollapsibleGroup
                    group={group}
                    path={activePath}
                    collapsed={collapsed}
                    onNavigate={onNavigate}
                  />
                </div>
              );
            }
            return (
              <div key={gi}>
                {group.title && !collapsed && (
                  <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                    {group.title}
                  </p>
                )}
                <div className="space-y-1">
                  {group.items.map((item, ii) => (
                    <ItemNode key={ii} item={item} path={activePath} collapsed={collapsed} onNavigate={onNavigate} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </nav>

      {footer && <div className="border-t border-[var(--border-light)] p-3">{footer}</div>}
    </aside>
  );
};

export default Sidebar;
