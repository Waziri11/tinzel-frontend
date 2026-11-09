import { test, expect } from './fixtures.js';

const wav = Buffer.alloc(44 + 16000 * 12);
wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28);
wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(wav.length - 44, 40);

async function setup(page, { fail = false } = {}) {
  const reads = [];
  await page.addInitScript(() => localStorage.setItem('tinzel_language', 'en'));
  const order = { _id: 'voice-note-order', clientName: 'Test Customer', clientPreferredLanguage: 'en', status: 'client_review', currentDraftVersion: 1,
    draftVersions: [{ versionNumber: 1, managerReview: { status: 'approved' } }], revisionRequests: [] };
  const annotations = [1, 2].map(number => ({ _id: `comment-${number}`, page: 1, version: 1, kind: 'area', text: '',
    authorName: 'Test Customer', createdAt: '2026-11-09T08:00:00Z', rects: [{ x: .2, y: .2 * number, width: .3, height: .1 }],
    attachments: [{ id: `audio-${number}`, name: `Voice note ${number}`, contentType: 'audio/wav' }] }));
  await page.route('**/api/client/order', route => route.fulfill({ json: { order } }));
  await page.route('**/api/proofs/client/1**', route => {
    const url = new URL(route.request().url());
    if (url.pathname.includes('/attachments/')) {
      reads.push(url.pathname.split('/').at(-1));
      if (fail && reads.length === 1) return route.fulfill({ status: 503, json: { message: 'Please retry.' } });
      return route.fulfill({ contentType: 'audio/wav', body: wav });
    }
    if (url.pathname.includes('/pages/')) return url.searchParams.has('text')
      ? route.fulfill({ json: { width: 600, height: 800, text: [] } })
      : route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect width="600" height="800" fill="white"/></svg>' });
    return route.fulfill({ json: { state: 'ready', pageCount: 1, pages: [{ page: 1 }], canComment: true, annotations } });
  });
  await page.goto('/track');
  await page.getByRole('button', { name: 'Comments (2)', exact: true }).click();
  return reads;
}

for (const width of [320, 1280]) test(`compact comment players play, pause, seek and change speed at ${width}px`, async ({ page }, info) => {
  await page.setViewportSize({ width, height: 900 });
  const reads = await setup(page);
  const players = page.getByRole('group', { name: 'Audio comment player', exact: true });
  await expect(players).toHaveCount(2);
  await expect(page.getByText('Listen to audio comment', { exact: true })).toHaveCount(0);
  expect(reads).toEqual([]);
  const first = players.nth(0), second = players.nth(1);
  await expect(first.getByRole('slider', { name: 'Audio position' })).toBeDisabled();
  const bounds = await first.boundingBox();
  expect(bounds.height).toBeLessThan(85);
  expect(await first.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  await first.getByRole('button', { name: 'Play audio comment', exact: true }).click();
  await expect(first.getByRole('button', { name: 'Pause audio comment', exact: true })).toBeVisible();
  await expect.poll(() => first.locator('audio').evaluate(audio => audio.currentTime)).toBeGreaterThan(0);
  await first.getByRole('button', { name: 'Pause audio comment', exact: true }).click();
  await expect.poll(() => first.locator('audio').evaluate(audio => audio.paused)).toBe(true);
  await expect(first.locator('.voice-note-time')).toContainText('0:12');
  const timeline = first.getByRole('slider', { name: 'Audio position' });
  await timeline.focus();
  await timeline.press('End');
  await expect(timeline).toHaveValue('12');
  await expect.poll(() => first.locator('audio').evaluate(audio => audio.currentTime)).toBeCloseTo(12, 1);
  await timeline.press('Home');
  await expect(timeline).toHaveValue('0');
  await expect.poll(() => first.locator('audio').evaluate(audio => audio.currentTime)).toBeCloseTo(0, 1);
  await timeline.press('ArrowRight');
  await expect.poll(() => first.locator('audio').evaluate(audio => audio.currentTime)).toBeCloseTo(.1, 1);
  await first.getByRole('button', { name: 'Playback speed: 1×', exact: true }).click();
  expect(await first.locator('audio').evaluate(audio => audio.playbackRate)).toBe(1.5);
  await first.getByRole('button', { name: 'Play audio comment', exact: true }).click();
  await second.getByRole('button', { name: 'Play audio comment', exact: true }).click();
  await expect(second.getByRole('button', { name: 'Pause audio comment', exact: true })).toBeVisible();
  await expect(first.getByRole('button', { name: 'Play audio comment', exact: true })).toBeVisible();
  expect(reads).toEqual(['audio-1', 'audio-2']);
  await second.getByRole('button', { name: 'Pause audio comment', exact: true }).click();
  await page.getByRole('complementary', { name: 'Magazine comments' }).screenshot({ path: info.outputPath(`compact-audio-comments-${width}.png`) });
  const element = await first.locator('audio').elementHandle();
  await first.getByRole('button', { name: 'Play audio comment', exact: true }).click();
  await page.getByRole('button', { name: 'Close comments', exact: true }).click();
  expect(await element.evaluate(audio => audio.paused && !audio.getAttribute('src'))).toBe(true);
});

test('compact player keeps its controls on a failed download and retries the audio', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const reads = await setup(page, { fail: true });
  const first = page.getByRole('group', { name: 'Audio comment player', exact: true }).first();
  await first.getByRole('button', { name: 'Play audio comment', exact: true }).click();
  await expect(first.getByRole('alert')).toHaveText('Audio could not open. Tap to retry.');
  await expect(first.getByRole('slider', { name: 'Audio position' })).toBeDisabled();
  await first.getByRole('button', { name: 'Retry audio', exact: true }).click();
  await expect(first.getByRole('button', { name: 'Pause audio comment', exact: true })).toBeVisible();
  await expect(first.getByRole('alert')).toHaveCount(0);
  expect(reads).toEqual(['audio-1', 'audio-1']);
});
