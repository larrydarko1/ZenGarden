<template>
  <div class="zen-idle-anim">
    <svg class="zen-wind-anim" width="100vw" height="100vh" viewBox="0 0 1920 1080" preserveAspectRatio="none">
      <defs>
        <linearGradient id="zenWindGradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="var(--text2)" stop-opacity="0.12"/>
          <stop offset="100%" stop-color="var(--text2)" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <g>
        <g>
          <rect v-for="i in 7" :key="i" :y="i*120-40" x="-600" width="600" height="18" rx="9" fill="url(#zenWindGradient)">
            <animate attributeName="x" :begin="(i-1)*1.2+'s'" from="-600" to="1920" dur="7s" repeatCount="indefinite"/>
          </rect>
        </g>
      </g>
    </svg>
  </div>
</template>

<script setup lang="ts">
// No logic needed, pure animation
</script>

<style scoped>
.zen-idle-anim {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  z-index: 1000;
  pointer-events: none;
  background: var(--base1);
  overflow: hidden;
  display: flex;
  align-items: stretch;
  justify-content: stretch;
}
.zen-wind-anim {
  width: 100vw;
  height: 100vh;
  display: block;
  position: absolute;
  top: 0;
  left: 0;
}
</style>
