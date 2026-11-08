import { readFileSync } from 'node:fs';
import { test, expect } from './fixtures.js';

const wav = Buffer.alloc(16044);
wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28);
wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(16000, 40);
const audioFile = { name: 'voice-note.wav', mimeType: 'audio/wav', buffer: wav };
const png = readFileSync(new URL('../../../tinzel-backend/tests/fixtures/review-reference.png', import.meta.url));

async function setup(page, lang = 'en', failures = false, fullscreen = false) {
  await page.addInitScript(language => localStorage.setItem('tinzel_language', language), lang);
  const state = { annotations: [], attachments: new Map(), chunkFailed: false, saveFailed: false, playbackFailed: false };
  const order = { _id: 'comment-audio', clientName: 'Audio comment client', clientPreferredLanguage: lang, status: 'client_review', currentDraftVersion: 1,
    draftVersions: [{ versionNumber: 1, managerReview: { status: 'approved' } }], revisionRequests: [] };
  await page.route('**/api/client/order', route => route.fulfill({ json: { order } }));
  await page.route('**/api/proofs/client/1**', async route => {
    const { pathname, searchParams } = new URL(route.request().url());
    const json = (data, status = 200) => route.fulfill({ status, json: data });
    if (pathname.endsWith('/attachments')) {
      const body = route.request().postDataJSON();
      let asset = [...state.attachments.values()].find(item => item.clientId === body.clientId);
      if (!asset) { asset = { ...body, id: String(state.attachments.size + 1).padStart(24, '0'), received: [], state: 'uploading' }; state.attachments.set(asset.id, asset); }
      return json({ ...asset, chunkBytes: 1024 * 1024 });
    }
    if (pathname.includes('/attachments/')) {
      const asset = state.attachments.get(pathname.split('/attachments/')[1].split('/')[0]);
      if (route.request().method() === 'DELETE') return json({});
      if (pathname.includes('/chunks/')) {
        if (failures && !state.chunkFailed && asset.contentType.startsWith('audio/')) { state.chunkFailed = true; return json({ message: 'Audio upload interrupted' }, 503); }
        // WebKit may omit binary request bodies from its inspection protocol.
        asset.bytes = route.request().postDataBuffer() || (asset.contentType.startsWith('image/') ? png : wav);
        asset.received.push({ n: 0 }); return json({});
      }
      if (pathname.endsWith('/complete')) { asset.state = 'ready'; return json({ id: asset.id, name: asset.name, contentType: asset.contentType }); }
      if (failures && asset.contentType.startsWith('audio/') && !state.playbackFailed) { state.playbackFailed = true; return route.fulfill({ contentType: asset.contentType, body: Buffer.from('bad audio') }); }
      return route.fulfill({ contentType: asset.contentType, body: asset.bytes });
    }
    if (pathname.endsWith('/annotations')) {
      if (failures && !state.saveFailed) { state.saveFailed = true; return json({ message: 'Comment save interrupted' }, 503); }
      const body = route.request().postDataJSON();
      state.annotations.push({ ...body, _id: 'annotation-1', version: 1, source: 'client', authorName: order.clientName, createdAt: new Date().toISOString(),
        attachments: body.attachmentIds.map(id => { const asset = state.attachments.get(id); return { id, name: asset.name, contentType: asset.contentType }; }) });
      return json({ annotations: state.annotations });
    }
    if (pathname.includes('/pages/')) return searchParams.has('text')
      ? json({ width: 600, height: 800, geometryVersion: 3, ocrVersion: 1, text: [], imageRegions: [] })
      : route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect width="600" height="800" fill="white"/></svg>' });
    return json({ state: 'ready', pageCount: 1, pages: [{ page: 1, width: 600, height: 800, geometryVersion: 3, ocrVersion: 1 }], canComment: true, annotations: state.annotations });
  });
  await page.goto('/track');
  if (fullscreen) {
    await page.getByRole('button', { name: lang === 'en' ? 'Fullscreen' : 'Skrini nzima', exact: true }).click();
    await expect(page.locator('.pdf-book.is-expanded')).toBeVisible();
  }
  await page.getByRole('button', { name: lang === 'en' ? 'Mark area' : 'Weka alama eneo', exact: true }).click();
  await page.locator('.proof-sheet').first().scrollIntoViewIfNeeded();
  const bounds = await page.locator('.proof-sheet').first().boundingBox();
  await page.mouse.move(bounds.x + bounds.width * .2, bounds.y + bounds.height * .3); await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * .6, bounds.y + bounds.height * .5); await page.mouse.up();
  await expect(page.locator('.proof-composer')).toBeVisible();
  return state;
}

