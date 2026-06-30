import type { Metadata } from "next";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "AirQ India — Real-time & Historical Air Quality",
  description:
    "Computed CPCB AQI for monitoring stations across India, with a historical timeline you can scrub through.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <Navbar />
          <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
