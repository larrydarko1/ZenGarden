<script setup lang="ts">
export type PhilosophyIconName = 'practice' | 'noGoals' | 'noStreaks' | 'silence' | 'observation';

defineProps<{ name: PhilosophyIconName }>();
</script>

<template>
    <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        focusable="false">
        <template v-if="name === 'practice'">
            <path
                d="M12 2C10.9 2 10 2.9 10 4C10 5.1 10.9 6 12 6C13.1 6 14 5.1 14 4C14 2.9 13.1 2 12 2Z"
                fill="currentColor" />
            <path
                d="M21 9H15V22H13V16H11V22H9V9H3V7H21V9Z"
                fill="currentColor" />
        </template>
        <template v-else-if="name === 'noGoals'">
            <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="2" />
            <circle
                cx="12"
                cy="12"
                r="6"
                stroke="currentColor"
                stroke-width="2" />
            <circle
                cx="12"
                cy="12"
                r="2"
                fill="currentColor" />
        </template>
        <path
            v-else-if="name === 'noStreaks'"
            d="M12 2C11.5 2 11 2.19 10.59 2.59L2.59 10.59C1.8 11.37 1.8 12.63 2.59 13.41C3.37 14.2 4.63 14.2 5.41 13.41L12 6.83L18.59 13.41C19.37 14.2 20.63 14.2 21.41 13.41C22.2 12.63 22.2 11.37 21.41 10.59L13.41 2.59C13 2.19 12.5 2 12 2M8 14L6 16V22H10V18H14V22H18V16L16 14L12 18L8 14Z"
            fill="currentColor" />
        <path
            v-else-if="name === 'silence'"
            d="M16.5 12A4.5 4.5 0 0 0 14 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zM19 12c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.8 8.8 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 0 0 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"
            fill="currentColor" />
        <path
            v-else
            d="M12 4.5C7 4.5 2.73 7.61 1 12C2.73 16.39 7 19.5 12 19.5C17 19.5 21.27 16.39 23 12C21.27 7.61 17 4.5 12 4.5ZM12 17C9.24 17 7 14.76 7 12C7 9.24 9.24 7 12 7C14.76 7 17 9.24 17 12C17 14.76 14.76 17 12 17ZM12 9C10.34 9 9 10.34 9 12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12C15 10.34 13.66 9 12 9Z"
            fill="currentColor" />
    </svg>
</template>
