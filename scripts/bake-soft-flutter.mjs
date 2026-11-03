// Bake the approved Blender animation into a lightweight, transparent CSS sprite.
// Usage: node scripts/bake-soft-flutter.mjs /absolute/path/to/tinzel-branding
import { chromium } from '@playwright/test';
import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const branding = resolve(process.argv[2] || '../tinzel-branding');
const browser = await chromium.launch({ channel: 'chrome', args: ['--allow-file-access-from-files'] });
try {
  const page = await browser.newPage({ viewport: { width: 400, height: 400 } });
  await page.goto(pathToFileURL(`${branding}/components/preview.html`).href);
  await page.waitForFunction(() => document.querySelector('tinzel-butterfly')?.dataset.ready === 'true');
  const data = await page.evaluate(async () => {
    const butterfly = document.querySelector('tinzel-butterfly');
    butterfly.style.width = '256px';
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const count = 96, size = 128, frames = [];
    let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
    for (let i = 0; i < count; i++) {
      butterfly.seek(i * butterfly.captureState().duration / count);
      const source = butterfly.shadowRoot.querySelector('canvas');
      const frame = document.createElement('canvas');
      frame.width = source.width; frame.height = source.height;
      const ctx = frame.getContext('2d'); ctx.drawImage(source, 0, 0);
      const pixels = ctx.getImageData(0, 0, frame.width, frame.height).data;
      for (let y = 0; y < frame.height; y++) for (let x = 0; x < frame.width; x++) {
        if (pixels[(y * frame.width + x) * 4 + 3] > 5) {
          minX = Math.min(minX, x); maxX = Math.max(maxX, x);
          minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        }
      }
      frames.push(frame);
    }
    if (!Number.isFinite(minX)) throw new Error('Animation rendered no visible pixels');
    const side = Math.max(maxX - minX, maxY - minY) + 8;
    const x = (minX + maxX - side) / 2, y = (minY + maxY - side) / 2;
    const atlas = document.createElement('canvas'); atlas.width = size * count; atlas.height = size;
    const ctx = atlas.getContext('2d');
    frames.forEach((frame, i) => ctx.drawImage(frame, x, y, side, side, i * size, 0, size, size));
    const poster = document.createElement('canvas'); poster.width = poster.height = size;
    poster.getContext('2d').drawImage(frames[0], x, y, side, side, 0, 0, size, size);
    return { atlas: atlas.toDataURL('image/webp', .94), poster: poster.toDataURL('image/webp', .94) };
  });
  await mkdir('public/brand', { recursive: true });
  for (const [name, value] of Object.entries(data)) await writeFile(`public/brand/soft-flutter-${name}.webp`, Buffer.from(value.split(',')[1], 'base64'));
} finally { await browser.close(); }
