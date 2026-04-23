import type { Metadata } from "next";

// Builds the alternates object for a localized page. Pass the CANONICAL path
// (the Czech URL, without /en prefix). Next.js emits:
//   <link rel="canonical" href="<base>/competitions/123">
//   <link rel="alternate" hreflang="cs" href="<base>/competitions/123">
//   <link rel="alternate" hreflang="en" href="<base>/en/competitions/123">
//   <link rel="alternate" hreflang="x-default" href="<base>/competitions/123">
// metadataBase is set once in the root layout.
export function localizedAlternates(canonicalPath: string): Metadata["alternates"] {
  const normalized = canonicalPath.startsWith("/") ? canonicalPath : `/${canonicalPath}`;
  const enPath = normalized === "/" ? "/en" : `/en${normalized}`;
  return {
    canonical: normalized,
    languages: {
      cs: normalized,
      en: enPath,
      "x-default": normalized,
    },
  };
}
