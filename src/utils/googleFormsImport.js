export const MAX_GOOGLE_FORM_FILE_BYTES = 5 * 1024 * 1024;

const invalidFile = () => Object.assign(new Error('Open the Google Form responder page while signed in, then save it as Webpage, HTML Only and select the saved .html file.'), { code: 'GOOGLE_FORM_INVALID_FILE' });

// Never execute the saved page or send its HTML, account information, response
// drafts, or other scripts to the server. Read only the form definition.
export function extractSavedGoogleForm(html) {
  if (typeof html !== 'string' || new TextEncoder().encode(html).length > MAX_GOOGLE_FORM_FILE_BYTES) {
    throw Object.assign(new Error('Choose a saved Google Form HTML file smaller than 5 MB.'), { code: 'GOOGLE_FORM_FILE_TOO_LARGE' });
  }
  const match = /\bFB_PUBLIC_LOAD_DATA_\s*=\s*(\[)/.exec(html);
  if (!match) throw invalidFile();
  const start = match.index + match[0].length - 1;
  let depth = 0, inString = false, escaped = false;
  for (let index = start; index < html.length; index += 1) {
    const char = html[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
    } else if (char === '"') inString = true;
    else if (char === '[') depth += 1;
    else if (char === ']' && --depth === 0) {
      try {
        const data = JSON.parse(html.slice(start, index + 1));
        if (!Array.isArray(data?.[1]?.[1]) || !data[1][1].length) throw invalidFile();
        const items = data[1][1].map(item => {
          if (!Array.isArray(item)) throw invalidFile();
          return item.slice(0, 5);
        });
        const formData = [null, [data[1][0] || '', items], null, data[3] || data[1][8] || 'Imported Google Form'];
        if (new TextEncoder().encode(JSON.stringify(formData)).length > 750 * 1024) {
          throw Object.assign(new Error('Google Form question data is too large to import.'), { code: 'GOOGLE_FORM_FILE_TOO_LARGE' });
        }
        return formData;
      } catch (error) {
        if (error.code) throw error;
        throw invalidFile();
      }
    }
  }
  throw invalidFile();
}
