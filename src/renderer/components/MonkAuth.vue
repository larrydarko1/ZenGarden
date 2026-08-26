<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import {
    register as storageRegister,
    login as storageLogin,
    getCurrentUser,
    resetPasswordWithRecoveryCode,
} from '@/renderer/store';
import type { User } from '@/renderer/store/types';
import ZenSpinner from '@/renderer/components/common/ZenSpinner.vue';

const emit = defineEmits<{
    auth: [session: { user: User; token: string }];
}>();

const { t } = useI18n();

const mode = ref<'login' | 'register' | 'recovery'>('login');
const username = ref('');
const password = ref('');
const loginUsername = ref('');
const loginPassword = ref('');
const user = ref<User | null>(null);
const error = ref('');
const isLoading = ref(false);
const isReady = ref(false);

const recoveryUsername = ref('');
const recoveryCode = ref('');
const newRecoveryPassword = ref('');
const confirmRecoveryPassword = ref('');
const recoverySuccess = ref(false);

function switchMode(newMode: 'login' | 'register' | 'recovery'): void {
    error.value = '';
    mode.value = newMode;
}

function setSession(token: string, userObj: User): void {
    user.value = userObj;
    emit('auth', { user: userObj, token });
}

async function register(): Promise<void> {
    error.value = '';
    isLoading.value = true;
    try {
        const res = await storageRegister(username.value, password.value);
        setSession(res.token, res.user);
    } catch (e: unknown) {
        error.value = e instanceof Error ? e.message : String(e);
    } finally {
        isLoading.value = false;
    }
}

async function login(): Promise<void> {
    error.value = '';
    isLoading.value = true;
    try {
        const res = await storageLogin(loginUsername.value, loginPassword.value);
        setSession(res.token, res.user);
    } catch (e: unknown) {
        error.value = e instanceof Error ? e.message : String(e);
    } finally {
        isLoading.value = false;
    }
}

async function resetPassword(): Promise<void> {
    error.value = '';
    if (newRecoveryPassword.value !== confirmRecoveryPassword.value) {
        error.value = t('auth.passwordsDoNotMatch');
        return;
    }
    isLoading.value = true;
    try {
        await resetPasswordWithRecoveryCode(recoveryUsername.value, recoveryCode.value, newRecoveryPassword.value);
        recoverySuccess.value = true;
    } catch (e: unknown) {
        error.value = e instanceof Error ? e.message : String(e);
    } finally {
        isLoading.value = false;
    }
}

function goToLogin(): void {
    mode.value = 'login';
    recoverySuccess.value = false;
    recoveryUsername.value = '';
    recoveryCode.value = '';
    newRecoveryPassword.value = '';
    confirmRecoveryPassword.value = '';
    error.value = '';
}

onMounted(() => {
    // Trigger entrance animation after mount
    requestAnimationFrame(() => {
        isReady.value = true;
    });
});

// Check if user is still logged in on mount
getCurrentUser()
    .then((res) => {
        setSession('', res.user);
    })
    .catch(() => {
        // Not logged in, show auth screen
    });
</script>

