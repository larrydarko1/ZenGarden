<template>
  <transition name="slide-down">
    <div v-if="showBanner" :class="['network-banner', isOnline ? 'online' : 'offline']">
      <span class="message">{{ message }}</span>
      <button v-if="!isOnline" @click="retry" class="retry-btn">Retry</button>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'

const isOnline = ref(navigator.onLine)
const showBanner = ref(false)
const message = ref('')
let hideTimeout: number | null = null

const updateOnlineStatus = () => {
  isOnline.value = navigator.onLine
  showBanner.value = true

  if (isOnline.value) {
    message.value = 'Back online - syncing data...'
    // Auto-hide after 3 seconds when back online
    hideTimeout = window.setTimeout(() => {
      showBanner.value = false
    }, 3000)
  } else {
    message.value = 'No internet - working offline'
    // Keep showing when offline
    if (hideTimeout) {
      clearTimeout(hideTimeout)
      hideTimeout = null
    }
  }
}

const retry = () => {
  if (navigator.onLine) {
    updateOnlineStatus()
  }
}

watch(isOnline, (newValue) => {
  if (newValue) {
    // Trigger a soft reload or sync logic here if needed
    console.log('Network restored - you may want to sync data')
  }
})

onMounted(() => {
  window.addEventListener('online', updateOnlineStatus)
  window.addEventListener('offline', updateOnlineStatus)

  // Show initial status if offline
  if (!navigator.onLine) {
    updateOnlineStatus()
  }
})

onUnmounted(() => {
  window.removeEventListener('online', updateOnlineStatus)
  window.removeEventListener('offline', updateOnlineStatus)
  if (hideTimeout) {
    clearTimeout(hideTimeout)
  }
})
</script>

<style scoped lang="scss">
.network-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  padding: 10px 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  z-index: 10000;
  font-size: 13px;
  font-weight: 400;
  letter-spacing: 0.3px;
  backdrop-filter: blur(12px);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  font-family: system-ui, -apple-system, sans-serif;

  &.offline {
    background: rgba(231, 76, 60, 0.85);
    color: rgba(255, 255, 255, 0.95);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 2px 12px rgba(231, 76, 60, 0.2);
  }

  &.online {
    background: rgba(74, 124, 89, 0.85);
    color: rgba(255, 255, 255, 0.95);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 2px 12px rgba(74, 124, 89, 0.2);
  }

  .icon {
    font-size: 16px;
    opacity: 0.9;
    transition: transform 0.3s ease;
  }

  .message {
    flex: 1;
    text-align: center;
    opacity: 0.95;
  }

  .retry-btn {
    background: rgba(255, 255, 255, 0.15);
    border: 1px solid rgba(255, 255, 255, 0.25);
    color: rgba(255, 255, 255, 0.95);
    padding: 5px 14px;
    border-radius: 16px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.3px;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    backdrop-filter: blur(4px);

    &:hover {
      background: rgba(255, 255, 255, 0.25);
      border-color: rgba(255, 255, 255, 0.35);
      transform: translateY(-1px);
    }

    &:active {
      transform: translateY(0);
      background: rgba(255, 255, 255, 0.2);
    }
  }
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-down-enter-from {
  transform: translateY(-100%);
  opacity: 0;
}

.slide-down-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}

@media (max-width: 768px) {
  .network-banner {
    padding: 8px 16px;
    font-size: 12px;

    .icon {
      font-size: 14px;
    }

    .retry-btn {
      padding: 4px 12px;
      font-size: 11px;
    }
  }
}
</style>
