import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { cn } from "@/lib/utils";
import { AppShell } from "@/components/layout/app-shell";

const iranYekan = localFont({
  src: [
    {
      path: "../../public/fonts/iranyekanwebregular.woff2",
      weight: "100 900",
      style: "normal",
    },
    {
      path: "../../public/fonts/iranyekanwebregular.woff",
      weight: "100 900",
      style: "normal",
    },
    {
      path: "../../public/fonts/iranyekanwebregular.ttf",
      weight: "100 900",
      style: "normal",
    },
  ],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "نبض زرین | Zarin Pulse",
  description: "مرکز اقدام هوشمند برای پذیرندگان زرین‌پال",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fa"
      dir="rtl"
      className={cn("font-sans", iranYekan.variable)}
      suppressHydrationWarning
    >
      <body className={iranYekan.className}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
