import "./globals.css";
import { Analytics } from "@vercel/analytics/next";

export const metadata = {
  title: "Chess PGN Analyzer - Stockfish WebAssembly",
  description: "Client-side Chess PGN Analyzer powered by Stockfish WebAssembly and chess.js",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
