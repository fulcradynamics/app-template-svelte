<script>
  import './layout.css';
  import { blur } from 'svelte/transition';
  import { page } from '$app/state';
  import AuthGate from '$lib/components/AuthGate.svelte';
  import PoweredByFulcra from '$lib/components/PoweredByFulcra.svelte';
  import { appConfig } from '$lib/app-config.js';

  let { children } = $props();
</script>

<svelte:head>
  <title>Fulcra App Template</title>
  <meta name="description" content={appConfig.tagline} />
  <!-- Link previews in messaging apps -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content={page.url.origin + page.url.pathname} />
  <meta property="og:title" content={appConfig.appName} />
  <meta property="og:description" content={appConfig.tagline} />
  <meta property="og:image" content={`${page.url.origin}/og-image.png`} />
  <meta property="og:image:type" content="image/png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content={`${appConfig.appName}, powered by Fulcra`} />
  <meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<div class="flex h-full min-h-screen w-full flex-col p-3" in:blur>
  <AuthGate>
    {#key page.url.pathname}
      {@render children()}
    {/key}
    <footer
      class="sticky bottom-0 -mx-3 mt-auto -mb-3 flex justify-center bg-fulcra-black/70 py-2 backdrop-blur-sm"
    >
      <PoweredByFulcra />
    </footer>
  </AuthGate>
</div>

<style>
  :global(BODY) {
    background-color: transparent !important;
  }

  :global(html:root) {
    background-color: transparent !important;
  }
</style>
