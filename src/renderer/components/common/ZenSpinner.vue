<script setup lang="ts">
type ZenSpinnerVariant = 'arc' | 'bar';

withDefaults(defineProps<{ variant?: ZenSpinnerVariant }>(), { variant: 'arc' });
</script>

<template>
    <span class="zen-loader">
        <svg
            v-if="variant === 'arc'"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            aria-hidden="true"
            focusable="false">
            <circle
                cx="10"
                cy="10"
                r="8"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-dasharray="40 60"
                opacity="0.4">
                <animateTransform
                    attributeName="transform"
                    type="rotate"
                    from="0 10 10"
                    to="360 10 10"
                    dur="1s"
                    repeatCount="indefinite" />
            </circle>
        </svg>
        <svg
            v-else
            width="20"
            height="20"
            viewBox="0 0 32 32"
            aria-hidden="true"
            focusable="false">
            <rect
                x="10"
                y="15"
                width="12"
                height="2"
                rx="1">
                <animateTransform
                    attributeName="transform"
                    type="rotate"
                    from="0 16 16"
                    to="360 16 16"
                    dur="2.5s"
                    repeatCount="indefinite" />
            </rect>
        </svg>
    </span>
</template>

<style scoped lang="scss">
.zen-loader {
    display: flex;
    align-items: center;
    justify-content: center;
}

.zen-loader svg {
    display: block;
}

.zen-loader svg rect {
    fill: $text1;
}
</style>
