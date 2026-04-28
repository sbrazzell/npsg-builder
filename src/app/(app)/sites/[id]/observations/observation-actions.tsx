'use client'

// ObservationActions is superseded by ObservationCard (which handles both
// edit and delete inline at full card width). Kept as a re-export shim so any
// other imports don't break.
export { ObservationCard as ObservationActions } from './observation-card'
