import { readFile } from 'node:fs/promises';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { appConfig } from '$lib/app-config.js';

// The link-preview image: the app's logo and name, powered by Fulcra.
// Rendered once at build time into a static file.
export const prerender = true;

const types = { svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg' };

/** @param {string} path */
async function dataUrl(path) {
  const type = types[/** @type {keyof types} */ (path.split('.').pop()?.toLowerCase())];
  return `data:${type};base64,${(await readFile(path)).toString('base64')}`;
}

/** @param {string} type @param {Record<string, unknown>} props @param {...unknown} children */
const h = (type, props, ...children) => ({ type, props: { ...props, children } });

export async function GET() {
  const logo = appConfig.logoSrc ? `static${appConfig.logoSrc}` : 'src/lib/assets/app-icon_152.png';
  const font = (/** @type {number} */ weight) =>
    readFile(`node_modules/@fontsource/rubik/files/rubik-latin-${weight}-normal.woff`);

  const svg = await satori(
    h(
      'div',
      {
        style: {
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 64,
          padding: 64,
          background: '#16161d',
          color: '#ffffff',
          fontFamily: 'Rubik'
        }
      },
      h(
        'div',
        { style: { display: 'flex', alignItems: 'center', gap: 40 } },
        h('img', { src: await dataUrl(logo), style: { height: 140, borderRadius: 24 } }),
        h('div', { style: { fontSize: 76, fontWeight: 500, maxWidth: 820 } }, appConfig.appName)
      ),
      h(
        'div',
        { style: { display: 'flex', alignItems: 'center', gap: 20 } },
        h('div', { style: { fontSize: 26, letterSpacing: 3, color: '#8a8a8e' } }, 'POWERED BY'),
        h('img', {
          src: await dataUrl('src/lib/assets/fulcra-logo.svg'),
          width: 202,
          height: 48
        })
      )
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'Rubik', data: await font(400), weight: 400 },
        { name: 'Rubik', data: await font(500), weight: 500 }
      ]
    }
  );

  return new Response(new Uint8Array(new Resvg(svg).render().asPng()), {
    headers: { 'Content-Type': 'image/png' }
  });
}
