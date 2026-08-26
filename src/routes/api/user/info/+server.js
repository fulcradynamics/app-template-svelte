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
    const apiUrl = `${env.FULCRA_API_ENDPOINT}/user/v1alpha1/info`;
    console.log('Fetching user info from:', apiUrl);
    console.log('FULCRA_API_ENDPOINT env var:', env.FULCRA_API_ENDPOINT);

    // Try to get user info
    let response = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    // If user doesn't exist (404), register them first
    if (response.status === 404) {
      console.log('User not found, registering new user...');
      const registerResponse = await fetch(`${env.FULCRA_API_ENDPOINT}/user/v0/register`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      if (!registerResponse.ok) {
        console.error('Registration failed:', registerResponse.status, registerResponse.statusText);
        throw error(registerResponse.status, 'Failed to register user');
      }

      console.log('User registered successfully, fetching user info...');

      // Now fetch user info again
      response = await fetch(`${env.FULCRA_API_ENDPOINT}/user/v1alpha1/info`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
    }

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
