<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { register as storageRegister, login as storageLogin, getCurrentUser } from '../store';

const { t } = useI18n();

const emit = defineEmits(['auth']);

const mode = ref<'login' | 'register' | 'recovery'>('login');
const username = ref('');
const password = ref('');
const loginUsername = ref('');
const loginPassword = ref('');
const user = ref<{ username: string } | null>(null);
const error = ref('');
const isLoading = ref(false);
const isReady = ref(false);

// Recovery state
const recoveryUsername = ref('');
const recoveryCode = ref('');
const newRecoveryPassword = ref('');
const confirmRecoveryPassword = ref('');
const recoverySuccess = ref(false);

onMounted(() => {
    // Trigger entrance animation after mount
    requestAnimationFrame(() => {
        isReady.value = true;
    });
});

function switchMode(newMode: 'login' | 'register' | 'recovery') {
    error.value = '';
    mode.value = newMode;
}

function setSession(token: string, userObj: { username: string; theme?: string }) {
    user.value = userObj;
    emit('auth', { user: userObj, token });
}

async function register() {
    error.value = '';
    isLoading.value = true;
    try {
        const res = await storageRegister(username.value, password.value);
        setSession(res.token, res.user);
    } catch (e: any) {
        error.value = e.message;
    } finally {
        isLoading.value = false;
    }
}

async function login() {
    error.value = '';
    isLoading.value = true;
    try {
        const res = await storageLogin(loginUsername.value, loginPassword.value);
        setSession(res.token, res.user);
    } catch (e: any) {
        error.value = e.message;
    } finally {
        isLoading.value = false;
    }
}

async function resetPassword() {
    error.value = '';
    if (newRecoveryPassword.value !== confirmRecoveryPassword.value) {
        error.value = t('auth.passwordsDoNotMatch');
        return;
    }
    error.value = t('auth.recoveryNotSupported');
}

