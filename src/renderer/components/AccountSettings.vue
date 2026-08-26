<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import {
    updateUsername as updateUsernameStorage,
    updatePassword as updatePasswordStorage,
    deleteAccount as deleteAccountStorage,
    getRecoveryStatus as getRecoveryStatusStorage,
    generateRecoveryCodes as generateRecoveryCodesStorage,
} from '@/renderer/store';
import type { RecoveryStatus } from '@/renderer/store';
import { log } from '@/renderer/utils/logger';
import ZenSpinner from '@/renderer/components/common/ZenSpinner.vue';

const emit = defineEmits<{
    usernameChanged: [username: string];
    accountDeleted: [];
}>();

const { t } = useI18n();

const newUsername = ref('');
const isChangingUsername = ref(false);
const usernameSuccess = ref('');
const usernameError = ref('');

const currentPassword = ref('');
const newPassword = ref('');
const confirmNewPassword = ref('');
const isChangingPassword = ref(false);
const passwordSuccess = ref('');
const passwordError = ref('');

const recoveryStatus = ref<RecoveryStatus | null>(null);
const showGenerateForm = ref(false);
const showRecoveryCodes = ref(false);
const recoveryCodes = ref<string[]>([]);
const recoveryPassword = ref('');
const isGeneratingCodes = ref(false);
const recoveryError = ref('');
const codesCopied = ref(false);

const showDeleteConfirm = ref(false);
const deletePassword = ref('');
const isDeletingAccount = ref(false);
const deleteError = ref('');

async function generateRecoveryCodes(): Promise<void> {
    recoveryError.value = '';
    isGeneratingCodes.value = true;
    try {
        const result = await generateRecoveryCodesStorage(recoveryPassword.value);
        recoveryCodes.value = result.codes;
        showRecoveryCodes.value = true;
        showGenerateForm.value = false;
        recoveryPassword.value = '';
        recoveryStatus.value = await getRecoveryStatusStorage();
    } catch (e: unknown) {
        recoveryError.value = e instanceof Error ? e.message : String(e);
    } finally {
        isGeneratingCodes.value = false;
    }
}

function cancelGenerateCodes(): void {
    showGenerateForm.value = false;
    recoveryPassword.value = '';
    recoveryError.value = '';
}

function closeRecoveryCodes(): void {
    showRecoveryCodes.value = false;
    recoveryCodes.value = [];
    codesCopied.value = false;
}

async function copyAllCodes(): Promise<void> {
    const codesText = recoveryCodes.value.map((code, index) => `${index + 1}. ${code}`).join('\n');
    try {
        await navigator.clipboard.writeText(codesText);
        codesCopied.value = true;
        setTimeout(() => {
            codesCopied.value = false;
        }, 2000);
    } catch (error) {
        log.error('Failed to copy recovery codes', error);
    }
}

async function changeUsername(): Promise<void> {
    usernameError.value = '';
    usernameSuccess.value = '';
    isChangingUsername.value = true;

    try {
        // Note: In local mode, password is not required for username change
        const result = await updateUsernameStorage(newUsername.value, '');
        usernameSuccess.value = t('account.usernameUpdated');
        newUsername.value = '';

        // Update username and notify parent
        if (result.username.length > 0) {
            emit('usernameChanged', result.username);
        }

        // Clear success message after 3 seconds
        setTimeout(() => {
            usernameSuccess.value = '';
        }, 3000);
    } catch (error: unknown) {
        usernameError.value = error instanceof Error ? error.message : t('account.usernameUpdateFailed');
    } finally {
        isChangingUsername.value = false;
    }
}

async function changePassword(): Promise<void> {
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
    } catch (error: unknown) {
        passwordError.value = error instanceof Error ? error.message : t('account.passwordUpdateFailed');
    } finally {
        isChangingPassword.value = false;
    }
}

