import type { Metadata, Viewport } from "next";
import Link from "next/link";
import Script from "next/script";
import "./globals.css";
import { SiteHeader } from "@/components/app/site-header";
import { themeScript } from "@/components/app/theme-toggle";
import { CompareTray } from "@/components/app/compare";
import { AppNav } from "@/components/app/app-nav";
import { COMMON, FOOTER, META } from "@/lib/copy";

export const metadata: Metadata = {
  title: META.title,
  description: META.description,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export const dynamic = "force-dynamic";

const YM_ID = Number(process.env.NEXT_PUBLIC_YM_ID) || null;

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
        <div className="flex">
          <AppNav />
          <main id="main" className="mx-auto w-full min-w-0 max-w-6xl px-4 pb-28 md:px-8 md:pb-16">{children}</main>
        </div>
        <CompareTray />
        {YM_ID && (
          // Яндекс Метрика: цели — события track() (reachGoal), вебвизор и карта кликов. Настройка — в README.
          <Script id="ym" strategy="afterInteractive">{`(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");ym(${YM_ID},"init",{clickmap:true,trackLinks:true,accurateTrackBounce:true,webvisor:true});`}</Script>
        )}
        <footer className="no-print border-t py-6 pb-24 text-xs text-muted-foreground md:pb-6">
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
