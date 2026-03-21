import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Sora } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { QueryProvider } from "@/components/shared/query-provider";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { MockProvider } from "@/components/shared/mock-provider";
import { LocaleProvider } from "@/contexts/locale-context";
import { ThemeProvider } from "@/contexts/theme-context";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["700", "800"],
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
      <body className={`${inter.variable} ${sora.variable} ${jetbrainsMono.variable} antialiased`}>
        <ThemeProvider>
          <LocaleProvider>
            <MockProvider>
              <QueryProvider>
                <ErrorBoundary>
                  {children}
                </ErrorBoundary>
                <Toaster />
              </QueryProvider>
            </MockProvider>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
