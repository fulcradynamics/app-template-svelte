# Fulcra App Template - Svelte

A SvelteKit web application template for building on the Fulcra platform. This template includes:

- **SvelteKit** with Svelte 5
- **Tailwind CSS 4** with DaisyUI
- **Fulcra brand colors** and styling
- **ESLint** and **Prettier** configured
- **Vitest** for testing

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
```
Then edit `.env` with your Auth0 credentials and Fulcra API endpoint.

3. Run the development server:
```bash
npm run dev
```
The app will be available at http://localhost:6173/

4. Build for production:
```bash
npm run build
```

## Authentication

This template includes Auth0 authentication out of the box with server-side API proxying:

- **Auth0 Login**: Handled client-side with Auth0 SDK
- **Access Tokens**: Stored in HTTP-only cookies (more secure than localStorage)
- **API Calls**: Proxied through SvelteKit server routes to bypass CORS
- **No CORS Issues**: Works with any deployment platform (Vercel, Netlify, Cloudflare Pages)

### How It Works

1. User authenticates with Auth0 (client-side)
2. Access token is sent to server and stored in HTTP-only cookie
3. Client makes requests to `/api/*` server routes
4. Server routes use the cookie token to call Fulcra API
5. No CORS restrictions since requests are server-to-server

This approach is more secure and doesn't require adding your domain to the Fulcra API CORS allowlist.

## Project Structure

```
src/
├── app.html           # HTML template
├── app.d.ts          # TypeScript declarations
├── lib/              # Shared components and utilities
└── routes/           # SvelteKit routes
    ├── layout.css    # Global styles with Fulcra colors
    ├── +layout.svelte # Root layout
    └── +page.svelte  # Home page
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run check` - Run type checking
- `npm run format` - Format code with Prettier
- `npm run lint` - Lint code with ESLint
- `npm test` - Run tests
