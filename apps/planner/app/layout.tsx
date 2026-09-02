import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ramani Planner",
  description: "City dashboard for informal-settlement climate resilience.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&display=swap"
          rel="stylesheet"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#0e7c66" />
      </head>
      <body>
        <div className="shell">
          <aside className="nav">
            <p className="brand">Ramani</p>
            <p className="tag">Planner · Kibera</p>
            <nav>
              <Link href="/" title="Climate Vulnerability Dashboard">
                📊 Vulnerability
              </Link>
              <Link href="/emergency" title="Live Emergency Feed">
                🚨 Emergency Feed
              </Link>
              <Link href="/damage" title="Damage Reports">
                💔 Damage Reports
              </Link>
            </nav>
          </aside>
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
