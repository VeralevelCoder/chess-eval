import "./globals.css";

export const metadata = {
  title: "Chess PGN Analyzer - Stockfish WebAssembly",
  description: "Client-side Chess PGN Analyzer powered by Stockfish WebAssembly and chess.js",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
