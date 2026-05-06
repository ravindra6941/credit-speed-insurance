import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Credit Speed Insurance — Admin Portal",
  description:
    "Internal admin portal for Credit Speed Insurance — manage retailers, customers, and warranty plans.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