function goToLogin() {
    mode.value = 'login';
    recoverySuccess.value = false;
    recoveryUsername.value = '';
    recoveryCode.value = '';
    newRecoveryPassword.value = '';
    confirmRecoveryPassword.value = '';
    error.value = '';
}

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
    <div class="monk-auth" :class="{ 'is-ready': isReady }">
        <!-- Animated gradient mesh background -->
        <div class="auth-bg-mesh"></div>
        <div class="auth-bg-grain"></div>

        <transition name="auth-fade" mode="out-in">
            <!-- LOGIN -->
            <form
                v-if="mode === 'login'"
                key="login"
                class="zen-form"
                role="form"
                aria-labelledby="login-title"
                @submit.prevent="login"
            >
                <div id="login-title" class="zen-heading">{{ t('auth.login') }}</div>

                <div class="field-group" style="--i: 0">
                    <input
                        v-model="loginUsername"
                        :disabled="isLoading"
                        :placeholder="t('auth.username')"
                        required
                        autocomplete="username"
                        aria-label="Enter your username"
                    />
                </div>
                <div class="field-group" style="--i: 1">
                    <input
                        v-model="loginPassword"
                        :disabled="isLoading"
                        type="password"
                        :placeholder="t('auth.password')"
                        required
                        autocomplete="current-password"
                        aria-label="Enter your password"
                    />
                </div>

                <button
                    type="submit"
                    :disabled="isLoading"
                    class="auth-btn"
                    style="--i: 2"
                    aria-label="Login to your account"
                >
                    <transition name="btn-content" mode="out-in">
                        <span v-if="!isLoading" key="text">{{ t('auth.login') }}</span>
                        <span v-else key="loader" class="zen-loader">
                            <svg width="20" height="20" viewBox="0 0 20 20">
                                <circle
                                    cx="10"
                                    cy="10"
                                    r="8"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-dasharray="40 60"
                                    opacity="0.4"
                                >
                                    <animateTransform
                                        attributeName="transform"
                                        type="rotate"
                                        from="0 10 10"
                                        to="360 10 10"
                                        dur="1s"
                                        repeatCount="indefinite"
                                    />
                                </circle>
                            </svg>
                        </span>
                    </transition>
                </button>

                <div class="zen-link-row" style="--i: 3">
                    <a href="#" aria-label="Switch to registration form" @click.prevent="switchMode('register')">{{
                        t('auth.switchToRegister')
                    }}</a>
                </div>
                <div class="zen-link-row" style="--i: 4">
                    <a
                        href="#"
                        aria-label="Reset password using recovery code"
                        @click.prevent="switchMode('recovery')"
                        >{{ t('auth.forgotPassword') }}</a
                    >
                </div>

                <transition name="error-slide">
                    <div v-if="error" class="error" role="alert" aria-live="polite">{{ error }}</div>
                </transition>
            </form>

            <!-- REGISTER -->
            <form
                v-else-if="mode === 'register'"
                key="register"
                class="zen-form"
                role="form"
                aria-labelledby="register-title"
                @submit.prevent="register"
            >
                <div id="register-title" class="zen-heading">{{ t('auth.register') }}</div>

                <div class="field-group" style="--i: 0">
                    <input
                        v-model="username"
                        :disabled="isLoading"
                        :placeholder="t('auth.username')"
                        required
                        autocomplete="username"
                        aria-label="Choose a username for your account"
                    />
                </div>
                <div class="field-group" style="--i: 1">
                    <input
                        v-model="password"
                        :disabled="isLoading"
                        type="password"
                        :placeholder="t('auth.password')"
                        required
                        autocomplete="new-password"
                        aria-label="Choose a password for your account"
                    />
                </div>

                <button
                    type="submit"
                    :disabled="isLoading"
                    class="auth-btn"
                    style="--i: 2"
                    aria-label="Create your new account"
                >
                    <transition name="btn-content" mode="out-in">
                        <span v-if="!isLoading" key="text">{{ t('auth.register') }}</span>
                        <span v-else key="loader" class="zen-loader">
                            <svg width="20" height="20" viewBox="0 0 20 20">
                                <circle
                                    cx="10"
                                    cy="10"
                                    r="8"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-dasharray="40 60"
                                    opacity="0.4"
                                >
                                    <animateTransform
                                        attributeName="transform"
                                        type="rotate"
                                        from="0 10 10"
                                        to="360 10 10"
                                        dur="1s"
                                        repeatCount="indefinite"
                                    />
                                </circle>
                            </svg>
                        </span>
                    </transition>
                </button>

                <div class="zen-link-row" style="--i: 3">
                    <a href="#" aria-label="Switch to login form" @click.prevent="switchMode('login')">{{
                        t('auth.switchToLogin')
                    }}</a>
                </div>

                <transition name="error-slide">
                    <div v-if="error" class="error" role="alert" aria-live="polite">{{ error }}</div>
                </transition>
            </form>

            <!-- RECOVERY -->
            <form
                v-else-if="mode === 'recovery' && !recoverySuccess"
                key="recovery"
                class="zen-form"
                role="form"
                aria-labelledby="recovery-title"
                @submit.prevent="resetPassword"
            >
                <div id="recovery-title" class="zen-heading">{{ t('auth.recoverPassword') }}</div>
                <div class="recovery-info">{{ t('auth.recoveryInfo') }}</div>

                <div class="field-group" style="--i: 0">
                    <input
                        v-model="recoveryUsername"
                        :disabled="isLoading"
                        :placeholder="t('auth.username')"
                        required
                        autocomplete="username"
                    />
                </div>
                <div class="field-group" style="--i: 1">
                    <input
                        v-model="recoveryCode"
                        :disabled="isLoading"
                        :placeholder="t('auth.recoveryCode')"
                        required
                    />
                </div>
                <div class="field-group" style="--i: 2">
                    <input
                        v-model="newRecoveryPassword"
                        :disabled="isLoading"
                        type="password"
                        :placeholder="t('auth.newPassword')"
                        required
                        autocomplete="new-password"
                    />
                </div>
                <div class="field-group" style="--i: 3">
                    <input
                        v-model="confirmRecoveryPassword"
                        :disabled="isLoading"
                        type="password"
                        :placeholder="t('auth.confirmNewPassword')"
                        required
                        autocomplete="new-password"
                    />
                </div>

                <button type="submit" :disabled="isLoading" class="auth-btn" style="--i: 4">
                    <transition name="btn-content" mode="out-in">
                        <span v-if="!isLoading" key="text">{{ t('auth.resetPassword') }}</span>
                        <span v-else key="loader" class="zen-loader">
                            <svg width="20" height="20" viewBox="0 0 20 20">
                                <circle
                                    cx="10"
                                    cy="10"
                                    r="8"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-dasharray="40 60"
                                    opacity="0.4"
                                >
                                    <animateTransform
                                        attributeName="transform"
                                        type="rotate"
                                        from="0 10 10"
                                        to="360 10 10"
                                        dur="1s"
                                        repeatCount="indefinite"
                                    />
                                </circle>
                            </svg>
                        </span>
                    </transition>
                </button>

                <div class="zen-link-row" style="--i: 5">
                    <a href="#" @click.prevent="switchMode('login')">{{ t('auth.backToLogin') }}</a>
                </div>

                <transition name="error-slide">
                    <div v-if="error" class="error" role="alert">{{ error }}</div>
                </transition>
            </form>

            <!-- RECOVERY SUCCESS -->
            <div v-else-if="recoverySuccess" key="recovery-success" class="zen-form recovery-success">
                <div class="success-icon">
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                        <circle cx="24" cy="24" r="22" stroke="currentColor" stroke-width="1.5" opacity="0.3" />
                        <path
                            d="M15 24l6 6 12-12"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        />
                    </svg>
                </div>
                <div class="zen-heading">{{ t('auth.passwordResetSuccess') }}</div>
                <div class="success-message">{{ t('auth.passwordResetMessage') }}</div>
                <button class="auth-btn" @click="goToLogin">{{ t('auth.goToLogin') }}</button>
            </div>
        </transition>
    </div>
