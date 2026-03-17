<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import {
    updateUsername as updateUsernameStorage,
    updatePassword as updatePasswordStorage,
    deleteAccount as deleteAccountStorage,
} from '../store';

const { t } = useI18n();

const emit = defineEmits(['usernameChanged', 'accountDeleted']);

// Change Username
const newUsername = ref('');
const isChangingUsername = ref(false);
const usernameSuccess = ref('');
const usernameError = ref('');

// Change Password
const currentPassword = ref('');
const newPassword = ref('');
const confirmNewPassword = ref('');
const isChangingPassword = ref(false);
const passwordSuccess = ref('');
const passwordError = ref('');

// Recovery Codes
const recoveryStatus = ref<any>(null);
const showGenerateForm = ref(false);
const showRecoveryCodes = ref(false);
const recoveryCodes = ref<string[]>([]);
const recoveryPassword = ref('');
const isGeneratingCodes = ref(false);
const recoveryError = ref('');
const codiesCopied = ref(false);

// Delete Account
const showDeleteConfirm = ref(false);
const deletePassword = ref('');
const isDeletingAccount = ref(false);
const deleteError = ref('');

onMounted(async () => {
    // Recovery codes not supported in local-only mode
    recoveryStatus.value = { hasRecoveryCodes: false };
});

async function generateRecoveryCodes() {
    recoveryError.value = t('account.recoveryCodesNotSupported');
    isGeneratingCodes.value = false;
    // Recovery codes not supported in local-only mode
}

function cancelGenerateCodes() {
    showGenerateForm.value = false;
    recoveryPassword.value = '';
    recoveryError.value = '';
}

function closeRecoveryCodes() {
    showRecoveryCodes.value = false;
    recoveryCodes.value = [];
    codiesCopied.value = false;
}

async function copyAllCodes() {
    const codesText = recoveryCodes.value.map((code, index) => `${index + 1}. ${code}`).join('\n');
    try {
        await navigator.clipboard.writeText(codesText);
        codiesCopied.value = true;
        setTimeout(() => {
            codiesCopied.value = false;
        }, 2000);
    } catch (error) {
        console.error('Failed to copy codes:', error);
    }
}

async function changeUsername() {
    usernameError.value = '';
    usernameSuccess.value = '';
    isChangingUsername.value = true;

    try {
        // Note: In local mode, password is not required for username change
        const result = await updateUsernameStorage(newUsername.value, '');
        usernameSuccess.value = t('account.usernameUpdated');
        newUsername.value = '';

        // Update username and notify parent
        if (result.username) {
            emit('usernameChanged', result.username);
        }

        // Clear success message after 3 seconds
        setTimeout(() => {
            usernameSuccess.value = '';
        }, 3000);
    } catch (error: any) {
        usernameError.value = error.message || t('account.usernameUpdateFailed');
    } finally {
        isChangingUsername.value = false;
    }
}

async function changePassword() {
    passwordError.value = '';
    passwordSuccess.value = '';

    // Validate passwords match
    if (newPassword.value !== confirmNewPassword.value) {
        passwordError.value = t('account.passwordsDoNotMatch');
        return;
    }

    // Validate password length
    if (newPassword.value.length < 6) {
        passwordError.value = t('account.passwordTooShort');
        return;
    }

    isChangingPassword.value = true;

    try {
        await updatePasswordStorage(currentPassword.value, newPassword.value);
        passwordSuccess.value = t('account.passwordUpdated');

        // Clear form
        currentPassword.value = '';
        newPassword.value = '';
        confirmNewPassword.value = '';

        // Clear success message after 3 seconds
        setTimeout(() => {
            passwordSuccess.value = '';
        }, 3000);
    } catch (error: any) {
        passwordError.value = error.message || t('account.passwordUpdateFailed');
    } finally {
        isChangingPassword.value = false;
    }
}

async function deleteAccount() {
    deleteError.value = '';
    isDeletingAccount.value = true;

    try {
        await deleteAccountStorage(deletePassword.value);

        // Notify parent that account was deleted
        emit('accountDeleted');
    } catch (error: any) {
        deleteError.value = error.message || t('account.deleteFailed');
        isDeletingAccount.value = false;
    }
}

function cancelDelete() {
    showDeleteConfirm.value = false;
    deletePassword.value = '';
    deleteError.value = '';
}
</script>