<template>
    <div
        class="monk-auth"
        :class="{ 'is-ready': isReady }">
        <transition
            name="auth-fade"
            mode="out-in">
            <!-- LOGIN -->
            <form
                v-if="mode === 'login'"
                key="login"
                class="zen-form"
                aria-labelledby="login-title"
                @submit.prevent="login">
                <div
                    id="login-title"
                    class="zen-heading"
                    >{{ t('auth.login') }}</div
                >

                <div
                    class="field-group"
                    :style="{ '--i': 0 }">
                    <input
                        v-model="loginUsername"
                        :disabled="isLoading"
                        :placeholder="t('auth.username')"
                        required
                        autocomplete="username"
                        aria-label="Enter your username" />
                </div>
                <div
                    class="field-group"
                    :style="{ '--i': 1 }">
                    <input
                        v-model="loginPassword"
                        :disabled="isLoading"
                        type="password"
                        :placeholder="t('auth.password')"
                        required
                        autocomplete="current-password"
                        aria-label="Enter your password" />
                </div>

                <button
                    type="submit"
                    :disabled="isLoading"
                    class="auth-btn"
                    :style="{ '--i': 2 }"
                    aria-label="Login to your account">
                    <transition
                        name="btn-content"
                        mode="out-in">
                        <span
                            v-if="!isLoading"
                            key="text"
                            >{{ t('auth.login') }}</span
                        >
                        <ZenSpinner
                            v-else
                            key="loader" />
                    </transition>
                </button>

                <div
                    class="zen-link-row"
                    :style="{ '--i': 3 }">
                    <a
                        href="#"
                        aria-label="Switch to registration form"
                        @click.prevent="switchMode('register')"
                        >{{ t('auth.switchToRegister') }}</a
                    >
                </div>
                <div
                    class="zen-link-row"
                    :style="{ '--i': 4 }">
                    <a
                        href="#"
                        aria-label="Reset password using recovery code"
                        @click.prevent="switchMode('recovery')"
                        >{{ t('auth.forgotPassword') }}</a
                    >
                </div>

                <transition name="error-slide">
                    <div
                        v-if="error"
                        class="error"
                        role="alert"
                        aria-live="polite"
                        >{{ error }}</div
                    >
                </transition>
            </form>

            <!-- REGISTER -->
            <form
                v-else-if="mode === 'register'"
                key="register"
                class="zen-form"
                aria-labelledby="register-title"
                @submit.prevent="register">
                <div
                    id="register-title"
                    class="zen-heading"
                    >{{ t('auth.register') }}</div
                >

                <div
                    class="field-group"
                    :style="{ '--i': 0 }">
                    <input
                        v-model="username"
                        :disabled="isLoading"
                        :placeholder="t('auth.username')"
                        required
                        autocomplete="username"
                        aria-label="Choose a username for your account" />
                </div>
                <div
                    class="field-group"
                    :style="{ '--i': 1 }">
                    <input
                        v-model="password"
                        :disabled="isLoading"
                        type="password"
                        :placeholder="t('auth.password')"
                        required
                        autocomplete="new-password"
                        aria-label="Choose a password for your account" />
                </div>

                <button
                    type="submit"
                    :disabled="isLoading"
                    class="auth-btn"
                    :style="{ '--i': 2 }"
                    aria-label="Create your new account">
                    <transition
                        name="btn-content"
                        mode="out-in">
                        <span
                            v-if="!isLoading"
                            key="text"
                            >{{ t('auth.register') }}</span
                        >
                        <ZenSpinner
                            v-else
                            key="loader" />
                    </transition>
                </button>

                <div
                    class="zen-link-row"
                    :style="{ '--i': 3 }">
                    <a
                        href="#"
                        aria-label="Switch to login form"
                        @click.prevent="switchMode('login')"
                        >{{ t('auth.switchToLogin') }}</a
                    >
                </div>

                <transition name="error-slide">
                    <div
                        v-if="error"
                        class="error"
                        role="alert"
                        aria-live="polite"
                        >{{ error }}</div
                    >
                </transition>
            </form>

            <!-- RECOVERY -->
            <form
                v-else-if="mode === 'recovery' && !recoverySuccess"
                key="recovery"
                class="zen-form"
                aria-labelledby="recovery-title"
                @submit.prevent="resetPassword">
                <div
                    id="recovery-title"
                    class="zen-heading"
                    >{{ t('auth.recoverPassword') }}</div
                >
                <div class="recovery-info">{{ t('auth.recoveryInfo') }}</div>

                <div
                    class="field-group"
                    :style="{ '--i': 0 }">
                    <input
                        v-model="recoveryUsername"
                        :disabled="isLoading"
                        :placeholder="t('auth.username')"
                        required
                        autocomplete="username" />
                </div>
                <div
                    class="field-group"
                    :style="{ '--i': 1 }">
                    <input
                        v-model="recoveryCode"
                        :disabled="isLoading"
                        :placeholder="t('auth.recoveryCode')"
                        required />
                </div>
                <div
                    class="field-group"
                    :style="{ '--i': 2 }">
                    <input
                        v-model="newRecoveryPassword"
                        :disabled="isLoading"
                        type="password"
                        :placeholder="t('auth.newPassword')"
                        :aria-label="t('auth.newPassword')"
                        required
                        autocomplete="new-password" />
                </div>
                <div
                    class="field-group"
                    :style="{ '--i': 3 }">
                    <input
                        v-model="confirmRecoveryPassword"
                        :disabled="isLoading"
                        type="password"
                        :placeholder="t('auth.confirmNewPassword')"
                        :aria-label="t('auth.confirmNewPassword')"
                        required
                        autocomplete="new-password" />
                </div>

                <button
                    type="submit"
                    :disabled="isLoading"
                    class="auth-btn"
                    :style="{ '--i': 4 }">
                    <transition
                        name="btn-content"
                        mode="out-in">
                        <span
                            v-if="!isLoading"
                            key="text"
                            >{{ t('auth.resetPassword') }}</span
                        >
                        <ZenSpinner
                            v-else
                            key="loader" />
                    </transition>
                </button>

                <div
                    class="zen-link-row"
                    :style="{ '--i': 5 }">
                    <a
                        href="#"
                        @click.prevent="switchMode('login')"
                        >{{ t('auth.backToLogin') }}</a
                    >
                </div>

                <transition name="error-slide">
                    <div
                        v-if="error"
                        class="error"
                        role="alert"
                        >{{ error }}</div
                    >
                </transition>
            </form>

            <!-- RECOVERY SUCCESS -->
            <div
                v-else-if="recoverySuccess"
                key="recovery-success"
                class="zen-form recovery-success">
                <div class="success-icon">
                    <svg
                        width="48"
                        height="48"
                        viewBox="0 0 48 48"
                        fill="none">
                        <circle
                            cx="24"
                            cy="24"
                            r="22"
                            stroke="currentColor"
                            stroke-width="1.5"
                            opacity="0.3" />
                        <path
                            d="M15 24l6 6 12-12"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round" />
                    </svg>
                </div>
                <div class="zen-heading">{{ t('auth.passwordResetSuccess') }}</div>
                <div class="success-message">{{ t('auth.passwordResetMessage') }}</div>
                <button
                    class="auth-btn"
                    @click="goToLogin"
                    >{{ t('auth.goToLogin') }}</button
                >
            </div>
        </transition>
    </div>
