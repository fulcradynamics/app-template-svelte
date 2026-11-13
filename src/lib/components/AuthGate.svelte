<script>
  import { onMount } from 'svelte';
  import { user } from '$lib/user';
  import LoginDeviceFlow from '$lib/components/LoginDeviceFlow.svelte';

  /** @type {{ children: import('svelte').Snippet }} */
  let { children } = $props();
  // Persisted user info is not proof of a valid server session.
  let restored = $state(false);
  let restorationFailed = $state(false);

  onMount(() => {
    let active = true;
    user
      .init()
      .then(() => {
        if (active) restored = true;
      })
      .catch(() => {
        if (active) restorationFailed = true;
      });
    return () => {
      active = false;
    };
  });
</script>

{#if restorationFailed}
  <p role="alert">Unable to restore your session. Please reload the page to try again.</p>
{:else if restored}
  {#if $user.authenticated}
    {@render children()}
  {:else}
    <LoginDeviceFlow />
  {/if}
{/if}
