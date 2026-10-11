/**
 * Genera assets/notification-icon.png: 96x96, silueta blanca sobre
 * transparente (lo que exige Android para el icono de notificacion).
 * Dibuja una moneda: circulo blanco con un "$" calado.
 *
 *   node scripts/make-notification-icon.js
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SIZE = 96;

function alphaAt(x, y) {
  const cx = SIZE / 2 - 0.5;
  const cy = SIZE / 2 - 0.5;
  const d = Math.hypot(x - cx, y - cy);
  const rOuter = 44;
  const rInner = 34;

  // Anillo exterior con borde suavizado.
  const ring = clamp(rOuter - d) * clamp(d - rInner + 1);
  if (ring > 0) return Math.min(1, ring);

  if (d > rInner) return 0;

  // Barra vertical del simbolo.
  if (Math.abs(x - cx) <= 2.5 && Math.abs(y - cy) <= 24) return 1;

  // Dos trazos horizontales que insinuan la "S".
  const bar = (yc) => Math.abs(y - yc) <= 2.5 && Math.abs(x - cx) <= 12;
  if (bar(cy - 10) || bar(cy + 10) || bar(cy)) return 1;

  return 0;
}

const clamp = (v) => (v <= 0 ? 0 : v >= 1 ? 1 : v);

// --- Construccion del PNG (RGBA, sin compresion de filtros) ---
const raw = Buffer.alloc((SIZE * 4 + 1) * SIZE);
let o = 0;
for (let y = 0; y < SIZE; y++) {
  raw[o++] = 0; // filtro "none" por fila
  for (let x = 0; x < SIZE; x++) {
    const a = Math.round(alphaAt(x, y) * 255);
    raw[o++] = 255;
    raw[o++] = 255;
    raw[o++] = 255;
    raw[o++] = a;
  }
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body) >>> 0);
  return Buffer.concat([len, body, crc]);
}

let table = null;
function crc32(buf) {
  if (!table) {
    table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let c = -1;
  for (const b of buf) c = table[(c ^ b) & 0xff] ^ (c >>> 8);
  return c ^ -1;
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // RGBA
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

const out = path.join(__dirname, '..', 'assets', 'notification-icon.png');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, png);
console.log(`OK ${out} (${png.length} bytes, ${SIZE}x${SIZE})`);
