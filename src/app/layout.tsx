import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { Inter, JetBrains_Mono, Sora } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { QueryProvider } from "@/components/shared/query-provider";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { MockProvider } from "@/components/shared/mock-provider";
import { LocaleProvider } from "@/contexts/locale-context";
import { ThemeProvider } from "@/contexts/theme-context";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, type Locale } from "@/lib/i18n";

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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://propodium.cz"),
  title: {
    default: "ProPodium",
    template: "%s | ProPodium",
  },
  description: "Competition management for ballroom dancing",
  formatDetection: { telephone: false },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Prefer URL-derived locale on /[locale]/** routes so a direct crawl from
  // Googlebot always sees the correct <html lang> regardless of cookie state.
  // Fall back to the cookie for non-localized routes (dashboard, auth, etc.).
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  const pathname = headerStore.get("x-pathname") ?? "";
  const hasEnPrefix = pathname === "/en" || pathname.startsWith("/en/");
  const isLocalizedPublic =
    pathname === "/" ||
    ["/competitions", "/scoreboard", "/privacy"].some(
      (p) => pathname === p || pathname.startsWith(p + "/"),
    );
  // /en/* → en; unprefixed localized paths (/, /competitions, ...) → cs (next-intl default)
  const urlLocale: Locale | undefined = hasEnPrefix
    ? "en"
    : isLocalizedPublic
    ? "cs"
    : undefined;
  const cookieLocale = cookieStore.get(LOCALE_STORAGE_KEY)?.value;
  const initialLocale: Locale =
    urlLocale ??
    (cookieLocale === "cs" || cookieLocale === "en" ? cookieLocale : DEFAULT_LOCALE);

  return (
    <html lang={initialLocale} suppressHydrationWarning>
      <body className={`${inter.variable} ${sora.variable} ${jetbrainsMono.variable} antialiased`}>
        <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? ""}>
          <ThemeProvider>
            <LocaleProvider initialLocale={initialLocale}>
              <MockProvider>
                <QueryProvider>
                  <a
                    href="#main-content"
                    className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[999] focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-black focus:shadow-lg focus:outline-2 focus:outline-blue-600"
                  >
                    Přeskočit na hlavní obsah
                  </a>
                  <ErrorBoundary>
                    {children}
                  </ErrorBoundary>
                  <Toaster />
                </QueryProvider>
              </MockProvider>
            </LocaleProvider>
          </ThemeProvider>
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}
