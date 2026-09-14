import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "MacroSnap",
  description: "Photograph a meal, get its macros, track your day.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "MacroSnap" },
  // iOS Safari's data detectors rewrite text that looks like a date, time or
  // phone number into <a> tags carrying x-apple-data-detectors attributes. That
  // happens before React hydrates, so every meal time and day heading in here
  // turns into a hydration mismatch on iPhone. Turn the detectors off.
  formatDetection: { telephone: false, date: false, address: false, email: false },
};

export const viewport: Viewport = {
  themeColor: "#07090f",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Next emits only the modern `mobile-web-app-capable`. iOS before 16.4
            reads the Apple-prefixed name to launch full screen from the home
            screen; React hoists this into <head>. */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <main className="mx-auto w-full max-w-lg px-4 pt-6">{children}</main>
        <Nav />
      </body>
    </html>
  );
}
