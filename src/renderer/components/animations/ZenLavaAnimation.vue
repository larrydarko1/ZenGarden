<script setup lang="ts">
/**
 * Pure animation component — lava lamp effect.
 *
 * Two separate costs came out of this one. The obvious was 140 SMIL animations
 * across 35 ellipses; the expensive one was the `<g filter="url(#lavaGlow)">`
 * wrapping all of them, which asked Chromium to re-run a full-viewport
 * `feGaussianBlur` over the entire scene on every frame — a CPU raster pass,
 * 60 times a second, that also invalidated every `backdrop-filter` stacked
 * above it.
 *
 * The filter is gone. What it was actually providing — soft, edgeless blobs —
 * is now baked into the gradients themselves: the extra mid-stops give each one
 * a long falloff to zero opacity, which reads as a blurred edge but is
 * rasterised once instead of every frame. The blobs then only ever move and
 * scale under a composited transform.
 */

type Blob = {
    key: string;
    cx: number;
    cy: number;
    rx: number;
    ry: number;
    gradient: string;
    opacity: number;
    variant: number;
    style: Record<string, string>;
};
const BANDS = [
    { count: 8, spacingX: 220, offsetX: 200, rx: 80, ry: 100, rxMod: 20, ryMod: 25, duration: 35, step: 5 },
    { count: 12, spacingX: 160, offsetX: 150, rx: 50, ry: 65, rxMod: 15, ryMod: 18, duration: 28, step: 3.5 },
    { count: 15, spacingX: 130, offsetX: 100, rx: 30, ry: 40, rxMod: 10, ryMod: 12, duration: 22, step: 2.8 },
];

/**
 * Every blob starts below the viewBox and rises out of the top. The negative
 * delay is what fills the column on the first frame rather than making the user
 * wait half a minute for the first blob to arrive.
 */
const blobs: Blob[] = BANDS.flatMap((band, bandIdx) =>
    Array.from({ length: band.count }, (_, idx): Blob => {
        const i = idx + 1;
        const duration = band.duration + i * band.step;
        return {
            key: `${bandIdx}-${i}`,
            cx: band.offsetX + i * band.spacingX,
            cy: 1250,
            rx: band.rx + (i % 3) * band.rxMod,
            ry: band.ry + (i % 4) * band.ryMod,
            gradient: i % 2 === 0 ? 'url(#lavaGradient1)' : 'url(#lavaGradient2)',
            opacity: bandIdx === 2 ? 0.7 + (i % 3) * 0.1 : 1,
            variant: i % 3,
            style: {
                animationDuration: `${duration}s`,
                animationDelay: `${-(i * duration) / band.count}s`,
            },
        };
    }),
);
</script>

<template>
    <svg
        class="zen-lava-anim"
        viewBox="0 0 1920 1080"
        preserveAspectRatio="none"
        aria-hidden="true">
        <defs>
            <radialGradient id="lavaGradient1">
                <stop
                    offset="0%"
                    stop-color="var(--text2)"
                    stop-opacity="0.4" />
                <stop
                    offset="40%"
                    stop-color="var(--text2)"
                    stop-opacity="0.26" />
                <stop
                    offset="70%"
                    stop-color="var(--text2)"
                    stop-opacity="0.12" />
                <stop
                    offset="100%"
                    stop-color="var(--text2)"
                    stop-opacity="0" />
            </radialGradient>
            <radialGradient id="lavaGradient2">
                <stop
                    offset="0%"
                    stop-color="var(--text2)"
                    stop-opacity="0.35" />
                <stop
                    offset="40%"
                    stop-color="var(--text2)"
                    stop-opacity="0.22" />
                <stop
                    offset="70%"
                    stop-color="var(--text2)"
                    stop-opacity="0.1" />
                <stop
                    offset="100%"
                    stop-color="var(--text2)"
                    stop-opacity="0" />
            </radialGradient>
        </defs>
        <ellipse
            v-for="blob in blobs"
            :key="blob.key"
            class="blob"
            :class="`blob-rise-${blob.variant}`"
            :cx="blob.cx"
            :cy="blob.cy"
            :rx="blob.rx"
            :ry="blob.ry"
            :fill="blob.gradient"
            :opacity="blob.opacity"
            :style="blob.style" />
    </svg>
</template>

<style scoped lang="scss">
.zen-lava-anim {
    position: absolute;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
}

.blob {
    /** Scale has to breathe around the blob's own centre, not the viewBox origin. */
    transform-box: fill-box;
    transform-origin: center;
    will-change: transform;
    animation-timing-function: ease-in-out;
    animation-iteration-count: infinite;
}

/**
 * Rise, sway and morph on one track. The non-uniform `scale()` is what the
 * animated `rx`/`ry` attributes used to do — same wobble, but a compositor
 * transform instead of two attribute mutations and a re-tessellated ellipse.
 */
@keyframes blob-rise-a {
    0% {
        transform: translate(0, 0) scale(1, 1);
    }

    25% {
        transform: translate(50px, -360px) scale(1.25, 0.85);
    }

    50% {
        transform: translate(-30px, -720px) scale(0.88, 1.1);
    }

    75% {
        transform: translate(40px, -1080px) scale(1.15, 0.92);
    }

    100% {
        transform: translate(0, -1450px) scale(1, 1);
    }
}

@keyframes blob-rise-b {
    0% {
        transform: translate(0, 0) scale(1, 1);
    }

    25% {
        transform: translate(-45px, -360px) scale(0.85, 1.18);
    }

    50% {
        transform: translate(35px, -720px) scale(1.2, 0.9);
    }

    75% {
        transform: translate(-25px, -1080px) scale(0.9, 1.12);
    }

    100% {
        transform: translate(0, -1450px) scale(1, 1);
    }
}

@keyframes blob-rise-c {
    0% {
        transform: translate(0, 0) scale(1, 1);
    }

    25% {
        transform: translate(28px, -360px) scale(1.1, 1.08);
    }

    50% {
        transform: translate(-52px, -720px) scale(0.82, 0.95);
    }

    75% {
        transform: translate(30px, -1080px) scale(1.22, 1.05);
    }

    100% {
        transform: translate(0, -1450px) scale(1, 1);
    }
}

.blob-rise-0 {
    animation-name: blob-rise-a;
}

.blob-rise-1 {
    animation-name: blob-rise-b;
}

.blob-rise-2 {
    animation-name: blob-rise-c;
}
</style>
