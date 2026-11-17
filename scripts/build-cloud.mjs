import { spawnSync } from 'node:child_process'

let url
try { url = new URL(process.env.VITE_API_BASE_URL) } catch { /* Explain setup below. */ }
if (!url || url.protocol !== 'https:' || url.username || url.password || url.search || url.hash ||
    ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || url.pathname.replace(/\/$/, '') !== '/api') {
  console.error('Set VITE_API_BASE_URL to your deployed HTTPS API URL ending in /api before building for Cloudflare Pages.')
  process.exit(1)
}
if (!process.env.npm_execpath) {
  console.error('Run this through npm run build:cloud.')
  process.exit(1)
}
const result = spawnSync(process.execPath, [process.env.npm_execpath, 'run', 'build'], {
  stdio: 'inherit', env: process.env,
})
if (result.error) { console.error(result.error.message); process.exit(1) }
process.exit(result.status ?? 1)
