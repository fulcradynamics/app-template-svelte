<script>
  import './layout.css';
  import { blur } from 'svelte/transition';
  import { page } from '$app/state';

  let { children } = $props();
</script>

{#key page.url.pathname}
  <div class="flex h-full min-h-screen w-full flex-col p-3" in:blur>
    {@render children()}
  </div>
{/key}

<style>
  :global(BODY) {
    background-color: transparent !important;
  }

  :global(html:root) {
    background-color: transparent !important;
  }
</style>
