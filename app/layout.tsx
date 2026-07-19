import type { Metadata, Viewport } from "next";
import { LocaleProvider } from "@/components/locale-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "FORA Navigator — понятный маршрут для семьи",
  description:
    "AI-навигация для семей мигрантов с детьми и молодыми взрослыми с инвалидностью в Астурии.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f5f0e6",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" data-scroll-behavior="smooth">
      <body><LocaleProvider>{children}</LocaleProvider></body>
    </html>
  );
}