</template>

<style scoped lang="scss">
/* –––––– Layout –––––– */

.monk-auth {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100vw;
    min-width: 100vw;
    height: 100vh;
    min-height: 100vh;
    background: $base1;
    overflow: hidden;
}

/* –––––– Form card –––––– */

.zen-form {
    position: relative;
    z-index: $z-normal;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: $space-3;
    width: 90%;
    min-width: $size-44;
    max-width: $size-46;
    margin: $space-6;
    padding: $space-8 $space-7 $space-7;
    background: $input-bg;
    border: $border-width-thin $input-border;
    border-radius: $border-radius-2xl;
    box-shadow: $shadow-float;
    opacity: $opacity-faint;
    transform: translateY($size-7) scale($scale-98);
    transition:
        opacity $duration-languid $ease-out-expo,
        transform $duration-languid $ease-out-expo;

    .monk-auth.is-ready & {
        opacity: $opacity-full;
        transform: translateY(0) scale($scale-100);
    }

    &.recovery-success {
        padding: $space-8 $space-7;
        text-align: center;
    }
}

/* –––––– Typography –––––– */

.zen-heading {
    margin-bottom: $space-2;
    color: $text2;
    font-size: $font-size-xs;
    font-weight: $font-weight-medium;
    line-height: $line-height-tight;
    text-align: center;
    text-transform: uppercase;
    letter-spacing: $letter-spacing-8;
}

/* –––––– Field groups –––––– */

.field-group,
.zen-link-row {
    animation: field-in $duration-calm $ease-out-expo both;
    animation-delay: calc(var(--i, 0) * $duration-stagger + $duration-fast);
}

@keyframes field-in {
    from {
        opacity: $opacity-faint;
        transform: translateY($size-5);
    }

    to {
        opacity: $opacity-full;
        transform: translateY(0);
    }
}

/* –––––– Inputs –––––– */

input {
    width: 100%;
    min-height: $size-21;
    box-sizing: border-box;
    padding: $space-3 $space-4;
    background: $input-bg;
    border: $border-width-thin $input-border;
    border-radius: $border-radius-lg;
    color: $text1;
    font-size: $font-size-sm;
    outline: none;
    transition:
        border-color $duration-slow $ease-out-expo,
        background $duration-slow $ease-out-expo,
        box-shadow $duration-slow $ease-out-expo;

    &:focus {
        background: $input-bg-focus;
        border-color: $input-border-focus;
        box-shadow: $shadow-ring;

        &::placeholder {
            opacity: $opacity-lowest;
        }
    }

    &::placeholder {
        color: $text2;
        opacity: $opacity-low-mid;
        transition: opacity $transition-slow;
    }
}

