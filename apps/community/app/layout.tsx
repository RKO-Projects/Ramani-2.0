import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ramani Safety",
  description: "Offline-first SOS and landmark routes for informal settlements.",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&family=Fraunces:opsz,wght@9..144,500&display=swap"
          rel="stylesheet"
        />
        <meta name="theme-color" content="#c44536" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body>
        <header>
          <p className="brand">Ramani</p>
          <p className="tag">Safety gateway · also *384*55#</p>
        </header>
        <main>{children}</main>
        <nav className="tab">
          <Link href="/">SOS</Link>
          <Link href="/route">Route</Link>
          <Link href="/report">Report</Link>
          <Link href="/alerts">Alerts</Link>
        </nav>
      </body>
    </html>
  );
}
