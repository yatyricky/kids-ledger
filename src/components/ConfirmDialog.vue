<script setup>
defineProps({
  message: { type: String, required: true },
  confirmText: { type: String, default: '删除' },
});
const emit = defineEmits(['confirm', 'cancel']);
</script>

<template>
  <div class="overlay" @click.self="emit('cancel')">
    <div class="dialog confirm">
      <p class="message">{{ message }}</p>
      <div class="dialog-actions">
        <button class="btn btn-plain" @click="emit('cancel')">取消</button>
        <button class="btn btn-danger" @click="emit('confirm')">{{ confirmText }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.confirm .message {
  margin: 6px 0 4px;
  font-size: 15px;
  line-height: 1.6;
}
</style>
