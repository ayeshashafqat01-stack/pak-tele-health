import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible } from "next/font/google";
import { Providers } from "@/shared/ui/components/providers";
import "@/shared/ui/tokens/design-tokens.css";
import "./globals.css";

const atkinson = Atkinson_Hyperlegible({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-atkinson",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Pak-Tele-Health",
  description:
    "Rural healthcare worker collects, remote doctor reviews. MVP with synthetic data only.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0c3438",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Prevent theme flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('pth-theme');if(t&&t!=='system'){document.documentElement.setAttribute('data-theme',t)}}catch(e){}})()`,
          }}
        />
      </head>
      <body
        className={`${atkinson.variable} min-h-screen`}
        style={{
          fontFamily: "var(--font-family)",
          backgroundColor: "var(--color-surface-base)",
          color: "var(--color-text-primary)",
          lineHeight: "var(--line-height-normal)",
        }}
      >
        <Providers>{children}</Providers>
        <div
          id="toast-root"
          role="status"
          aria-live="polite"
          className="fixed left-1/2 -translate-x-1/2 bottom-4 z-50"
        />
      </body>
    </html>
  );
}
