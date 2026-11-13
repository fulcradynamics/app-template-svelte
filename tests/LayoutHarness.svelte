<script>
  import Layout from '../src/routes/+layout.svelte';
  import Feature from './Feature.svelte';
  let { mounted } = $props();
</script>

<Layout><Feature {mounted} /></Layout>
