import { describe, it, expect } from 'vitest';
import { mountWithI18n } from '@test-utils';
import SessionNotes from '@/renderer/components/SessionNotes.vue';

const mountNotes = () => mountWithI18n(SessionNotes, { props: { duration: 600 } });

describe('SessionNotes', () => {
    it('presents itself to assistive technology as a modal dialog with a name', () => {
        const wrapper = mountNotes();

        const dialog = wrapper.find('[role="dialog"]');
        expect(dialog.attributes('aria-modal')).toBe('true');
        expect(wrapper.find(`#${dialog.attributes('aria-labelledby')}`).text()).not.toBe('');
        wrapper.unmount();
    });

    it('emits save with whatever was typed', async () => {
        const wrapper = mountNotes();

        await wrapper.find('textarea').setValue('felt settled');
        await wrapper.find('.notes-btn-primary').trigger('click');

        expect(wrapper.emitted('save')).toEqual([['felt settled']]);
        wrapper.unmount();
    });

    it('saves an empty string rather than refusing when nothing was written', async () => {
        const wrapper = mountNotes();

        await wrapper.find('.notes-btn-primary').trigger('click');

        expect(wrapper.emitted('save')).toEqual([['']]);
        wrapper.unmount();
    });

    it('emits skip without a note when the session is left unwritten', async () => {
        const wrapper = mountNotes();

        await wrapper.find('.notes-btn-secondary').trigger('click');

        expect(wrapper.emitted('skip')).toHaveLength(1);
        expect(wrapper.emitted('save')).toBeUndefined();
        wrapper.unmount();
    });

    it('closes from the × button, the backdrop, and Escape in the field', async () => {
        for (const close of [
            (w: ReturnType<typeof mountNotes>) => w.find('.notes-close').trigger('click'),
            (w: ReturnType<typeof mountNotes>) => w.find('.notes-modal-backdrop').trigger('click'),
            (w: ReturnType<typeof mountNotes>) => w.find('textarea').trigger('keydown.esc'),
        ]) {
            const wrapper = mountNotes();

            await close(wrapper);

            expect(wrapper.emitted('close')).toHaveLength(1);
            wrapper.unmount();
        }
    });
});
