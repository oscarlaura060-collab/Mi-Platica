/**
 * Genera todos los assets de marca de Mi Platica a partir de brand-source.webp.
 *
 *   node scripts/build-brand-assets.js
 *
 * El original NO se redibuja: solo se recorta, se le quita el fondo blanco
 * y se escala. El recorte del simbolo (la alcancia) se usa para los
 * espacios pequeños, donde el logo con texto seria ilegible.
 */
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'brand-source.webp');
const OUT = path.join(ROOT, 'assets');
fs.mkdirSync(OUT, { recursive: true });

/** Convierte el fondo blanco en transparente conservando el antialiasing. */
async function transparentBackground(input) {
  const img = sharp(input).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const px = Buffer.from(data);

  for (let i = 0; i < px.length; i += info.channels) {
    const r = px[i];
    const g = px[i + 1];
    const b = px[i + 2];
    const min = Math.min(r, g, b);
    // Blanco puro -> transparente. Los grises claros del borde se vuelven
    // semitransparentes para que no quede un halo dentado.
    if (min >= 250) {
      px[i + 3] = 0;
    } else if (min >= 235) {
      px[i + 3] = Math.round(((250 - min) / 15) * 255);
    }
  }

  return sharp(px, {
    raw: { width: info.width, height: info.height, channels: info.channels },
  }).png();
}

/**
 * Calcula el recuadro que de verdad ocupa el dibujo (alpha > 0).
 * Se hace a mano en vez de usar trim(): trim falla con "bad extract area"
 * cuando la region analizada queda uniforme, y aqui necesitamos un
 * resultado predecible.
 */
async function boundingBox(buffer, region) {
  let pipe = sharp(buffer).ensureAlpha();
  if (region) pipe = pipe.extract(region);
  const { data, info } = await pipe.raw().toBuffer({ resolveWithObject: true });

  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const a = data[(y * info.width + x) * info.channels + 3];
      if (a > 12) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) throw new Error('La region quedo vacia');

  const base = region ?? { left: 0, top: 0 };
  return {
    left: base.left + minX,
    top: base.top + minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

/** Silueta blanca sobre transparente: lo que Android exige para notificar. */
async function whiteSilhouette(input, size) {
  const img = sharp(input).ensureAlpha().resize(size, size, {
    fit: 'contain',
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  });
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const px = Buffer.from(data);

  for (let i = 0; i < px.length; i += info.channels) {
    const a = px[i + 3];
    px[i] = 255;
    px[i + 1] = 255;
    px[i + 2] = 255;
    px[i + 3] = a;
  }

  return sharp(px, {
    raw: { width: info.width, height: info.height, channels: info.channels },
  }).png();
}

async function main() {
  const meta = await sharp(SRC).metadata();
  const W = meta.width;
  const H = meta.height;

  // --- 1. Logo completo sin fondo -----------------------------------
  const sinFondo = await transparentBackground(SRC);
  const sinFondoBuf = await sinFondo.toBuffer();

  // Recorta el espacio vacio alrededor del logo completo.
  const cajaFull = await boundingBox(sinFondoBuf);
  console.log('  logo completo ocupa', JSON.stringify(cajaFull));
  const logoFull = await sharp(sinFondoBuf).extract(cajaFull).png().toBuffer();
  await sharp(logoFull)
    .resize({ width: 1200, withoutEnlargement: true })
    .png()
    .toFile(path.join(OUT, 'logo-full.png'));

  // --- 2. Solo el simbolo (la alcancia) ------------------------------
  // El simbolo es el primer tercio del logo. Se recorta sobre la caja real
  // para no depender de los margenes del archivo original.
  const anchoSimbolo = Math.round(cajaFull.width * 0.33);
  const cajaSimbolo = await boundingBox(sinFondoBuf, {
    left: cajaFull.left,
    top: cajaFull.top,
    width: anchoSimbolo,
    height: cajaFull.height,
  });
  console.log('  simbolo ocupa    ', JSON.stringify(cajaSimbolo));
  const symbolRaw = await sharp(sinFondoBuf).extract(cajaSimbolo).png().toBuffer();

  const symMeta = await sharp(symbolRaw).metadata();
  const lado = Math.max(symMeta.width, symMeta.height);

  // Lienzo cuadrado con el simbolo centrado y aire alrededor.
  const cuadrado = await sharp({
    create: {
      width: Math.round(lado * 1.18),
      height: Math.round(lado * 1.18),
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: symbolRaw, gravity: 'center' }])
    .png()
    .toBuffer();

  await sharp(cuadrado).resize(1024, 1024).png().toFile(path.join(OUT, 'symbol.png'));

  // --- 3. Icono de la app --------------------------------------------
  // Fondo blanco solido: el simbolo turquesa necesita contraste y los
  // lanzadores recortan el icono en formas distintas.
  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([
      {
        input: await sharp(cuadrado).resize(880, 880, { fit: 'contain' }).toBuffer(),
        gravity: 'center',
      },
    ])
    .png()
    .toFile(path.join(OUT, 'icon.png'));

  // --- 4. Adaptive icon de Android -----------------------------------
  // El sistema recorta hasta el 33% exterior: el simbolo debe caber en el
  // circulo central seguro, por eso ocupa solo el 62% del lienzo.
  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: await sharp(cuadrado).resize(620, 620, { fit: 'contain' }).toBuffer(),
        gravity: 'center',
      },
    ])
    .png()
    .toFile(path.join(OUT, 'adaptive-icon.png'));

  // --- 5. Icono de notificacion --------------------------------------
  // Android ignora los colores del icono de notificacion y lo pinta de
  // blanco usando solo el canal alfa. Por eso va la silueta, no el logo
  // a color: un logo a color se veria como un cuadrado blanco macizo.
  const sil = await whiteSilhouette(cuadrado, 96);
  await sil.toFile(path.join(OUT, 'notification-icon.png'));

  // --- 6. Splash y favicon -------------------------------------------
  await sharp({
    create: {
      width: 1242,
      height: 1242,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([
      {
        input: await sharp(logoFull).resize(900, null, { fit: 'inside' }).toBuffer(),
        gravity: 'center',
      },
    ])
    .png()
    .toFile(path.join(OUT, 'splash.png'));

  await sharp(cuadrado).resize(196, 196).png().toFile(path.join(OUT, 'favicon.png'));

  // --- Reporte --------------------------------------------------------
  for (const f of fs.readdirSync(OUT)) {
    const m = await sharp(path.join(OUT, f)).metadata();
    console.log(`  ${f.padEnd(24)} ${m.width}x${m.height}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
