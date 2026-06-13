import Link from "next/link";
import { SignInButton, UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { Disclaimer } from "@/app/(ui)/components/Disclaimer";

/** App frame: a calm vellum sidebar (the "docket") + content. Editorial, restrained (FRONTEND_DESIGN §7). */
export async function AppShell({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  return (
    <div className="grid min-h-full grid-cols-[260px_1fr] max-md:grid-cols-1">
      <aside className="flex flex-col border-r border-[var(--paper-edge)] bg-[var(--paper-2)] p-6 max-md:hidden">
        <Link href="/" className="block">
          <p className="eyebrow">Legal Document Intelligence</p>
          <h1 className="mt-1 text-2xl text-[var(--ink)]">
            Case<span className="text-[var(--claret)]">Pilot</span>
          </h1>
        </Link>
        <nav className="mt-8 flex flex-col gap-1 text-sm text-[var(--ink-2)]">
          <Link href="/" className="rounded px-2 py-1.5 hover:bg-[var(--paper-edge)]/50">
            Contracts
          </Link>
        </nav>
        <div className="mt-auto pt-6">{userId ? <UserButton /> : <SignInButton />}</div>
      </aside>

      <div className="flex min-h-full flex-col">
        <main className="flex-1 px-8 py-10 max-md:px-5">{children}</main>
        <Disclaimer />
      </div>
    </div>
  );
}
