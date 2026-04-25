// ─── Acronyms that must never be lower-cased ─────────────────────────────────

const PROTECTED_ACRONYMS = [
  'CTA', 'CCTV', 'NSGP', 'FEMA', 'DHS', 'FBI', 'EIN', 'SAA',
  'UEI', 'SAM', 'CFDA', 'OMB', 'IRS', 'DOJ', 'ATF', 'TSA',
  'CISA', 'JTTF', 'ICE', 'US', 'USA', 'FBI', 'LED', 'DVR',
  'NVR', 'IP', 'AI', 'IT',
]

// Placeholder to protect acronyms during processing
function protectAcronyms(text: string): [string, Map<string, string>] {
  const map = new Map<string, string>()
  let protected_ = text
  PROTECTED_ACRONYMS.forEach((acr, i) => {
    const token = `__ACR${i}__`
    // Replace word-boundary occurrences (case-insensitive)
    protected_ = protected_.replace(new RegExp(`\\b${acr}\\b`, 'gi'), (match) => {
      map.set(token, acr) // always restore to canonical uppercase
      return token
    })
  })
  return [protected_, map]
}

function restoreAcronyms(text: string, map: Map<string, string>): string {
  let restored = text
  map.forEach((acr, token) => {
    restored = restored.replaceAll(token, acr)
  })
  return restored
}

// ─── Long sentence threshold ──────────────────────────────────────────────────

const LONG_SENTENCE_WORD_THRESHOLD = 45

// ─── Main export ─────────────────────────────────────────────────────────────

export interface CleanTextResult {
  /** The cleaned version of the text */
  cleaned: string
  /** Human-readable flags found during cleaning */
  flags: string[]
}

/**
 * Clean generated narrative text for PDF export.
 *
 * Operations performed (in order):
 * 1. Protect acronyms so they survive casing transforms
 * 2. Capitalise the first character of the string
 * 3. Capitalise the first letter after sentence-ending punctuation
 * 4. Collapse multiple consecutive spaces
 * 5. Remove repeated adjacent phrases (common in AI output)
 * 6. Restore acronyms
 * 7. Flag sentences that exceed LONG_SENTENCE_WORD_THRESHOLD words
 */
export function cleanText(raw: string): CleanTextResult {
  if (!raw || raw.trim() === '') return { cleaned: raw, flags: [] }

  const flags: string[] = []

  // Step 1 — protect acronyms
  const [protected_, acronymMap] = protectAcronyms(raw)

  let text = protected_

  // Step 2 — capitalise start of string
  text = text.charAt(0).toUpperCase() + text.slice(1)

  // Step 3 — capitalise after sentence-ending punctuation (. ! ?)
  text = text.replace(/([.!?]+)\s+([a-z])/g, (_, punct, letter) => `${punct} ${letter.toUpperCase()}`)

  // Step 4 — collapse multiple spaces
  text = text.replace(/[ \t]{2,}/g, ' ')

  // Step 5 — remove repeated adjacent phrases (2–8 word runs that appear back-to-back)
  // e.g. "the facility the facility should" → "the facility should"
  text = text.replace(/\b(\w+(?:\s+\w+){1,7})\s+\1\b/gi, '$1')

  // Step 6 — restore acronyms
  text = restoreAcronyms(text, acronymMap)

  // Step 7 — flag long sentences
  // Split on sentence-ending punctuation followed by whitespace or end-of-string
  const sentences = text.split(/(?<=[.!?])\s+/)
  for (const sentence of sentences) {
    const words = sentence.trim().split(/\s+/).filter(Boolean)
    if (words.length > LONG_SENTENCE_WORD_THRESHOLD) {
      const preview = words.slice(0, 12).join(' ')
      flags.push(
        `Long sentence (${words.length} words) — consider splitting: "${preview}…"`,
      )
    }
  }

  return { cleaned: text.trim(), flags }
}

/**
 * Clean all narrative text values in a record, returning cleaned values and
 * aggregated flags keyed by section name.
 */
export function cleanNarratives(
  narratives: Record<string, string>,
): { cleaned: Record<string, string>; flags: Record<string, string[]> } {
  const cleaned: Record<string, string> = {}
  const flags: Record<string, string[]> = {}

  for (const [key, value] of Object.entries(narratives)) {
    const result = cleanText(value)
    cleaned[key] = result.cleaned
    if (result.flags.length > 0) flags[key] = result.flags
  }

  return { cleaned, flags }
}
