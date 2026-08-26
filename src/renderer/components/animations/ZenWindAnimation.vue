<script setup lang="ts">
const STREAKS = 7;
const STAGGER_SECONDS = 1.2;
</script>

<template>
    <svg
        class="zen-wind-anim"
        viewBox="0 0 1920 1080"
        preserveAspectRatio="none"
        aria-hidden="true">
        <defs>
            <linearGradient
                id="zenWindGradient"
                x1="0"
                y1="0"
                x2="1"
                y2="0">
                <stop
                    offset="0%"
                    stop-color="var(--text2)"
                    stop-opacity="0.12" />
                <stop
                    offset="100%"
                    stop-color="var(--text2)"
                    stop-opacity="0" />
            </linearGradient>
        </defs>
        <rect
            v-for="i in STREAKS"
            :key="i"
            class="wind-streak"
            x="0"
            :y="i * 120 - 40"
            width="600"
            height="18"
            rx="9"
            fill="url(#zenWindGradient)"
            :style="{ animationDelay: `${(i - 1) * STAGGER_SECONDS}s` }" />
    </svg>
</template>

<style scoped lang="scss">
.zen-wind-anim {
    position: absolute;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
}

.wind-streak {
    /** Starts off the left edge; the keyframe carries it past the right one. */
    animation: wind-sweep $duration-wind linear infinite;
    will-change: transform;
}

@keyframes wind-sweep {
    from {
        transform: translateX(-600px);
    }

    to {
        transform: translateX(1920px);
    }
}
</style>
