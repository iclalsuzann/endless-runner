import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Endless Runner",
  description: "2D Endless Runner Game",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
