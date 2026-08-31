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
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600&family=Fraunces:opsz,wght@9..144,500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="shell">
          <aside className="nav">
            <p className="brand">Ramani</p>
            <p className="tag">Planner · Kibera</p>
            <nav>
              <Link href="/">Vulnerability</Link>
              <Link href="/emergency">Emergency feed</Link>
              <Link href="/damage">Damage</Link>
            </nav>
          </aside>
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
