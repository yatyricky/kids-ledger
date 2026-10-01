<script setup>
import { onBeforeUnmount, ref, watch } from 'vue';

// 加载转圈：active 持续超过 DELAY 才显示，避免快速加载时闪烁
const props = defineProps({
  active: { type: Boolean, default: false },
});

const DELAY = 200;
const visible = ref(false);
let timer = null;

watch(
  () => props.active,
  (on) => {
    clearTimeout(timer);
    if (on) {
      timer = setTimeout(() => {
        visible.value = true;
      }, DELAY);
    } else {
      visible.value = false;
    }
  },
  { immediate: true }
);

onBeforeUnmount(() => clearTimeout(timer));
</script>

<template>
  <div v-if="visible" class="loading-spinner" role="status">
    <span class="spinner-ring" aria-hidden="true"></span>
    <span>加载中…</span>
  </div>
</template>
