<script>
  import { user } from '$lib/user';
  import fulcraLogo from '$lib/assets/app-icon_152.png';

  let verificationInfo = $state(null);
  let polling = $state(false);
  let error = $state(null);

  async function startLogin() {
    try {
      error = null;
      verificationInfo = await user.startLogin();

      // Start polling for token
      polling = true;
      await user.completeLogin(verificationInfo.deviceCode, verificationInfo.interval);

      // If we get here, login succeeded
      polling = false;
      verificationInfo = null;
    } catch (err) {
      console.error('Login error:', err);
      error = err.message;
      polling = false;
      verificationInfo = null;
    }
  }
</script>

<div class="flex h-screen w-full items-center justify-center">
  <div class="w-full max-w-md rounded-lg border border-solid border-fulcra-black-25 bg-fulcra-black-75 px-10 pt-10 pb-6">
    <div class="flex flex-col items-center pb-4">
      <div class="text-lg">Fulcra App Template</div>
      <img src={fulcraLogo} alt="Fulcra logo" />
    </div>

    {#if !verificationInfo}
      <div class="flex flex-col space-y-4">
        <button
          class="btn mx-auto w-full rounded-lg bg-fulcra-teal/20 px-2 py-2 text-fulcra-teal hover:bg-fulcra-teal/50"
          on:click={startLogin}
        >
          Sign In with Device Flow
        </button>

        {#if error}
          <p class="text-sm text-fulcra-error text-center">{error}</p>
        {/if}
      </div>
    {:else}
      <div class="flex flex-col space-y-4">
        <div class="rounded-lg bg-fulcra-black-50 p-4">
          <p class="text-sm text-fulcra-gray mb-2">1. Visit this URL on any device:</p>
          <a
            href={verificationInfo.verificationUri}
            target="_blank"
            rel="noopener noreferrer"
            class="text-fulcra-teal hover:underline break-all text-sm"
          >
            {verificationInfo.verificationUri}
          </a>

          <p class="text-sm text-fulcra-gray mt-4 mb-2">2. Enter this code:</p>
          <div class="bg-fulcra-black-25 rounded px-3 py-2 text-center">
            <span class="text-2xl font-mono text-fulcra-white tracking-widest">
              {verificationInfo.userCode}
            </span>
          </div>
        </div>

        {#if polling}
          <div class="flex items-center justify-center gap-2 text-fulcra-gray">
            <div class="loading loading-spinner loading-sm"></div>
            <span class="text-sm">Waiting for authentication...</span>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>
