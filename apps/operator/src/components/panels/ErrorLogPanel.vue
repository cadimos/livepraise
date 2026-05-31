<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useErrorLog, type ErrorLogEntry } from '../../composables/useErrorLog';

const { t } = useI18n();
const { items, loading, error, refresh, clear } = useErrorLog();

const expandedIds = ref<Set<string>>(new Set());

const tsFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'medium',
});

function formatTs(ts: string): string {
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? ts : tsFormatter.format(d);
}

function levelClass(level: ErrorLogEntry['level']): string {
  return level === 'warn'
    ? 'bg-amber-500/20 text-amber-200'
    : 'bg-rose-700/30 text-rose-100';
}

function toggleDetail(id: string): void {
  const next = new Set(expandedIds.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  expandedIds.value = next;
}

function isExpanded(id: string): boolean {
  return expandedIds.value.has(id);
}

async function onClear(): void {
  if (!window.confirm(t('settings.errorLog.confirmClear'))) return;
  const ok = await clear();
  if (ok) expandedIds.value = new Set();
}

onMounted(() => {
  void refresh();
});
</script>

<template>
  <div class="flex flex-col gap-3 text-sm">
    <p class="text-lp-muted">{{ t('settings.errorLog.intro') }}</p>

    <div class="flex flex-wrap items-center gap-2">
      <button
        type="button"
        class="rounded bg-lp-primary px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        :disabled="loading"
        @click="refresh()"
      >
        {{ loading ? t('settings.errorLog.refreshing') : t('settings.errorLog.refresh') }}
      </button>
      <button
        type="button"
        class="rounded border border-rose-500/50 px-3 py-1.5 text-xs text-rose-200 hover:bg-rose-900/30 disabled:opacity-50"
        :disabled="loading || !items.length"
        @click="onClear"
      >
        {{ t('settings.errorLog.clear') }}
      </button>
    </div>

    <p v-if="error" class="text-rose-300" role="alert">{{ error }}</p>

    <p v-else-if="!loading && !items.length" class="text-lp-muted">
      {{ t('settings.errorLog.empty') }}
    </p>

    <ul v-else class="flex max-h-[50vh] flex-col gap-2 overflow-y-auto" role="list">
      <li
        v-for="entry in items"
        :key="entry.id"
        class="rounded-lg border border-lp-surface bg-lp-surface/50 px-3 py-2"
      >
        <div class="flex flex-wrap items-start gap-2">
          <time class="shrink-0 font-mono text-xs text-lp-muted" :datetime="entry.ts">
            {{ formatTs(entry.ts) }}
          </time>
          <span
            class="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
            :class="levelClass(entry.level)"
          >
            {{ entry.level }}
          </span>
          <span class="text-xs text-lp-muted">{{ entry.source }}</span>
        </div>
        <p class="mt-1 break-words text-lp-text">{{ entry.message }}</p>
        <button
          v-if="entry.detail"
          type="button"
          class="mt-1 text-xs text-lp-primary hover:underline"
          :aria-expanded="isExpanded(entry.id)"
          @click="toggleDetail(entry.id)"
        >
          {{
            isExpanded(entry.id)
              ? t('settings.errorLog.hideDetail')
              : t('settings.errorLog.showDetail')
          }}
        </button>
        <pre
          v-if="entry.detail && isExpanded(entry.id)"
          class="mt-2 max-h-40 overflow-auto rounded bg-black/30 p-2 font-mono text-xs text-lp-muted"
        >{{ entry.detail }}</pre>
      </li>
    </ul>
  </div>
</template>
