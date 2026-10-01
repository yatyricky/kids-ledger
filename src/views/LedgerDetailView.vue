<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { api, isParent } from '../api.js';
import { getFamily, getBadge } from '../../shared/palettes.js';
import { fmtDate, fmtAmount, fmtBalance } from '../format.js';
import EntryDialog from '../components/EntryDialog.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue';
import LoadingSpinner from '../components/LoadingSpinner.vue';

const props = defineProps({
  id: { type: String, required: true },
});

const router = useRouter();
const ledger = ref(null);
const entries = ref([]);
const categories = ref([]);
const loadError = ref('');
const loading = ref(true);

const showEntryDialog = ref(false);
const editingEntry = ref(null);
const deletingEntry = ref(null);

const fam = computed(() => getFamily(ledger.value?.color));

// 核算汇总：按当前记录实时累加；正数总额排前（一级），组内绝对值倒序（二级）
const categorySummary = computed(() => {
  const map = new Map();
  for (const e of entries.value) {
    if (!e.category) continue;
    const cur = map.get(e.category.id) ?? { id: e.category.id, name: e.category.name, color: e.category.color, total: 0 };
    cur.total += e.amount;
    map.set(e.category.id, cur);
  }
  return [...map.values()].sort((a, b) => {
    const pa = a.total > 0 ? 1 : 0;
    const pb = b.total > 0 ? 1 : 0;
    if (pa !== pb) return pb - pa;
    return Math.abs(b.total) - Math.abs(a.total);
  });
});

// 整页跟随账簿色系家族：背景 page、文字 ink、强调 accent
const pageVars = computed(() =>
  ledger.value
    ? {
        '--page-bg': fam.value.page,
        '--ink': fam.value.ink,
        '--ink-soft': fam.value.inkSoft,
        '--accent': fam.value.accent,
        '--line': fam.value.inkSoft + '40',
      }
    : {}
);

const badgeVars = (cat) => ({ background: getBadge(cat.color).css });

async function load() {
  loadError.value = '';
  loading.value = true;
  try {
    ledger.value = await api(`/ledgers/${props.id}`);
    entries.value = await api(`/ledgers/${props.id}/entries`);
  } catch (e) {
    loadError.value = e.message;
  } finally {
    loading.value = false;
  }
}

async function loadCategories() {
  try {
    categories.value = await api('/categories');
  } catch {
    /* 非关键数据，失败不阻塞页面 */
  }
}

onMounted(() => {
  load();
  loadCategories();
});

function openCreate() {
  editingEntry.value = null;
  showEntryDialog.value = true;
}

function openEdit(entry) {
  if (!isParent()) return;
  editingEntry.value = entry;
  showEntryDialog.value = true;
}

// EntryDialog 点"删除记录" → 关闭表单，弹确认框
function requestDeleteEntry(entry) {
  showEntryDialog.value = false;
  deletingEntry.value = entry;
}

async function onSaved() {
  showEntryDialog.value = false;
  editingEntry.value = null;
  await load();
  await loadCategories();
}

async function doDeleteEntry() {
  const target = deletingEntry.value;
  deletingEntry.value = null;
  try {
    await api(`/entries/${target.id}`, { method: 'DELETE' });
    await load();
  } catch (e) {
    loadError.value = e.message;
  }
}
</script>

