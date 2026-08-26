<script>
  import { user } from '$lib/user';
  import fulcraLogo from '$lib/assets/app-icon_152.png';
</script>

<div class="flex h-screen w-full items-center justify-center">
  <div
    class="w-full rounded-lg px-10 pt-10 pb-6 sm:w-1/3 sm:min-w-[340px] sm:border sm:border-solid sm:border-fulcra-black-25 sm:bg-fulcra-black-75"
  >
    <div class="flex flex-col items-center pb-4">
      <div class="text-lg">Fulcra App Template</div>
      <img src={fulcraLogo} alt="Fulcra logo" />
    </div>

    <div class="flex flex-col space-y-4">
      <button
        class="btn mx-auto w-full rounded-lg bg-fulcra-teal/20 px-2 py-2 text-fulcra-teal hover:bg-fulcra-teal/50"
        on:click={user.login}>Sign In</button
      >
    </div>
  </div>
</div>
