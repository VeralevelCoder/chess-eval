# ♟️ ChessEval • Client-Side Stockfish WASM Analyzer

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat&logo=next.js)](https://nextjs.org/)
[![Stockfish](https://img.shields.io/badge/Engine-Stockfish%20WASM-orange?style=flat)](https://github.com/official-stockfish/Stockfish)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react)](https://react.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> A high-performance, zero-backend, client-side Chess PGN analyzer powered by **Stockfish WebAssembly**, **Next.js 16**, and **React 19**. Import games directly from **Chess.com**, paste shared links, upload PGNs, and receive move-by-move engine commentary, visual guide lines, blunder detection, and interactive best move suggestions.

---

## ⚡ Complete Feature Overview

### 1. 🔗 Multiple Game Import Methods (`HomePage.js`)
* **Direct Game Link / Share Text Import:**
  * Paste any Chess.com URL (e.g. `https://www.chess.com/game/live/185520318828` or daily game links) or mobile share text (e.g. `Check out this #chess game: user1 vs user2 - https://www.chess.com/game/live/...`).
  * Backend API route (`/api/chesscom/game`) queries Chess.com callback endpoints to resolve player details, moves, and official PGNs.
* **Chess.com Profile Sync:**
  * Enter any username to fetch recent games, with ratings, game mode (bullet, blitz, rapid), date, and outcome.
  * Includes on-demand pagination (`⬇ Import 5 More Games`) without reloading.
* **⚡ Trending Matches & Historic Masterpieces Showcase:**
  * Curated showcase allowing users to load and analyze legendary modern clashes and historic games with 1 click:
    * **🔥 Recent Trending Clashes:**
      * **Gukesh D vs Ding Liren (2024 World Championship - Game 11):** Gukesh's historic `29. Qxc6!` queen sacrifice on his way to becoming the youngest World Champion in history at age 18.
      * **Ding Liren vs Ian Nepomniachtchi (2023 World Championship - Tiebreak 4):** Ding's unforgettable `46... Rg6!!` self-pin refusal of a draw to capture the World Championship title.
      * **R. Praggnanandhaa vs Magnus Carlsen (Norway Chess 2024):** 18-year-old Pragg's first classical victory against World #1 Magnus Carlsen.
    * **🏛️ Historic Classics:**
      * **Donald Byrne vs Bobby Fischer (1956 "Game of the Century"):** 13-year-old Fischer's immortal `17... Be6!!` queen sacrifice.
      * **Paul Morphy vs Duke Karl (1858 Paris Opera House):** The quintessential classical attacking masterpiece ending in `17. Rd8#`.
      * **Garry Kasparov vs Veselin Topalov (1999 "Kasparov's Immortal"):** Kasparov's double-rook sacrifice and 15-move king hunt.
      * **Adolf Anderssen vs Lionel Kieseritzky (1851 "The Immortal Game"):** Sacrificing both rooks, a bishop, and a queen for a minor piece mate.

---

### 2. 🎯 Visual Guide Lines & Interactive Board Arrows
* **🔵 Played Move (Royal Blue - `#3b82f6`):**
  * Displays a static blue guide arrow and subtle blue square highlights on origin and destination squares indicating the piece movement. Color remains constant across all moves.
* **🟢 Best Move Arrow (Emerald Green - `#10b981`):**
  * Displays a static emerald green guide arrow directly on the board pointing out Stockfish's top recommended move for the player to move.
* **💡 Alternative Arrow for Mistakes (Cyan - `#06b6d4`):**
  * When reviewing an inaccuracy, mistake, or blunder, a static cyan guide arrow appears indicating what move *should* have been played instead.
* **Square Highlights (`squareStyles`):**
  * Origin and destination squares of the played move are highlighted in soft blue to clearly show piece movement.
  * Previewing best or alternative moves displays dedicated green or cyan square highlights.
* **Custom User Drawing:**
  * Right-click and drag on the board to draw custom tactical guide arrows anytime.
* **Guide Lines Toolbar:**
  * Quick toggles for:
    * Master toggle (`Visible` / `Hidden`)
    * `[🟢 Best Move]`
    * `[🔵 Played]`
    * `[💡 Alternative]`

---

### 3. 💡 Visual Best Move Suggestions & PV Continuation Card
* **Engine Best Move Box:**
  * Displays the player whose turn it is, the suggested move in Standard Algebraic Notation (SAN, e.g. `14... exd4` or `15. Rd8#`), and evaluation score.
  * **`[👀 Preview Move]` Button:** Click to test and view the board position after playing the suggested move.
* **Better Alternative Comparison (for Blunders & Mistakes):**
  * Automatically highlights the error:
    * 🚨 **Played:** `{san}` (*Mistake / Blunder*)
    * 💡 **Engine Alternative:** `{recommended}`
  * **`[👀 Preview Alternative on Board]` Button:** Test what the position would look like if the better move had been chosen.
* **Guide Line Continuation Sequence (PV):**
  * Converts the engine's Principal Variation into readable SAN move pills (e.g. `1. e4  e5  2. Nf3  Nc6  3. Bc4`).
  * Clicking any move pill previews that continuation line directly on the board.
* **Active Preview Banner:**
  * While previewing an alternative or continuation, an alert bar indicates the previewed move with an **`[Exit Preview ✕]`** button to restore the live game position instantly.

---

### 4. 🧠 Natural-Language Move Commentary
* Contextual grading for each move:
  * 🌟 **Best Move** ($\le 15$ cp loss)
  * ✨ **Excellent** ($\le 45$ cp loss)
  * 👍 **Good Move** ($\le 90$ cp loss)
  * ⚠️ **Inaccuracy** ($\le 180$ cp loss)
  * ❌ **Mistake** ($\le 300$ cp loss)
  * 🚨 **Critical Blunder** ($> 300$ cp loss or lost checkmate)
  * 👑 **Checkmate**
* Tactical annotations explaining captures, checks, castling, minor piece development, and evaluation swings.
* Centipawn loss delta ($\Delta$) and depth readout for every position.

---

### 5. 🏁 Game Conclusion & Termination Detection
* Detects and announces the exact conclusion of the match:
  * 🏳️ **Win by Resignation** (extracted from PGN headers)
  * 👑 **Win by Checkmate**
  * 🤝 **Draw by Stalemate**
  * ⏱️ **Win on Time**
  * 🤝 **Draw by Repetition / Insufficient Material / Mutual Agreement**
* **Multiple Outcome Indicators:**
  * Displayed in the final move's commentary headline and body.
  * Displayed in an explicit **Game Outcome** card in the Move Analysis panel.
  * Displayed as a badge in the top header banner next to the result score (`1-0`, `0-1`, `1/2-1/2`).
  * Rendered as a clickable conclusion button at the bottom of the Move History list.

---

### 6. ⚡ Full Game Auto-Analysis
* **1-Click Review:** Evaluates all positions from start to finish in the background.
* **Accuracy Breakdown:** Displays counts of Best, Good, Inaccuracies, Mistakes, and Blunders for both White and Black.
* **Interactive Move List:** Moves are annotated with classification symbols (`★`, `!`, `✓`, `?!`, `?`, `??`, `#`) and cached evaluation scores.
* **Quick Blunder Jumper:** `⏪ Prev Blunder` and `Next Blunder ⏩` buttons let you jump straight to pivotal mistakes.
* **🏆 Game Analysis Summary (Post-Analysis Pop-up):**
  * Automatically appears once full analysis completes.
  * Displays a **human-like narrative** (3–4 paragraphs) — opening context, game flow, critical blunders called out by player/move/centipawn swing, and the game outcome — all generated from Stockfish eval data, no LLM.
  * **Per-player stat pills**: Blunders 🚨, Mistakes ❌, Inaccuracies ⚠️, Best/Excellent 🌟, Good 👍.
  * **📌 Key Moments list**: Up to 6 most critical moments sorted by severity (blunders → mistakes → inaccuracies) with eval swing details.
  * Dismissable via ✕, backdrop click, or **Continue Analysis →** button.
  * Resets automatically when a new game is loaded.

---

### 7. 🎨 Theming & Navigation
* **Dark & Light Modes:** Class-based dark theme (Tailwind CSS v4) with persistent `localStorage` saving and system preference fallback.
* **Keyboard Navigation:**
  * **Left / Right Arrow:** Previous / Next move.
  * **Home / End:** First / Last move.
* **Board Controls:** Flip board orientation (`White` / `Black`), engine depth adjustment (10, 12, 15, 18 ply).

---

## 🛠️ Tech Stack

| Technology | Purpose |
| :--- | :--- |
| **Next.js 16 (App Router)** | Framework with Turbopack, static prerendering, and server routes |
| **Stockfish.js / WASM** | Client-side UCI chess engine running in a dedicated Web Worker |
| **chess.js (v1.4.0)** | Rule validation, FEN generation, SAN translation, and board state |
| **react-chessboard (v5.12.1)** | Animated SVG chessboard with arrow overlays and square styles |
| **chess-tcn** | Decoder for Chess.com compressed TCN move notations |
| **Tailwind CSS v4** | Utility-first responsive styling and dark mode variant |

---

## 🚀 Getting Started

### Prerequisites
* [Node.js](https://nodejs.org/) v18.0 or higher
* `npm`, `pnpm`, or `yarn`

### Running the App

```bash
# Clone the repository
git clone https://github.com/VeralevelCoder/chess-eval.git
cd ChessEngine

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

> **Note on Project Directory Structure:**
> Commands can be run either from the project root (`/`) or from `chess-eval/`. The root `package.json` proxies all scripts (`dev`, `build`, `start`, `lint`) directly to the `chess-eval` Next.js application.

---

## 📦 Project Structure

```
ChessEngine/
├── package.json              # Root script proxy to chess-eval
├── README.md                 # Project documentation
└── chess-eval/
    ├── public/
    │   ├── stockfish.js      # Self-contained Stockfish JS worker
    │   ├── stockfish.wasm.js # WebAssembly worker loader
    │   └── stockfish.wasm    # Stockfish WASM binary
    ├── src/
    │   ├── app/
    │   │   ├── api/
    │   │   │   ├── chesscom/game/route.js # Direct URL & share text resolver
    │   │   │   └── chesscom/route.js      # Profile games fetcher & paginator
    │   │   ├── globals.css   # Tailwind v4 styles & dark mode variant
    │   │   ├── layout.js     # Root HTML layout
    │   │   └── page.js       # Router switching between HomePage and ChessAnalyzer
    │   ├── components/
    │   │   ├── ChessAnalyzer.js # Board, arrows, guide lines, eval bar, and commentary
    │   │   └── HomePage.js      # Landing dashboard, link importer, profile sync, PGN upload
    │   └── hooks/
    │       └── useStockfish.js  # UCI Web Worker communication and async evaluation
    ├── package.json
    └── README.md
```

---

## 🌐 Deployment (Vercel)

Because engine computation runs client-side via WebAssembly in the user's browser, this application requires **zero server GPU/CPU compute** and is **100% free** to host on [Vercel](https://vercel.com/):

1. **Deploy via Vercel CLI:**
   ```bash
   npm install -g vercel
   cd chess-eval
   vercel
   ```
2. **Deploy via GitHub Integration:**
   Import your repository into the Vercel Dashboard with Root Directory set to `chess-eval`.

---

## 📄 License
This project is licensed under the [MIT License](LICENSE). Stockfish is licensed under the [GNU GPL v3](https://www.gnu.org/licenses/gpl-3.0.html).