async function deleteAccount(): Promise<void> {
    deleteError.value = '';
    isDeletingAccount.value = true;

    try {
        await deleteAccountStorage(deletePassword.value);

        // Notify parent that account was deleted
        emit('accountDeleted');
    } catch (error: unknown) {
        deleteError.value = error instanceof Error ? error.message : t('account.deleteFailed');
        isDeletingAccount.value = false;
    }
}

function cancelDelete(): void {
    showDeleteConfirm.value = false;
    deletePassword.value = '';
    deleteError.value = '';
}

onMounted(async () => {
    try {
        recoveryStatus.value = await getRecoveryStatusStorage();
    } catch {
        recoveryStatus.value = { hasRecoveryCodes: false, totalCodes: 0, usedCodes: 0, remainingCodes: 0 };
    }
});
</script>

<template>
    <div class="account-settings">
        <!-- Change Username Section -->
        <div class="settings-section">
            <h3 class="section-title">{{ t('account.changeUsername') }}</h3>
            <form
                class="settings-form"
                @submit.prevent="changeUsername">
                <input
                    v-model="newUsername"
                    class="zen-input"
                    :placeholder="t('account.newUsernamePlaceholder')"
                    :disabled="isChangingUsername"
                    required
                    autocomplete="username" />
                <button
                    type="submit"
                    :disabled="isChangingUsername || !newUsername"
                    class="zen-btn">
                    <span v-if="!isChangingUsername">{{ t('account.updateUsername') }}</span>
                    <ZenSpinner
                        v-else
                        variant="bar" />
                </button>
                <div
                    v-if="usernameSuccess"
                    class="zen-success success-message"
                    >{{ usernameSuccess }}</div
                >
                <div
                    v-if="usernameError"
                    class="zen-error error-message"
                    >{{ usernameError }}</div
                >
            </form>
        </div>

        <!-- Change Password Section -->
        <div class="settings-section">
            <h3 class="section-title">{{ t('account.changePassword') }}</h3>
            <form
                class="settings-form"
                @submit.prevent="changePassword">
                <input
                    v-model="currentPassword"
                    class="zen-input"
                    type="password"
                    :placeholder="t('account.currentPasswordPlaceholder')"
                    :aria-label="t('account.currentPasswordPlaceholder')"
                    :disabled="isChangingPassword"
                    required
                    autocomplete="current-password" />
                <input
                    v-model="newPassword"
                    class="zen-input"
                    type="password"
                    :placeholder="t('account.newPasswordPlaceholder')"
                    :aria-label="t('account.newPasswordPlaceholder')"
                    :disabled="isChangingPassword"
                    required
                    autocomplete="new-password" />
                <input
                    v-model="confirmNewPassword"
                    class="zen-input"
                    type="password"
                    :placeholder="t('account.confirmPasswordPlaceholder')"
                    :aria-label="t('account.confirmPasswordPlaceholder')"
                    :disabled="isChangingPassword"
                    required
                    autocomplete="new-password" />
                <button
                    type="submit"
                    :disabled="isChangingPassword || !currentPassword || !newPassword || !confirmNewPassword"
                    class="zen-btn">
                    <span v-if="!isChangingPassword">{{ t('account.updatePassword') }}</span>
                    <ZenSpinner
                        v-else
                        variant="bar" />
                </button>
                <div
                    v-if="passwordSuccess"
                    class="zen-success success-message"
                    >{{ passwordSuccess }}</div
                >
                <div
                    v-if="passwordError"
                    class="zen-error error-message"
                    >{{ passwordError }}</div
                >
            </form>
        </div>

        <!-- Recovery Codes Section -->
        <div class="settings-section">
            <h3 class="section-title">{{ t('account.recoveryCodes') }}</h3>
            <p class="info-text">{{ t('account.recoveryCodesDescription') }}</p>

            <!-- Status display -->
            <div
                v-if="recoveryStatus && recoveryStatus.hasRecoveryCodes"
                class="recovery-status">
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
            <div
                v-if="!showRecoveryCodes && !showGenerateForm"
                class="button-container">
                <button
                    class="zen-btn"
                    @click="showGenerateForm = true">
                    {{ recoveryStatus?.hasRecoveryCodes ? t('account.regenerateCodes') : t('account.generateCodes') }}
                </button>
            </div>

            <form
                v-if="showGenerateForm && !showRecoveryCodes"
                class="settings-form"
                @submit.prevent="generateRecoveryCodes">
                <p class="warning-text">{{ t('account.generateCodesWarning') }}</p>
                <input
                    v-model="recoveryPassword"
                    class="zen-input"
                    type="password"
                    :placeholder="t('account.confirmPasswordToGenerate')"
                    :aria-label="t('account.confirmPasswordToGenerate')"
                    :disabled="isGeneratingCodes"
                    required
                    autocomplete="current-password" />
                <div class="button-row">
                    <button
                        type="button"
                        :disabled="isGeneratingCodes"
                        class="zen-btn is-ghost"
                        @click="cancelGenerateCodes">
                        {{ t('account.cancel') }}
                    </button>
                    <button
                        type="submit"
                        :disabled="isGeneratingCodes || !recoveryPassword"
                        class="zen-btn">
                        <span v-if="!isGeneratingCodes">{{ t('account.confirm') }}</span>
                        <ZenSpinner
                            v-else
                            variant="bar" />
                    </button>
                </div>
                <div
                    v-if="recoveryError"
                    class="zen-error error-message"
                    >{{ recoveryError }}</div
                >
            </form>

            <!-- Display generated codes -->
            <div
                v-if="showRecoveryCodes && recoveryCodes.length > 0"
                class="recovery-codes-display">
                <div class="warning-banner">
                    <strong>{{ t('account.saveCodesWarning') }}</strong>
                    <p>{{ t('account.saveCodesDescription') }}</p>
                </div>
                <div class="codes-grid">
                    <div
                        v-for="(code, index) in recoveryCodes"
                        :key="index"
                        class="code-item">
                        <span class="code-number">{{ index + 1 }}.</span>
                        <code class="code-value">{{ code }}</code>
                    </div>
                </div>
                <div class="button-row">
                    <button
                        class="zen-btn"
                        @click="copyAllCodes">
                        {{ codesCopied ? t('account.copied') : t('account.copyAll') }}
                    </button>
                    <button
                        class="zen-btn"
                        @click="closeRecoveryCodes">
                        {{ t('account.iHaveSavedCodes') }}
                    </button>
                </div>
            </div>
        </div>

        <!-- Delete Account Section -->
        <div class="settings-section danger-section">
            <h3 class="section-title danger-title">{{ t('account.deleteAccount') }}</h3>
            <p class="warning-text">{{ t('account.deleteWarning') }}</p>

            <button
                v-if="!showDeleteConfirm"
                class="zen-btn is-danger danger-btn"
                @click="showDeleteConfirm = true">
                {{ t('account.deleteAccountButton') }}
            </button>

            <form
                v-else
                class="settings-form delete-form"
                @submit.prevent="deleteAccount">
                <input
                    v-model="deletePassword"
                    class="zen-input"
                    type="password"
                    :placeholder="t('account.confirmPasswordToDelete')"
                    :aria-label="t('account.confirmPasswordToDelete')"
                    :disabled="isDeletingAccount"
                    required
                    autocomplete="current-password" />
                <div class="button-row">
                    <button
                        type="button"
                        :disabled="isDeletingAccount"
                        class="zen-btn is-ghost"
                        @click="cancelDelete">
                        {{ t('account.cancel') }}
                    </button>
                    <button
                        type="submit"
                        :disabled="isDeletingAccount || !deletePassword"
                        class="zen-btn is-danger danger-btn">
                        <span v-if="!isDeletingAccount">{{ t('account.confirmDelete') }}</span>
                        <ZenSpinner
                            v-else
                            variant="bar" />
                    </button>
                </div>
                <div
                    v-if="deleteError"
                    class="zen-error error-message"
                    >{{ deleteError }}</div
                >
            </form>
        </div>
    </div>
