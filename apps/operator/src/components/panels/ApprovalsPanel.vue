<script setup lang="ts">
import { onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRemoteSync } from '../../composables/useRemoteSync';

const { t } = useI18n();
const { pendingApprovals, refreshApprovals, approve, reject } = useRemoteSync();

onMounted(() => {
  void refreshApprovals();
});
</script>

<template>
  <div class="flex flex-col gap-3 text-sm">
    <p class="text-lp-muted">{{ t('settings.approvals.intro') }}</p>

    <p v-if="!pendingApprovals.length" class="text-lp-muted">
      {{ t('settings.approvals.empty') }}
    </p>

    <ul v-else class="flex flex-col gap-2">
      <li
        v-for="item in pendingApprovals"
        :key="item.id"
        class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/30 bg-lp-surface/60 px-3 py-2"
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
  </div>
</template>
