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
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&family=Fraunces:opsz,wght@9..144,500&display=swap"
          rel="stylesheet"
        />
        <link rel="apple-touch-icon" href="/icon.svg" />
      </head>
      <body>
        <RegisterSw />
        <header className="top">
          <p className="brand">Ramani</p>
          <p className="tag">Safety gateway · also *384*55#</p>
        </header>
        <AlertStrip />
        <main>{children}</main>
        <TabBar />
      </body>
    </html>
  );
}
