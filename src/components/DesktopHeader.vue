<template>
  <div class="desktop-header" :class="platform">
    <div class="desktop-header-drag-region">
      <div class="desktop-header-title">
        <svg class="app-icon" version="1.1" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 1000 747" preserveAspectRatio="xMidYMid meet">
          <path d="M0 0 C2.95837144 1.29802084 4.68321036 2.49800106 6.59375 5.09765625 C7.06031006 5.72526855 7.52687012 6.35288086 8.00756836 6.99951172 C8.5000708 7.68029785 8.99257324 8.36108398 9.5 9.0625 C10.02408447 9.77422363 10.54816895 10.48594727 11.08813477 11.21923828 C15.27345419 16.92927677 19.36883293 22.70421316 23.42773438 28.50463867 C26.51829512 32.92051284 29.66597177 37.28766194 32.85742188 41.63110352 C61.24982076 80.41744986 81.49505399 122.66586794 81.375 171.4375 C81.37445618 172.27149323 81.37391235 173.10548645 81.37335205 173.9647522 C81.33249292 187.63245956 80.44546842 200.71448498 77 214 C76.68651611 215.22009766 76.68651611 215.22009766 76.36669922 216.46484375 C68.19952351 247.05351683 51.34200026 278.27286403 24.15234375 295.83984375 C14.18952579 301.57091625 3.70121643 305.15702424 -7.7890625 302.30859375 C-19.03127208 298.52424433 -27.516049 292.12931639 -36 284 C-36.73992188 283.33484375 -37.47984375 282.6696875 -38.2421875 281.984375 C-57.46313459 264.0630649 -67.98726289 238.15009799 -74.75 213.3125 C-74.94891846 212.58933594 -75.14783691 211.86617187 -75.3527832 211.12109375 C-78.69929738 198.21167483 -79.41014289 185.32138765 -79.375 172.0625 C-79.37412384 171.25085388 -79.37324768 170.43920776 -79.37234497 169.60296631 C-79.27159197 141.20038287 -72.60599263 114.48084792 -60 89 C-59.67918457 88.3512793 -59.35836914 87.70255859 -59.02783203 87.03417969 C-45.86688057 60.79248571 -27.76565277 37.25478821 -10.4375 13.6875 C-9.85379639 12.89303467 -9.27009277 12.09856934 -8.66870117 11.2800293 C-5.85056904 7.45821268 -3.00383769 3.67951756 0 0 Z M1 39 C-4.04942367 44.18499048 -8.32160662 49.98517299 -12.5 55.875 C-13.06968506 56.67381592 -13.63937012 57.47263184 -14.22631836 58.2956543 C-15.33848021 59.85630698 -16.44915215 61.41802283 -17.55810547 62.98095703 C-18.67903039 64.55055559 -19.82160973 66.10469902 -20.97265625 67.65234375 C-48.86032184 105.54393851 -61.73727261 151.35171026 -55 198 C-50.00426265 227.42489298 -35.55596832 257.98868928 -11.16015625 276.109375 C-6.99139587 278.74227629 -3.04259272 281.10962158 2 281 C13.52750504 278.21749878 22.87351079 269.10451082 30 260 C30.77859375 259.02933594 31.5571875 258.05867187 32.359375 257.05859375 C54.87694957 227.96126571 62.51221044 188.90151302 58.17553711 152.88037109 C52.69271617 113.1548077 33.29603014 80.89749032 9.67480469 49.24804688 C8.53428681 47.71715932 7.39974318 46.1818069 6.27050781 44.64257812 C5.73006836 43.90974609 5.18962891 43.17691406 4.6328125 42.421875 C3.90795654 41.4333252 3.90795654 41.4333252 3.16845703 40.42480469 C2.78286621 39.95461914 2.39727539 39.48443359 2 39 C1.67 39 1.34 39 1 39 Z" fill="currentColor" transform="translate(716,126)"/>
        </svg>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const platform = ref('');
const isMaximized = ref(false);

// Detect platform
onMounted(() => {
  if ((window as any).electron) {
    platform.value = (window as any).electron.platform || '';
    
    // Listen for maximize state changes
    if ((window as any).electron.onMaximizeChange) {
      (window as any).electron.onMaximizeChange((maximized: boolean) => {
        isMaximized.value = maximized;
      });
    }
    
    // Check initial maximize state
    checkMaximizeState();
  }
});

async function checkMaximizeState() {
  if ((window as any).electron?.isMaximized) {
    isMaximized.value = await (window as any).electron.isMaximized();
  }
}

onUnmounted(() => {
  // Clean up listeners if needed
});
</script>

<style scoped>
.desktop-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 40px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--base2, #35456e);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  z-index: 1000;
  user-select: none;
}

.desktop-header-drag-region {
  flex: 1;
  height: 100%;
  display: flex;
  align-items: center;
  padding-left: 12px;
  -webkit-app-region: drag;
}

.desktop-header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text1, #F0F8FF);
  font-size: 13px;
  font-weight: 500;
  opacity: 0.9;
}

.app-icon {
  width: 18px;
  height: 18px;
  opacity: 0.95;
}

.app-name {
  letter-spacing: 0.3px;
}

.desktop-header-controls {
  display: flex;
  height: 100%;
  -webkit-app-region: no-drag;
}

.window-control-btn {
  width: 46px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--text2, #BFD7ED);
  cursor: pointer;
  transition: background-color 0.15s ease;
  padding: 0;
}

.window-control-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.window-control-btn:active {
  background: rgba(255, 255, 255, 0.15);
}

.window-control-btn svg {
  opacity: 0.8;
}

.window-control-btn:hover svg {
  opacity: 1;
}

/* Platform-specific styling for close button */
.desktop-header.win32 .close-btn:hover,
.desktop-header.linux .close-btn:hover {
  background: #e81123;
  color: white;
}

.desktop-header.win32 .close-btn:active,
.desktop-header.linux .close-btn:active {
  background: #c50b1a;
}

.desktop-header.darwin .close-btn:hover {
  background: #ff5f56;
  color: white;
}

.desktop-header.darwin .close-btn:active {
  background: #e04b42;
}

/* macOS style - controls on left */
.desktop-header.darwin {
  flex-direction: row-reverse;
}

.desktop-header.darwin .desktop-header-drag-region {
  padding-left: 0;
  padding-right: 12px;
  justify-content: flex-end;
}

.desktop-header.darwin .desktop-header-controls {
  order: -1;
  padding-left: 8px;
}

.desktop-header.darwin .window-control-btn {
  width: 40px;
}
</style>
