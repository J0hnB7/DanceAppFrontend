import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { QueryProvider } from "@/components/shared/query-provider";
import { MockProvider } from "@/components/shared/mock-provider";
import { LocaleProvider } from "@/contexts/locale-context";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "DanceApp",
    template: "%s | DanceApp",
  },
  description: "Competition management for ballroom dancing",
  formatDetection: { telephone: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sk" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}>
        <LocaleProvider>
          <MockProvider>
            <QueryProvider>
              {children}
              <Toaster />
            </QueryProvider>
          </MockProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
