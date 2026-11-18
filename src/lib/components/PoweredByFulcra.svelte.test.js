import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import PoweredByFulcra from './PoweredByFulcra.svelte';

const skillUrl =
  'https://github.com/fulcradynamics/agent-skills/tree/main/skills/build-and-deploy-a-web-app';

beforeEach(() => {
  // jsdom has no modal dialogs or matchMedia.
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test('the Fulcra logo opens the build-an-app drawer with a copyable prompt', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal('navigator', { clipboard: { writeText } });
  render(PoweredByFulcra);
  expect(screen.queryByRole('heading', { name: 'Go from idea to live app' })).toBeNull();

  await fireEvent.click(screen.getByRole('button', { name: /powered by\s+fulcra/i }));

  expect(screen.getByRole('heading', { name: 'Go from idea to live app' })).toBeTruthy();
  const prompt = `Install the build-and-deploy-a-web-app skill from ${skillUrl} and help me build an app.`;
  expect(screen.getByText(prompt)).toBeTruthy();
  expect(screen.getByRole('link', { name: /View the skill on GitHub/ }).getAttribute('href')).toBe(
    skillUrl
  );
  await fireEvent.click(screen.getByRole('button', { name: 'Copy prompt' }));
  expect(writeText).toHaveBeenCalledWith(prompt);
  expect(await screen.findByRole('button', { name: 'Copied' })).toBeTruthy();

  await fireEvent.click(screen.getByRole('button', { name: 'Close panel' }));
  await waitFor(() =>
    expect(screen.queryByRole('heading', { name: 'Go from idea to live app' })).toBeNull()
  );
});
