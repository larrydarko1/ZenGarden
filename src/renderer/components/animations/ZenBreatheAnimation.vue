<script setup lang="ts">
/**
 * Pure animation component — falling petals.
 *
 * Was 25 ellipses carrying four `<animate>` elements each: 100 SMIL animations
 * mutating DOM attributes on the main thread every frame. Now each petal is a
 * single element running one composited CSS animation, with fall, sway, spin
 * and fade folded into the same keyframe track. Three keyframe variants keep
 * the sway from looking uniform; the per-petal duration and negative delay do
 * the rest, so no two petals are ever in phase.
 */

type Petal = {
    cx: number;
    cy: number;
    rx: number;
    ry: number;
    variant: number;
    style: Record<string, string>;
};
const PETALS = 25;

/**
 * Negative delays start each petal partway through its own cycle, so the field
 * is already full on the first frame instead of raining in all at once.
 */
const petals: Petal[] = Array.from({ length: PETALS }, (_, idx) => {
    const i = idx + 1;
    const duration = 15 + (i % 8) * 2.5;
    return {
        cx: i * 85 + (i % 3) * 30,
        cy: -50,
        rx: 8 + (i % 3) * 2,
        ry: 12 + (i % 4) * 2,
        variant: i % 3,
        style: {
            animationDuration: `${duration}s`,
            animationDelay: `${-(i * duration) / PETALS}s`,
        },
    };
});
</script>

<template>
    <svg
        class="zen-breathe-anim"
        viewBox="0 0 1920 1080"
        preserveAspectRatio="none"
        aria-hidden="true">
        <defs>
            <radialGradient id="petalGradient">
                <stop
                    offset="0%"
                    stop-color="var(--text2)"
                    stop-opacity="0.25" />
                <stop
                    offset="100%"
                    stop-color="var(--text2)"
                    stop-opacity="0.08" />
            </radialGradient>
        </defs>
        <ellipse
            v-for="(petal, idx) in petals"
            :key="idx"
            class="petal"
            :class="`petal-drift-${petal.variant}`"
            :cx="petal.cx"
            :cy="petal.cy"
            :rx="petal.rx"
            :ry="petal.ry"
            fill="url(#petalGradient)"
            :style="petal.style" />
    </svg>
</template>

<style scoped lang="scss">
.zen-breathe-anim {
    position: absolute;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
}

.petal {
    /** Rotation has to pivot on the petal, not the viewBox origin. */
    transform-box: fill-box;
    transform-origin: center;
    opacity: 0;
    will-change: transform, opacity;
    animation-timing-function: linear;
    animation-iteration-count: infinite;
}

/**
 * Three sway signatures. The vertical travel is identical in all of them — it
 * is what makes a petal read as falling — so only the horizontal offsets and
 * the spin direction differ.
 */
@keyframes petal-drift-a {
    0% {
        transform: translate(0, 0) rotate(0deg);
        opacity: 0;
    }

    12% {
        opacity: 0.5;
    }

    25% {
        transform: translate(60px, 320px) rotate(120deg);
    }

    50% {
        transform: translate(-40px, 640px) rotate(240deg);
    }

    75% {
        transform: translate(35px, 960px) rotate(300deg);
    }

    88% {
        opacity: 0.5;
    }

    100% {
        transform: translate(0, 1250px) rotate(360deg);
        opacity: 0;
    }
}

@keyframes petal-drift-b {
    0% {
        transform: translate(0, 0) rotate(0deg);
        opacity: 0;
    }

    12% {
        opacity: 0.4;
    }

    25% {
        transform: translate(-55px, 320px) rotate(-90deg);
    }

    50% {
        transform: translate(45px, 640px) rotate(-200deg);
    }

    75% {
        transform: translate(-30px, 960px) rotate(-380deg);
    }

    88% {
        opacity: 0.4;
    }

    100% {
        transform: translate(0, 1250px) rotate(-540deg);
        opacity: 0;
    }
}

@keyframes petal-drift-c {
    0% {
        transform: translate(0, 0) rotate(0deg);
        opacity: 0;
    }

    12% {
        opacity: 0.6;
    }

    25% {
        transform: translate(30px, 320px) rotate(60deg);
    }

    50% {
        transform: translate(-65px, 640px) rotate(180deg);
    }

    75% {
        transform: translate(50px, 960px) rotate(240deg);
    }

    88% {
        opacity: 0.6;
    }

    100% {
        transform: translate(0, 1250px) rotate(360deg);
        opacity: 0;
    }
}

.petal-drift-0 {
    animation-name: petal-drift-a;
}

.petal-drift-1 {
    animation-name: petal-drift-b;
}

.petal-drift-2 {
    animation-name: petal-drift-c;
}
</style>
