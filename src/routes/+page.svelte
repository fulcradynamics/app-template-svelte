<script>
  import { user } from '$lib/user';
  import { onMount } from 'svelte';
  import Login from '$lib/components/Login.svelte';

  onMount(async () => {
    await user.init();
  });
</script>

<svelte:head>
  <title>Fulcra App Template</title>
</svelte:head>

{#if !$user.authenticated}
  <Login />
{:else}
  <div class="flex h-full min-h-screen items-center justify-center">
    <div class="text-center">
      <div class="mb-4 text-6xl text-fulcra-teal">🚀</div>
      <h1 class="mb-2 text-3xl font-bold text-fulcra-white">Fulcra App Template</h1>
      <p class="text-fulcra-gray">A SvelteKit template for building on the Fulcra platform</p>
      <div class="mt-6">
        <p class="text-sm text-fulcra-gray">
          User ID: <span class="text-fulcra-teal"
            >{$user.auth0UserInfo['fulcradynamics.com/userid']}</span
          >
        </p>
        <button
          class="mt-4 rounded-lg bg-fulcra-teal/20 px-4 py-2 text-fulcra-teal hover:bg-fulcra-teal/50"
          on:click={user.logout}>Sign Out</button
        >
      </div>
    </div>
  </div>
{/if}
