"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

function Icon({ d }: { d: string }) {
  return (
    <svg
      width="20"
      height="20"
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
  { href: "/", label: "Contracts", icon: <Icon d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z|M14 3v5h5|M9 13h6|M9 17h6" /> },
  { href: "/compare", label: "Compare", icon: <Icon d="M4 5h7v14H4z|M13 5h7v14h-7z" /> },
  { href: "/settings/standards", label: "Standards", icon: <Icon d="M4 7h16|M4 12h16|M4 17h16|M9 7v0|M15 12v0|M7 17v0" /> },
];

export function SidebarNav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" || pathname.startsWith("/contracts") : pathname.startsWith(href);

  return (
    <nav className="mt-8 flex flex-col gap-1">
      {NAV.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className="group relative flex items-center gap-3.5 rounded-lg px-3 py-3 text-[15px] font-medium transition-colors"
            style={{
              color: active ? "var(--claret)" : "var(--ink-2)",
              background: active ? "color-mix(in srgb, var(--claret) 8%, transparent)" : "transparent",
            }}
          >
            <span
              className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-full bg-[var(--claret)] transition-opacity"
              style={{ opacity: active ? 1 : 0 }}
              aria-hidden
            />
            <span style={{ color: active ? "var(--claret)" : "var(--ink-3)" }}>{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
