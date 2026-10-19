# Velox AI — Intelligent Assistant

**Velox AI** is a premium, modern full-stack AI assistant foundation built with **React + Vite** on the frontend, **Node.js + Express** on the backend, and **MongoDB + Mongoose** for data persistence.

---

## 🎨 Strict Color Palette

The interface strictly adheres to the requested brand palette without extraneous colors:

| Token | Hex Value | Role |
|---|---|---|
| Deep Base | `#010001` | Main viewport background, dark depth |
| Surface | `#133336` | Sidebar, card containers, assistant bubbles |
| Border | `#285F6B` | Structural dividers, user message bubble base |
| Accent | `#367D8A` | Vibrant interactive highlights, buttons, active states |
| Text | `#FFFFFF` | Crisp typography and icon contrast |
| Error State | `#FF4D4D` | Dedicated offline/error state indicator |

---

## 🚀 Key Features

1. **Velox AI Welcome Screen**:
   - Radiant Velox geometric emblem with refined typography.
   - 3 interactive prompt cards (System Architecture, Database Optimization, and API Engineering) that launch prompt sessions immediately on click.

2. **Refined Navigation & Mobile Drawer**:
   - Desktop persistent sidebar with conversation history, active indicator, and smooth delete action.
   - Full mobile responsive drawer with hamburger toggle and touch-dismiss backdrop.

3. **High-Performance Message Composer**:
   - Auto-expanding multiline textarea with max-height clamping.
   - IME-safe Enter-to-submit keyboard handlers (`event.isComposing` and Safari fallback).
   - Dedicated action button with brand SVG icon.

4. **Resilient Architecture**:
   - Backend gracefully manages MongoDB connections via Mongoose; if MongoDB is starting or unreachable, fallback in-memory state keeps the application active and functional.
   - Pluggable AI integration for Google Gemini and OpenAI with zero code changes required.

---

## 💻 Quick Start

### 1. Install Dependencies
```bash
npm run install:all
```

### 2. Development Mode
```bash
npm run dev
```

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000 (Health Check: http://localhost:5000/api/health)

---

## 📐 Modern Web Guidance Compliance
- **`css-layout`**: Adopted `height: 100dvh` for responsive dynamic viewport stability, nested scrolling containment via `overscroll-behavior: contain` and `scrollbar-gutter: stable`, and `min-height: 0` flex constraints preventing content clipping.
- **`ime-safe-enter-submit`**: Guarded textarea keyboard submission using `event.isComposing` and Safari `keyCode === 229` check.