</template>

<style scoped lang="scss">
.account-settings {
    max-width: 100%;
    padding: $space-4;
}

.settings-title {
    margin-bottom: $space-6;
    color: $text1;
    font-size: $font-size-xl;
    font-weight: $font-weight-medium;
    text-align: center;
}

.settings-section {
    margin-bottom: $space-6;
    padding: $space-4;
    background: $input-bg;
    border: $border-width-thin $input-border;
    border-radius: $border-radius;

    &.danger-section {
        background: color-mix(in srgb, $danger 5%, transparent);
        border-color: color-mix(in srgb, $danger 30%, transparent);
    }
}

.section-title {
    margin-bottom: $space-4;
    color: $text1;
    font-size: $font-size-base;
    font-weight: $font-weight-medium;

    &.danger-title {
        color: $danger;
    }
}

.settings-form {
    display: flex;
    flex-direction: column;
    gap: $space-3;
}

.warning-text,
.info-text {
    margin-bottom: $space-4;
    color: $text2;
    font-size: $font-size-sm;
    line-height: $line-height-base;
}

/* ––––– Recovery codes ––––– */

.recovery-status {
    margin-bottom: $space-4;
    padding: $space-4;
    background: $base1;
    border: $border-width-thin $border-subtle;
    border-radius: $border-radius-sm;
}