<template>
    <div class="account-settings">
        <!-- Change Username Section -->
        <div class="settings-section">
            <h3 class="section-title">{{ t('account.changeUsername') }}</h3>
            <form class="settings-form" @submit.prevent="changeUsername">
                <input
                    v-model="newUsername"
                    :placeholder="t('account.newUsernamePlaceholder')"
                    :disabled="isChangingUsername"
                    required
                    autocomplete="username"
                />
                <button type="submit" :disabled="isChangingUsername || !newUsername" class="zen-btn">
                    <span v-if="!isChangingUsername">{{ t('account.updateUsername') }}</span>
                    <span v-else class="zen-loader">
                        <svg width="20" height="20" viewBox="0 0 32 32">
                            <rect x="10" y="15" width="12" height="2" rx="1">
                                <animateTransform
                                    attributeName="transform"
                                    type="rotate"
                                    from="0 16 16"
                                    to="360 16 16"
                                    dur="2.5s"
                                    repeatCount="indefinite"
                                />
                            </rect>
                        </svg>
                    </span>
                </button>
                <div v-if="usernameSuccess" class="success-message">{{ usernameSuccess }}</div>
                <div v-if="usernameError" class="error-message">{{ usernameError }}</div>
            </form>
        </div>

        <!-- Change Password Section -->
        <div class="settings-section">
            <h3 class="section-title">{{ t('account.changePassword') }}</h3>
            <form class="settings-form" @submit.prevent="changePassword">
                <input
                    v-model="currentPassword"
                    type="password"
                    :placeholder="t('account.currentPasswordPlaceholder')"
                    :disabled="isChangingPassword"
                    required
                    autocomplete="current-password"
                />
                <input
                    v-model="newPassword"
                    type="password"
                    :placeholder="t('account.newPasswordPlaceholder')"
                    :disabled="isChangingPassword"
                    required
                    autocomplete="new-password"
                />
                <input
                    v-model="confirmNewPassword"
                    type="password"
                    :placeholder="t('account.confirmPasswordPlaceholder')"
                    :disabled="isChangingPassword"
                    required
                    autocomplete="new-password"
                />
                <button
                    type="submit"
                    :disabled="isChangingPassword || !currentPassword || !newPassword || !confirmNewPassword"
                    class="zen-btn"
                >
                    <span v-if="!isChangingPassword">{{ t('account.updatePassword') }}</span>
                    <span v-else class="zen-loader">
                        <svg width="20" height="20" viewBox="0 0 32 32">
                            <rect x="10" y="15" width="12" height="2" rx="1">
                                <animateTransform
                                    attributeName="transform"
                                    type="rotate"
                                    from="0 16 16"
                                    to="360 16 16"
                                    dur="2.5s"
                                    repeatCount="indefinite"
                                />
                            </rect>
                        </svg>
                    </span>
                </button>
                <div v-if="passwordSuccess" class="success-message">{{ passwordSuccess }}</div>
                <div v-if="passwordError" class="error-message">{{ passwordError }}</div>
            </form>
        </div>

        <!-- Recovery Codes Section -->
        <div class="settings-section">
            <h3 class="section-title">{{ t('account.recoveryCodes') }}</h3>
            <p class="info-text">{{ t('account.recoveryCodesDescription') }}</p>

            <!-- Status display -->
            <div v-if="recoveryStatus && recoveryStatus.hasRecoveryCodes" class="recovery-status">
                <div class="status-item">
                    <span class="status-label">{{ t('account.totalCodes') }}:</span>
                    <span class="status-value">{{ recoveryStatus.totalCodes }}</span>
                </div>
                <div class="status-item">
                    <span class="status-label">{{ t('account.usedCodes') }}:</span>
                    <span class="status-value">{{ recoveryStatus.usedCodes }}</span>
                </div>
                <div class="status-item">
                    <span class="status-label">{{ t('account.remainingCodes') }}:</span>
                    <span class="status-value">{{ recoveryStatus.remainingCodes }}</span>
                </div>
            </div>

            <!-- Generate codes form -->
            <div v-if="!showRecoveryCodes && !showGenerateForm" class="button-container">
                <button class="zen-btn" @click="showGenerateForm = true">
                    {{ recoveryStatus?.hasRecoveryCodes ? t('account.regenerateCodes') : t('account.generateCodes') }}
                </button>
            </div>

            <form
                v-if="showGenerateForm && !showRecoveryCodes"
                class="settings-form"
                @submit.prevent="generateRecoveryCodes"
            >
                <p class="warning-text">{{ t('account.generateCodesWarning') }}</p>
                <input
                    v-model="recoveryPassword"
                    type="password"
                    :placeholder="t('account.confirmPasswordToGenerate')"
                    :disabled="isGeneratingCodes"
                    required
                    autocomplete="current-password"
                />
                <div class="button-row">
                    <button
                        type="button"
                        :disabled="isGeneratingCodes"
                        class="zen-btn cancel-btn"
                        @click="cancelGenerateCodes"
                    >
                        {{ t('account.cancel') }}
                    </button>
                    <button type="submit" :disabled="isGeneratingCodes || !recoveryPassword" class="zen-btn">
                        <span v-if="!isGeneratingCodes">{{ t('account.confirm') }}</span>
                        <span v-else class="zen-loader">
                            <svg width="20" height="20" viewBox="0 0 32 32">
                                <rect x="10" y="15" width="12" height="2" rx="1">
                                    <animateTransform
                                        attributeName="transform"
                                        type="rotate"
                                        from="0 16 16"
                                        to="360 16 16"
                                        dur="2.5s"
                                        repeatCount="indefinite"
                                    />
                                </rect>
                            </svg>
                        </span>
                    </button>
                </div>
                <div v-if="recoveryError" class="error-message">{{ recoveryError }}</div>
            </form>

            <!-- Display generated codes -->
            <div v-if="showRecoveryCodes && recoveryCodes.length > 0" class="recovery-codes-display">
                <div class="warning-banner">
                    <strong>{{ t('account.saveCodesWarning') }}</strong>
                    <p>{{ t('account.saveCodesDescription') }}</p>
                </div>
                <div class="codes-grid">
                    <div v-for="(code, index) in recoveryCodes" :key="index" class="code-item">
                        <span class="code-number">{{ index + 1 }}.</span>
                        <code class="code-value">{{ code }}</code>
                    </div>
                </div>
                <div class="button-row">
                    <button class="zen-btn" @click="copyAllCodes">
                        {{ codiesCopied ? t('account.copied') : t('account.copyAll') }}
                    </button>
                    <button class="zen-btn" @click="closeRecoveryCodes">
                        {{ t('account.iHaveSavedCodes') }}
                    </button>
                </div>
            </div>
        </div>

        <!-- Delete Account Section -->
        <div class="settings-section danger-section">
            <h3 class="section-title danger-title">{{ t('account.deleteAccount') }}</h3>
            <p class="warning-text">{{ t('account.deleteWarning') }}</p>

            <button v-if="!showDeleteConfirm" class="zen-btn danger-btn" @click="showDeleteConfirm = true">
                {{ t('account.deleteAccountButton') }}
            </button>

            <form v-else class="settings-form delete-form" @submit.prevent="deleteAccount">
                <input
                    v-model="deletePassword"
                    type="password"
                    :placeholder="t('account.confirmPasswordToDelete')"
                    :disabled="isDeletingAccount"
                    required
                    autocomplete="current-password"
                />
                <div class="button-row">
                    <button
                        type="button"
                        :disabled="isDeletingAccount"
                        class="zen-btn cancel-btn"
                        @click="cancelDelete"
                    >
                        {{ t('account.cancel') }}
                    </button>
                    <button type="submit" :disabled="isDeletingAccount || !deletePassword" class="zen-btn danger-btn">
                        <span v-if="!isDeletingAccount">{{ t('account.confirmDelete') }}</span>
                        <span v-else class="zen-loader">
                            <svg width="20" height="20" viewBox="0 0 32 32">
                                <rect x="10" y="15" width="12" height="2" rx="1">
                                    <animateTransform
                                        attributeName="transform"
                                        type="rotate"
                                        from="0 16 16"
                                        to="360 16 16"
                                        dur="2.5s"
                                        repeatCount="indefinite"
                                    />
                                </rect>
                            </svg>
                        </span>
                    </button>
                </div>
                <div v-if="deleteError" class="error-message">{{ deleteError }}</div>
            </form>
        </div>
    </div>
