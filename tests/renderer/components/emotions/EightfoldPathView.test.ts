import { describe, it, expect } from 'vitest';
import { mountWithI18n } from '@test-utils';
import EightfoldPathView from '@/renderer/components/emotions/EightfoldPathView.vue';

const paths = ['view', 'intention', 'speech', 'action', 'livelihood', 'effort', 'mindfulness', 'concentration'].map(
    (key) => ({
        key,
        displayName: `Right ${key}`,
        description: `${key} description`,
        questions: `${key} question?`,
    }),
);

function mountView(overrides: Record<string, unknown> = {}) {
    const followedPaths = (overrides.followedPaths as string[]) ?? [];
    return mountWithI18n(EightfoldPathView, {
        props: {
            loading: false,
            paths,
            followedPaths,
            pathNotes: {},
            completedCount: followedPaths.length,
            progressPercentage: Math.round((followedPaths.length / 8) * 100),
            isPathFollowed: (key: string) => followedPaths.includes(key),
            ...overrides,
        },
    });
}

describe('EightfoldPathView', () => {
    it('shows the loading line instead of the list while the day is still being read', () => {
        const wrapper = mountView({ loading: true });

        expect(wrapper.find('.loading').exists()).toBe(true);
        expect(wrapper.find('.eightfold-path-list').exists()).toBe(false);
        wrapper.unmount();
    });

    it('renders one row per path once loaded', () => {
        const wrapper = mountView();

        expect(wrapper.findAll('.eightfold-path-item')).toHaveLength(8);
        wrapper.unmount();
    });

    it('reports progress as a count out of eight and a percentage', () => {
        const wrapper = mountView({ followedPaths: ['view', 'speech'] });

        const values = wrapper.findAll('.eightfold-stat-value').map((stat) => stat.text());
        expect(values).toEqual(['2/8', '25%']);
        wrapper.unmount();
    });

    it('checks exactly the paths the parent says are followed', () => {
        const wrapper = mountView({ followedPaths: ['speech'] });

        const checked = wrapper.findAll('input[type="checkbox"]').map((box) => box.element.checked);
        expect(checked).toEqual(paths.map((path) => path.key === 'speech'));
        wrapper.unmount();
    });

    it('emits toggle-path with the key of the row that was clicked', async () => {
        const wrapper = mountView();

        await wrapper.findAll('input[type="checkbox"]')[2].trigger('change');

        expect(wrapper.emitted('toggle-path')).toEqual([['speech']]);
        wrapper.unmount();
    });

    it('opens a note field only for a followed path', () => {
        const wrapper = mountView({ followedPaths: ['action'] });

        const notes = wrapper.findAll('.eightfold-path-note');
        expect(notes).toHaveLength(1);
        wrapper.unmount();
    });

    it('emits the merged note map and a save tick when the note is typed into', async () => {
        const wrapper = mountView({ followedPaths: ['action'], pathNotes: { view: 'kept' } });

        const textarea = wrapper.find('.eightfold-path-note textarea');
        textarea.element.value = 'noted';
        await textarea.trigger('input');

        expect(wrapper.emitted('update:pathNotes')).toEqual([[{ view: 'kept', action: 'noted' }]]);
        expect(wrapper.emitted('save-path')).toHaveLength(1);
        wrapper.unmount();
    });

    it('ties each label to its own checkbox, so the whole row is clickable', () => {
        const wrapper = mountView();

        for (const path of paths) {
            expect(wrapper.find(`label[for="ef-${path.key}"]`).exists()).toBe(true);
            expect(wrapper.find(`input#ef-${path.key}`).exists()).toBe(true);
        }
        wrapper.unmount();
    });
});