/* –––––– Buttons –––––– */

button {
    position: relative;
    min-height: $size-22;
    margin-top: $space-1;
    padding: $space-3 $space-4;
    background: $button-bg;
    border: $border-width-thin $border-subtle;
    border-radius: $border-radius-lg;
    color: $text1;
    font-size: $font-size-xs;
    font-weight: $font-weight-medium;
    text-transform: uppercase;
    letter-spacing: $letter-spacing-6;
    cursor: pointer;
    outline: none;
    overflow: hidden;
    animation: field-in $duration-calm $ease-out-expo both;
    animation-delay: calc(var(--i, 0) * $duration-stagger + $duration-fast);
    transition:
        color $duration-slow $ease-out-expo,
        background $duration-slow $ease-out-expo,
        border-color $duration-slow $ease-out-expo,
        transform $duration-slow $ease-out-expo,
        box-shadow $duration-slow $ease-out-expo;

    &:hover:not(:disabled) {
        background: $button-bg-hover;
        border-color: $button-border-hover;
        box-shadow: $shadow-md-soft;
        transform: translateY(-$size-0);
    }

    &:active:not(:disabled) {
        box-shadow: none;
        transform: translateY(0);
    }

    &:focus-visible {
        box-shadow: $shadow-ring-strong;
    }

    &:disabled {
        opacity: $opacity-mid-low;
        cursor: not-allowed;
    }
}

.auth-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: $size-22;
}

/* –––––– Links –––––– */

.zen-link-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: $space-1;
    margin-top: $space-1;
    color: $text2;
    font-size: $font-size-xs;

    a {
        padding-bottom: $space-0;
        border-bottom: $border-width-thin transparent;
        color: $text2;
        font-weight: $font-weight-normal;
        text-decoration: none;
        cursor: pointer;
        transition:
            color $duration-slow,
            border-color $duration-slow;

        &:hover {
            border-bottom-color: $border-subtle;
            color: $text1;
        }
    }
}

/* –––––– Messages –––––– */

.error {
    padding: $space-2 $space-3;
    background: $error-bg;
    border: $border-width-thin $error-border;
    border-radius: $border-radius-lg;
    color: $error-text;
    font-size: $font-size-xs;
    line-height: $line-height-snug;
    text-align: center;
}

.recovery-info {
    margin-bottom: $space-2;
    color: $text2;
    font-size: $font-size-xs;
    line-height: $line-height-base;
    text-align: center;
    opacity: $opacity-mid-high;
}

.success-icon {
    display: flex;
    justify-content: center;
    margin-bottom: $space-4;
    color: $text1;
    opacity: $opacity-higher;
}

.success-message {
    margin-bottom: $space-6;
    color: $text2;
    font-size: $font-size-xs;
    line-height: $line-height-base;
}

/* –––––– Transitions –––––– */

.auth-fade-enter-active {
    transition:
        opacity $duration-slower $ease-out-expo,
        transform $duration-gentle $ease-out-expo;
}

.auth-fade-leave-active {
    transition:
        opacity $duration-base $ease-out-expo,
        transform $duration-relaxed $ease-out-expo;
}

.auth-fade-enter-from {
    opacity: $opacity-faint;
    transform: translateY($size-6) scale($scale-97);
}

.auth-fade-leave-to {
    opacity: $opacity-faint;
    transform: translateY(-$size-4) scale($scale-97);
}

.btn-content-enter-active,
.btn-content-leave-active {
    transition:
        opacity $transition-base,
        transform $transition-base;
}

.btn-content-enter-from {
    opacity: $opacity-faint;
    transform: scale($scale-90);
}

.btn-content-leave-to {
    opacity: $opacity-faint;
    transform: scale($scale-90);
}

.error-slide-enter-active {
    transition:
        opacity $transition-slow,
        transform $duration-slow $ease-out-expo,
        max-height $transition-slow;
}

.error-slide-leave-active {
    transition:
        opacity $transition-base,
        transform $transition-base,
        max-height $transition-base;
}

.error-slide-enter-from {
    opacity: $opacity-faint;
    transform: translateY(-$size-4);
    max-height: 0;
}

.error-slide-enter-to {
    max-height: $size-33;
}

.error-slide-leave-to {
    opacity: $opacity-faint;
    transform: translateY(-$size-3);
    max-height: 0;
}
</style>
