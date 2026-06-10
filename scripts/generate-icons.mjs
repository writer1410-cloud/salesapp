// ブランドカラーのPWAアイコン(PNG)を生成する簡易スクリプト。
// 外部依存なし。zlibでRGBAビットマップをPNGにエンコードする。
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = resolve(__dirname, '../public')
mkdirSync(publicDir, { recursive: true })

// CRC32 (PNG用)
const crcTable = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()
function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const body = Buffer.concat([typeBuf, data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body), 0)
  return Buffer.concat([len, body, crc])
}

function hex(c) {
  return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]
}

function lerp(a, b, t) {
  return Math.round(a + (b - a) * t)
}

function buildPng(size) {
  const bgTop = hex('#24272e')
  const bgBottom = hex('#121317')
  const fg = hex('#f3f4f5')
  const dot = hex('#16181d')
  const gold = hex('#cda758')
  const r = size * 0.22

  // 角丸ラウンド矩形の内側判定（pad だけ内側に縮めた形）
  const inRound = (x, y, pad) => {
    const lo = pad
    const hi = size - pad
    if (x < lo || y < lo || x > hi || y > hi) return false
    const rr = Math.max(0, r - pad)
    const cxL = lo + rr,
      cxR = hi - rr,
      cyT = lo + rr,
      cyB = hi - rr
    if (x < cxL && y < cyT) return (x - cxL) ** 2 + (y - cyT) ** 2 <= rr * rr
    if (x > cxR && y < cyT) return (x - cxR) ** 2 + (y - cyT) ** 2 <= rr * rr
    if (x < cxL && y > cyB) return (x - cxL) ** 2 + (y - cyB) ** 2 <= rr * rr
    if (x > cxR && y > cyB) return (x - cxR) ** 2 + (y - cyB) ** 2 <= rr * rr
    return true
  }

  const px = (x, y) => {
    if (!inRound(x, y, 0)) return [0, 0, 0, 0]
    // 縦グラデーション背景
    const t = y / size
    const bg = [
      lerp(bgTop[0], bgBottom[0], t),
      lerp(bgTop[1], bgBottom[1], t),
      lerp(bgTop[2], bgBottom[2], t),
    ]

    // 細いゴールドの縁取り
    const border = size * 0.022
    if (!inRound(x, y, border)) return [...gold, 150]

    // 吹き出し本体
    const bx0 = size * 0.22,
      bx1 = size * 0.78,
      by0 = size * 0.28,
      by1 = size * 0.6
    if (x >= bx0 && x <= bx1 && y >= by0 && y <= by1) {
      const cy = (by0 + by1) / 2
      const dots = [0.36, 0.5, 0.64]
      for (let i = 0; i < dots.length; i++) {
        const cx = size * dots[i]
        if ((x - cx) ** 2 + (y - cy) ** 2 <= (size * 0.045) ** 2) {
          return i === 2 ? [...gold, 255] : [...dot, 255]
        }
      }
      return [...fg, 255]
    }
    // 吹き出しのしっぽ
    if (
      x >= size * 0.32 &&
      x <= size * 0.46 &&
      y >= by1 &&
      y <= by1 + size * 0.12 &&
      y - by1 <= (x - size * 0.32) * 0.85
    )
      return [...fg, 255]
    return [...bg, 255]
  }

  const raw = Buffer.alloc((size * 4 + 1) * size)
  let p = 0
  for (let y = 0; y < size; y++) {
    raw[p++] = 0 // filter type none
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = px(x, y)
      raw[p++] = r
      raw[p++] = g
      raw[p++] = b
      raw[p++] = a
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

for (const size of [192, 512]) {
  writeFileSync(resolve(publicDir, `pwa-${size}x${size}.png`), buildPng(size))
}
writeFileSync(resolve(publicDir, 'apple-touch-icon.png'), buildPng(180))
console.log('PWA icons generated.')