.status-item {
    display: flex;
    justify-content: space-between;
    padding: $space-2 0;
    border-bottom: $border-width-thin $border-subtle;

    &:last-child {
        border-bottom: none;
    }
}

.status-label {
    color: $text2;
    font-size: $font-size-sm;
}

.status-value {
    color: $text1;
    font-size: $font-size-sm;
    font-weight: $font-weight-medium;
}

.button-container {
    display: flex;
    justify-content: center;
}

.recovery-codes-display {
    margin-top: $space-4;
}

.warning-banner {
    margin-bottom: $space-4;
    padding: $space-4;
    background: color-mix(in srgb, $warning 10%, transparent);
    border: $border-width-thin color-mix(in srgb, $warning 30%, transparent);
    border-radius: $border-radius-sm;

    strong {
        display: block;
        margin-bottom: $space-2;
        color: $warning;
    }

    p {
        margin: 0;
        color: $text2;
        font-size: $font-size-sm;
        line-height: $line-height-base;
    }
}

.codes-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: $space-3;
    margin-bottom: $space-4;
}

.code-item {
    display: flex;
    align-items: center;
    gap: $space-2;
    padding: $space-3;
    background: $base1;
    border: $border-width-thin $border-subtle;
    border-radius: $border-radius-sm;
}

.code-number {
    min-width: $size-14;
    color: $text2;
    font-size: $font-size-xs;
}

.code-value {
    color: $text1;
    font-family: 'Courier New', monospace;
    font-size: $font-size-sm;
    font-weight: $font-weight-semibold;
    letter-spacing: $letter-spacing-4;
}

/* ––––– Delete account ––––– */

.delete-form {
    margin-top: $space-4;
}

.button-row {
    display: flex;
    flex-direction: column;
    gap: $space-3;

    /** Both buttons share the row evenly, whichever variant they carry. */
    > .zen-btn {
        flex: 1;
    }
}

/* –––––– Responsive –––––– */

@media (width > #{$breakpoint-lg}) {
    .account-settings {
        padding: 0;
    }

    .settings-section {
        padding: $space-6;
    }

    .codes-grid {
        grid-template-columns: repeat(2, 1fr);
    }

    .button-row {
        flex-direction: row;
    }
}
</style>
