import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Chowka Bara · A little luck. A lot of tradition.",
  description:
    "The timeless Indian cowrie game, back at the table. Play Chowka Bara online with friends, together on one screen, or against the computer. 5×5 and 7×7 boards.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "Chowka Bara · The Indian game table",
    description:
      "A handful of shells. Four little pawns. Play together, wherever you are.",
    type: "website",
  },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f7f5ee",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
