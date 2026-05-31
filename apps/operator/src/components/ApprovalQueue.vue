<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useRemoteSync } from '../composables/useRemoteSync';

const { t } = useI18n();
const { pendingApprovals, approve, reject } = useRemoteSync();
</script>

<template>
  <section
    v-if="pendingApprovals.length"
    class="border-b border-lp-surface bg-amber-500/10 px-4 py-2"
  >
    <p class="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-200">
      {{ t('settings.approvals.banner') }}
    </p>
    <ul class="flex flex-col gap-2">
      <li
        v-for="item in pendingApprovals"
        :key="item.id"
        class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/30 bg-lp-surface/60 px-3 py-2 text-sm"
      >
        <span>
          <strong>{{ item.userName }}</strong>
          — {{ item.kind }}
        </span>
        <span class="flex gap-2">
          <button
            type="button"
            class="rounded bg-emerald-600 px-2 py-1 text-xs text-white"
            @click="approve(item.id)"
          >
            {{ t('settings.approvals.approve') }}
          </button>
          <button
            type="button"
            class="rounded bg-rose-700 px-2 py-1 text-xs text-white"
            @click="reject(item.id)"
          >
            {{ t('settings.approvals.reject') }}
          </button>
        </span>
      </li>
    </ul>
  </section>
</template>
