import { requirePhone } from '../utils/phone.js';

// Only contact fields are normalized: form answers and other free text stay intact.
export function normalizePhonePayload(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return body;
  const result = { ...body };
  for (const key of ['phone', 'clientWhatsApp', 'printerPhone']) {
    if (result[key] !== undefined && result[key] !== '') result[key] = requirePhone(result[key]);
  }
  if (result.channel === 'sms' || result.channel === 'whatsapp') {
    for (const key of ['destination', 'to']) if (result[key]) result[key] = requirePhone(result[key]);
  }
  if (['printer_whatsapp_phone', 'support_phone'].includes(result.key) && result.value !== '') result.value = requirePhone(result.value);
  if (result.values && typeof result.values === 'object') {
    result.values = { ...result.values };
    for (const key of ['TWILIO_PHONE_NUMBER', 'TWILIO_WHATSAPP_NUMBER']) {
      if (result.values[key]) result.values[key] = requirePhone(result.values[key].replace(/^whatsapp:/i, ''));
    }
  }
  return result;
}