<template>
  <div class="page" :style="pageVars">
    <header class="topbar">
      <button class="back pressable" @click="router.push('/ledgers')">← 返回</button>
      <div class="title-wrap">
        <div class="title-row">
          <h1>{{ ledger?.name ?? '…' }}</h1>
          <span v-if="ledger" class="balance-num">¥ {{ fmtBalance(ledger.balance) }}</span>
        </div>
      </div>
      <button v-if="isParent()" class="btn add-btn" @click="openCreate">＋ 记一笔</button>
      <span v-else class="spacer"></span>
    </header>

    <LoadingSpinner :active="loading" />
    <p v-if="loadError" class="load-error">{{ loadError }}</p>

    <div v-if="ledger" class="table-wrap">
      <table>
        <thead>
          <tr>
            <th class="col-date">日期</th>
            <th class="col-desc">事情</th>
            <th class="col-amount">金额</th>
            <th class="col-balance">余额</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="e in entries"
            :key="e.id"
            :class="{ pressable: isParent() }"
            @click="openEdit(e)"
          >
            <td class="col-date">{{ fmtDate(e.date) }}</td>
            <td class="col-desc">
              <span class="desc-text">{{ e.description }}</span>
              <span
                v-if="e.category"
                class="badge"
                :style="badgeVars(e.category)"
              >{{ e.category.name }}</span>
            </td>
            <td class="col-amount" :class="e.amount > 0 ? 'amount-income' : e.amount < 0 ? 'amount-expense' : ''">
              {{ fmtAmount(e.amount) }}
            </td>
            <td class="col-balance">{{ fmtBalance(e.balance) }}</td>
          </tr>
          <tr v-if="entries.length === 0">
            <td colspan="4" class="empty-row">
              {{ isParent() ? '还没有记录，点右上角"记一笔"开始记账' : '这本账簿还没有记录' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 核算汇总：算式流式排列，正数排前、组内绝对值倒序，末尾 = 总余额 -->
    <div v-if="ledger && categorySummary.length > 0" class="summary-wrap">
      <h2>核算汇总</h2>
      <p class="summary-flow">
        <span v-for="s in categorySummary" :key="s.id" class="summary-item">
          <span class="badge" :style="badgeVars(s)">{{ s.name }}</span>
          <span
            class="summary-amount"
            :class="s.total > 0 ? 'amount-income' : s.total < 0 ? 'amount-expense' : ''"
          >{{ fmtAmount(s.total) }}</span>
        </span>
        <span class="summary-result">
          <span class="summary-eq">=</span>
          <span class="summary-balance">{{ fmtBalance(ledger.balance) }}</span>
        </span>
      </p>
    </div>

    <EntryDialog
      v-if="showEntryDialog"
      :entry="editingEntry"
      :entry-ledger-id="id"
      :categories="categories"
      :family-id="ledger.color"
      @close="showEntryDialog = false"
      @saved="onSaved"
      @deleted="requestDeleteEntry(editingEntry)"
      @categories-changed="loadCategories"
    />

    <ConfirmDialog
      v-if="deletingEntry"
      message="删除这条记录？"
      @confirm="doDeleteEntry"
      @cancel="deletingEntry = null"
    />
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: var(--page-bg);
  color: var(--ink);
  padding: 16px 16px 40px;
}
.topbar {
  max-width: 860px;
  margin: 0 auto 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.back {
  border: none;
  background: none;
  color: var(--accent);
  font-size: 15px;
  font-weight: 600;
  padding: 8px 6px;
  cursor: pointer;
  flex-shrink: 0;
}
.title-wrap {
  flex: 1;
  min-width: 0;
}
.title-row {
  display: flex;
  align-items: baseline;
  gap: 10px;
  min-width: 0;
}
h1 {
  margin: 0;
  font-size: 20px;
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.balance-num {
  font-size: 17px;
  font-weight: 700;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  flex-shrink: 0;
}
.add-btn {
  background: var(--accent);
  flex-shrink: 0;
}
.spacer {
  width: 70px;
  flex-shrink: 0;
}
.load-error {
  max-width: 860px;
  margin: 40px auto;
  text-align: center;
  color: #b3372e;
}

.table-wrap {
  max-width: 860px;
  margin: 0 auto;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(4px);
  border-radius: 18px;
  padding: 6px 14px 12px;
  box-shadow: 0 8px 24px rgba(90, 80, 110, 0.08);
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}
th {
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  color: var(--ink-soft);
  padding: 12px 8px 8px;
  border-bottom: 1.5px solid var(--line);
}
td {
  padding: 11px 8px;
  border-bottom: 1px solid var(--line);
  vertical-align: top;
}
tbody tr:last-child td {
  border-bottom: none;
}
@media (hover: hover) {
  tbody tr.pressable:hover {
    background: rgba(255, 255, 255, 0.65);
  }
}

.col-date {
  white-space: nowrap;
  width: 86px;
  color: var(--ink-soft);
  font-variant-numeric: tabular-nums;
}
.col-desc {
  word-break: break-all;
}
.badge {
  display: inline-block;
  margin-left: 6px;
  padding: 2px 9px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  vertical-align: 1px;
  white-space: nowrap;
}
.col-amount,
.col-balance {
  text-align: right;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}
.col-balance {
  color: var(--ink-soft);
  font-weight: 500;
}
.empty-row {
  text-align: center;
  color: var(--ink-soft);
  padding: 40px 8px;
}
/* ── 核算汇总 ── */
.summary-wrap {
  max-width: 860px;
  margin: 14px auto 0;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(4px);
  border-radius: 18px;
  padding: 14px 18px;
  box-shadow: 0 8px 24px rgba(90, 80, 110, 0.08);
}
.summary-wrap h2 {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-soft);
}
/* 算式流式排列：badge+金额 成对不拆行，整体可换行 */
.summary-flow {
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  column-gap: 16px;
  row-gap: 8px;
  line-height: 1.9;
}
.summary-item {
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
  white-space: nowrap;
}
.summary-item .badge {
  margin-left: 0;
}
.summary-amount {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  font-size: 14px;
}
.summary-result {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  white-space: nowrap;
}
.summary-eq {
  font-weight: 700;
  color: var(--ink-soft);
  font-size: 15px;
}
.summary-balance {
  font-weight: 700;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
  font-size: 15px;
  white-space: nowrap;
}

@media (max-width: 480px) {
  .page {
    padding: 12px 10px 32px;
  }
  .table-wrap {
    padding: 2px 10px 10px;
    border-radius: 14px;
  }
  .summary-wrap {
    padding: 10px 12px;
    border-radius: 14px;
    margin-top: 10px;
  }
  td,
  th {
    padding-left: 5px;
    padding-right: 5px;
  }
  .col-date {
    width: 74px;
  }
  table {
    font-size: 13px;
  }
  .badge {
    font-size: 11px;
    padding: 1px 8px;
  }
  h1 {
    font-size: 17px;
  }
  .balance-num {
    font-size: 15px;
  }
  .spacer {
    width: 0;
  }
}
</style>
