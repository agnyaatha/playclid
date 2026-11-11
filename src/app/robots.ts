import type { MetadataRoute } from "next";
import { isIndexable, siteUrl } from "@/core/site";

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  if (!isIndexable()) return { rules: { userAgent: "*", disallow: "/" } };
  return { rules: { userAgent: "*", allow: "/" }, sitemap: new URL("/sitemap.xml", base).href, host: base.origin };
}
