// Only fixed, safe diagnostics. Never render server exception text or initData.
export function authFailure(status, data = {}) {
  if (status === 403 && data?.code === 'ORIGIN_DENIED') return 'Panel URL/proxy configuration blocked this login (ORIGIN_DENIED · HTTP 403). Please contact the panel owner.';
  if (status === 401) return 'Telegram access could not be verified (TG_AUTH_INVALID · HTTP 401). Close and reopen from the official bot. If this repeats, the owner must check the bot configuration and server clock.';
  if (status === 429) return 'Too many login attempts (HTTP 429). Wait 15 minutes before trying again.';
  if (status === 503) return 'Telegram login is not configured or temporarily unavailable (HTTP 503). Please contact the panel owner.';
  if (status >= 500) {
    const id = /^[a-f0-9]{16}$/.test(data?.request_id || '') ? ` Reference: ${data.request_id}.` : '';
    return `The server could not finish signing you in (HTTP ${status}).${id} Please contact the panel owner.`;
  }
  return `Panel sign-in failed (HTTP ${Number.isInteger(status) ? status : 'unknown'}). Please contact the panel owner.`;
}