for (const lang of ['en', 'sw']) test(`page feedback offers audio beside pictures, persists and plays in ${lang}`, async ({ page }, info) => {
  await page.setViewportSize({ width: lang === 'sw' ? 390 : 1280, height: 900 });
  const state = await setup(page, lang, lang === 'en');
  const composer = page.locator('.proof-composer');
  await expect(composer.getByRole('button', { name: lang === 'en' ? 'Attach images' : 'Ambatisha picha', exact: true })).toBeVisible();
  await expect(composer.getByRole('button', { name: lang === 'en' ? 'Attach audio' : 'Ambatisha sauti', exact: true })).toBeInViewport();
  await composer.getByLabel(lang === 'en' ? 'Attach audio' : 'Ambatisha sauti', { exact: true }).setInputFiles(audioFile);
  const save = composer.getByRole('button', { name: lang === 'en' ? 'Save comment' : 'Hifadhi maoni', exact: true });
  if (lang === 'en') {
    await expect(page.getByText('Audio upload interrupted')).toBeVisible(); await expect(save).toBeDisabled();
    await page.getByRole('button', { name: 'Retry audio upload', exact: true }).click();
  }
  await expect(save).toBeEnabled();
  await expect(composer.locator('textarea')).toBeEmpty();
  await composer.screenshot({ path: info.outputPath(`audio-comment-${lang}.png`), animations: 'disabled' });
  await save.click();
  if (lang === 'en') {
    await expect(page.getByText('Comment save interrupted')).toBeVisible();
    await expect(composer.getByLabel('Preview audio feedback')).toBeVisible();
    await save.click();
  }
  await expect(composer).toHaveCount(0);
  expect(state.annotations[0].attachments[0].contentType).toBe('audio/wav');
  await page.getByRole('button', { name: lang === 'en' ? 'Listen to audio comment' : 'Sikiliza maoni ya sauti', exact: true }).click();
  if (lang === 'en') await page.getByRole('button', { name: 'Retry audio', exact: true }).click();
  const player = page.locator('.proof-attached-audio audio');
  await expect(player).toBeVisible();
  await expect.poll(() => player.evaluate(audio => audio.readyState)).toBeGreaterThan(0);
  await page.reload();
  await page.getByRole('button', { name: /^(Comments|Maoni) \(1\)$/, exact: true }).click();
  await expect(page.getByRole('button', { name: lang === 'en' ? 'Listen to audio comment' : 'Sikiliza maoni ya sauti', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('recording locks comment saving, stops the microphone, and can accompany pictures', async ({ page, context }) => {
  await context.grantPermissions(['microphone']);
  await page.addInitScript(() => {
    const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async options => { const stream = await original(options); window.commentStream = stream; return stream; };
  });
  const state = await setup(page);
  const composer = page.locator('.proof-composer');
  await composer.locator('input[accept^="image/"]').setInputFiles({ name: 'reference.png', mimeType: 'image/png', buffer: png });
  await composer.getByRole('button', { name: 'Record voice note' }).click();
  await expect(composer.getByRole('button', { name: 'Stop recording' })).toBeVisible();
  await expect(composer.getByRole('button', { name: 'Save comment', exact: true })).toBeDisabled();
  await page.waitForTimeout(1200);
  await composer.getByRole('button', { name: 'Stop recording' }).click();
  await expect(composer.getByLabel('Preview audio feedback')).toBeVisible();
  expect(await page.evaluate(() => window.commentStream.getTracks().every(track => track.readyState === 'ended'))).toBe(true);
  await expect(composer.getByRole('button', { name: 'Save comment', exact: true })).toBeEnabled();
  await composer.getByRole('button', { name: 'Save comment', exact: true }).click();
  await expect(composer).toHaveCount(0);
  expect(state.annotations[0].attachments).toHaveLength(2);
  await expect(page.locator('.proof-attached-image img')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Listen to audio comment', exact: true })).toBeVisible();
});

test.use({ launchOptions: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] } });

for (const width of [390, 1280]) test(`photo chooser preserves fullscreen, previews and saved pictures at ${width}px`, async ({ page }, info) => {
  await page.setViewportSize({ width, height: 900 });
  const state = await setup(page, 'en', false, true);
  const composer = page.locator('.proof-composer');
  await composer.locator('textarea').fill('Please use these photos.');
  const chooserReady = page.waitForEvent('filechooser');
  await composer.getByRole('button', { name: 'Attach images', exact: true }).click();
  const chooser = await chooserReady;
  // Native photo pickers can exit browser fullscreen before dispatching change.
  await page.evaluate(async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
    else document.dispatchEvent(new Event('fullscreenchange'));
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  await expect(page.locator('.pdf-book.is-expanded')).toBeVisible();
  expect(await chooser.element().evaluate(input => input.isConnected)).toBe(true);
  await chooser.setFiles([]);
  await expect(composer.locator('textarea')).toHaveValue('Please use these photos.');
  const secondChooserReady = page.waitForEvent('filechooser');
  await composer.getByRole('button', { name: 'Attach images', exact: true }).click();
  await (await secondChooserReady).setFiles([{ name: 'first.png', mimeType: 'image/png', buffer: png }, { name: 'second.png', mimeType: 'image/png', buffer: png }]);
  const previews = composer.locator('.proof-attachment-thumbnails img');
  await expect(previews).toHaveCount(2);
  await expect(previews.first()).toBeInViewport();
  await expect.poll(() => previews.evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0))).toBe(true);
  await expect(composer.locator('textarea')).toHaveValue('Please use these photos.');
  const save = composer.getByRole('button', { name: 'Save comment', exact: true });
  await expect(save).toBeEnabled(); await expect(save).toBeInViewport();
  await page.screenshot({ path: info.outputPath(`fullscreen-photo-previews-${width}.png`), animations: 'disabled' });
  await composer.getByRole('button', { name: 'Remove image: first.png', exact: true }).click();
  await expect(previews).toHaveCount(1);
  await save.click();
  await expect(composer).toHaveCount(0);
  expect(state.annotations[0].attachments).toHaveLength(1);
  await expect(page.locator('.pdf-book.is-expanded')).toBeVisible();
  await page.getByRole('button', { name: 'Open image: second.png', exact: true }).click();
  await expect.poll(() => page.locator('.proof-image-viewer img').evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
  await page.getByRole('button', { name: 'Close image', exact: true }).click();
  await expect(page.locator('.pdf-book.is-expanded')).toBeVisible();
  await page.getByRole('button', { name: 'Exit fullscreen', exact: true }).click();
  await expect(page.locator('.pdf-book.is-expanded')).toHaveCount(0);
  await expect(page.locator('.proof-attached-image img')).toBeVisible();
});
