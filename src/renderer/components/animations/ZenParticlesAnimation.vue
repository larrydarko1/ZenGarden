<script setup lang="ts">
/**
 * Pure animation component — drifting particles.
 *
 * The heaviest of the five before this rewrite: 62 circles carrying three
 * `<animate>` elements each, so 186 SMIL animations mutating attributes on the
 * main thread every frame. Each particle now runs one composited CSS animation
 * that folds the horizontal sweep, the vertical bob and the fade into a single
 * transform-and-opacity track.
 */

type Particle = {
    key: string;
    cx: number;
    cy: number;
    r: number;
    solid: boolean;
    variant: number;
    style: Record<string, string>;
};
const BANDS = [
    { count: 12, radius: 8, spacingX: 180, spacingY: 90, offsetY: 80, duration: 18, step: 2, peak: 0.5 },
    { count: 20, radius: 5, spacingX: 120, spacingY: 60, offsetY: 40, duration: 13, step: 1.5, peak: 0.4 },
    { count: 30, radius: 3, spacingX: 80, spacingY: 40, offsetY: 15, duration: 10, step: 0.8, peak: 0.3 },
];

/**
 * Peak opacity varies per band, so it rides on the element rather than the
 * keyframes — that keeps three keyframe tracks covering all 62 particles
 * instead of one per band.
 */
const particles: Particle[] = BANDS.flatMap((band, bandIdx) =>
    Array.from({ length: band.count }, (_, idx): Particle => {
        const i = idx + 1;
        const duration = band.duration + i * band.step;
        return {
            key: `${bandIdx}-${i}`,
            cx: i * band.spacingX - band.spacingX,
            cy: i * band.spacingY + band.offsetY,
            r: band.radius,
            // The smallest band is a flat fill; the glow gradient is wasted at 3px.
            solid: bandIdx === 2,
            variant: i % 3,
            style: {
                'animationDuration': `${duration}s`,
                'animationDelay': `${-(i * duration) / band.count}s`,
                '--peak-opacity': `${band.peak}`,
            },
        };
    }),
);
</script>

<template>
    <svg
        class="zen-particles-anim"
        viewBox="0 0 1920 1080"
        preserveAspectRatio="none"
        aria-hidden="true">
        <defs>
            <radialGradient id="particleGlow">
                <stop
                    offset="0%"
                    stop-color="var(--text2)"
                    stop-opacity="0.4" />
                <stop
                    offset="100%"
                    stop-color="var(--text2)"
                    stop-opacity="0" />
            </radialGradient>
        </defs>
        <circle
            v-for="particle in particles"
            :key="particle.key"
            class="particle"
            :class="`particle-bob-${particle.variant}`"
            :cx="particle.cx"
            :cy="particle.cy"
            :r="particle.r"
            :fill="particle.solid ? 'var(--text2)' : 'url(#particleGlow)'"
            :style="particle.style" />
    </svg>
</template>

<style scoped lang="scss">
.zen-particles-anim {
    position: absolute;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
}

.particle {
    /** Overridden per band by an inline style; this is the fallback. */
    --peak-opacity: 0.4;

    opacity: 0;
    will-change: transform, opacity;
    animation-timing-function: linear;
    animation-iteration-count: infinite;
}

/**
 * Three bob signatures over a shared left-to-right sweep. The sweep distance
 * (2100 user units) clears the 1920 viewBox from any starting column, so a
 * particle is always off-screen when its cycle restarts.
 */
@keyframes particle-bob-a {
    0% {
        transform: translate(0, 0);
        opacity: 0;
    }

    10% {
        opacity: var(--peak-opacity);
    }

    50% {
        transform: translate(1050px, 100px);
    }

    90% {
        opacity: var(--peak-opacity);
    }

    100% {
        transform: translate(2100px, 0);
        opacity: 0;
    }
}

@keyframes particle-bob-b {
    0% {
        transform: translate(0, 0);
        opacity: 0;
    }

    10% {
        opacity: var(--peak-opacity);
    }

    35% {
        transform: translate(735px, -70px);
    }

    70% {
        transform: translate(1470px, 90px);
    }

    90% {
        opacity: var(--peak-opacity);
    }

    100% {
        transform: translate(2100px, 0);
        opacity: 0;
    }
}

@keyframes particle-bob-c {
    0% {
        transform: translate(0, 0);
        opacity: 0;
    }

    10% {
        opacity: var(--peak-opacity);
    }

    25% {
        transform: translate(525px, 60px);
    }

    60% {
        transform: translate(1260px, -50px);
    }

    90% {
        opacity: var(--peak-opacity);
    }

    100% {
        transform: translate(2100px, 0);
        opacity: 0;
    }
}

.particle-bob-0 {
    animation-name: particle-bob-a;
}

.particle-bob-1 {
    animation-name: particle-bob-b;
}

.particle-bob-2 {
    animation-name: particle-bob-c;
}
</style>
