import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { SiteHeader } from "@/components/app/site-header";
import { themeScript } from "@/components/app/theme-toggle";
import { CompareTray } from "@/components/app/compare";
import { COMMON, FOOTER, META } from "@/lib/copy";

export const metadata: Metadata = {
  title: META.title,
  description: META.description,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f6fc" },
    { media: "(prefers-color-scheme: dark)", color: "#1b1830" },
  ],
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh antialiased">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-card focus:px-3 focus:py-2">
          {COMMON.skipLink}
        </a>
        <SiteHeader />
        <main id="main" className="mx-auto w-full max-w-6xl px-4 pb-24">{children}</main>
        <CompareTray />
        <footer className="border-t py-6 text-xs text-muted-foreground">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4">
            <span>{FOOTER.note}</span>
            <Link href="/#data" className="underline-offset-2 hover:underline">{FOOTER.dataLink}</Link>
            <Link href="/data-gaps" className="underline-offset-2 hover:underline">{FOOTER.gapsLink}</Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