</template>

<style scoped>
.account-settings {
    padding: 0;
    max-width: 100%;
}

.settings-title {
    font-size: 1.25rem;
    color: var(--text1);
    margin-bottom: 1.5rem;
    font-weight: 500;
    text-align: center;
}

.settings-section {
    background: var(--input-bg);
    border: 1px solid var(--input-border);
    border-radius: 6px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
}

.section-title {
    font-size: 1rem;
    color: var(--text1);
    margin-bottom: 1rem;
    font-weight: 500;
}

.settings-form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

input {
    padding: 0.625rem 0.75rem;
    border-radius: 4px;
    border: 1px solid var(--input-border);
    background: var(--input-bg);
    color: var(--text1);
    font-size: 0.875rem;
    outline: none;
    transition:
        border 0.15s,
        background 0.15s;
}

input:focus {
    border: 1px solid var(--input-border-focus);
    background: var(--input-bg-focus);
}

input::placeholder {
    color: var(--text2);
    opacity: 0.6;
}

.zen-btn {
    background: var(--button-bg);
    color: var(--text1);
    border: 1px solid var(--border-subtle);
    border-radius: 4px;
    padding: 0.625rem 1rem;
    cursor: pointer;
    font-weight: 400;
    font-size: 0.875rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    transition: all 0.15s;
    outline: none;
    min-height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.zen-btn:hover:not(:disabled) {
    background: var(--button-bg-hover);
    border-color: var(--button-border-hover);
}

.zen-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.zen-loader {
    display: flex;
    align-items: center;
    justify-content: center;
}

.zen-loader svg rect {
    fill: var(--text1);
}

.success-message {
    color: #10b981;
    background: rgba(16, 185, 129, 0.1);
    border: 1px solid rgba(16, 185, 129, 0.3);
    padding: 0.625rem;
    border-radius: 4px;
    font-size: 0.875rem;
    text-align: center;
}

.error-message {
    color: var(--error-text);
    background: var(--error-bg);
    border: 1px solid var(--error-border);
    padding: 0.625rem;
    border-radius: 4px;
    font-size: 0.875rem;
    text-align: center;
}

/* Danger Section Styles */
.danger-section {
    border-color: rgba(239, 68, 68, 0.3);
    background: rgba(239, 68, 68, 0.05);
}

.danger-title {
    color: #ef4444;
}

.warning-text {
    color: var(--text2);
    font-size: 0.875rem;
    margin-bottom: 1rem;
    line-height: 1.5;
}

.info-text {
    color: var(--text2);
    font-size: 0.875rem;
    margin-bottom: 1rem;
    line-height: 1.5;
}

.recovery-status {
    background: var(--base1);
    border: 1px solid var(--border-subtle);
    border-radius: 4px;
    padding: 1rem;
    margin-bottom: 1rem;
}

.status-item {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--border-subtle);
}

