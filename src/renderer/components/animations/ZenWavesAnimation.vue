<script setup lang="ts">
/**
 * Pure animation component — two drifting wave bands.
 *
 * The waves used to animate the `d` attribute between three path strings, which
 * re-tessellates the curve and repaints a full-viewport fill on the main thread
 * every frame. Instead each path is drawn two periods wide — 3840 user units
 * across a 1920 viewBox — and simply translated left by exactly one period. The
 * seam lands on an identical point of the curve, so the loop is invisible while
 * the geometry never changes, which keeps the whole thing on the compositor.
 */
</script>

<template>
    <svg
        class="zen-waves-anim"
        viewBox="0 0 1920 1080"
        preserveAspectRatio="none"
        aria-hidden="true">
        <defs>
            <linearGradient
                id="zenWaveGradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1">
                <stop
                    offset="0%"
                    stop-color="var(--text2)"
                    stop-opacity="0.12" />
                <stop
                    offset="100%"
                    stop-color="var(--base1)"
                    stop-opacity="0.18" />
            </linearGradient>
        </defs>
        <path
            class="wave wave-front"
            fill="url(#zenWaveGradient)"
            d="M0,800 Q480,900 960,800 T1920,800 T2880,800 T3840,800 V1080 H0 Z" />
        <path
            class="wave wave-back"
            fill="url(#zenWaveGradient)"
            opacity="0.7"
            d="M0,900 Q480,1000 960,900 T1920,900 T2880,900 T3840,900 V1080 H0 Z" />
    </svg>
</template>

<style scoped lang="scss">
.zen-waves-anim {
    position: absolute;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
}

.wave {
    will-change: transform;
}

// Opposite directions, unequal periods — the two bands never phase-lock.
.wave-front {
    animation: wave-drift-left $duration-wave linear infinite;
}

.wave-back {
    animation: wave-drift-right $duration-wave-slow linear infinite;
}

@keyframes wave-drift-left {
    from {
        transform: translateX(0);
    }

    to {
        transform: translateX(-1920px);
    }
}

@keyframes wave-drift-right {
    from {
        transform: translateX(-1920px);
    }

    to {
        transform: translateX(0);
    }
}
</style>
