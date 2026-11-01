import { translateUI } from './uiText';
export function errorText(message, status) {
  let lang = 'en';
  try {
    lang = localStorage.getItem('tinzel_language') || 'en';
  } catch {}
  if (lang !== 'sw') return message;
  const translated = translateUI(message, lang);
  if (translated !== message) return translated;
  if (/capacity|workload|fully assigned/i.test(message))
    return 'Msanifu huyu hana nafasi ya oda hii. Sasisha orodha na uchague msanifu anayepatikana.';
  if (/version|stale|changed|conflict/i.test(message))
    return 'Rekodi imebadilika. Fungua taarifa zilizohifadhiwa kabla ya kuendelea. Maandishi yako yamehifadhiwa hapa.';
  if (/otp|verification code|code.*expired/i.test(message))
    return 'Msimbo haujakubaliwa au umeisha muda. Hakiki msimbo au uombe mwingine.';
  if (/invalid email or password/i.test(message))
    return 'Barua pepe au nenosiri si sahihi. Hakiki taarifa zako kisha ujaribu tena.';
  if (/initial password.*expired/i.test(message))
    return 'Nenosiri la kwanza limeisha muda. Mwombe msimamizi atoe jingine.';
  if (/account.*deactivated/i.test(message)) return 'Akaunti hii imesitishwa. Wasiliana na msimamizi.';
  if (status === 401) return 'Kipindi chako kimeisha au hakitambuliki. Tafadhali ingia tena.';
  if (status === 403) return 'Hatua hii hairuhusiwi kwa ruhusa au hali ya sasa ya oda.';
  if (status === 404) return 'Taarifa hizi hazipatikani. Hakiki kiungo au namba ya oda.';
  if (status === 429) return 'Maombi ni mengi kwa sasa. Subiri kidogo kabla ya kujaribu tena.';
  if (status >= 500 || !status)
    return 'Muunganisho haujakamilika. Hakiki mtandao na taarifa zilizohifadhiwa kabla ya kurudia kitendo.';
  return 'Ombi halijakamilika. Hakiki taarifa ulizoingiza kisha ujaribu tena.';
}
