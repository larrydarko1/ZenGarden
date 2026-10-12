import { mount } from '@vue/test-utils';

/**
 * vitest.setup.ts installs vue-i18n on every mount, so `useI18n()` resolves instead
 * of throwing and the real English messages render. This is `mount` under the name
 * the suites know, with mount's own types — a wrapper typed loosely here is how a
 * test reaches into a component through `any`.
 */
export const mountWithI18n = mount;

/**
 * The nth entry of a list, or a failure naming what was missing.
 *
 * `items[i]` is `T | undefined` under noUncheckedIndexedAccess, and both ways of
 * quieting that at the assertion are worse than throwing here: `!` asserts what
 * the suite is supposed to be checking, and `?.` turns a missing element into a
 * PASSING `expect(...).not.toContain(...)`. This fails, and says how many it found.
 */
export function nth<T>(items: readonly T[], index: number): T {
    const item = items[index];
    if (item === undefined) throw new Error(`No entry at index ${index} — the list holds ${items.length}.`);
    return item;
}

export default mountWithI18n;
