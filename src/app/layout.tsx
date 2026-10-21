import type { Metadata } from "next";
import "./globals.css";
import "mapbox-gl/dist/mapbox-gl.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://laurent.fyi"),
  title: "laurent del rey - internet designer",
  description: "this is my journey",
  openGraph: {
    title: "laurent del rey - internet designer",
    description: "this is my journey",
    type: "website",
    videos: [
      {
        url: "https://laurent.fyi/videos/og.mp4",
        secureUrl: "https://laurent.fyi/videos/og.mp4",
        type: "video/mp4",
        width: 824,
        height: 720,
      },
    ],
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
