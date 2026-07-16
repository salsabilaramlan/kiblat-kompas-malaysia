import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KIBLAT. — Kompas Kiblat Dalam Talian",
  description: "Cari arah kiblat dengan tepat menggunakan lokasi dan kompas peranti anda.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ms">
      <body>{children}</body>
    </html>
  );
}
