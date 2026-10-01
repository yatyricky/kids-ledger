<script setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { api, isParent, getLabel, clearAuth } from '../api.js';
import { getFamily } from '../../shared/palettes.js';
import { fmtBalance } from '../format.js';
import ColorPicker from '../components/ColorPicker.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue';
import LoadingSpinner from '../components/LoadingSpinner.vue';

const router = useRouter();
const ledgers = ref([]);
const loading = ref(true);
const loadError = ref('');

// 新增/编辑弹窗状态
const showForm = ref(false);
const editingId = ref(null); // null = 新增
const formName = ref('');
const formColor = ref('peach');
const formError = ref('');
const saving = ref(false);
const confirmingDelete = ref(false);

async function load() {
  loading.value = true;
  loadError.value = '';
  try {
    ledgers.value = await api('/ledgers');
  } catch (e) {
    loadError.value = e.message;
  } finally {
    loading.value = false;
  }
}

onMounted(load);

function cardVars(l) {
  const fam = getFamily(l.color);
  return {
    '--card-bg': fam.card,
    '--blob-a': fam.blobA,
    '--blob-b': fam.blobB,
    '--ink': fam.ink,
    '--ink-soft': fam.inkSoft,
  };
}

function openLedger(l) {
  router.push(`/ledgers/${l.id}`);
}

function openCreate() {
  editingId.value = null;
  formName.value = '';
  formColor.value = 'peach';
  formError.value = '';
  showForm.value = true;
}

function openEdit(l) {
  if (!isParent()) return;
  editingId.value = l.id;
  formName.value = l.name;
  formColor.value = l.color;
  formError.value = '';
  showForm.value = true;
}

async function save() {
  if (!formName.value.trim()) {
    formError.value = '请填写账簿名称';
    return;
  }
  saving.value = true;
  formError.value = '';
  try {
    if (editingId.value === null) {
      await api('/ledgers', { method: 'POST', body: { name: formName.value, color: formColor.value } });
    } else {
      await api(`/ledgers/${editingId.value}`, {
        method: 'PATCH',
        body: { name: formName.value, color: formColor.value },
      });
    }
    showForm.value = false;
    await load();
  } catch (e) {
    formError.value = e.message;
  } finally {
    saving.value = false;
  }
}

async function doDelete() {
  confirmingDelete.value = false;
  try {
    await api(`/ledgers/${editingId.value}`, { method: 'DELETE' });
    showForm.value = false;
    await load();
  } catch (e) {
    formError.value = e.message;
  }
}

function logout() {
  clearAuth();
  router.push('/login');
}
</script>

<template>
  <div class="page">
    <header class="topbar">
      <div>
        <h1>家庭账本</h1>
        <p class="who">{{ getLabel() }}</p>
      </div>
      <div class="actions">
        <button v-if="isParent()" class="btn add-btn" @click="openCreate">＋ 添加账簿</button>
        <button class="btn-logout pressable" @click="logout">退出</button>
      </div>
    </header>

    <LoadingSpinner :active="loading" />
    <p v-if="loadError" class="load-error">{{ loadError }}</p>
    <p v-if="!loading && ledgers.length === 0 && !loadError" class="empty">
      {{ isParent() ? '还没有账簿，点击右上角"添加账簿"创建第一本吧' : '暂无账簿，请让家长添加' }}
    </p>

    <div class="grid">
      <article
        v-for="l in ledgers"
        :key="l.id"
        class="ledger-card pressable"
        :style="cardVars(l)"
        @click="openLedger(l)"
      >
        <button
          v-if="isParent()"
          type="button"
          class="card-edit pressable"
          title="编辑账簿"
          @click.stop="openEdit(l)"
        >
          <svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true">
            <path
              d="M14.2 2.3a1.6 1.6 0 0 1 2.3 0l1.2 1.2a1.6 1.6 0 0 1 0 2.3l-9.6 9.6-4.1 1.2a.5.5 0 0 1-.6-.6l1.2-4.1 9.6-9.6Z"
              fill="currentColor"
            />
          </svg>
        </button>
        <h2 class="name">{{ l.name }}</h2>
        <div class="balance-label">当前余额</div>
        <div class="balance">¥ {{ fmtBalance(l.balance) }}</div>
      </article>
    </div>

    <!-- 新增/编辑账簿 -->
    <div v-if="showForm" class="overlay" @click.self="showForm = false">
      <div class="dialog">
        <h2>{{ editingId === null ? '添加账簿' : '编辑账簿' }}</h2>
        <div class="field">
          <label>账簿名称</label>
          <input v-model="formName" type="text" placeholder="例如：康康的压岁钱" maxlength="30" />
        </div>
        <div class="field">
          <label>配色</label>
          <ColorPicker type="family" v-model="formColor" />
        </div>
        <p v-if="formError" class="form-error">{{ formError }}</p>
        <div class="dialog-actions split">
          <button
            v-if="editingId !== null"
            class="btn btn-danger"
            @click="confirmingDelete = true"
          >
            删除账簿
          </button>
          <span v-else></span>
          <span class="right">
            <button class="btn btn-plain" @click="showForm = false">取消</button>
            <button class="btn" :disabled="saving" @click="save">
              {{ saving ? '保存中…' : '保存' }}
            </button>
          </span>
        </div>
      </div>
    </div>

    <ConfirmDialog
      v-if="confirmingDelete"
      :message="`删除账簿「${formName}」及其全部明细记录？此操作不可恢复。`"
      @confirm="doDelete"
      @cancel="confirmingDelete = false"
    />
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  padding: 20px 16px 40px;
  background: linear-gradient(165deg, #f4f6fb 0%, #eef0f8 55%, #f3eff8 100%);
  max-width: 960px;
  margin: 0 auto;
}
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}
h1 {
  margin: 0;
  font-size: 24px;
  color: #2f3a52;
}
.who {
  margin: 2px 0 0;
  font-size: 13px;
  color: #8593a8;
}
.actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
.add-btn {
  background: #4c688f;
}
.btn-logout {
  border: none;
  background: none;
  color: #8593a8;
  font-size: 14px;
  padding: 6px;
}
.load-error,
.empty {
  text-align: center;
  color: #8593a8;
  font-size: 14px;
  margin: 40px 0;
}
.empty {
  white-space: pre-line;
}

