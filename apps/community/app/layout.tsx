import type { Metadata, Viewport } from "next";
import { RegisterSw } from "@/components/RegisterSw";
import { LocationGate } from "@/components/LocationGate";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ramani Safety",
  description: "SOS, landmark routes, and hazard reports for informal settlements. Also *384*55#.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Ramani",
    statusBarStyle: "black-translucent",
  },
  icons: { icon: "/logo.svg", apple: "/logo.svg" },
};

export const viewport: Viewport = {
  themeColor: "#0F4F4A",
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
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link rel="apple-touch-icon" href="/logo.svg" />
      </head>
      <body>
        <RegisterSw />
        <LocationGate>{children}</LocationGate>
      </body>
    </html>
  );
}
