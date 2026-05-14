<script setup lang="ts">
import { useI18n } from 'vue-i18n';

defineProps<{
    journalMode: boolean;
    calendarMode: boolean;
    philosophyMode: boolean;
    settingsMode: boolean;
}>();

defineEmits<{
    'toggle-journal': [];
    'toggle-calendar': [];
    'toggle-philosophy': [];
    'toggle-settings': [];
    logout: [];
}>();

const { t } = useI18n();
</script>

<template>
    <nav class="bottom-nav">
        <button
            :class="['nav-item', { 'nav-active': journalMode }]"
            aria-label="Track your emotions"
            @click="$emit('toggle-journal')"
        >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                    d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15Z"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                />
                <path
                    d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                />
                <path d="M8 7h8M8 11h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </svg>
            <span>{{ t('header.emotions') }}</span>
        </button>
        <button
            :class="['nav-item', { 'nav-active': calendarMode }]"
            aria-label="View meditation history"
            @click="$emit('toggle-calendar')"
        >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="1.5" />
                <path d="M3 10h18M8 2v4M16 2v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </svg>
            <span>{{ t('header.calendar') }}</span>
        </button>
        <button
            :class="['nav-item', { 'nav-active': philosophyMode }]"
            aria-label="About our philosophy"
            @click="$emit('toggle-philosophy')"
        >
            <svg width="22" height="22" viewBox="0 0 96 96" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path
                    d="M44 9.553c-1.925.812-4.86 3.056-6.523 4.988-2.862 3.327-3.196 3.453-6.299 2.371-7.117-2.481-16.58 2.241-20.581 10.27-4.402 8.833-2.61 17.282 4.996 23.559 4.854 4.006 5.66 4.812 9.666 9.666 5.493 6.656 13.034 8.936 20.741 6.269 2.85-.986 4.266-.939 7.623.253 5.57 1.978 11.336.245 16.708-5.021C72.524 59.759 74.906 58 75.624 58c2.279 0 8.621-6.331 10.511-10.491C91.4 35.919 83.178 22.041 70 20.273c-2.2-.295-4-.926-4-1.402 0-2.12-7.482-8.911-10.848-9.846-4.829-1.341-6.956-1.24-11.152.528m.838 7.973c-1.621.88-3.336 3.21-4.386 5.96-2.008 5.258-1.53 5.046-5.678 2.518-10.81-6.591-23.486 5.211-17.138 15.956 1.765 2.989 6.195 6.04 8.768 6.04A1.6 1.6 0 0 1 28 49.596c0 7.743 11.474 13.045 18.381 8.492 2.83-1.866 2.935-1.866 6 .002 5.341 3.258 11.783 1.708 14.573-3.505C67.715 53.163 68.98 52 69.765 52 74.454 52 80 45.498 80 40c0-7.684-6.192-12.605-14.615-11.615-5.226.614-5.385.56-5.385-1.829 0-8.107-8.042-12.897-15.162-9.03M26 74c-3.585 3.585-1.019 10 4 10 2.576 0 6-3.424 6-6 0-1.1-.9-2.9-2-4s-2.9-2-4-2-2.9.9-4 2m-12.96 7.452c-2.657 3.201 1.245 8.118 4.71 5.936C21.212 85.207 19.979 80 16 80c-.965 0-2.297.653-2.96 1.452"
                    fill-rule="evenodd"
                />
            </svg>
            <span>{{ t('header.philosophy') }}</span>
        </button>
        <button
            :class="['nav-item', { 'nav-active': settingsMode }]"
            aria-label="Open settings"
            @click="$emit('toggle-settings')"
        >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.5" />
                <path
                    d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                />
            </svg>
            <span>{{ t('header.settings') }}</span>
        </button>
        <button class="nav-item nav-logout" aria-label="Logout from your account" @click="$emit('logout')">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                    d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                />
            </svg>
            <span>{{ t('header.logout') }}</span>
        </button>
    </nav>
</template>

<style scoped>
.bottom-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    padding: 0.5rem 1rem;
    padding-bottom: calc(0.5rem + env(safe-area-inset-bottom, 0px));
    background: color-mix(in srgb, var(--base1) 85%, transparent);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-top: 1px solid var(--input-border);
    z-index: 100;
}

.nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    padding: 0.4rem 0.75rem;
    background: transparent;
    border: none;
    color: var(--text2);
    font-size: 0.65rem;
    font-weight: 400;
    cursor: pointer;
    border-radius: 8px;
    transition:
        color 0.35s cubic-bezier(0.4, 0, 0.2, 1),
        background 0.35s cubic-bezier(0.4, 0, 0.2, 1),
        transform 0.25s cubic-bezier(0.4, 0, 0.2, 1),
        box-shadow 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    letter-spacing: 0.02em;
    position: relative;
    min-width: 52px;
}

.nav-item svg {
    flex-shrink: 0;
    opacity: 0.7;
    transition:
        opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1),
        transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.nav-item span {
    line-height: 1;
    white-space: nowrap;
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.nav-item:hover {
    color: var(--text1);
    background: var(--input-bg-focus);
}

.nav-item:hover svg {
    opacity: 1;
    transform: translateY(-1px);
}

.nav-item:active {
    transform: scale(0.93);
    transition-duration: 0.1s;
}

.nav-logout {
    color: color-mix(in srgb, var(--text2) 60%, transparent);
}

.nav-logout:hover {
    color: var(--text1);
}

.nav-active {
    color: var(--text1) !important;
    background: var(--button-bg) !important;
    position: relative;
    box-shadow: 0 0 12px rgba(255, 255, 255, 0.05);
}

.nav-active svg {
    opacity: 1 !important;
    transform: translateY(-1px);
}

.nav-active::after {
    content: '';
    position: absolute;
    bottom: 2px;
    left: 50%;
    transform: translateX(-50%) scaleX(0);
    width: 16px;
    height: 2px;
    background: var(--text1);
    border-radius: 1px;
    opacity: 0.6;
    animation: navIndicatorIn 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

@keyframes navIndicatorIn {
    from {
        transform: translateX(-50%) scaleX(0);
        opacity: 0;
    }
    to {
        transform: translateX(-50%) scaleX(1);
        opacity: 0.6;
    }
}

@media (max-width: 768px) {
    .bottom-nav {
        padding: 0.35rem 0.25rem calc(0.35rem + env(safe-area-inset-bottom));
    }

    .nav-item {
        font-size: 0.7rem;
        gap: 0.3rem;
        padding: 0.5rem 0.4rem;
        min-width: 56px;
    }

    .nav-item svg {
        width: 26px;
        height: 26px;
    }
}

@media (max-width: 480px) {
    .bottom-nav {
        gap: 0;
    }

    .nav-item {
        font-size: 0.65rem;
        gap: 0.25rem;
        padding: 0.45rem 0.3rem;
        min-width: 50px;
    }

    .nav-item svg {
        width: 24px;
        height: 24px;
    }
}

@media (max-height: 500px) and (max-width: 900px) {
    .bottom-nav {
        flex-direction: row;
        padding: 0.25rem 0.5rem;
    }

    .nav-item {
        font-size: 0.6rem;
    }

    .nav-item svg {
        width: 22px;
        height: 22px;
    }
}

@media (max-width: 360px) {
    .nav-item {
        font-size: 0.6rem;
        gap: 0.4rem;
        padding: 0.2rem 0.2rem;
        min-width: 46px;
    }

    .nav-item svg {
        width: 22px;
        height: 22px;
    }
}
</style>
