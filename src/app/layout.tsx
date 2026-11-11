import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SITE_URL } from "@/lib/env";
import { themeScript } from "@/components/theme-toggle";
import { DemoBanner } from "@/components/demo-banner";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "VagaLoop — Contrate mais rápido com IA + especialistas", template: "%s · VagaLoop" },
  description: "Publique vagas grátis, triagem com IA e, quando precisar, uma recrutadora especialista do seu setor entregando finalistas com parecer.",
  applicationName: "VagaLoop",
  openGraph: { type: "website", locale: "pt_BR", siteName: "VagaLoop" },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = {
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#faf9fc" }, { media: "(prefers-color-scheme: dark)", color: "#0e0c15" }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh">
        <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-brand focus:px-4 focus:py-2 focus:text-brand-ink">
          Pular para o conteúdo
        </a>
        <DemoBanner />
        {children}
      </body>
    </html>
  );
}
