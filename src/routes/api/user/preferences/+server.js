import { env } from '$env/dynamic/public';
import { error, json } from '@sveltejs/kit';
import { FulcraApiClient } from '$lib/apiclient.js';

/**
 * Server-side endpoint to fetch user preferences from Fulcra API
 * Demonstrates using FulcraApiClient's high-level methods
 */
export async function GET({ cookies }) {
  const accessToken = cookies.get('fulcra_access_token');

  if (!accessToken) {
    throw error(401, 'Not authenticated');
  }

  try {
    const apiClient = new FulcraApiClient(env.PUBLIC_FULCRA_API_ENDPOINT, accessToken);
    const preferences = await apiClient.getUserPreferences();
    return json(preferences);
  } catch (err) {
    console.error('Error fetching user preferences:', err);
    throw error(500, err.message || 'Failed to fetch user preferences');
  }
}
