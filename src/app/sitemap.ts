import type { MetadataRoute } from "next";

// Single public page (the app shell). Submitting this in Google Search Console
// is what actually gets a brand-new domain crawled and indexed.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://ramblebabble.com",
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
