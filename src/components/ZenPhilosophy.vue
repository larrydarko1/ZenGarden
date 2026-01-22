<template>
  <div class="philosophy-overlay" @click.self="$emit('close')">
    <div class="philosophy-modal" @click.stop>
      <button class="philosophy-close" @click="$emit('close')" aria-label="Close philosophy">×</button>
      
      <div class="philosophy-header">
        <h2>{{ t('philosophy.title') }}</h2>
        <p class="philosophy-subtitle">{{ t('philosophy.subtitle') }}</p>
      </div>

      <div class="philosophy-content">
        <div class="philosophy-section">
          <div class="section-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C10.9 2 10 2.9 10 4C10 5.1 10.9 6 12 6C13.1 6 14 5.1 14 4C14 2.9 13.1 2 12 2Z" fill="currentColor"/>
              <path d="M21 9H15V22H13V16H11V22H9V9H3V7H21V9Z" fill="currentColor"/>
            </svg>
          </div>
          <h3>{{ t('philosophy.practice.title') }}</h3>
          <p>{{ t('philosophy.practice.body') }}</p>
        </div>

        <div class="philosophy-section">
          <div class="section-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
              <circle cx="12" cy="12" r="6" stroke="currentColor" stroke-width="2"/>
              <circle cx="12" cy="12" r="2" fill="currentColor"/>
            </svg>
          </div>
          <h3>{{ t('philosophy.noGoals.title') }}</h3>
          <p>{{ t('philosophy.noGoals.body') }}</p>
        </div>

        <div class="philosophy-section">
          <div class="section-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C11.5 2 11 2.19 10.59 2.59L2.59 10.59C1.8 11.37 1.8 12.63 2.59 13.41C3.37 14.2 4.63 14.2 5.41 13.41L12 6.83L18.59 13.41C19.37 14.2 20.63 14.2 21.41 13.41C22.2 12.63 22.2 11.37 21.41 10.59L13.41 2.59C13 2.19 12.5 2 12 2M8 14L6 16V22H10V18H14V22H18V16L16 14L12 18L8 14Z" fill="currentColor"/>
            </svg>
          </div>
          <h3>{{ t('philosophy.noStreaks.title') }}</h3>
          <p>{{ t('philosophy.noStreaks.body') }}</p>
        </div>

        <div class="philosophy-section">
          <div class="section-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 4.5C7 4.5 2.73 7.61 1 12C2.73 16.39 7 19.5 12 19.5C17 19.5 21.27 16.39 23 12C21.27 7.61 17 4.5 12 4.5ZM12 17C9.24 17 7 14.76 7 12C7 9.24 9.24 7 12 7C14.76 7 17 9.24 17 12C17 14.76 14.76 17 12 17ZM12 9C10.34 9 9 10.34 9 12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12C15 10.34 13.66 9 12 9Z" fill="currentColor"/>
            </svg>
          </div>
          <h3>{{ t('philosophy.observation.title') }}</h3>
          <p>{{ t('philosophy.observation.body') }}</p>
        </div>

        <div class="philosophy-divider"></div>

        <div class="philosophy-quote">
          <p class="quote-text">{{ t('philosophy.quote.text') }}</p>
          <p class="quote-author">{{ t('philosophy.quote.author') }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

defineEmits<{
  (e: 'close'): void;
}>();
</script>

<style scoped lang="scss">
.philosophy-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.philosophy-modal {
  background: var(--bg-color);
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  position: relative;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.philosophy-close {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  background: none;
  border: none;
  font-size: 1.75rem;
  color: var(--text2);
  cursor: pointer;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s;
  z-index: 1;
}

.philosophy-close:hover {
  background: var(--button-bg-hover);
  color: var(--text1);
}

.philosophy-header {
  padding: 1rem 1.5rem 0.75rem;
  border-bottom: 1px solid var(--border-subtle);
}

.philosophy-header h2 {
  margin: 0 0 0.25rem;
  color: var(--text1);
  font-size: 1.35rem;
  font-weight: 600;
}

.philosophy-subtitle {
  margin: 0;
  color: var(--text2);
  font-size: 0.9rem;
  font-style: italic;
}

.philosophy-content {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.philosophy-section {
  .section-icon {
    margin-bottom: 0.75rem;
    color: var(--text2);
    
    svg {
      display: block;
    }
  }
  
  h3 {
    margin: 0 0 0.75rem;
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--text1);
  }
  
  p {
    margin: 0;
    font-size: 0.95rem;
    line-height: 1.6;
    color: var(--text1);
  }
}

.philosophy-divider {
  height: 1px;
  background: var(--border-subtle);
  margin: 0.5rem 0;
}

.philosophy-quote {
  background: var(--blur1);
  border-left: 3px solid var(--accent-color);
  padding: 1rem 1.25rem;
  border-radius: 8px;
  
  .quote-text {
    margin: 0 0 0.75rem;
    font-size: 1rem;
    font-style: italic;
    line-height: 1.6;
    color: var(--text1);
  }
  
  .quote-author {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text2);
    text-align: right;
  }
}

/* Responsive */
@media (max-width: 640px) {
  .philosophy-modal {
    width: 95%;
    max-height: 90vh;
  }
  
  .philosophy-header {
    padding: 1rem 1.25rem 0.75rem;
    
    h2 {
      font-size: 1.25rem;
    }
  }
  
  .philosophy-subtitle {
    font-size: 0.85rem;
  }
  
  .philosophy-content {
    padding: 1.25rem;
    gap: 1.25rem;
  }
  
  .philosophy-section {
    .section-icon svg {
      width: 28px;
      height: 28px;
    }
    
    h3 {
      font-size: 1rem;
    }
    
    p {
      font-size: 0.9rem;
    }
  }
  
  .philosophy-quote {
    padding: 0.875rem 1rem;
    
    .quote-text {
      font-size: 0.95rem;
    }
    
    .quote-author {
      font-size: 0.8125rem;
    }
  }
}
</style>