</template>

<style scoped>
/* ─── Layout ─── */
.monk-auth {
    min-height: 100vh;
    min-width: 100vw;
    width: 100vw;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--base1);
    position: relative;
    overflow: hidden;
}

/* Animated gradient mesh */
.auth-bg-mesh {
    position: absolute;
    inset: -50%;
    width: 200%;
    height: 200%;
    background:
        radial-gradient(ellipse 40% 50% at 20% 30%, var(--auth-accent1) 0%, transparent 60%),
        radial-gradient(ellipse 50% 40% at 80% 20%, var(--auth-accent2) 0%, transparent 60%),
        radial-gradient(ellipse 45% 55% at 60% 80%, var(--auth-accent3) 0%, transparent 55%),
        radial-gradient(ellipse 35% 45% at 30% 75%, var(--auth-accent2) 0%, transparent 55%);
    opacity: 0;
    pointer-events: none;
    z-index: 0;
    animation: meshDrift 25s ease-in-out infinite alternate;
    transition: opacity 2s cubic-bezier(0.22, 1, 0.36, 1);
}

.monk-auth.is-ready .auth-bg-mesh {
    opacity: 1;
}

@keyframes meshDrift {
    0% {
        transform: translate(0, 0) rotate(0deg) scale(1);
    }
    33% {
        transform: translate(3%, -2%) rotate(3deg) scale(1.02);
    }
    66% {
        transform: translate(-2%, 3%) rotate(-2deg) scale(0.98);
    }
    100% {
        transform: translate(1%, -1%) rotate(1deg) scale(1.01);
    }
}

/* Subtle noise grain overlay */
.auth-bg-grain {
    position: absolute;
    inset: 0;
    opacity: 0.3;
    pointer-events: none;
    z-index: 0;
    mix-blend-mode: overlay;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E");
}

