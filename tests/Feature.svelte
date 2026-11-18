<script>
  import { onMount } from 'svelte';
  let { mounted } = $props();
  onMount(() => {
    mounted();
  });
</script>

<p>Private feature</p>
