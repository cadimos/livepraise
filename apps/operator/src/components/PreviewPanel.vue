<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps<{
  contentHtml: string;
  backgroundUrl: string;
}>();

const contentRef = ref<HTMLElement | null>(null);

watch(
  () => props.contentHtml,
  (html) => {
    if (contentRef.value) {
      contentRef.value.innerHTML = html;
    }
  },
  { immediate: true },
);
</script>

<template>
  <div
    class="relative aspect-video w-full shrink-0 overflow-hidden rounded-xl border border-lp-surface bg-black shadow-inner"
  >
    <img
      v-if="backgroundUrl"
      :src="backgroundUrl"
      alt=""
      class="absolute inset-0 h-full w-full object-cover"
    />
    <div
      ref="contentRef"
      class="conteudo absolute inset-0 flex flex-col p-[5%] text-white [&_.content]:flex [&_.content]:flex-1 [&_.content]:items-center [&_.content]:justify-center [&_.content]:text-center [&_.content]:text-2xl [&_.rodape]:mt-auto [&_.rodape]:rounded [&_.rodape]:bg-black/60 [&_.rodape]:px-2 [&_.rodape]:py-1 [&_.rodape]:text-sm [&_.rodape]:text-slate-100 [&_.titulo]:mb-2 [&_.titulo]:text-lg"
    />
    <p
      class="absolute bottom-2 right-3 rounded bg-black/60 px-2 py-0.5 text-xs font-medium text-slate-100"
    >
      {{ t('preview.local') }}
    </p>
  </div>
</template>