/* ─── Form Card ─── */
.zen-form {
    position: relative;
    z-index: 1;
    background: var(--input-bg);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border: 1px solid var(--input-border);
    border-radius: 16px;
    padding: 2.5rem 2rem 2rem;
    display: flex;
    flex-direction: column;
    gap: 0.875rem;
    min-width: 300px;
    max-width: 380px;
    width: 90%;
    margin: 1.5rem;
    align-items: stretch;
    box-shadow:
        0 8px 40px rgba(0, 0, 0, 0.08),
        0 1px 3px rgba(0, 0, 0, 0.04);
    /* Entrance animation */
    opacity: 0;
    transform: translateY(12px) scale(0.98);
    transition:
        opacity 0.7s cubic-bezier(0.22, 1, 0.36, 1),
        transform 0.7s cubic-bezier(0.22, 1, 0.36, 1);
}

.monk-auth.is-ready .zen-form {
    opacity: 1;
    transform: translateY(0) scale(1);
}

/* ─── Typography ─── */
.zen-heading {
    font-size: 0.8rem;
    color: var(--text2);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    text-align: center;
    margin-bottom: 0.5rem;
    line-height: 1.3;
}

/* ─── Field Groups (staggered animation) ─── */
.field-group {
    animation: fieldIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
    animation-delay: calc(var(--i, 0) * 0.07s + 0.15s);
}

