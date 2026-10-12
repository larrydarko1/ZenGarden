<script setup lang="ts">
import IconSpinnerArc from '@/renderer/components/icons/IconSpinnerArc.vue';
import IconSpinnerBar from '@/renderer/components/icons/IconSpinnerBar.vue';

type ZenSpinnerVariant = 'arc' | 'bar';

withDefaults(defineProps<{ variant?: ZenSpinnerVariant }>(), { variant: 'arc' });
</script>

<template>
    <span class="zen-loader">
        <IconSpinnerArc
            v-if="variant === 'arc'"
            width="20"
            height="20" />
        <IconSpinnerBar
            v-else
            class="spinner-bar"
            width="20"
            height="20" />
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

.spinner-bar {
    color: $text1;
}
</style>
