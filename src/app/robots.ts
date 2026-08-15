import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/site";

/**
 * Rendered per request, not at build time. Prerendered, this file would bake in
 * whatever `SITE_URL` happened to be during the build — which on a deploy that
 * sets it only at runtime means pointing crawlers at localhost.
 */
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
