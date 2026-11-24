import { createElement } from "react";
import { desktopPlatforms } from "@/lib/platforms";
import { tiers } from "@/lib/pricing";
import { site } from "@/lib/site";

export function softwareApplicationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: site.name,
    operatingSystem: desktopPlatforms.map(({ name }) => name),
    applicationCategory: "ProductivityApplication",
    offers: tiers.map(({ name, id }) => ({
      "@type": "Offer",
      name,
      url: new URL("/pricing", site.url).href,
      ...(id === "personal" ? { price: 0, priceCurrency: "USD" } : {}),
    })),
  } as const;
}

export function breadcrumbJsonLd(items: readonly { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map(({ name, path }, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name,
      item: new URL(path, site.url).href,
    })),
  } as const;
}

type JsonLdData = ReturnType<typeof softwareApplicationJsonLd | typeof breadcrumbJsonLd>;

export function JsonLd({ data }: { data: JsonLdData }) {
  return createElement("script", {
    type: "application/ld+json",
    dangerouslySetInnerHTML: { __html: JSON.stringify(data).replaceAll("<", "\\u003c") },
  });
}
