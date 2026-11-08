const HOUR = 3600000;
const DAY = 24 * HOUR;
const EAT_OFFSET = 3 * HOUR;
export const EXPRESS_FEE = 20000;

export function isExpressSunday(time = Date.now()) {
  return new Date(new Date(time).getTime() + EAT_OFFSET).getUTCDay() === 0;
}

// The deadline is saved by the server; the display excludes Sunday hours too.
export function workingMilliseconds(from, to) {
  let start = new Date(from).getTime(), end = new Date(to).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  if (start > end) return -workingMilliseconds(to, from);
  let elapsed = 0;
  // Skip complete weeks so old overdue orders remain cheap to render.
  const weeks = Math.floor((end - start) / (7 * DAY));
  elapsed += weeks * 6 * DAY;
  start += weeks * 7 * DAY;
  while (start < end) {
    const local = new Date(start + EAT_OFFSET);
    const midnight = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + 1) - EAT_OFFSET;
    const next = Math.min(end, midnight);
    if (local.getUTCDay() !== 0) elapsed += next - start;
    start = next;
  }
  return elapsed;
}

export function compareExpressPriority(a, b) {
  const priority = Number(b.isExpress === true) - Number(a.isExpress === true);
  if (priority) return priority;
  if (a.isExpress && b.isExpress) {
    const due = new Date(a.expressDueAt || 0).getTime() - new Date(b.expressDueAt || 0).getTime();
    if (due) return due;
  }
  return 0;
}

export function expressCountdown(order, now = Date.now()) {
  if (!order?.isExpress) return null;
  if (['delivered', 'closed'].includes(order.orderStatus || order.status)) return { state: 'complete' };
  if (!order.expressStartedAt || !order.expressDueAt) return { state: 'pending' };
  const remaining = workingMilliseconds(now, order.expressDueAt);
  const seconds = Math.ceil(Math.abs(remaining) / 1000);
  const paused = isExpressSunday(now);
  const localNow = new Date(new Date(now).getTime() + EAT_OFFSET);
  return {
    state: new Date(now).getTime() >= new Date(order.expressDueAt).getTime() ? 'overdue' : 'active',
    hours: Math.floor(seconds / 3600), minutes: Math.floor(seconds / 60) % 60, seconds: seconds % 60,
    paused,
    ...(paused ? { resumesAt: Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), localNow.getUTCDate() + 1) - EAT_OFFSET } : {}),
  };
}
