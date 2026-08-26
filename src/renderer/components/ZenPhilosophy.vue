<script setup lang="ts">
import { useI18n } from 'vue-i18n';

defineEmits<(e: 'close') => void>();

const sections: { titleKey: string; bodyKey: string }[] = [
    {
        titleKey: 'philosophy.practice.title',
        bodyKey: 'philosophy.practice.body',
    },
    {
        titleKey: 'philosophy.noGoals.title',
        bodyKey: 'philosophy.noGoals.body',
    },
    {
        titleKey: 'philosophy.noStreaks.title',
        bodyKey: 'philosophy.noStreaks.body',
    },
    {
        titleKey: 'philosophy.silence.title',
        bodyKey: 'philosophy.silence.body',
    },
    {
        titleKey: 'philosophy.observation.title',
        bodyKey: 'philosophy.observation.body',
    },
];

const { t } = useI18n();
</script>

<template>
    <div class="philosophy-inline">
        <div class="philosophy-sections">
            <div
                v-for="(section, idx) in sections"
                :key="idx"
                class="philosophy-section">
                <div class="section-text">
                    <h3>{{ t(section.titleKey) }}</h3>
                    <p>{{ t(section.bodyKey) }}</p>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped lang="scss">
.philosophy-inline {
    display: flex;
    flex-direction: column;
    gap: $space-6;
    width: 100%;
}

.philosophy-sections {
    display: flex;
    flex-direction: column;
    gap: $space-5;
}

.philosophy-section {
    display: flex;
    align-items: flex-start;
    gap: $space-4;
    padding: $space-3 $space-4;
    background: $input-bg;
    border: $border-width-thin $input-border;
    border-radius: $border-radius-lg;
    transition: background $transition-fast;

    &:hover {
        background: $input-bg-focus;
    }
}

.section-text {
    h3 {
        margin: 0 0 $space-2;
        color: $text1;
        font-size: $font-size-xs;
        font-weight: $font-weight-medium;
        letter-spacing: $letter-spacing-1;
    }

    p {
        margin: 0;
        color: $text2;
        font-size: $font-size-xs;
        line-height: $line-height-relaxed;
    }
}

/* –––––– Responsive –––––– */

@media (width > #{$breakpoint-xl}) {
    .philosophy-section {
        padding: $space-4 $space-5;
    }

    .section-text h3 {
        font-size: $font-size-sm;
    }
}
</style>
