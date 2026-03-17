// DesktopHeader — platform-aware draggable title bar for the Electron desktop window. // Owns: OS detection from
user-agent, drag region, platform-specific CSS. // Does NOT own: window controls, visibility (App.vue).
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { isElectron } from '../utils/platform';

const platform = ref('');

// Detect OS for platform-specific title bar styling
onMounted(() => {
    if (!isElectron()) return;

    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('mac')) platform.value = 'darwin';
    else if (ua.includes('win')) platform.value = 'win32';
    else if (ua.includes('linux')) platform.value = 'linux';
});
</script>

<template>
    <div class="desktop-header" :class="platform">
        <div class="desktop-header-drag-region"></div>
    </div>
</template>

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
    color: var(--text1, #f0f8ff);
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
    color: var(--text2, #bfd7ed);
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
