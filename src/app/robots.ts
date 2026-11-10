import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/empresa", "/candidato", "/recrutadora", "/admin", "/api/", "/candidatar/", "/entrar", "/cadastro"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
