import type { Metadata } from "next";
import "./globals.css";
import "mapbox-gl/dist/mapbox-gl.css";

export const metadata: Metadata = {
  title: "laurent del rey - internet designer",
  description: "this is my journey",
  openGraph: {
    title: "laurent del rey - internet designer",
    description: "this is my journey",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "laurent del rey - internet designer",
    description: "this is my journey",
  },
};

import Providers from "./providers";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
