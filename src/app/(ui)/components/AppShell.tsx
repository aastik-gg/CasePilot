import { auth } from "@clerk/nextjs/server";
import { AppShellHeader } from "@/app/(ui)/components/AppShellHeader";
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
      <AppShellHeader userId={userId} />

      <main className="w-full flex-1 px-8 py-10 max-md:px-4 max-md:py-6">{children}</main>
      <Disclaimer />
    </div>
  );
}
