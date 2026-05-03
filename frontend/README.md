# Lift Lab — frontend

Next.js 16 (App Router) + React 19 + Tailwind v4 + shadcn (Base UI variant) + Recharts.

See the [root README](../README.md) for project overview and the [root CLAUDE.md](../CLAUDE.md) for AI-agent conventions and stack gotchas. The `AGENTS.md` in this directory has a critical warning about Next 16 differing from training-data Next.

```sh
npm install
npm run dev      # http://localhost:3000
npm run build
npm run lint
```

`/api/*` is rewritten to the FastAPI backend on `http://127.0.0.1:8000` via `next.config.ts`. Server Components fetch the backend directly using `BACKEND_URL` (defaults to localhost:8000) — see `src/lib/api-server.ts`.
