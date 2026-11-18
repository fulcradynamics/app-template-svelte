<script>
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import fulcraLogo from '$lib/assets/fulcra-logo.svg';

  // Same content as the "Go from idea to live app" panel in the Fulcra portal.
  const skillUrl =
    'https://github.com/fulcradynamics/agent-skills/tree/main/skills/build-and-deploy-a-web-app';
  const guideUrl = 'https://docs.fulcradynamics.com/#for-agents';
  const prompt = `Install the build-and-deploy-a-web-app skill from ${skillUrl} and help me build an app.`;

  /** @type {HTMLDialogElement} */
  let dialog;
  // Mounts the drawer so it slides in, and out before the dialog closes.
  let open = $state(false);
  let copied = $state(false);

  function show() {
    open = true;
    copied = false;
    dialog.showModal();
  }

  async function copyPrompt() {
    await navigator.clipboard.writeText(prompt);
    copied = true;
    setTimeout(() => (copied = false), 1500);
  }

  const duration = () => (matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 300);
</script>

<button
  type="button"
  class="flex items-center gap-3 rounded-md opacity-90 transition-opacity hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-fulcra-teal"
  onclick={show}
>
  <span class="text-[11px] leading-none tracking-[0.06em] text-fulcra-gray uppercase"
    >powered by</span
  >
  <img src={fulcraLogo} alt="Fulcra" class="block h-[22px] w-auto" />
</button>

<dialog
  bind:this={dialog}
  aria-labelledby="build-with-fulcra-title"
  class="fixed inset-0 m-0 h-dvh max-h-dvh w-screen max-w-[100vw] overflow-hidden border-none bg-transparent p-0 backdrop:bg-black/60"
  oncancel={(e) => {
    e.preventDefault();
    open = false;
  }}
  onclick={(e) => {
    if (e.target === dialog) open = false;
  }}
  onclose={() => (open = false)}
>
  {#if open}
    <div
      class="ml-auto flex h-full w-full max-w-[460px] flex-col overflow-hidden rounded-l-2xl border-l border-fulcra-black-25 bg-fulcra-black text-fulcra-white"
      transition:fly={{ x: 480, duration: duration(), opacity: 1, easing: cubicOut }}
      onoutroend={() => dialog.close()}
    >
      <header class="flex items-center justify-between border-b border-fulcra-black-25 px-5 py-4">
        <h2 id="build-with-fulcra-title" class="text-lg font-semibold">Go from idea to live app</h2>
        <button
          type="button"
          class="rounded-md px-2 text-xl text-fulcra-gray hover:text-fulcra-white"
          aria-label="Close panel"
          onclick={() => (open = false)}>×</button
        >
      </header>

      <div class="flex flex-1 flex-col gap-6 overflow-y-auto p-5">
        <div class="flex flex-col gap-3">
          <a
            href={skillUrl}
            target="_blank"
            rel="noopener noreferrer"
            class="w-fit rounded border border-fulcra-black-25 px-1.5 font-mono text-[11px] text-fulcra-gray hover:text-fulcra-teal"
            >build-and-deploy-a-web-app ↗</a
          >
          <p class="text-sm leading-relaxed text-fulcra-gray">
            Your agent plans, builds, tests, and deploys an app on your data, hosted at its own
            my.fulcra.ai address.
          </p>
        </div>

        {#snippet number(/** @type {number} */ n)}
          <span
            class="flex h-6 w-6 flex-none items-center justify-center rounded-full border border-fulcra-black-25 text-xs font-semibold text-fulcra-lavender-75"
            >{n}</span
          >
        {/snippet}
        <ol class="flex flex-col gap-3 text-sm [&>li]:flex [&>li]:items-center [&>li]:gap-3">
          <li>{@render number(1)} Describe the app you want</li>
          <li>{@render number(2)} Your agent builds and tests it</li>
          <li>
            {@render number(3)}
            <span
              >It ships live at your own
              <strong class="font-medium underline decoration-fulcra-purple">my.fulcra.ai</strong> URL</span
            >
          </li>
        </ol>

        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold tracking-wider text-fulcra-gray uppercase"
              >Prompt for your agent</span
            >
            <button
              type="button"
              class="rounded-md bg-fulcra-black-50 px-2.5 py-1 text-xs font-medium text-fulcra-gray hover:text-fulcra-white"
              onclick={copyPrompt}>{copied ? 'Copied' : 'Copy prompt'}</button
            >
          </div>
          <pre
            class="rounded-xl border border-fulcra-black-25 p-4 font-mono text-[12.5px] leading-relaxed whitespace-pre-wrap text-fulcra-gray">{prompt}</pre>
        </div>

        <div class="flex flex-col gap-2.5 text-sm font-medium text-fulcra-lavender-75">
          <a href={guideUrl} target="_blank" rel="noopener noreferrer" class="hover:opacity-80"
            >Full guide ↗</a
          >
          <a href={skillUrl} target="_blank" rel="noopener noreferrer" class="hover:opacity-80"
            >View the skill on GitHub ↗</a
          >
        </div>
      </div>
    </div>
  {/if}
</dialog>
