import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/*/track?"] }],
    sitemap: `${env.siteUrl}/sitemap.xml`,
  };
}
