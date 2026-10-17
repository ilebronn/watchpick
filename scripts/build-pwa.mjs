import { readFile, readdir, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'

const assetNames = (await readdir('dist/assets')).filter(name => /\.(js|css)$/.test(name))
const posters = (await readdir('dist/posters')).filter(name => /\.(jpg|svg)$/.test(name))
const precache = ['/index.html', '/manifest.webmanifest', '/favicon.svg', '/tmdb.svg', '/tmdb-attribution.txt', '/icon-192.png', '/icon-512.png', ...assetNames.map(name => `/assets/${name}`), ...posters.map(name => `/posters/${name}`)]
const hash = createHash('sha256')
for (const file of precache) hash.update(await readFile(`dist${file}`))
const cacheName = `watchpick-shell-${hash.digest('hex').slice(0, 12)}`
const template = await readFile('scripts/service-worker.js', 'utf8')
await writeFile('dist/sw.js', template.replace("'__SHELL_CACHE__'", JSON.stringify(cacheName)).replace('/* PRECACHE */[]', JSON.stringify(precache)))
console.log(`PWA built: ${precache.length} public assets; API responses are never cached.`)
