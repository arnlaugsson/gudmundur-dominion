import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// The game data lives in data/*.json (written by the sync script). Instead of
// bundling it into the JS, serve it as /data/<file> — minified at build time,
// streamed from disk in dev — so data syncs don't invalidate cached JS chunks.
const DATA_FILES = ['dominion_data.json', 'card_texts.json']
const readMinified = file => JSON.stringify(JSON.parse(readFileSync(resolve('data', file), 'utf8')))

function dominionData() {
  return {
    name: 'dominion-data',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const file = DATA_FILES.find(f => req.url?.split('?')[0] === `/data/${f}`)
        if (!file) return next()
        try {
          res.setHeader('Content-Type', 'application/json')
          res.end(readMinified(file))
        } catch (err) {
          next(err)
        }
      })
    },
    generateBundle() {
      for (const file of DATA_FILES) {
        this.emitFile({ type: 'asset', fileName: `data/${file}`, source: readMinified(file) })
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), dominionData()],
  build: { target: 'es2022' },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    exclude: ['**/node_modules/**', '**/.worktrees/**', 'dist/**'],
  },
})
