<script setup>
import { computed, ref } from 'vue';
import { api } from '../api.js';
import { getFamily, getBadge } from '../../shared/palettes.js';
import { todayISO } from '../format.js';
import ColorPicker from './ColorPicker.vue';
import CategoryModal from './CategoryModal.vue';

// 新增/编辑明细记录弹窗。
// props.entry 为 null → 新增；否则为待编辑记录（amount 为分）。
const props = defineProps({
  entry: { type: Object, default: null },
  categories: { type: Array, required: true },
  familyId: { type: String, required: true },
  entryLedgerId: { type: [Number, String], required: true },
});
const emit = defineEmits(['close', 'saved', 'deleted', 'categories-changed']);

const family = computed(() => getFamily(props.familyId));

const dateStr = ref(props.entry ? props.entry.date : todayISO());
const description = ref(props.entry ? props.entry.description : '');
// 直接输入正/负数，预填自带符号
const amountStr = ref(props.entry ? (props.entry.amount / 100).toFixed(2) : '');
const categoryId = ref(props.entry ? props.entry.category?.id : null);
const error = ref('');
const saving = ref(false);

// ── 金额：输入不清洗，保存时统一校验 ──
function toCents() {
  const m = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(amountStr.value.trim());
  if (!m) return null;
  const c = Number(m[2]) * 100 + Number((m[3] || '').padEnd(2, '0'));
  return m[1] === '-' ? -c : c;
}

// ── 核算：badge 单选（必选）+ 独立弹窗添加/长按编辑 ──
const catModal = ref(null); // null | { mode: 'new' } | { mode: 'edit', cat }

const recommendedIds = computed(() => family.value.badges);

const badgeVars = (cat) => ({ background: getBadge(cat.color).css });
const catGroups = computed(() => {
  const rec = props.categories.filter((c) => recommendedIds.value.includes(c.color));
  const rest = props.categories.filter((c) => !recommendedIds.value.includes(c.color));
  return { rec, rest };
});

function selectCat(id) {
  categoryId.value = id; // 核算必选，点击只做切换、不取消
}

function openAddCategory() {
  catModal.value = { mode: 'new' };
}

// 编辑当前所选核算
function openEditCategory() {
  const cat = props.categories.find((c) => c.id === categoryId.value);
  if (cat) catModal.value = { mode: 'edit', cat };
}

function onCatSaved(cat) {
  const wasNew = catModal.value?.mode === 'new';
  catModal.value = null;
  emit('categories-changed');
  if (wasNew) categoryId.value = cat.id; // 新增后自动选中
}

// ── 保存记录 ──
async function save() {
  if (!dateStr.value) {
    error.value = '请选择日期';
    return;
  }
  if (!description.value.trim()) {
    error.value = '请填写事情摘要';
    return;
  }
  if (categoryId.value === null) {
    error.value = '请选择核算';
    return;
  }
  const cents = toCents();
  if (cents === null) {
    error.value = '请输入正确的金额：负号表示支出，最多两位小数';
    return;
  }
  if (cents === 0) {
    error.value = '金额不能为 0';
    return;
  }
  saving.value = true;
  error.value = '';
  const body = {
    date: dateStr.value,
    description: description.value,
    categoryId: categoryId.value,
    amount: cents,
  };
  try {
    if (props.entry) {
      await api(`/entries/${props.entry.id}`, { method: 'PATCH', body });
    } else {
      await api(`/ledgers/${props.entryLedgerId}/entries`, { method: 'POST', body });
    }
    emit('saved');
  } catch (e) {
    error.value = e.message;
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="overlay" @click.self="emit('close')">
    <div class="dialog">
      <h2>{{ entry ? '编辑记录' : '添加记录' }}</h2>

      <div class="field">
        <label>日期</label>
        <input v-model="dateStr" type="date" />
      </div>

      <div class="field">
        <label>事情</label>
        <input v-model="description" type="text" placeholder="例如：买绿豆糕" maxlength="60" />
      </div>

      <div class="field">
        <label>核算（必选）</label>
        <div class="chips">
          <button
            v-for="cat in catGroups.rec"
            :key="cat.id"
            type="button"
            class="chip pressable"
            :class="{ selected: categoryId === cat.id }"
            :style="badgeVars(cat)"
            @click="selectCat(cat.id)"
          >
            {{ cat.name }}
          </button>
          <span v-if="catGroups.rec.length > 0 && catGroups.rest.length > 0" class="chip-sep">·</span>
          <button
            v-for="cat in catGroups.rest"
            :key="cat.id"
            type="button"
            class="chip pressable"
            :class="{ selected: categoryId === cat.id }"
            :style="badgeVars(cat)"
            @click="selectCat(cat.id)"
          >
            {{ cat.name }}
          </button>
          <button
            v-if="!catModal"
            type="button"
            class="chip chip-add pressable"
            @click="openAddCategory"
          >
            ＋
          </button>
          <button
            v-if="!catModal"
            type="button"
            class="chip chip-add pressable"
            :disabled="categoryId === null"
            title="点击编辑可以编辑当前所选核算"
            @click="openEditCategory"
          >
            ✎ 编辑
          </button>
        </div>
      </div>

      <div class="field">
        <label>金额（正数收入 / 负数支出）</label>
        <input v-model="amountStr" class="amount-input" placeholder="例如 -7.90" />
      </div>

      <p v-if="error" class="form-error">{{ error }}</p>
      <div class="dialog-actions split">
        <button v-if="entry" class="btn btn-danger" @click="emit('deleted')">删除记录</button>
        <span v-else></span>
        <span class="right">
          <button class="btn btn-plain" @click="emit('close')">取消</button>
          <button class="btn" :style="{ background: family.accent }" :disabled="saving" @click="save">
            {{ saving ? '保存中…' : '保存' }}
          </button>
        </span>
      </div>
    </div>

    <CategoryModal
      v-if="catModal"
      :category="catModal.mode === 'edit' ? catModal.cat : null"
      :recommended-ids="recommendedIds"
      @close="catModal = null"
      @saved="onCatSaved"
    />
  </div>
</template>

<style scoped>
.chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.chip {
  border: none;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  padding: 7px 14px;
  border-radius: 999px;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.14);
  outline: 2.5px solid transparent;
  outline-offset: 1.5px;
  transition: outline-color 0.12s ease, transform 0.08s ease;
}
.chip.selected {
  outline-color: #4c688f;
  transform: scale(1.04);
}
.chip-add {
  background: #eceef4;
  color: #6b7486;
  box-shadow: none;
  padding: 7px 12px;
}
.chip-add:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.chip-sep {
  color: #b9bfca;
}

.amount-input {
  width: 100%;
  padding: 11px 12px;
  border: 1.5px solid #d9dbe3;
  border-radius: 10px;
  outline: none;
  text-align: right;
  font-variant-numeric: tabular-nums;
  transition: border-color 0.15s ease;
}
.amount-input:focus {
  border-color: var(--accent, #52709a);
}
.form-error {
  margin: 4px 0 0;
  font-size: 13px;
  color: #b3372e;
}
.dialog-actions.split {
  justify-content: space-between;
}
.dialog-actions .right {
  display: flex;
  gap: 10px;
}
</style>
