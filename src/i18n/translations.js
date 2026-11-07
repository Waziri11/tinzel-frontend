import { trackingTranslations } from './trackingTranslations';

// Every UI string: key -> { en, sw }. Placeholders use {name}.
export const translations = {
  ...trackingTranslations,

  // Language selection
  'lang.title': { en: 'Choose your language', sw: 'Chagua lugha yako' },
  'lang.subtitle': { en: 'Select a language to continue', sw: 'Chagua lugha kuendelea' },
  'lang.english': { en: 'English', sw: 'English' },
  'lang.swahili': { en: 'Kiswahili', sw: 'Kiswahili' },
  'lang.change': { en: 'Language', sw: 'Lugha' },

  // App header / footer
  'nav.home': { en: 'Home', sw: 'Mwanzo' },
  'nav.followUp': { en: 'Follow Up Order', sw: 'Fuatilia Oda' },
  'nav.staffLogin': { en: 'Staff Login', sw: 'Ingia kama Mfanyakazi' },
  'footer.text': {
    en: 'Tinzel Bespoke Magazine Studios • White, Red, and Gold Editorial Palette • Zero Gradients • Zero Emojis',
    sw: 'Tinzel Studio za Majarida Maalum • Rangi Nyeupe, Nyekundu na Dhahabu • Bila Gradienti • Bila Emoji',
  },

  // Landing
  'landing.login': { en: 'Login', sw: 'Ingia' },
  'landing.every': { en: 'Every', sw: 'Kila' },
  'landing.deserves': { en: 'Deserves Its Own Magazine', sw: 'Inastahili Jarida Lake' },
  'landing.newOrder': { en: 'New Magazine Order', sw: 'Oda Mpya ya Jarida' },
  'landing.followUp': { en: 'Magazine Order Follow Up', sw: 'Fuatilia Oda ya Jarida' },
  'occasion.0': { en: 'Great Love Story', sw: 'Hadithi Nzuri ya Mapenzi' },
  'occasion.1': { en: 'Beautiful Wedding', sw: 'Harusi Nzuri' },
  'occasion.2': { en: 'Amazing Graduation', sw: 'Mahafali Mazuri' },
  'occasion.3': { en: 'Memorable Birthday', sw: 'Siku ya Kuzaliwa ya Kukumbukwa' },
  'occasion.4': { en: 'Cherished Anniversary', sw: 'Maadhimisho Yanayothaminiwa' },
  'occasion.5': { en: 'Milestone Celebration', sw: 'Sherehe ya Hatua Muhimu' },

  // Showcase
  'showcase.backHome': { en: 'Back to Home', sw: 'Rudi Mwanzo' },
  'showcase.backEditions': { en: 'Back to Magazine Editions', sw: 'Rudi kwenye Matoleo ya Majarida' },
  'showcase.catalogue': { en: 'Tinzel Editorial Catalogue', sw: 'Katalogi ya Tinzel' },
  'showcase.select': { en: 'Select Your Magazine Format', sw: 'Chagua Aina ya Jarida Lako' },
  'showcase.searchLabel': { en: 'Search magazine editions', sw: 'Tafuta matoleo ya majarida' },
  'showcase.searchPlaceholder': { en: 'Search by occasion or magazine name', sw: 'Tafuta kwa tukio au jina la jarida' },
  'showcase.found.one': { en: '{count} edition found', sw: 'Toleo {count} limepatikana' },
  'showcase.found.many': { en: '{count} editions found', sw: 'Matoleo {count} yamepatikana' },
  'showcase.available.one': { en: '{count} magazine edition available', sw: 'Toleo {count} la jarida linapatikana' },
  'showcase.available.many': { en: '{count} magazine editions available', sw: 'Matoleo {count} ya majarida yanapatikana' },
  'showcase.loading': { en: 'Loading editorial editions...', sw: 'Inapakia matoleo...' },
  'showcase.none': { en: 'No active magazine formats currently published.', sw: 'Hakuna aina za majarida zilizochapishwa kwa sasa.' },
  'showcase.noMatch': { en: 'No magazine editions match "{query}".', sw: 'Hakuna toleo linalolingana na "{query}".' },
  'showcase.clear': { en: 'Clear search', sw: 'Futa utafutaji' },
  'showcase.defaultTitle': { en: 'Personalized Magazine', sw: 'Jarida Maalum' },
  'showcase.weddingTitle': { en: 'Wedding Magazine', sw: 'Jarida la Harusi' },
  'showcase.birthdayTitle': { en: 'Birthday Magazine', sw: 'Jarida la Siku ya Kuzaliwa' },

  // Follow-up modal
  'follow.title': { en: 'Magazine Order Follow Up', sw: 'Fuatilia Oda ya Jarida' },
  'follow.intro': {
    en: "Follow your magazine's editorial progress, review designer drafts, and approve your printed edition.",
    sw: 'Fuatilia maendeleo ya jarida lako, kagua rasimu za mbunifu, na idhinisha toleo lako la kuchapishwa.',
  },
  'follow.orderNumber': { en: 'Magazine Order Number *', sw: 'Namba ya Oda ya Jarida *' },
  'follow.orderPlaceholder': { en: 'e.g. TNZ-2026-0001', sw: 'mf. TNZ-2026-0001' },
  'follow.orderHint': {
    en: 'Sent to your phone after payment verification.',
    sw: 'Hutumwa kwenye simu yako baada ya malipo kuthibitishwa.',
  },
  'follow.whatsapp': { en: 'Mobile Phone Number *', sw: 'Namba ya simu *' },
  'follow.whatsappHint': {
    en: 'We verify this number by SMS and remember this browser for this order for 30 days.',
    sw: 'Tutathibitisha namba hii kwa SMS na kukumbuka kivinjari hiki kwa oda hii kwa siku 30.',
  },
  'follow.continue': { en: 'Continue to Private Review', sw: 'Endelea kwenye Ukaguzi wa Faragha' },
  'follow.errBoth': {
    en: 'Please provide both your Magazine Order Number and registered phone number.',
    sw: 'Tafadhali weka namba ya oda ya jarida na namba ya simu.',
  },
  'follow.errLocate': {
    en: 'Could not locate order. Please check the order number and registered phone number.',
    sw: 'Oda haikupatikana. Tafadhali angalia namba ya oda na namba ya simu.',
  },
  'follow.errCode': {
    en: 'Please enter the 6-digit SMS verification code.',
    sw: 'Tafadhali weka msimbo wa uthibitisho wa tarakimu 6 wa SMS.',
  },
  'follow.errInvalid': { en: 'Invalid or expired verification code.', sw: 'Msimbo si sahihi au umeisha muda.' },
  'follow.sentTo': {
    en: 'A 6-digit SMS verification code was sent to {phone} for Order {order}.',
    sw: 'Msimbo wa uthibitisho wa tarakimu 6 umetumwa kwa SMS kwenye {phone} kwa Oda {order}.',
  },
  'follow.devCode': { en: '[Dev Mode] Verification Code: {code}', sw: '[Hali ya Dev] Msimbo wa Uthibitisho: {code}' },
  'follow.enterCode': { en: 'Enter 6-Digit Verification Code', sw: 'Weka Msimbo wa Tarakimu 6' },
  'follow.verify': { en: 'Verify & Enter Order Portal', sw: 'Thibitisha na Ingia Kwenye Oda' },
  'follow.change': { en: 'Change Order Number or Phone Number', sw: 'Badilisha Namba ya Oda au Simu' },

  // Form renderer
  'form.loading': { en: 'Loading your magazine details...', sw: 'Inapakia fomu ya jarida...' },
  'form.loadFailed': { en: 'We could not load this form. Please try again.', sw: 'Imeshindwa kupakia fomu' },
  'form.notFound': { en: 'Form Not Found', sw: 'Fomu Haipatikani' },
  'form.notFoundSlug': { en: 'This magazine is currently unavailable. Please choose another magazine or contact Tinzel.', sw: 'Jarida hili halipatikani kwa sasa. Tafadhali chagua jarida jingine au wasiliana na Tinzel.' },
  'form.defaultSection': { en: 'Magazine Details & Content', sw: 'Maelezo na Maudhui ya Jarida' },
  'form.defaultType': { en: 'Keepsake Edition', sw: 'Toleo la Kumbukumbu' },
  'form.badges': {
    en: 'No account needed • Order updates by SMS',
    sw: 'Huhitaji akaunti • Taarifa za oda kwa SMS',
  },
  'form.step': { en: 'Step {n} of {total}', sw: 'Hatua {n} ya {total}' },
  'form.contactTitle': { en: 'Your contact details', sw: 'Taarifa za Mawasiliano' },
  'form.contactDesc': {
    en: 'Use a phone number that can receive your tracking code by SMS.',
    sw: 'Weka namba ya simu inayoweza kupokea msimbo wa ufuatiliaji kwa SMS.',
  },
  'form.fullName': { en: 'Full Name *', sw: 'Jina Kamili *' },
  'form.fullNamePh': { en: 'e.g. Neema Mwita', sw: 'mf. Neema Mwita' },
  'form.whatsapp': { en: 'Mobile Phone Number *', sw: 'Namba ya simu *' },
  'form.email': { en: 'Email Address (Optional)', sw: 'Barua Pepe (Si Lazima)' },
  'form.emailPh': { en: 'e.g. neema@example.com', sw: 'mf. neema@example.com' },
  'form.errNamePhone': {
    en: 'Please enter your name and mobile number',
    sw: 'Tafadhali weka jina lako na namba ya simu',
  },
  'form.errRequired': { en: 'Please complete required question: {label}', sw: 'Tafadhali jibu swali linalohitajika: {label}' },
  'form.errSubmit': { en: 'Failed to submit magazine order', sw: 'Imeshindwa kuwasilisha oda ya jarida' },
  'form.pickGroup': { en: 'Click to select multiple photos for this spread', sw: 'Bofya kuchagua picha nyingi kwa ukurasa huu' },
  'form.pickSingle': { en: 'Choose a photo', sw: 'Bofya kuchagua picha' },
  'form.groupHint': {
    en: 'Choose clear, high-quality photos for your magazine.',
    sw: 'Chagua picha zilizo wazi na zenye ubora mzuri kwa jarida lako.',
  },
  'form.singleHint': { en: 'JPEG, PNG, WEBP files up to 25MB each', sw: 'Faili za JPEG, PNG, WEBP hadi 25MB kila moja' },
  'form.folderAssets': { en: 'Your photos ({count} {unit}):', sw: 'Picha zako ({count} {unit}):' },
  'form.photo': { en: 'photo', sw: 'picha' },
  'form.photos': { en: 'photos', sw: 'picha' },
  'form.chooseOption': { en: '-- Choose an option --', sw: '-- Chagua chaguo --' },
  'form.durationPh': { en: 'e.g. 1 hour 30 minutes', sw: 'mf. saa 1 dakika 30' },
  'form.readyTitle': { en: 'Ready to immortalize your story?', sw: 'Uko tayari kuifanya hadithi yako idumu?' },
  'form.readyDesc': {
    en: 'Submit your magazine details to continue to payment.',
    sw: 'Wasilisha taarifa za jarida lako ili kuendelea kwenye malipo.',
  },
  'form.submitting': { en: 'Submitting Order...', sw: 'Inawasilisha Oda...' },
  'form.continuePay': { en: 'Continue to Payment', sw: 'Endelea kwenye Malipo' },

  // Lipa Namba screen
  'pay.title': { en: 'Order received · Complete your payment', sw: 'Oda imepokelewa · Kamilisha malipo' },
  'pay.uploaded': {
    en: 'Your photos and responses for {title} are safely uploaded.',
    sw: 'Picha na majibu yako kwa {title} yamepakiwa salama.',
  },
  'pay.submitter': { en: 'Your name:', sw: 'Jina lako:' },
  'pay.awaiting': { en: 'Awaiting Payment', sw: 'Inasubiri Malipo' },
  'pay.noticeTitle': { en: 'Your order number', sw: 'Namba ya oda yako' },
  'pay.notice': {
    en: 'Once payment is confirmed, we’ll text your tracking ID to {phone}.',
    sw: 'Malipo yakithibitishwa, tutatuma namba yako ya ufuatiliaji kwa SMS kwenye {phone}.',
  },
  'pay.instrTitle': { en: 'Lipa Namba Payment Instructions', sw: 'Maelekezo ya Malipo ya Lipa Namba' },
  'pay.till': { en: 'Lipa Namba (Till Number):', sw: 'Lipa Namba:' },
  'pay.copy': { en: 'Copy', sw: 'Nakili' },
  'pay.copied': { en: 'Copied', sw: 'Imenakiliwa' },
  'pay.amount': { en: 'Amount to Pay:', sw: 'Kiasi cha Kulipa:' },
  'pay.account': { en: 'Account Name:', sw: 'Jina la Akaunti:' },
  'pay.verify': { en: 'We will let you know when your payment is confirmed.', sw: 'Tutakujulisha malipo yako yakithibitishwa.' },
  'pay.goTracking': { en: 'Track my order', sw: 'Fuatilia oda yangu' },
};
