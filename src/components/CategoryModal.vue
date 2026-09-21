<script setup>
import { ref } from 'vue';
import { api } from '../api.js';
import ColorPicker from './ColorPicker.vue';

// 添加（category=null）/ 编辑核算的独立弹窗，叠在记录弹窗之上，背景更暗
const props = defineProps({
  category: { type: Object, default: null },
  recommendedIds: { type: Array, default: () => [] },
});
const emit = defineEmits(['close', 'saved']);

const name = ref(props.category ? props.category.name : '');
const color = ref(props.category ? props.category.color : props.recommendedIds[0] || 'graphite');
const error = ref('');
const saving = ref(false);

async function save() {
  if (!name.value.trim()) {
    error.value = '请填写核算名称';
    return;
  }
  saving.value = true;
  error.value = '';
  try {
    const cat = props.category
      ? await api(`/categories/${props.category.id}`, {
          method: 'PATCH',
          body: { name: name.value, color: color.value },
        })
      : await api('/categories', {
          method: 'POST',
          body: { name: name.value, color: color.value },
        });
    emit('saved', cat);
  } catch (e) {
    error.value = e.message;
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="overlay nested" @click.self="emit('close')">
    <div class="dialog">
      <h2>{{ category ? '编辑核算' : '添加核算' }}</h2>
      <div class="field">
        <label>核算名称</label>
        <input v-model="name" type="text" placeholder="例如：吃的" maxlength="12" />
      </div>
      <div class="field">
        <label>badge 颜色</label>
        <ColorPicker type="badge" v-model="color" :recommended-ids="recommendedIds" />
      </div>
      <p v-if="error" class="form-error">{{ error }}</p>
      <div class="dialog-actions">
        <button class="btn btn-plain" @click="emit('close')">取消</button>
        <button class="btn" :disabled="saving" @click="save">
          {{ saving ? '保存中…' : '保存' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 叠加在 EntryDialog 之上：更高层级 + 更暗的背景 */
.overlay.nested {
  z-index: 200;
  background: rgba(20, 20, 28, 0.6);
}
.form-error {
  margin: 4px 0 0;
  font-size: 13px;
  color: #b3372e;
}
</style>
