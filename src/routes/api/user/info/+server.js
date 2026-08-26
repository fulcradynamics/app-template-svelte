import { env } from '$env/dynamic/private';
import { error, json } from '@sveltejs/kit';

/**
 * Server-side endpoint to fetch user info from Fulcra API
 * This bypasses CORS by making the request server-side
 */
export async function GET({ cookies }) {
  const accessToken = cookies.get('fulcra_access_token');

  if (!accessToken) {
    throw error(401, 'Not authenticated');
  }

  try {
    const response = await fetch(`${env.FULCRA_API_ENDPOINT}/user/v1alpha1/info`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw error(response.status, `API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    return json(data);
  } catch (err) {
    console.error('Error fetching user info:', err);
    throw error(500, 'Failed to fetch user info');
  }
}
