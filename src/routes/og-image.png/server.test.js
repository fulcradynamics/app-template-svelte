import { expect, it } from 'vitest';
import { GET } from './+server.js';

it('renders a 1200x630 PNG link preview', async () => {
  const response = await GET();
  const png = Buffer.from(await response.arrayBuffer());
  expect(response.headers.get('Content-Type')).toBe('image/png');
  expect(png.subarray(1, 4).toString()).toBe('PNG');
  expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630]);
});
