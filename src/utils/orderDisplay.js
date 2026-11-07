// Historical notifications retain their original audit text; hide retired references when displayed.
export function hideSubmissionReference(value) {
  return String(value ?? '')
    .replace(/(?:Temporary Submission ID|Submission ID|Namba ya (?:Muda ya Uwasilishaji|Mawasilisho))\s*:\s*SUB-\d{4}-[a-z0-9]+/gi, '')
    .replace(/\(?\bSUB-\d{4}-[a-z0-9]+\b\)?/gi, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
