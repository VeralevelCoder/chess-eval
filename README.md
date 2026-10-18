# ♟️ ChessEval • Client-Side Stockfish WASM Analyzer

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat&logo=next.js)](https://nextjs.org/)
[![Stockfish](https://img.shields.io/badge/Engine-Stockfish%20WASM-orange?style=flat)](https://github.com/official-stockfish/Stockfish)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react)](https://react.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> A modern, zero-backend, client-side Chess PGN analyzer powered by **Stockfish WebAssembly** and **Next.js**. Import matches directly from **Chess.com**, upload or paste PGNs, and receive move-by-move engine commentary, accuracy grading, and instant blunder alerts.

---

## ⚡ Highlights & Features

- **🚀 100% Client-Side Engine (Free Hosting):** Stockfish runs entirely inside the user's browser via Web Workers and WebAssembly. No expensive backend servers, timeout limits, or compute bills.
- **♟️ Direct Chess.com Sync:** Enter any Chess.com username to instantly retrieve recent matches, preview player ratings, time controls, and outcomes, with on-demand pagination.
- **🧠 Natural-Language Move Commentary:** Every move is evaluated and categorized (🌟 Best, ✨ Excellent, 👍 Good, ⚠️ Inaccuracy, ❌ Mistake, 🚨 Blunder, 👑 Checkmate) with contextual tactical explanations.
- **🚨 Blunder Detection:** Replicates tournament engine logic to flag critical evaluation swings ($> 2.00$ pawns) and checkmate threats.
- **⚡ Auto-Analyze Full Game:** One-click automated game review that evaluates all moves sequentially, produces an overall accuracy summary for White and Black, and annotates the full move list.
- **📊 Real-time Dynamic Eval Bar:** Visual advantage gauge mirroring Chess.com / Lichess with centipawn and mate-distance readouts.
- **🌙 Dark & Light Themes:** Toggleable theme with persistent storage in `localStorage` and system color scheme fallback.
- **⌨️ Keyboard & Navigation Controls:** Navigate with `|◀`, `◀ Prev`, `Next ▶`, `▶|` or your keyboard's **Left/Right Arrow** keys.
- **📱 Responsive Design:** Clean layout built with Tailwind CSS that works seamlessly across desktop and mobile screens.

---

## 🛠️ Tech Stack

| Technology | Purpose |
| :--- | :--- |
| **Next.js 16 (App Router)** | Modern React framework with server-rendered routes and static prerendering |
| **Stockfish.js / WASM** | UCI chess engine compiled to WebAssembly running in a background Web Worker |
| **chess.js** | Chess rules, move validation, PGN parsing, and board state management |
| **react-chessboard** | Interactive, animated SVG chessboard UI |
| **Tailwind CSS v4** | Modern styling with dark mode support |

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v18.0 or higher
- `npm`, `pnpm`, or `yarn`

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/chess-eval.git
   cd chess-eval
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the local development server:**
   ```bash
   npm run dev
   ```

4. Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 📦 Project Structure

```
chess-eval/
├── public/
│   ├── stockfish.js          # Standalone JS Stockfish engine
│   ├── stockfish.wasm.js     # WebAssembly worker loader
│   └── stockfish.wasm        # Compiled Stockfish WASM binary
├── src/
│   ├── app/
│   │   ├── api/chesscom/     # Server-side proxy for Chess.com public archives
│   │   ├── globals.css       # Tailwind configuration and dark mode variant
│   │   ├── layout.js         # Root layout with system font setup
│   │   └── page.js           # Main view router (Home vs Analyzer)
│   ├── components/
│   │   ├── ChessAnalyzer.js  # Board, move list, eval bar, and commentary card
│   │   └── HomePage.js       # Welcome hero, PGN uploader, and Chess.com importer
│   └── hooks/
│       └── useStockfish.js   # Custom hook managing the Stockfish Web Worker (UCI)
└── package.json
```

---

## 🌐 Deploy to Vercel

Because computation runs on the client device via WebAssembly, this project is **100% free** to host on Vercel:

1. Install the Vercel CLI:
   ```bash
   npm install -g vercel
   ```
2. Deploy directly from the `chess-eval` folder:
   ```bash
   vercel
   ```
3. Or link your GitHub repository to [Vercel Dashboard](https://vercel.com/) for automatic deployments on every `git push`.

---

## 📄 License
This project is licensed under the [MIT License](LICENSE). Stockfish is licensed under the [GNU GPL v3](https://www.gnu.org/licenses/gpl-3.0.html).
