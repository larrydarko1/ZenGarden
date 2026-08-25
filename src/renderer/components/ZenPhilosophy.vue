<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import PhilosophyIcon, { type PhilosophyIconName } from '@/renderer/components/philosophy/PhilosophyIcon.vue';

defineEmits<(e: 'close') => void>();

const sections: { titleKey: string; bodyKey: string; icon: PhilosophyIconName }[] = [
    {
        titleKey: 'philosophy.practice.title',
        bodyKey: 'philosophy.practice.body',
        icon: 'practice',
    },
    {
        titleKey: 'philosophy.noGoals.title',
        bodyKey: 'philosophy.noGoals.body',
        icon: 'noGoals',
    },
    {
        titleKey: 'philosophy.noStreaks.title',
        bodyKey: 'philosophy.noStreaks.body',
        icon: 'noStreaks',
    },
    {
        titleKey: 'philosophy.silence.title',
        bodyKey: 'philosophy.silence.body',
        icon: 'silence',
    },
    {
        titleKey: 'philosophy.observation.title',
        bodyKey: 'philosophy.observation.body',
        icon: 'observation',
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
                <div class="section-icon">
                    <PhilosophyIcon :name="section.icon" />
                </div>
                <div class="section-text">
                    <h3>{{ t(section.titleKey) }}</h3>
                    <p>{{ t(section.bodyKey) }}</p>
                </div>
            </div>
        </div>

        <div class="philosophy-divider"></div>

        <div class="philosophy-quote">
            <p class="quote-text">{{ t('philosophy.quote.text') }}</p>
            <p class="quote-author">{{ t('philosophy.quote.author') }}</p>
        </div>
    </div>
</template>

<style scoped lang="scss">
.philosophy-inline {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: $space-6;
}

.philosophy-sections {
    display: flex;
    flex-direction: column;
    gap: $space-5;
}

.philosophy-section {
    display: flex;
    gap: $space-4;
    align-items: flex-start;
    padding: $space-4 $space-5;
    background: $input-bg;
    border: $border-width-thin $input-border;
    border-radius: $border-radius-lg;
    transition: background $transition-fast;
}

.philosophy-section:hover {
    background: $input-bg-focus;
}

.section-icon {
    flex-shrink: 0;
    color: $text2;
    opacity: $opacity-mid-high;
    margin-top: $space-0;
}

.section-text h3 {
    margin: 0 0 $space-2;
    font-size: $font-size-sm;
    font-weight: $font-weight-medium;
    color: $text1;
    letter-spacing: $letter-spacing-1;
}

.section-text p {
    margin: 0;
    font-size: $font-size-xs;
    line-height: $line-height-relaxed;
    color: $text2;
}

.philosophy-divider {
    height: $size-0;
    background: $input-border;
    opacity: $opacity-mid-low;
}

.philosophy-quote {
    padding: $space-4 $space-5;
    background: $input-bg;
    border: $border-width-thin $input-border;
    border-left: $border-width-thicker $text2;
    border-radius: 0 $border-radius-lg $border-radius-lg 0;
}

.quote-text {
    margin: 0 0 $space-2;
    font-size: $font-size-xs;
    font-style: italic;
    line-height: $line-height-loose;
    color: $text1;
}

.quote-author {
    margin: 0;
    font-size: $font-size-xxs;
    font-weight: $font-weight-medium;
    color: $text2;
    text-align: right;
    text-transform: uppercase;
    letter-spacing: $letter-spacing-5;
}

@media (width <= #{$breakpoint-xl}) {
    .philosophy-section {
        padding: $space-3 $space-4;
    }

    .section-text h3 {
        font-size: $font-size-xs;
    }

    .section-text p {
        font-size: $font-size-xs;
    }

    .philosophy-quote {
        padding: $space-3 $space-4;
    }

    .quote-text {
        font-size: $font-size-xs;
    }
}
</style>
