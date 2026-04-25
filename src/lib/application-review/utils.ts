// ─── Shared utilities for the review engine ───────────────────────────────────

/** Convert an arbitrary string (e.g. a CUID) into a URL-safe slug for finding IDs. */
export function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

/** True when a string looks like it contains a year reference (incident dating). */
export function containsYearReference(text: string): boolean {
  return /\b(19|20)\d{2}\b/.test(text)
}

/** True when text mentions law enforcement, police, or official agencies. */
export function mentionsLawEnforcement(text: string): boolean {
  return /(police|law enforcement|sheriff|FBI|DHS|FEMA|federal bureau|department of homeland|fusion center|joint terrorism|threat assessment|JTTF)/i.test(text)
}

/** True when text mentions a specific contractor, vendor, or installer. */
export function mentionsContractor(text: string): boolean {
  return /(contractor|integrator|installer|licensed|vendor|firm|company|technician|professional|certified technician)/i.test(text)
}

/** True when text mentions system testing, inspection, or closeout. */
export function mentionsTesting(text: string): boolean {
  return /(test|inspect|commission|closeout|verify|validation|walkthrough|punch list|acceptance)/i.test(text)
}

/** True when text mentions maintenance schedule/frequency. */
export function mentionsMaintenance(text: string): boolean {
  return /(annual|semi-annual|quarterly|monthly|routine maintenance|scheduled|periodic|inspection schedule|service agreement|maintenance plan)/i.test(text)
}

/** True when text mentions ownership or responsible party. */
export function mentionsOwnership(text: string): boolean {
  return /(responsible|assigned to|maintained by|managed by|ownership|point of contact|facilities manager|security director|designated staff)/i.test(text)
}

/** True when narrative is suspiciously short (< threshold chars) for its purpose. */
export function isTooShort(text: string, threshold = 80): boolean {
  return text.trim().length < threshold
}

/** Detect vague, non-specific phrases that weaken a narrative. */
export function detectVagueTerms(text: string): string[] {
  const vague = [
    /\bTBD\b/i,
    /\bto be determined\b/i,
    /\bto be decided\b/i,
    /\bASAP\b/i,
    /\bas soon as possible\b/i,
    /\bvarious\b/i,
    /\bappropriate\b.*\bstaff\b/i,
    /\bif needed\b/i,
    /\bif necessary\b/i,
    /\bas needed\b/i,
    /\bsoon\b/i,
    /\bin the future\b/i,
    /\bpossibly\b/i,
    /\bperhaps\b/i,
    /\bmight\b.*\bconside/i,
    /\bsometime\b/i,
    /\bgeneral(ly)?\b/i,
    /\bnormal operations\b/i,
    /\bstandard practice\b/i,
  ]
  return vague.filter((re) => re.test(text)).map((re) => re.source)
}
