import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Waschkalender Haus-App",
  description: "Teilbare Waschplan-App für Mehrfamilienhäuser mit E-Mail/SMS-Weitergabe.",
  applicationName: "Waschkalender",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Waschkalender",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
