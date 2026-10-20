# ♟️ ChessEval • Client-Side Stockfish WASM Analyzer

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat&logo=next.js)](https://nextjs.org/)
[![Stockfish](https://img.shields.io/badge/Engine-Stockfish%20WASM-orange?style=flat)](https://github.com/official-stockfish/Stockfish)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react)](https://react.dev/)
[![Analytics](https://img.shields.io/badge/Vercel_Analytics-Active-blue?style=flat&logo=vercel)](https://vercel.com/analytics)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> A modern, zero-backend, client-side Chess PGN analyzer powered by **Stockfish WebAssembly**, **Next.js 16**, and **React 19**. Import games directly from **Chess.com** (via username or shared links), upload/paste PGNs, receive move-by-move engine commentary, visual guide lines, interactive blunder retry puzzles, advantage graphs, and automated **Last 6 Games Performance Reviews** — 100% computed on-device with zero external AI delays.

---

## ⚡ Complete Feature Overview

### 1. 📈 Last 6 Games Performance Review (100% Client-Side Engine)
* **Automated Trend & Form Analysis:**
  * When searching any Chess.com profile, an automated on-device analysis evaluates the player's last 6 matches in milliseconds.
  * Detects current trajectory:
    * 🔥 **Trending Up — On Fire!**: Active 3-game winning streak.
    * 📈 **Strong Form Progression**: 4+ wins with rating momentum on the rise.
    * 📉 **Facing Resistance / Slump**: 3-game loss streak or 4+ losses, highlighting early concession patterns.
    * ⚡ **Solid Consistency**: Balanced, competitive match results.
* **Core Indicators & Metrics:**
  * **Win Rate & Record:** Win percentage and precise `W - L - D` breakdown.
  * **Rating Shift ($\Delta$):** Real-time tracking of rating gained or lost over the match sequence.
  * **White vs. Black Performance:** Comparative win rates based on piece color and opening control.
* **🌟 Common Strengths & Good Habits:**
  * Highlights positive patterns: fast tactical conversions ($< 30$ moves), early king safety & castling ($\le 12$ moves), endgame tenacity ($\ge 38$ moves), first-move command as White, and resilience as Black.
* **🚨 Common Vulnerabilities & Mistakes:**
  * Pinpoints recurring pitfalls: early tactical concessions ($< 30$ moves), delayed castling exposure, opening central pressure as Black, and endgame precision drift.
* **🧙‍♂️ Coach's Actionable Advice:**
  * Concise, practical takeaways formulated to prevent repeated mistakes in upcoming games.
* **Interactive Modal & 1-Click Game Review:**
  * Quick summary banner in both the **Home** dashboard and the Analyzer's **Profile** tab.
  * Modal displays reviewed matches with opening names, move counts, outcome badges, and a 1-click **`[Analyze Match →]`** button that loads the match immediately into the analysis board.

---

### 2. 🔗 Multiple Game Import Options (`HomePage.js`)
* **Direct Game Link / Share Text Import:**
  * Paste any Chess.com URL (e.g. `https://www.chess.com/game/live/185520318828` or daily game links) or mobile share text (e.g. `Check out this #chess game: user1 vs user2 - https://www.chess.com/game/live/...`).
  * Backend API route (`/api/chesscom/game`) queries Chess.com endpoints to resolve player details, moves, and official PGNs.
* **Chess.com Profile Sync:**
  * Enter any username to fetch recent games, with ratings, time controls (bullet, blitz, rapid), date, and outcome.
  * Includes on-demand pagination (`⬇ Import 6 More Games`) without reloading.
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

### 3. 🎯 Visual Guide Lines & Static Unique Arrows
* **🔵 Played Move (Royal Blue - `#3b82f6`):**
  * Displays a static blue guide arrow and origin/destination square highlights showing the move just executed. Color remains strictly static and unique to avoid confusion with quality evaluations.
* **🟢 Best Move Arrow (Emerald Green - `#10b981`):**
  * Displays a static emerald green guide arrow pointing out Stockfish's top recommended move for the player whose turn it is.
* **💡 Alternative Arrow for Mistakes (Cyan - `#06b6d4`):**
  * When reviewing an inaccuracy, mistake, or blunder, a static cyan guide arrow appears indicating what move *should* have been played instead.
* **Square Highlights (`squareStyles`):**
  * Played move start and destination squares are highlighted in royal blue.
  * Best move and alternative move previews display dedicated green and cyan square borders.
* **Custom User Drawing:**
  * Right-click and drag on the board to draw custom tactical arrows anytime.
* **Guide Lines Toolbar:**
  * Quick toggles for Master visibility, Best Move, Played Move, and Alternative Move arrows.

---

### 4. 🧙‍♂️ Virtual Coach & Game Advantage Graph
* **Rule 1: Gamified Metrics Over Raw Data:**
  * Abstracts raw centipawns into an accessible 0–100% CAPS Accuracy score for both White and Black.
* **Rule 2: Emotive Visual Vocabulary:**
  * Move classifications with distinct badges and icons:
    * 🌟 **Brilliant**
    * ✨ **Great Move**
    * 👍 **Best Move**
    * ⚡ **Excellent**
    * 🟢 **Good Move**
    * ⚠️ **Inaccuracy**
    * ❌ **Mistake**
    * 🚨 **Critical Blunder**
    * ❓ **Missed Win**
    * 👑 **Checkmate**
* **Rule 3: Narrative Abstraction:**
  * **Friendly Virtual Coach:** Dynamic avatar and plain-English speech bubble explaining *why* a move was good, inaccurate, or blundered from the player's perspective.
  * **Interactive Advantage Graph:** SVG line chart below the board showing the continuous flow of advantage throughout the game, with red dots marking blunders and interactive scrub/click navigation.
* **Rule 4: Interactive Remediation ("Retry Mistakes"):**
  * When reaching a mistake or blunder, users can click **"Retry"** to solve the position interactively as a tactical puzzle with hint and solution reveal buttons.
* **Rule 5: Progressive Disclosure:**
  * Clean, beginner-friendly Game Review by default. Deep engine lines, depth selectors, and move tables remain available in self-analysis mode.

---

### 5. 💡 Best Move Guidance & PV Continuations
* **Engine Best Move Card:**
  * Displays the side to move, the top engine SAN move (e.g. `14... exd4`), and evaluation score.
  * **`[👀 Preview Move]` Button:** Tests and previews the position after playing the suggested move.
* **Better Alternative Comparison:**
  * Instantly highlights the error:
    * 🚨 **Played:** `{san}` (*Mistake / Blunder*)
    * 💡 **Engine Alternative:** `{recommended}`
  * **`[👀 Alternative]` Button:** Previews what the position would look like if the better move had been chosen.
* **PV Continuation Pills:**
  * Converts the engine's Principal Variation into readable SAN buttons. Clicking any step previews that continuation line directly on the board.
* **Active Preview Banner:**
  * An alert bar indicates the active preview state with an **`[Exit Preview ✕]`** button to restore the live game position instantly.

---

### 6. 📱 Mobile Optimization & Stability
* **Sub-100ms Initial Paint:**
  * Heavy components (`ChessAnalyzer`, `react-chessboard`, `chess.js`) are code-split using `next/dynamic` (`ssr: false`).
  * The landing page HTML is served immediately without waiting for Web Workers or engine initialization.
* **Resilient WebKit / Mobile Browser Compatibility:**
  * Safe storage wrappers (`safeGetStorage`, `safeSetStorage`) prevent uncaught `SecurityError` crashes in iOS Safari Private Browsing mode.
  * Safe `window.matchMedia` guards ensure stability across mobile browsers and in-app webviews (Instagram, Twitter, Reddit).
  * Removed experimental streaming flags (`partialPrefetching`, `cacheComponents`) in `next.config.mjs` that caused mobile connection resets.
* **Touch-Friendly UI:**
  * Responsive flex layouts, `min-h-[44px]` touch targets, and touch-drag support on the advantage graph.
* **Root Error Boundary (`src/app/error.js`):**
  * Gracefully catches any client-side runtime issues with a "Try Again" recovery screen rather than a blank page.

---

### 7. 🏁 Game Conclusion & Auto-Analysis Summary
* **Termination Detection:**
  * Automatically detects and announces: Resignation 🏳️, Checkmate 👑, Stalemate 🤝, Timeout ⏱️, and Draw by Repetition/Agreement 🤝.
* **Full Game Auto-Analysis:**
  * Evaluates every move in background.
  * Pops up a comprehensive human-like game narrative, per-player stat cards (Blunders, Mistakes, Inaccuracies, Best moves), and a Key Moments list sorted by severity.

---

## 🛠️ Tech Stack

| Technology | Purpose |
| :--- | :--- |
| **Next.js 16 (App Router)** | Framework with Turbopack, dynamic code-splitting, and server routes |
| **Stockfish.js / WASM** | Client-side UCI chess engine running in a dedicated Web Worker |
| **chess.js (v1.4.0)** | Rule validation, FEN generation, SAN translation, and board state |
| **react-chessboard (v5.12.1)** | Animated SVG chessboard with arrow overlays and square styles |
| **chess-tcn** | Decoder for Chess.com compressed TCN move notations |
| **Tailwind CSS v4** | Modern utility-first styling with class-based dark mode |
| **@vercel/analytics** | Privacy-friendly page-view and performance telemetry |

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
    │   │   │   └── chesscom/route.js      # Profile games fetcher & paginator (limit=6)
    │   │   ├── error.js      # Root Error Boundary for client crash recovery
    │   │   ├── globals.css   # Tailwind v4 styles & dark mode variant
    │   │   ├── layout.js     # Root HTML layout with Vercel Analytics
    │   │   └── page.js       # Dynamic code-split router between HomePage and ChessAnalyzer
    │   ├── components/
    │   │   ├── ChessAnalyzer.js          # Board, arrows, coach bubble, retry mode, and eval bar
    │   │   ├── HomePage.js               # Landing dashboard, link importer, profile sync, PGN upload
    │   │   └── RecentGamesReviewModal.js # Interactive 6-game performance review popup modal
    │   ├── hooks/
    │   │   └── useStockfish.js # UCI Web Worker communication and async evaluation
    │   └── utils/
    │       └── recentGamesAnalysis.js # 100% client-side heuristic performance & trend engine
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
