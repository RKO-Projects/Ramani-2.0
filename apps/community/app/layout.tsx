import type { Metadata, Viewport } from "next";
import { AlertStrip } from "@/components/AlertStrip";
import { RegisterSw } from "@/components/RegisterSw";
import { TabBar } from "@/components/TabBar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ramani Safety",
  description: "SOS, landmark routes, and hazard reports for informal settlements. Also *384*55#.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Ramani",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#c44536",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
<<<<<<< HEAD
        <link rel="apple-touch-icon" href="/icon.svg" />
=======
        <meta name="theme-color" content="#c44536" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <style>{`
          body {
            max-width: 480px;
            margin: 0 auto;
          }
          #__next {
            width: 100%;
          }
          main {
            width: 100%;
            max-width: 480px;
            margin: 0 auto;
          }
          nav.tab {
            left: 50%;
            transform: translateX(-50%);
            width: 100%;
          }
        `}</style>
>>>>>>> 7391bf5 (Modernize Ramani frontend: community app with interactive emergency response UI and planner app with dark-themed climate dashboard)
      </head>
      <body>
        <RegisterSw />
        <header className="top">
          <p className="brand">Ramani</p>
          <p className="tag">Safety gateway · Also *384*55#</p>
        </header>
        <AlertStrip />
        <main>{children}</main>
<<<<<<< HEAD
        <TabBar />
=======
        <nav className="tab">
          <Link href="/" title="Emergency SOS">
            🆘 SOS
          </Link>
          <Link href="/route" title="Evacuation Route">
            🗺️ Route
          </Link>
          <Link href="/report" title="Report Hazard">
            📋 Report
          </Link>
          <Link href="/alerts" title="Local Alerts">
            🚨 Alerts
          </Link>
        </nav>
>>>>>>> 7391bf5 (Modernize Ramani frontend: community app with interactive emergency response UI and planner app with dark-themed climate dashboard)
      </body>
    </html>
  );
}
