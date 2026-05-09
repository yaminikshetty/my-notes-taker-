# My Notes Taker & Voice Archive

A modern, high-performance monorepo featuring a clean **Notes Taker** application and a **Cassette Voice Memo Archive**. Built with a focus on speed, aesthetics, and a premium user experience.

## 🚀 Projects in this Workspace

### 1. 📝 Notes Taker (`artifacts/notes`)
A minimalist, elegant note-taking application designed for productivity.
- **Rich Note Types**: Support for text, checklists, bullet points, and doodles.
- **Smart Search**: Instant filtering of notes.
- **Organization**: Pin your most important thoughts to the top.
- **Aesthetics**: Premium serif typography and subtle micro-animations.
- **Tech Stack**: React 19, Vite, Tailwind CSS, Lucide Icons, Wouter.

### 2. 🎙️ Cassette Voice Archive (`artifacts/cassette`)
A beautiful interface for managing and playback of voice recordings.
- **Voice Memo Management**: Organized library for all your recordings.
- **Modern UI**: Dark-mode optimized, glassmorphic design.
- **Tech Stack**: React, Vite, Framer Motion, Tailwind CSS.

### 3. 🛠️ Shared Infrastructure (`lib/`)
- **api-client-react**: Generated React hooks for seamless API communication.
- **db**: Type-safe database schema and definitions (Drizzle ORM).
- **api-spec**: OpenAPI specifications for the backend.
- **object-storage-web**: Utilities for handling file uploads and storage.

---

## 🛠️ Tech Stack & Tools

- **Frontend**: [React 19](https://react.dev/), [Vite 7](https://vitejs.dev/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **State & Data**: [TanStack Query (React Query)](https://tanstack.com/query/latest)
- **Routing**: [Wouter](https://github.com/molecula-js/wouter)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Package Manager**: [pnpm](https://pnpm.io/) (Workspace-aware)

---

## 🏃 Getting Started

### Prerequisites
- Node.js (Latest LTS recommended)
- pnpm (`npm install -g pnpm`)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/yaminikshetty/my-notes-taker-.git
   cd my-notes-taker-
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Run the development servers:
   - **Notes App**:
     ```bash
     pnpm --filter @workspace/notes dev
     ```
   - **Cassette App**:
     ```bash
     pnpm --filter @workspace/cassette dev
     ```

---

## 📂 Project Structure

```text
.
├── artifacts/
│   ├── notes/          # Notes Taker frontend
│   ├── cassette/       # Voice Memo frontend
│   └── api-server/     # Express API backend
├── lib/
│   ├── api-client-react/ # Generated hooks
│   ├── api-spec/       # OpenAPI definitions
│   ├── db/             # Database schema
│   └── object-storage/ # Storage utilities
├── pnpm-workspace.yaml # Monorepo configuration
└── package.json
```

---

Built with ❤️ by [yaminikshetty](https://github.com/yaminikshetty)