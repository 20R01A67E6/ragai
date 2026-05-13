import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://ragaii.vercel.app", lastModified: new Date() },
    { url: "https://ragaii.vercel.app/login", lastModified: new Date() },
    { url: "https://ragaii.vercel.app/signup", lastModified: new Date() },
  ];
}
