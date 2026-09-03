import type { Metadata, Viewport } from "next";
import { RegisterSw } from "@/components/RegisterSw";
import { LocationGate } from "@/components/LocationGate";
import { ThemeProvider } from "@/components/ThemeProvider";
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

const THEME_BOOT = `(function(){try{var t=localStorage.getItem("ramani.community.theme");if(t==="dark"||t==="light"){document.documentElement.setAttribute("data-theme",t);document.documentElement.style.colorScheme=t;}else if(window.matchMedia("(prefers-color-scheme: dark)").matches){document.documentElement.setAttribute("data-theme","dark");document.documentElement.style.colorScheme="dark";}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link rel="apple-touch-icon" href="/logo.svg" />
      </head>
      <body>
        <ThemeProvider>
          <RegisterSw />
          <LocationGate>{children}</LocationGate>
        </ThemeProvider>
      </body>
    </html>
  );
}
