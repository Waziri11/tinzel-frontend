// Historical notifications retain their original audit text; hide retired references when displayed.
export function hideSubmissionReference(value) {
  return String(value ?? '')
    .replace(/(?:Temporary Submission ID|Submission ID|Namba ya (?:Muda ya Uwasilishaji|Mawasilisho))\s*:\s*SUB-\d{4}-[a-z0-9]+/gi, '')
    .replace(/\(?\bSUB-\d{4}-[a-z0-9]+\b\)?/gi, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Names are display labels only; all lookups and mutations continue using the order's internal ID.
export function orderSenderName(order, fallback = 'Unnamed customer') {
  return String(order?.clientName ?? '').trim() || fallback;
}

export function staffOrderText(value, order = {}) {
  const name = String(order.clientName ?? '').trim();
  let text = String(value ?? '')
    .replace(/https?:\/\/[^\s<>]+\/staff[^\s<>]*/gi, '')
    .replace(/(?:Tracking ID|Order ID|Temporary Submission ID|Submission ID|Namba ya (?:Ufuatiliaji|Muda ya Uwasilishaji|Mawasilisho))\s*:\s*(?:TNZ|SUB)-[a-z0-9-]+/gi, () => name);
  for (const reference of [order._id, order.trackingId, order.submissionId]) {
    if (reference) text = text.split(String(reference)).join(name);
  }
  return text.replace(/\b(?:TNZ|SUB)-[a-z0-9]+(?:-[a-z0-9]+)*\b/gi, () => name)
    .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}
