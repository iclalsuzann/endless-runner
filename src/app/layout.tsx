import type { Metadata } from "next";
import "./globals.css"; // Global CSS dosyasını buraya bağlıyoruz

export const metadata: Metadata = {
  title: "Endless Runner Game",
  description: "Phaser & Next.js Endless Runner",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* Next.js'de body ve html etiketleri SADECE burada olur */}
      <body>{children}</body>
    </html>
  );
}