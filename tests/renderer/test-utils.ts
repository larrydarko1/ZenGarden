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

export default mountWithI18n;
