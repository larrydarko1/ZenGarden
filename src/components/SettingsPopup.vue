<template>
	<div class="settings-overlay" @click.self="$emit('close')">
		<div class="settings-popup">
			<div class="settings-header">
				<h2 class="settings-title">{{ t('settings.title') }}</h2>
				<button class="close-btn" @click="$emit('close')" aria-label="Close settings">
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M18 6L6 18M6 6l12 12"/>
					</svg>
				</button>
			</div>

			<div class="settings-content">
				<div class="settings-section">
					<h3 class="section-label">{{ t('settings.theme') }}</h3>
					<div class="theme-options">
						<button
							v-for="theme in themes"
							:key="theme"
							:class="['theme-option', theme, { active: currentTheme === theme }]"
							@click="selectTheme(theme)"
						>
							<div class="theme-preview" :class="theme"></div>
							<span class="theme-name">{{ t(`settings.themes.${theme}`) }}</span>
						</button>
					</div>
				</div>

				<div class="settings-section">
					<h3 class="section-label">{{ t('settings.language') }}</h3>
					<div class="language-options">
						<button
							v-for="(langName, langCode) in languages"
							:key="langCode"
							:class="['language-option', { active: currentLanguage === langCode }]"
							@click="selectLanguage(langCode)"
						>
							{{ langName }}
						</button>
					</div>
				</div>

				<div class="settings-divider"></div>

				<AccountSettings 
					@usernameChanged="handleUsernameChange"
					@accountDeleted="handleAccountDeletion"
				/>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import AccountSettings from './AccountSettings.vue';

const { t, locale } = useI18n();

const emit = defineEmits<{
	(e: 'close'): void;
	(e: 'theme-change', theme: string): void;
	(e: 'language-change', language: string): void;
}>();

const themes = ['dark', 'light'];
const languages = {
	en: 'English',
	es: 'Español',
	it: 'Italiano',
	fr: 'Français',
	de: 'Deutsch',
	pt: 'Português',
	zh: '中文',
	ja: '日本語'
};

const currentTheme = ref('dark'); // Will be set from user data
const currentLanguage = ref(locale.value);

function selectTheme(theme: string) {
	currentTheme.value = theme;
	emit('theme-change', theme);
}

function selectLanguage(lang: string) {
	currentLanguage.value = lang;
	emit('language-change', lang);
}

function handleUsernameChange(newUsername: string) {
	// Username was changed successfully, might want to update UI
	console.log('Username changed to:', newUsername);
	// Optionally refresh the page or update any displayed username
	window.location.reload();
}

function handleAccountDeletion() {
	// Account deleted, redirect to login
	emit('close');
	window.location.reload();
}
</script>

<style scoped>
.settings-overlay {
	position: fixed;
	inset: 0;
	background: var(--blur2);
	backdrop-filter: blur(8px);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 2000;
	animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
	from { opacity: 0; }
	to { opacity: 1; }
}

.settings-popup {
	background: var(--input-bg);
	border: 1px solid var(--input-border);
	border-radius: 6px;
	width: 90%;
	max-width: 600px;
	max-height: 85vh;
	position: relative;
	animation: slideUp 0.3s ease-out;
	box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
	display: flex;
	flex-direction: column;
	overflow: hidden;
}

@keyframes slideUp {
	from {
		transform: translateY(20px);
		opacity: 0;
	}
	to {
		transform: translateY(0);
		opacity: 1;
	}
}

.settings-header {
	padding: 0.75rem;
	border-bottom: 1px solid var(--input-border);
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	position: relative;
}

.settings-title {
	color: var(--text1);
	font-size: 0.875rem;
	font-weight: 400;
	margin: 0;
	text-align: center;
	text-transform: uppercase;
	letter-spacing: 0.05em;
}

.settings-content {
	padding: 0.75rem;
	overflow-y: auto;
	flex: 1;
}

.settings-section {
	margin-bottom: 1rem;
}

.settings-section:last-of-type {
	margin-bottom: 0;
}

.section-label {
	color: var(--text2);
	font-size: 0.7rem;
	font-weight: 400;
	text-transform: uppercase;
	letter-spacing: 0.05em;
	margin: 0 0 0.5rem 0;
}

.settings-divider {
	height: 1px;
	background: var(--input-border);
	margin: 1.5rem 0;
	opacity: 0.5;
}

