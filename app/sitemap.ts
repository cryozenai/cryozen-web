import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

const routes = [
  { path: "/", priority: 1, changeFrequency: "monthly" as const },
  { path: "/download", priority: 0.9, changeFrequency: "weekly" as const },
  { path: "/pricing", priority: 0.7, changeFrequency: "monthly" as const },
  { path: "/changelog", priority: 0.6, changeFrequency: "weekly" as const },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly" as const },
  { path: "/terms", priority: 0.3, changeFrequency: "yearly" as const },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((route) => ({
    url: `${site.url}${route.path}`,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
