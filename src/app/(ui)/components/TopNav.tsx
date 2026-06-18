"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

function Icon({ d }: { d: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {d.split("|").map((seg, i) => (
        <path key={i} d={seg} />
      ))}
    </svg>
  );
}

const NAV: { href: string; label: string; icon: ReactNode }[] = [
  { href: "/contracts", label: "Contracts", icon: <Icon d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z|M14 3v5h5|M9 13h6|M9 17h6" /> },
  { href: "/compare", label: "Compare", icon: <Icon d="M4 5h7v14H4z|M13 5h7v14h-7z" /> },
  { href: "/settings/standards", label: "Standards", icon: <Icon d="M4 7h16|M4 12h16|M4 17h16" /> },
];

export function TopNav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/contracts"
      ? pathname === "/contracts" || pathname.startsWith("/contracts/")
      : pathname.startsWith(href);

  return (
    <nav className="flex items-center gap-1">
      {NAV.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors max-sm:px-2.5"
            style={{
              color: active ? "var(--claret)" : "var(--ink-2)",
              background: active ? "color-mix(in srgb, var(--claret) 8%, transparent)" : "transparent",
            }}
          >
            <span style={{ color: active ? "var(--claret)" : "var(--ink-3)" }}>{item.icon}</span>
            <span className="max-sm:hidden">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
