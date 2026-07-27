import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const source = path.join(root, 'public/images/otzar-logo-transparent.png');
const outDir = path.join(root, 'public/icons');

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const THEME_BG = '#FCFAF5';

async function run() {
  for (const size of SIZES) {
    await sharp(source)
      .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toFile(path.join(outDir, `icon-${size}x${size}.png`));
    console.log(`icon-${size}x${size}.png`);
  }

  // Maskable icon: logo scaled to ~65% and centered on a solid brand background,
  // so Android's adaptive-icon safe-zone crop never cuts off the artwork.
  const maskableSize = 512;
  const logoSize = Math.round(maskableSize * 0.65);
  const logoBuffer = await sharp(source)
    .resize(logoSize, logoSize, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: maskableSize,
      height: maskableSize,
      channels: 4,
      background: THEME_BG,
    },
  })
    .composite([{ input: logoBuffer, gravity: 'center' }])
    .png()
    .toFile(path.join(outDir, 'icon-maskable-512x512.png'));
  console.log('icon-maskable-512x512.png');

  // Apple touch icon (iOS ignores manifest icons; needs its own <link> tag).
  await sharp(source)
    .resize(180, 180, { fit: 'contain', background: THEME_BG })
    .flatten({ background: THEME_BG })
    .png()
    .toFile(path.join(outDir, 'apple-touch-icon.png'));
  console.log('apple-touch-icon.png');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
