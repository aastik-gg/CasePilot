import Link from "next/link";
import { SignInButton, UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { BrandMark } from "@/app/(ui)/components/BrandMark";
import { SidebarNav } from "@/app/(ui)/components/SidebarNav";
import { Disclaimer } from "@/app/(ui)/components/Disclaimer";

/** App frame: a calm vellum sidebar (the "docket") + content. Editorial, restrained (FRONTEND_DESIGN §7). */
export async function AppShell({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  return (
    <div className="grid min-h-screen grid-cols-[256px_1fr] max-md:grid-cols-1">
      <aside className="sticky top-0 flex h-screen flex-col border-r border-[var(--paper-edge)] bg-[var(--paper-2)] px-5 py-6 max-md:static max-md:h-auto max-md:flex-row max-md:items-center max-md:gap-4 max-md:py-3">
        <Link href="/" className="flex items-center gap-3">
          <BrandMark size={36} />
          <span>
            <span className="block text-xl leading-none text-[var(--ink)]" style={{ fontFamily: "var(--font-display)" }}>
              Case<span className="text-[var(--claret)]">Pilot</span>
            </span>
            <span className="eyebrow mt-1 block max-md:hidden">Legal Document Intelligence</span>
          </span>
        </Link>

        <div className="max-md:hidden">
          <SidebarNav />
        </div>

        <div className="mt-auto flex items-center gap-3 border-t border-[var(--paper-edge)] pt-4 max-md:mt-0 max-md:ml-auto max-md:border-0 max-md:pt-0">
          {userId ? <UserButton /> : <SignInButton />}
          <span className="text-xs text-[var(--ink-3)] max-md:hidden">Your workspace</span>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <main className="flex-1 px-10 py-12 max-md:px-5 max-md:py-8">{children}</main>
        <Disclaimer />
      </div>
    </div>
  );
}
