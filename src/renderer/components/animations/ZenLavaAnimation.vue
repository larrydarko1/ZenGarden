<script setup lang="ts">
// Pure animation component - lava lamp effect
</script>

<template>
    <div class="zen-lava-anim">
        <svg
            class="zen-lava-svg"
            width="100vw"
            height="100vh"
            viewBox="0 0 1920 1080"
            preserveAspectRatio="none">
            <defs>
                <!-- Blur filter for glow effect -->
                <filter id="lavaGlow">
                    <feGaussianBlur
                        in="SourceGraphic"
                        stdDeviation="12" />
                </filter>
                <!-- Lava blob gradient -->
                <radialGradient id="lavaGradient1">
                    <stop
                        offset="0%"
                        stop-color="var(--text2)"
                        stop-opacity="0.4" />
                    <stop
                        offset="50%"
                        stop-color="var(--text2)"
                        stop-opacity="0.25" />
                    <stop
                        offset="100%"
                        stop-color="var(--text2)"
                        stop-opacity="0.1" />
                </radialGradient>
                <radialGradient id="lavaGradient2">
                    <stop
                        offset="0%"
                        stop-color="var(--text2)"
                        stop-opacity="0.35" />
                    <stop
                        offset="50%"
                        stop-color="var(--text2)"
                        stop-opacity="0.2" />
                    <stop
                        offset="100%"
                        stop-color="var(--text2)"
                        stop-opacity="0.08" />
                </radialGradient>
            </defs>
            <g filter="url(#lavaGlow)">
                <!-- Large slow blobs -->
                <ellipse
                    v-for="i in 8"
                    :key="'large-' + i"
                    :cx="200 + i * 220"
                    :cy="1200 + i * 100"
                    :rx="80 + (i % 3) * 20"
                    :ry="100 + (i % 4) * 25"
                    :fill="i % 2 === 0 ? 'url(#lavaGradient1)' : 'url(#lavaGradient2)'">
                    <!-- Rise up slowly -->
                    <animate
                        attributeName="cy"
                        :from="1200 + i * 100"
                        to="-200"
                        :dur="35 + i * 5 + 's'"
                        repeatCount="indefinite" />
                    <!-- Sway horizontally -->
                    <animate
                        attributeName="cx"
                        :values="`${200 + i * 220};${250 + i * 220};${170 + i * 220};${200 + i * 220}`"
                        :dur="12 + i * 2 + 's'"
                        repeatCount="indefinite" />
                    <!-- Morph size -->
                    <animate
                        attributeName="rx"
                        :values="`${80 + (i % 3) * 20};${100 + (i % 3) * 20};${70 + (i % 3) * 20};${80 + (i % 3) * 20}`"
                        :dur="8 + i * 1.5 + 's'"
                        repeatCount="indefinite" />
                    <animate
                        attributeName="ry"
                        :values="`${100 + (i % 4) * 25};${85 + (i % 4) * 25};${110 + (i % 4) * 25};${100 + (i % 4) * 25}`"
                        :dur="9 + i * 1.3 + 's'"
                        repeatCount="indefinite" />
                </ellipse>

                <!-- Medium blobs -->
                <ellipse
                    v-for="i in 12"
                    :key="'medium-' + i"
                    :cx="150 + i * 160"
                    :cy="1300 + i * 70"
                    :rx="50 + (i % 3) * 15"
                    :ry="65 + (i % 4) * 18"
                    :fill="i % 2 === 0 ? 'url(#lavaGradient2)' : 'url(#lavaGradient1)'">
                    <!-- Rise up -->
                    <animate
                        attributeName="cy"
                        :from="1300 + i * 70"
                        to="-150"
                        :dur="28 + i * 3.5 + 's'"
                        repeatCount="indefinite" />
                    <!-- Sway -->
                    <animate
                        attributeName="cx"
                        :values="`${150 + i * 160};${180 + i * 160};${130 + i * 160};${150 + i * 160}`"
                        :dur="10 + i * 1.8 + 's'"
                        repeatCount="indefinite" />
                    <!-- Morph -->
                    <animate
                        attributeName="rx"
                        :values="`${50 + (i % 3) * 15};${65 + (i % 3) * 15};${45 + (i % 3) * 15};${50 + (i % 3) * 15}`"
                        :dur="7 + i * 1.2 + 's'"
                        repeatCount="indefinite" />
                    <animate
                        attributeName="ry"
                        :values="`${65 + (i % 4) * 18};${55 + (i % 4) * 18};${72 + (i % 4) * 18};${65 + (i % 4) * 18}`"
                        :dur="7.5 + i * 1.1 + 's'"
                        repeatCount="indefinite" />
                </ellipse>

                <!-- Small blobs -->
                <ellipse
                    v-for="i in 15"
                    :key="'small-' + i"
                    :cx="100 + i * 130"
                    :cy="1350 + i * 50"
                    :rx="30 + (i % 3) * 10"
                    :ry="40 + (i % 4) * 12"
                    :fill="i % 2 === 0 ? 'url(#lavaGradient1)' : 'url(#lavaGradient2)'"
                    :opacity="0.7 + (i % 3) * 0.1">
                    <!-- Rise up -->
                    <animate
                        attributeName="cy"
                        :from="1350 + i * 50"
                        to="-120"
                        :dur="22 + i * 2.8 + 's'"
                        repeatCount="indefinite" />
                    <!-- Sway -->
                    <animate
                        attributeName="cx"
                        :values="`${100 + i * 130};${125 + i * 130};${90 + i * 130};${100 + i * 130}`"
                        :dur="8 + i * 1.5 + 's'"
                        repeatCount="indefinite" />
                    <!-- Morph -->
                    <animate
                        attributeName="rx"
                        :values="`${30 + (i % 3) * 10};${40 + (i % 3) * 10};${28 + (i % 3) * 10};${30 + (i % 3) * 10}`"
                        :dur="6 + i * 0.9 + 's'"
                        repeatCount="indefinite" />
                    <animate
                        attributeName="ry"
                        :values="`${40 + (i % 4) * 12};${35 + (i % 4) * 12};${45 + (i % 4) * 12};${40 + (i % 4) * 12}`"
                        :dur="6.5 + i * 0.8 + 's'"
                        repeatCount="indefinite" />
                </ellipse>
            </g>
        </svg>
    </div>
</template>

<style scoped lang="scss">
.zen-lava-anim {
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
}

.zen-lava-svg {
    width: 100vw;
    height: 100vh;
    display: block;
    position: absolute;
    top: 0;
    left: 0;
}
</style>
