import { json } from '@sveltejs/kit';
import { clearSession } from '$lib/server/session.js';

export function POST({ cookies }) {
  clearSession(cookies);
  return json({ signedOut: true });
}
