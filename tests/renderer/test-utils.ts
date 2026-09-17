import { mount, type VueWrapper, type ComponentMountingOptions } from '@vue/test-utils';
import { i18n } from '@/renderer/i18n';

/**
 * Mount a component with vue-i18n already installed, so `useI18n()` resolves
 * instead of throwing. vitest.setup.ts seeds the real English messages, which is
 * what makes an assertion on rendered text meaningful rather than a key echo.
 */
export function mountWithI18n<T>(component: T, options?: ComponentMountingOptions<T>): VueWrapper {
    const mountOptions: ComponentMountingOptions<any> = {
        ...options,
        global: {
            ...(options?.global ?? {}),
            plugins: [...(options?.global?.plugins ?? []), i18n],
        },
    };
    return mount(component as any, mountOptions);
}

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
