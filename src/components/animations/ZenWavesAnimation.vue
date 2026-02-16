<template>
  <svg class="zen-waves-anim" width="100vw" height="100vh" viewBox="0 0 1920 1080" preserveAspectRatio="none">
    <defs>
      <linearGradient id="zenWaveGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="var(--text2)" stop-opacity="0.12"/>
        <stop offset="100%" stop-color="var(--base1)" stop-opacity="0.18"/>
      </linearGradient>
    </defs>
    <g>
      <path id="wave1" fill="url(#zenWaveGradient)">
        <animate attributeName="d" dur="8s" repeatCount="indefinite"
          values="M0,800 Q480,900 960,800 T1920,800 V1080 H0Z;
                  M0,820 Q480,700 960,820 T1920,820 V1080 H0Z;
                  M0,800 Q480,900 960,800 T1920,800 V1080 H0Z"/>
      </path>
      <path id="wave2" fill="url(#zenWaveGradient)" opacity="0.7">
        <animate attributeName="d" dur="10s" repeatCount="indefinite"
          values="M0,900 Q480,1000 960,900 T1920,900 V1080 H0Z;
                  M0,880 Q480,950 960,880 T1920,880 V1080 H0Z;
                  M0,900 Q480,1000 960,900 T1920,900 V1080 H0Z"/>
      </path>
    </g>
  </svg>
</template>

<script setup lang="ts">
// No logic needed
</script>

<style scoped>
.zen-waves-anim {
  width: 100vw;
  height: 100vh;
  display: block;
  position: absolute;
  top: 0;
  left: 0;
}
</style>
