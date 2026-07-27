# Chess Bridge ♞

A premium SaaS-style web application and Chrome extension to instantly detect finished games on Chess.com and analyze them on Lichess with free cloud analysis.

## ✨ Features

- **🎨 Modern Dark Glassmorphism UI**: Built with Space Grotesk typography, ambient floating background mesh orbs, and responsive CSS grid layouts.
- **⚡ Zero-Delay Game Detection**: Chrome extension integrates directly with Chess.com APIs to catch completed games instantly without polling delays or Share dialog popups.
- **🚀 One-Click & Auto-Import**: Instantly transition to Lichess analysis board with one click or automatic trigger upon checkmate.
- **📊 Post-Game Review**: Clean game preview cards with result accent styling (Win/Loss/Draw), opening names, time controls, and persistent game history stored in localStorage.
- **🔒 Secure & Lightweight**: Vite + TypeScript architecture with zero heavy frameworks, running fully client-side.

## 🛠️ Tech Stack

- **Frontend**: Vite, TypeScript, Vanilla CSS (Custom Properties, Glassmorphism design system)
- **Extension**: Manifest V3 Chrome Extension, Service Workers, MutationObserver, Chess.com Public & Callback APIs
- **Hosting**: Designed for zero-config static deployment on GitHub Pages

## 📦 Getting Started

### Web Application

1. Clone the repository:
   ```bash
   git clone https://github.com/ostrich2635/chess-bridge.git
   cd chess-bridge
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start local development server:
   ```bash
   npm run dev
   ```
4. Build for production:
   ```bash
   npm run build
   ```

### Chrome Extension

1. Open Chrome / Edge / Brave and navigate to `chrome://extensions/`.
2. Toggle on **Developer mode** in the top right corner.
3. Click **Load unpacked** in the top left corner.
4. Select the `extension/` directory from this project.
5. Play or view any finished game on Chess.com — the **♞ Analyze on Lichess ↗** button will appear automatically!

---

*Made with ❤️ for chess lovers.*