.theme-options {
	display: flex;
	gap: 0.5rem;
	justify-content: space-between;
}

.theme-option {
	background: var(--input-bg);
	border: 1px solid var(--input-border);
	border-radius: 4px;
	padding: 0.5rem;
	cursor: pointer;
	transition: all 0.15s;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 0.5rem;
	flex: 1;
}

.theme-option:hover {
	background: var(--input-bg-focus);
	border-color: var(--border-subtle);
}

.theme-option.active {
	background: var(--border-subtle);
	border-color: var(--border-subtle);
}

.theme-preview {
	width: 40px;
	height: 40px;
	border-radius: 4px;
	border: 1px solid var(--input-border);
	transition: transform 0.15s;
}

.theme-option:hover .theme-preview {
	transform: scale(1.05);
}

.theme-preview.light {
	background: linear-gradient(135deg, #F2F3F4 0%, #e3e6ed 100%);
}

.theme-preview.dark {
	background: linear-gradient(135deg, #181a20 0%, #23262f 100%);
}

.theme-name {
	color: var(--text1);
	font-size: 0.7rem;
	font-weight: 400;
}

.language-options {
	display: grid;
	grid-template-columns: repeat(4, 1fr);
	gap: 0.5rem;
}

.language-option {
	background: var(--input-bg);
	border: 1px solid var(--input-border);
	border-radius: 4px;
	padding: 0.5rem 0.35rem;
	color: var(--text2);
	font-size: 0.75rem;
	cursor: pointer;
	transition: all 0.15s;
	text-align: center;
	font-weight: 400;
}

.language-option:hover {
	background: var(--input-bg-focus);
	border-color: var(--border-subtle);
	color: var(--text1);
}

.language-option.active {
	background: var(--border-subtle);
	border-color: var(--border-subtle);
	color: var(--text1);
	font-weight: 400;
}

.close-btn {
	position: absolute;
	top: 50%;
	right: 0.5rem;
	transform: translateY(-50%);
	background: transparent;
	border: none;
	color: var(--text2);
	cursor: pointer;
	padding: 0.25rem;
	border-radius: 3px;
	transition: all 0.15s;
	display: flex;
	align-items: center;
	justify-content: center;
}

.close-btn:hover {
	background: var(--input-bg-focus);
	color: var(--text1);
}

.close-btn svg {
	width: 16px;
	height: 16px;
}

/* Mobile optimizations */
@media (max-width: 768px) {
	.settings-overlay {
		align-items: stretch;
		padding: 0;
	}

	.settings-popup {
		width: 100vw;
		max-width: 100vw;
		height: 100vh;
		max-height: 100vh;
		border-radius: 0;
		display: flex;
		flex-direction: column;
	}

	.settings-header {
		padding: 1rem 1.25rem;
		border-bottom: 1px solid var(--input-border);
		min-height: 56px;
		display: flex;
		align-items: center;
	}

	.settings-title {
		font-size: 1.25rem;
	}

	.close-btn {
		right: 1rem;
		width: 44px;
		height: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
		touch-action: manipulation;
	}

	.close-btn svg {
		width: 20px;
		height: 20px;
	}

	.settings-content {
		padding: 1.5rem 1.25rem;
		overflow-y: auto;
		flex: 1;
		-webkit-overflow-scrolling: touch;
	}

	.settings-section {
		margin-bottom: 2rem;
	}

	.section-label {
		font-size: 1rem;
		margin-bottom: 1rem;
	}

	.theme-options {
		gap: 0.75rem;
	}

	.theme-option {
		padding: 1rem;
		min-height: 72px;
		touch-action: manipulation;
	}

	.theme-preview {
		width: 36px;
		height: 36px;
	}

	.theme-name {
		font-size: 0.85rem;
		margin-top: 0.5rem;
	}

	.language-options {
		grid-template-columns: repeat(2, 1fr);
		gap: 0.75rem;
	}

	.language-option {
		padding: 0.875rem 0.75rem;
		font-size: 0.85rem;
		min-height: 52px;
		display: flex;
		align-items: center;
		justify-content: center;
		touch-action: manipulation;
	}

	.settings-divider {
		margin: 1.5rem 0;
	}
}

@media (max-width: 480px) {
	.settings-header {
		padding: 0.875rem 1rem;
	}

	.settings-content {
		padding: 1.25rem 1rem;
	}

	.language-options {
		grid-template-columns: 1fr;
	}
}
</style>
