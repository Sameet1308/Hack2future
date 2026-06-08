// Runtime config for the Glass Box AI demo frontend.
//
// COPILOT_EMBED_URL — the published Copilot Studio agent web-chat URL.
// Get it after publishing: Copilot Studio → Glass Box Claims Assistant →
//   Settings → Channels → "Custom website" → copy the iframe `src` URL
//   (looks like: https://copilotstudio.microsoft.com/environments/<env>/bots/<bot>/webchat?...)
// Paste it into the .env file as VITE_COPILOT_EMBED_URL=... (preferred), or hardcode the
// fallback string below for a quick demo.
export const COPILOT_EMBED_URL =
  import.meta.env.VITE_COPILOT_EMBED_URL || '';

// GlassBox-GetClaimAudit read-flow URL (Day-2: drives Theater from real Decision_Rationale rows).
// Get it after building the HTTP-triggered flow: the "When an HTTP request is received" trigger's URL.
export const CLAIM_AUDIT_URL =
  import.meta.env.VITE_CLAIM_AUDIT_URL || '';
