<template>
  <div class="zen-particles-anim">
    <svg class="zen-particles-svg" width="100vw" height="100vh" viewBox="0 0 1920 1080" preserveAspectRatio="none">
      <defs>
        <radialGradient id="particleGlow">
          <stop offset="0%" stop-color="var(--text2)" stop-opacity="0.4"/>
          <stop offset="100%" stop-color="var(--text2)" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <g>
        <!-- Large slow particles -->
        <circle v-for="i in 12" :key="'large-' + i" 
          :cx="(i * 180) - 150" 
          :cy="(i * 90) + 80" 
          r="8" 
          fill="url(#particleGlow)"
          opacity="0.5">
          <animate 
            attributeName="cx" 
            :from="(i * 180) - 150" 
            to="2100" 
            :dur="(18 + i * 2) + 's'" 
            repeatCount="indefinite"/>
          <animate 
            attributeName="cy" 
            :values="`${(i * 90) + 80};${(i * 90) + 180};${(i * 90) + 80}`" 
            :dur="(7 + i * 0.8) + 's'" 
            repeatCount="indefinite"/>
          <animate 
            attributeName="opacity" 
            values="0;0.5;0.5;0" 
            :dur="(18 + i * 2) + 's'" 
            repeatCount="indefinite"/>
        </circle>
        
        <!-- Medium particles -->
        <circle v-for="i in 20" :key="'medium-' + i" 
          :cx="(i * 120) - 80" 
          :cy="(i * 60) + 40" 
          r="5" 
          fill="url(#particleGlow)"
          opacity="0.4">
          <animate 
            attributeName="cx" 
            :from="(i * 120) - 80" 
            to="2000" 
            :dur="(13 + i * 1.5) + 's'" 
            repeatCount="indefinite"/>
          <animate 
            attributeName="cy" 
            :values="`${(i * 60) + 40};${(i * 60) + 130};${(i * 60) + 40}`" 
            :dur="(5 + i * 0.4) + 's'" 
            repeatCount="indefinite"/>
          <animate 
            attributeName="opacity" 
            values="0;0.4;0.4;0" 
            :dur="(13 + i * 1.5) + 's'" 
            repeatCount="indefinite"/>
        </circle>
        
        <!-- Small fast particles -->
        <circle v-for="i in 30" :key="'small-' + i" 
          :cx="(i * 80) - 40" 
          :cy="(i * 40) + 15" 
          r="3" 
          fill="var(--text2)"
          opacity="0.3">
          <animate 
            attributeName="cx" 
            :from="(i * 80) - 40" 
            to="1950" 
            :dur="(10 + i * 0.8) + 's'" 
            repeatCount="indefinite"/>
          <animate 
            attributeName="cy" 
            :values="`${(i * 40) + 15};${(i * 40) + 90};${(i * 40) + 15}`" 
            :dur="(4 + i * 0.2) + 's'" 
            repeatCount="indefinite"/>
          <animate 
            attributeName="opacity" 
            values="0;0.3;0.3;0" 
            :dur="(10 + i * 0.8) + 's'" 
            repeatCount="indefinite"/>
        </circle>
      </g>
    </svg>
  </div>
</template>

<script setup lang="ts">
// Pure animation component
</script>

<style scoped>
.zen-particles-anim {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}
.zen-particles-svg {
  width: 100vw;
  height: 100vh;
  display: block;
  position: absolute;
  top: 0;
  left: 0;
}
</style>
