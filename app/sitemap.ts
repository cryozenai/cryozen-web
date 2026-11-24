import type { MetadataRoute } from "next";
import { getAllDocs, hrefForSlug } from "@/lib/docs";
import { surfaceIds } from "@/lib/product/surfaces";
import { site } from "@/lib/site";

const routes = [
  { path: "/", priority: 1, changeFrequency: "monthly" as const },
  { path: "/download", priority: 0.9, changeFrequency: "weekly" as const },
  { path: "/tour", priority: 0.9, changeFrequency: "monthly" as const },
  { path: "/features", priority: 0.8, changeFrequency: "monthly" as const },
  ...surfaceIds.map((id) => ({
    path: `/features/${id}`,
    priority: 0.7,
    changeFrequency: "monthly" as const,
  })),
  { path: "/pricing", priority: 0.7, changeFrequency: "monthly" as const },
  { path: "/changelog", priority: 0.6, changeFrequency: "weekly" as const },
  { path: "/teams", priority: 0.7, changeFrequency: "monthly" as const },
  { path: "/security", priority: 0.6, changeFrequency: "monthly" as const },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly" as const },
  { path: "/terms", priority: 0.3, changeFrequency: "yearly" as const },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const docs = getAllDocs().map((doc) => ({
    path: hrefForSlug(doc.slug),
    priority: 0.5,
    changeFrequency: "monthly" as const,
  }));
  return [...routes, ...docs].map((route) => ({
    url: `${site.url}${route.path}`,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
