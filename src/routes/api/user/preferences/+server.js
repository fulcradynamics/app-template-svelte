import { env } from '$env/dynamic/public';
import { error, json } from '@sveltejs/kit';

/**
 * Server-side endpoint to fetch user preferences from Fulcra API
 * This demonstrates that the cookie token works for subsequent requests
 */
export async function GET({ cookies }) {
  const accessToken = cookies.get('fulcra_access_token');

  if (!accessToken) {
    throw error(401, 'Not authenticated');
  }

  try {
    const apiUrl = `${env.PUBLIC_FULCRA_API_ENDPOINT}user/v1alpha1/preferences`;
    console.log('Fetching user preferences from:', apiUrl);

    const response = await fetch(apiUrl, {
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
    console.error('Error fetching user preferences:', err);
    throw error(500, 'Failed to fetch user preferences');
  }
}
