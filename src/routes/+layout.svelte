<script>
  import './layout.css';
  import { blur } from 'svelte/transition';
  import { page } from '$app/state';
  import AuthGate from '$lib/components/AuthGate.svelte';
  import PoweredByFulcra from '$lib/components/PoweredByFulcra.svelte';

  let { children } = $props();
</script>

<svelte:head>
  <title>Fulcra App Template</title>
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
