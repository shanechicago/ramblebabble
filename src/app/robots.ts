import type { MetadataRoute } from "next";

// Tells crawlers the site is open and where the sitemap is. Helps Google
// discover and index ramblebabble.com (a new domain takes time to appear).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: "https://ramblebabble.com/sitemap.xml",
    host: "https://ramblebabble.com",
  };
}
