import { timedFetch } from './timed-fetch.js';

export async function loadAccessPolicy() {
  // The server clears an expired session cookie with a 401 before reaching this
  // public endpoint. Retry that GET once; never retry authentication or purchases.
  for (let attempt = 0; attempt < 2; attempt++) {
    const { response, data } = await timedFetch('/api/access-policy', {
      credentials: 'same-origin', cache: 'no-store'
    }, 10000);
    if (response.status === 401 && attempt === 0) continue;
    if (!response.ok) throw new Error('Access policy unavailable');
    const policy = JSON.parse(data);
    if (typeof policy?.telegram_only !== 'boolean') throw new Error('Invalid access policy');
    return policy;
  }
}
