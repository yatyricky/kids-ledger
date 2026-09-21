<script setup>
import { computed } from 'vue';
import { FAMILIES, BADGES } from '../../shared/palettes.js';

// 选色器（预设制）：
//  type="family" → 账簿色系家族（浅色渐变卡片预览）
//  type="badge"  → 核算 badge 深色主题；recommendedIds 中的主题排最前并单独分组
const props = defineProps({
  type: { type: String, required: true }, // 'family' | 'badge'
  modelValue: { type: String, required: true },
  recommendedIds: { type: Array, default: () => [] },
});
const emit = defineEmits(['update:modelValue']);

const familyGroups = computed(() => [
  { label: '', items: FAMILIES },
]);

const badgeGroups = computed(() => {
  const rec = props.recommendedIds
    .map((id) => BADGES.find((b) => b.id === id))
    .filter(Boolean);
  const rest = BADGES.filter((b) => !props.recommendedIds.includes(b.id));
  const groups = [];
  if (rec.length > 0) groups.push({ label: '推荐搭配', items: rec });
  groups.push({ label: rec.length > 0 ? '全部主题' : '', items: rest });
  return groups;
});

function pick(id) {
  emit('update:modelValue', id);
}
</script>

<template>
  <div class="picker">
    <template v-if="type === 'family'">
      <div v-for="(g, gi) in familyGroups" :key="gi" class="group">
        <div class="grid grid-family">
          <button
            v-for="f in g.items"
            :key="f.id"
            type="button"
            class="swatch-family pressable"
            :class="{ active: modelValue === f.id }"
            @click="pick(f.id)"
          >
            <span class="preview" :style="{ background: f.card }" />
            <span class="name">{{ f.name }}</span>
          </button>
        </div>
      </div>
    </template>

    <template v-else>
      <div v-for="(g, gi) in badgeGroups" :key="gi" class="group">
        <p v-if="g.label" class="group-label">{{ g.label }}</p>
        <div class="grid grid-badge">
          <button
            v-for="b in g.items"
            :key="b.id"
            type="button"
            class="swatch-badge pressable"
            :class="{ active: modelValue === b.id }"
            @click="pick(b.id)"
          >
            <span class="preview" :style="{ background: b.css }">字</span>
            <span class="name">{{ b.name }}</span>
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.group {
  margin-bottom: 10px;
}
.group-label {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 600;
  color: #98a0ae;
}
.grid {
  display: grid;
  gap: 10px;
}
.grid-family {
  grid-template-columns: repeat(4, 1fr);
}
.grid-badge {
  grid-template-columns: repeat(6, 1fr);
}
.swatch-family,
.swatch-badge {
  border: none;
  background: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  cursor: pointer;
}
.preview {
  display: block;
  border-radius: 12px;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.06);
  outline: 3px solid transparent;
  outline-offset: 2px;
  transition: outline-color 0.15s ease, transform 0.1s ease;
}
.swatch-family .preview {
  width: 100%;
  aspect-ratio: 4 / 3;
}
.swatch-badge .preview {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  color: #fff;
  font-size: 14px;
  line-height: 34px;
  text-align: center;
  font-weight: 600;
}
.swatch-family.active .preview,
.swatch-badge.active .preview {
  outline-color: #4c688f;
  transform: scale(1.05);
}
.name {
  font-size: 11px;
  color: #7a828f;
}
.swatch-family.active .name,
.swatch-badge.active .name {
  color: #2f3a52;
  font-weight: 600;
}
</style>
