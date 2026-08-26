import { json } from '@sveltejs/kit';

/**
 * Server-side endpoint to store the Auth0 access token in an HTTP-only cookie
 * Called after successful Auth0 authentication from the client
 */
export async function POST({ request, cookies }) {
  const { accessToken } = await request.json();

  if (!accessToken) {
    return json({ error: 'No access token provided' }, { status: 400 });
  }

  // Store token in HTTP-only cookie (more secure than localStorage)
  // Security settings ensure cookie is only accessible from this domain:
  // - httpOnly: JavaScript cannot access the cookie (XSS protection)
  // - secure: Only sent over HTTPS (localhost is exempt in dev)
  // - sameSite: 'strict': Cookie only sent to same domain, not cross-site
  // - path: '/': Available to all routes on this domain only
  cookies.set('fulcra_access_token', accessToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/'
  });

  return json({ success: true });
}

/**
 * DELETE endpoint to clear the access token cookie (logout)
 */
export async function DELETE({ cookies }) {
  cookies.delete('fulcra_access_token', { path: '/' });
  return json({ success: true });
}