/* ── 卡片网格：手机 1 列 → 平板 2-3 列 ── */
.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}
@media (min-width: 520px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (min-width: 820px) {
  .grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* ── 渐变卡片 + 光斑动画 ── */
.ledger-card {
  position: relative;
  overflow: hidden;
  border-radius: 24px;
  padding: 22px 20px;
  min-height: 140px;
  background: var(--card-bg);
  background-size: 180% 180%;
  animation: card-breath 12s ease-in-out infinite alternate;
  box-shadow: 0 10px 26px rgba(90, 80, 110, 0.14);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.ledger-card:active {
  transform: scale(0.98);
}
@media (hover: hover) {
  .ledger-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 14px 32px rgba(90, 80, 110, 0.2);
  }
}
/* 两团模糊光斑做非纯色层次，缓慢漂移 */
.ledger-card::before,
.ledger-card::after {
  content: '';
  position: absolute;
  border-radius: 50%;
  filter: blur(26px);
  pointer-events: none;
}
.ledger-card::before {
  width: 62%;
  aspect-ratio: 1;
  background: var(--blob-a);
  top: -24%;
  right: -16%;
  opacity: 0.6;
  animation: blob-a 14s ease-in-out infinite alternate;
}
.ledger-card::after {
  width: 46%;
  aspect-ratio: 1;
  background: var(--blob-b);
  bottom: -22%;
  left: -12%;
  opacity: 0.55;
  animation: blob-b 17s ease-in-out infinite alternate;
}
@keyframes card-breath {
  from {
    background-position: 0% 0%;
  }
  to {
    background-position: 100% 100%;
  }
}
@keyframes blob-a {
  from {
    transform: translate(0, 0) scale(1);
  }
  to {
    transform: translate(-14%, 12%) scale(1.18);
  }
}
@keyframes blob-b {
  from {
    transform: translate(0, 0) scale(1);
  }
  to {
    transform: translate(16%, -10%) scale(1.22);
  }
}
@media (prefers-reduced-motion: reduce) {
  .ledger-card,
  .ledger-card::before,
  .ledger-card::after {
    animation: none;
  }
}

/* 内容压在光斑之上；编辑按钮浮在右上角 */
.ledger-card > * {
  position: relative;
  z-index: 1;
}
.card-edit {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 2;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.6);
  color: var(--ink);
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(90, 80, 110, 0.18);
  transition: transform 0.12s ease, background 0.15s ease;
}
.card-edit:hover {
  background: rgba(255, 255, 255, 0.85);
  transform: scale(1.08);
}
.card-edit:active {
  transform: scale(0.94);
}
.name {
  margin: 0 0 26px;
  font-size: 19px;
  font-weight: 700;
  color: var(--ink);
  word-break: break-all;
}
.balance-label {
  font-size: 12px;
  color: var(--ink-soft);
}
.balance {
  font-size: 26px;
  font-weight: 700;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
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
