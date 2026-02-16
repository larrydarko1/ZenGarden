<template>
  <div class="zen-breathe-anim">
    <svg class="zen-breathe-svg" width="100vw" height="100vh" viewBox="0 0 1920 1080" preserveAspectRatio="none">
      <defs>
        <!-- Petal gradient -->
        <radialGradient id="petalGradient">
          <stop offset="0%" stop-color="var(--text2)" stop-opacity="0.25"/>
          <stop offset="100%" stop-color="var(--text2)" stop-opacity="0.08"/>
        </radialGradient>
      </defs>
      <g>
        <!-- Falling petals - various sizes and speeds -->
        <ellipse v-for="i in 25" :key="'petal-' + i" 
          :cx="(i * 85) + (i % 3) * 30" 
          :cy="-50 - (i * 20)"
          :rx="8 + (i % 3) * 2"
          :ry="12 + (i % 4) * 2"
          fill="url(#petalGradient)"
          :opacity="0.4 + (i % 4) * 0.1">
          <!-- Fall down -->
          <animate 
            attributeName="cy" 
            :from="-50 - (i * 20)"
            to="1200"
            :dur="(15 + (i % 8) * 2.5) + 's'" 
            repeatCount="indefinite"/>
          <!-- Sway side to side -->
          <animate 
            attributeName="cx"
            :values="`${(i * 85) + (i % 3) * 30};${(i * 85) + (i % 3) * 30 + 60};${(i * 85) + (i % 3) * 30 - 40};${(i * 85) + (i % 3) * 30}`"
            :dur="(4 + (i % 5) * 0.8) + 's'"
            repeatCount="indefinite"/>
          <!-- Rotate as they fall -->
          <animateTransform
            attributeName="transform"
            type="rotate"
            :from="`0 ${(i * 85) + (i % 3) * 30} ${-50 - (i * 20)}`"
            :to="`${360 + (i % 2) * 180} ${(i * 85) + (i % 3) * 30} ${-50 - (i * 20)}`"
            :dur="(6 + (i % 6) * 1.5) + 's'"
            repeatCount="indefinite"/>
          <!-- Fade in and out -->
          <animate
            attributeName="opacity"
            :values="`0;${0.4 + (i % 4) * 0.1};${0.4 + (i % 4) * 0.1};0`"
            :dur="(15 + (i % 8) * 2.5) + 's'"
            repeatCount="indefinite"/>
        </ellipse>
      </g>
    </svg>
  </div>
</template>

<script setup lang="ts">
// Pure animation component - falling petals
</script>

<style scoped>
.zen-breathe-anim {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}
.zen-breathe-svg {
  width: 100vw;
  height: 100vh;
  display: block;
  position: absolute;
  top: 0;
  left: 0;
}
</style>
