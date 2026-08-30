<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { vaultIsPickable, chooseVault } from '@/renderer/store';
import { log } from '@/renderer/utils/logger';

const emit = defineEmits<{
    opened: [path: string];
}>();

const { t } = useI18n();

const pickable = ref(true);
const busy = ref(false);
const error = ref('');

async function open(): Promise<void> {
    busy.value = true;
    error.value = '';
    try {
        const path = await chooseVault();
        // Null is a cancelled dialog, not a failure — the picker just stays put.
        if (path !== null) emit('opened', path);
    } catch (err) {
        log.error('Failed to open vault', err);
        error.value = t('vault.chooseFailed');
    } finally {
        busy.value = false;
    }
}

onMounted(async () => {
    pickable.value = await vaultIsPickable();
    // Android has one fixed vault and no picker to show, so opening it is not a
    // decision the user has to make — take it for them and get out of the way.
    if (!pickable.value) await open();
});
</script>

<template>
    <div class="vault-picker">
        <div class="vault-panel">
            <h1 class="vault-title">{{ t('vault.title') }}</h1>
            <p class="vault-description">{{ t('vault.description') }}</p>

            <template v-if="pickable">
                <button
                    type="button"
                    class="zen-btn vault-choose"
                    :disabled="busy"
                    @click="open">
                    {{ t('vault.choose') }}
                </button>
                <p
                    v-if="error !== ''"
                    class="zen-error vault-error"
                    role="alert"
                    >{{ error }}</p
                >
            </template>
            <p
                v-else
                class="vault-description"
                >{{ t('vault.fixedLocation') }}</p
            >
        </div>
    </div>
</template>

<style scoped lang="scss">
@use '@/renderer/styles/variables' as *;

.vault-picker {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    padding: $space-4;
}

.vault-panel {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $space-4;
    max-width: $size-48;
    text-align: center;
}

.vault-title {
    color: $text1;
    font-size: $font-size-lg;
    font-weight: $font-weight-normal;
}

.vault-description {
    color: $text2;
    font-size: $font-size-sm;
    line-height: $line-height-relaxed;
}

.vault-choose {
    min-width: $size-40;
}

.vault-error {
    width: 100%;
}
</style>
