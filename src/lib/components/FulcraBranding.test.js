import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import FulcraBranding from './FulcraBranding.svelte';

describe('Fulcra branding', () => {
  it('invites visitors to build their own app with the starter skill', () => {
    const { body } = render(FulcraBranding);
    expect(body).toContain('Powered by');
    expect(body).toContain('Fulcra');
    expect(body).toContain('Build your own app with Fulcra');
    expect(body).toContain(
      'href="https://github.com/fulcradynamics/community-skills/tree/main/skills/fulcra-app-starter"'
    );
    expect(body).toContain('rel="noopener noreferrer"');
  });
});
