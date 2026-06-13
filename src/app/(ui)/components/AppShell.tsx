import Link from "next/link";
import { SignInButton, UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { BrandMark } from "@/app/(ui)/components/BrandMark";
import { TopNav } from "@/app/(ui)/components/TopNav";
import { Disclaimer } from "@/app/(ui)/components/Disclaimer";

/**
 * App frame: a refined masthead (top bar) over full-width content. A top bar fits shallow
 * navigation (≤5 destinations) better than a persistent sidebar and frees the page width for the
 * wide document / clause views (FRONTEND_DESIGN §6–7).
 */
export async function AppShell({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  return (
    <div className="flex min-h-screen flex-col">
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
            <TopNav />
            <div className="ml-1 flex items-center border-l border-[var(--paper-edge)] pl-4">
              {userId ? <UserButton /> : <SignInButton />}
            </div>
          </div>
        </div>
      </header>

      <main className="w-full flex-1 px-8 py-10 max-md:px-4 max-md:py-6">{children}</main>
      <Disclaimer />
    </div>
  );
}
