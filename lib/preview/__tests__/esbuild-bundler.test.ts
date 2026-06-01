import { describe, it, expect } from 'vitest';
import { preprocessSvelteTS } from '../esbuild-bundler';

describe('preprocessSvelteTS', () => {
  it('does not modify plain JS script blocks', async () => {
    const input = `<script>
  import Calculator from './Calculator.svelte';
  let count = 0;
</script>

<Calculator />`;

    const result = await preprocessSvelteTS(input);
    // Should be byte-identical — plain JS blocks are not processed
    expect(result).toBe(input);
  });

  it('strips type annotations from lang="ts" blocks', async () => {
    const input = `<script lang="ts">
  let count: number = 0;
  const name: string = 'hello';
  function add(a: number, b: number): number { return a + b; }
</script>

<div>{count}</div>`;

    const result = await preprocessSvelteTS(input);
    expect(result).not.toContain('lang="ts"');
    expect(result).not.toContain(': number');
    expect(result).not.toContain(': string');
    expect(result).toContain('let count');
    expect(result).toContain('const name');
    expect(result).toContain('function add(a, b)');
  });

  it('strips type-only imports from lang="ts" blocks', async () => {
    const input = `<script lang="ts">
  import type { SvelteComponent } from 'svelte';
  let x = 1;
</script>`;

    const result = await preprocessSvelteTS(input);
    expect(result).not.toContain('import type');
    expect(result).toContain('let x = 1');
  });

  it('preserves value imports in lang="ts" blocks that esbuild would drop', async () => {
    // This is the critical regression test: esbuild.transform drops imports
    // not referenced in the script body. Component imports are only used in
    // the template, so esbuild considers them unused. The preprocessor must
    // re-inject them.
    const input = `<script lang="ts">
  import Calculator from './Calculator.svelte';
  import Dialog from './Dialog.svelte';
  let value: number = 0;
</script>

<Calculator /><Dialog />`;

    const result = await preprocessSvelteTS(input);
    expect(result).toContain("import Calculator from './Calculator.svelte'");
    expect(result).toContain("import Dialog from './Dialog.svelte'");
    expect(result).not.toContain(': number');
  });

  it('does not duplicate imports that esbuild preserved', async () => {
    // If an import IS used in the script body, esbuild keeps it.
    // The re-injection logic should not add a second copy.
    const input = `<script lang="ts">
  import { onMount } from 'svelte';
  onMount(() => console.log('hi'));
</script>`;

    const result = await preprocessSvelteTS(input);
    const matches = result.match(/import.*onMount/g) || [];
    expect(matches.length).toBe(1);
  });

  it('preserves template and style blocks untouched', async () => {
    const input = `<script lang="ts">
  let x: number = 1;
</script>

<h1 class="title">{x}</h1>

<style>
  .title { color: red; }
</style>`;

    const result = await preprocessSvelteTS(input);
    expect(result).toContain('<h1 class="title">{x}</h1>');
    expect(result).toContain('.title { color: red; }');
  });
});