.status-item:last-child {
    border-bottom: none;
}

.status-label {
    color: var(--text2);
    font-size: 0.875rem;
}

.status-value {
    color: var(--text1);
    font-weight: 500;
    font-size: 0.875rem;
}

.button-container {
    display: flex;
    justify-content: center;
}

.recovery-codes-display {
    margin-top: 1rem;
}

.warning-banner {
    background: rgba(251, 191, 36, 0.1);
    border: 1px solid rgba(251, 191, 36, 0.3);
    border-radius: 4px;
    padding: 1rem;
    margin-bottom: 1rem;
}

.warning-banner strong {
    color: #f59e0b;
    display: block;
    margin-bottom: 0.5rem;
}

.warning-banner p {
    color: var(--text2);
    font-size: 0.875rem;
    margin: 0;
    line-height: 1.5;
}

.codes-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
    margin-bottom: 1rem;
}

.code-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: var(--base1);
    border: 1px solid var(--border-subtle);
    border-radius: 4px;
    padding: 0.75rem;
}

.code-number {
    color: var(--text2);
    font-size: 0.75rem;
    min-width: 1.5rem;
}

.code-value {
    font-family: 'Courier New', monospace;
    font-size: 0.875rem;
    color: var(--text1);
    font-weight: 600;
    letter-spacing: 0.05em;
}

.danger-btn {
    background: #ef4444;
    border-color: #dc2626;
    color: white;
}

.danger-btn:hover:not(:disabled) {
    background: #dc2626;
    border-color: #b91c1c;
}

.delete-form {
    margin-top: 1rem;
}

.button-row {
    display: flex;
    gap: 0.75rem;
}

.cancel-btn {
    flex: 1;
}

.danger-btn {
    flex: 1;
}

@media (max-width: 640px) {
    .account-settings {
        padding: 1rem;
    }

    .settings-section {
        padding: 1rem;
    }

    .button-row {
        flex-direction: column;
    }

    .codes-grid {
        grid-template-columns: 1fr;
    }
}
</style>