@keyframes fieldIn {
    from {
        opacity: 0;
        transform: translateY(8px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* ─── Inputs ─── */
input {
    padding: 0.8rem 1rem;
    border-radius: 10px;
    border: 1px solid var(--input-border);
    background: var(--input-bg);
    color: var(--text1);
    font-size: 0.9rem;
    width: 100%;
    box-sizing: border-box;
    outline: none;
    transition:
        border-color 0.3s cubic-bezier(0.22, 1, 0.36, 1),
        background 0.3s cubic-bezier(0.22, 1, 0.36, 1),
        box-shadow 0.3s cubic-bezier(0.22, 1, 0.36, 1);
    min-height: 44px;
}

input:focus {
    border-color: var(--input-border-focus);
    background: var(--input-bg-focus);
    box-shadow: 0 0 0 3px rgba(128, 128, 128, 0.06);
}

input::placeholder {
    color: var(--text2);
    opacity: 0.45;
    transition: opacity 0.3s;
}

input:focus::placeholder {
    opacity: 0.3;
}

/* ─── Button ─── */
button {
    background: var(--button-bg);
    color: var(--text1);
    border: 1px solid var(--border-subtle);
    border-radius: 10px;
    padding: 0.8rem 1rem;
    cursor: pointer;
    font-weight: 500;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-top: 0.25rem;
    transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
    outline: none;
    min-height: 46px;
    position: relative;
    overflow: hidden;
    animation: fieldIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
    animation-delay: calc(var(--i, 0) * 0.07s + 0.15s);
}

button:hover:not(:disabled) {
    background: var(--button-bg-hover);
    border-color: var(--button-border-hover);
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
}

button:active:not(:disabled) {
    transform: translateY(0);
    box-shadow: none;
}

button:focus-visible {
    box-shadow: 0 0 0 3px rgba(128, 128, 128, 0.12);
}

button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.auth-btn {
    width: 100%;
    min-height: 46px;
    display: flex;
    align-items: center;
    justify-content: center;
}

/* ─── Loader ─── */
.zen-loader {
    display: flex;
    align-items: center;
    justify-content: center;
}

.zen-loader svg {
    display: block;
}

/* ─── Links ─── */
.zen-link-row {
    display: flex;
    gap: 0.35rem;
    font-size: 0.75rem;
    color: var(--text2);
    justify-content: center;
    align-items: center;
    margin-top: 0.25rem;
    animation: fieldIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
    animation-delay: calc(var(--i, 0) * 0.07s + 0.15s);
}

.zen-link-row a {
    color: var(--text2);
    text-decoration: none;
    cursor: pointer;
    font-weight: 400;
    transition:
        color 0.3s,
        opacity 0.3s;
    padding-bottom: 1px;
    border-bottom: 1px solid transparent;
}

.zen-link-row a:hover {
    color: var(--text1);
    border-bottom-color: var(--border-subtle);
}

/* ─── Error ─── */
.error {
    color: var(--error-text);
    font-size: 0.75rem;
    text-align: center;
    background: var(--error-bg);
    border-radius: 8px;
    padding: 0.6rem 0.8rem;
    border: 1px solid var(--error-border);
    line-height: 1.4;
}

/* ─── Recovery ─── */
.recovery-info {
    font-size: 0.75rem;
    color: var(--text2);
    text-align: center;
    margin-bottom: 0.5rem;
    opacity: 0.7;
    line-height: 1.5;
}

.recovery-success {
    text-align: center;
    padding: 2.5rem 2rem;
}

.success-icon {
    color: var(--text1);
    margin-bottom: 1rem;
    opacity: 0.8;
    display: flex;
    justify-content: center;
}

.success-message {
    font-size: 0.8rem;
    color: var(--text2);
    margin-bottom: 1.5rem;
    line-height: 1.5;
}

/* ─── Transition: form swap ─── */
.auth-fade-enter-active {
    transition:
        opacity 0.35s cubic-bezier(0.22, 1, 0.36, 1),
        transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

.auth-fade-leave-active {
    transition:
        opacity 0.2s cubic-bezier(0.22, 1, 0.36, 1),
        transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}

.auth-fade-enter-from {
    opacity: 0;
    transform: translateY(10px) scale(0.97);
}

.auth-fade-leave-to {
    opacity: 0;
    transform: translateY(-6px) scale(0.97);
}

/* ─── Transition: button content swap ─── */
.btn-content-enter-active,
.btn-content-leave-active {
    transition:
        opacity 0.2s ease,
        transform 0.2s ease;
}

.btn-content-enter-from {
    opacity: 0;
    transform: scale(0.9);
}

.btn-content-leave-to {
    opacity: 0;
    transform: scale(0.9);
}

/* ─── Transition: error slide ─── */
.error-slide-enter-active {
    transition:
        opacity 0.3s ease,
        transform 0.3s cubic-bezier(0.22, 1, 0.36, 1),
        max-height 0.3s ease;
}

.error-slide-leave-active {
    transition:
        opacity 0.2s ease,
        transform 0.2s ease,
        max-height 0.2s ease;
}

.error-slide-enter-from {
    opacity: 0;
    transform: translateY(-6px);
    max-height: 0;
}

.error-slide-enter-to {
    max-height: 100px;
}

.error-slide-leave-to {
    opacity: 0;
    transform: translateY(-4px);
    max-height: 0;
}

/* ─── Responsive ─── */
@media (max-width: 768px) {
    .zen-form {
        padding: 2rem 1.5rem 1.5rem;
        gap: 0.875rem;
        max-width: 95%;
        margin: 1rem;
        border-radius: 14px;
    }

    input {
        font-size: 1rem;
        padding: 0.9rem 1rem;
        min-height: 48px;
    }

    button {
        font-size: 0.85rem;
        padding: 0.9rem 1rem;
        min-height: 48px;
    }

    .auth-btn {
        min-height: 48px;
    }

    .zen-title {
        font-size: 1.15rem;
    }
}

@media (max-width: 420px) {
    .zen-form {
        padding: 1.5rem 1.25rem 1.25rem;
        min-width: 280px;
        max-width: 100%;
        margin: 0.75rem;
        gap: 0.75rem;
        border-radius: 12px;
    }

    input {
        font-size: 1rem;
        border-radius: 8px;
    }

    button {
        border-radius: 8px;
    }

    .zen-link-row {
        font-size: 0.8rem;
    }
}

/* ─── Reduced motion ─── */
@media (prefers-reduced-motion: reduce) {
    .zen-form,
    .field-group,
    .zen-link-row,
    button {
        animation: none !important;
    }

    .auth-fade-enter-active,
    .auth-fade-leave-active,
    .btn-content-enter-active,
    .btn-content-leave-active,
    .error-slide-enter-active,
    .error-slide-leave-active {
        transition-duration: 0.01s !important;
    }

    .auth-bg-mesh {
        animation: none !important;
        transition-duration: 0.01s !important;
    }

    .monk-auth .zen-form {
        opacity: 1;
        transform: none;
    }
}
</style>
