"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignInButton, UserButton } from "@clerk/nextjs";
import { BrandMark } from "@/app/(ui)/components/BrandMark";
import { TopNav } from "@/app/(ui)/components/TopNav";

export function AppShellHeader({ userId }: { userId: string | null }) {
  const pathname = usePathname();
  const isLanding = pathname === "/";

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--paper-edge)] bg-[var(--paper)]/85 backdrop-blur">
      <div className="flex h-16 items-center justify-between gap-6 px-8 max-md:px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <BrandMark size={32} />
          <span
            className="text-xl leading-none text-[var(--ink)] max-sm:hidden"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Case<span className="text-[var(--claret)]">Pilot</span>
          </span>
        </Link>

        <div className="flex items-center gap-4">
          {!isLanding && <TopNav />}
          <div
            className={
              isLanding ? "flex items-center" : "ml-1 flex items-center border-l border-[var(--paper-edge)] pl-4"
            }
          >
            {userId ? <UserButton /> : <SignInButton />}
          </div>
        </div>
      </div>
    </header>
  );
}
