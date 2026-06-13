import type { Metadata } from "next";
import { Newsreader, Public_Sans, IBM_Plex_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { AppShell } from "@/app/(ui)/components/AppShell";
import "./globals.css";

// "Counsel's Brief" type system (FRONTEND_DESIGN §2): editorial serif + civic sans + record mono.
const display = Newsreader({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const body = Public_Sans({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CasePilot — Legal Document Intelligence",
  description: "Find the risk in 100-page contracts before your lawyer does.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${display.variable} ${body.variable} ${mono.variable} h-full antialiased`}
      >
        <body className="min-h-full">
          <AppShell>{children}</AppShell>
        </body>
      </html>
    </ClerkProvider>
  );
}
