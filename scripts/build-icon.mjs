// Rasterize resources/icon.svg -> resources/icon.png (transparent, 1024px).
// resvg renders with proper anti-aliasing and preserves the alpha channel, so
// the squircle's safe-area margin stays transparent (qlmanage flattens to white).
//
//   node scripts/build-icon.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { Resvg } from '@resvg/resvg-js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const svg = readFileSync(join(root, 'resources/icon.svg'), 'utf-8')

const resvg = new Resvg(svg, {
  fitTo: { mode: 'width', value: 1024 },
  background: 'rgba(0,0,0,0)' // keep the canvas transparent
})
const png = resvg.render().asPng()
writeFileSync(join(root, 'resources/icon.png'), png)
console.log(`Wrote resources/icon.png (${png.length} bytes)`)
