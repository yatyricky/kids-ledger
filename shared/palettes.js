// 色系家族 + badge 主题：前后端共享的单一颜色来源。
// 前端用它渲染卡片/页面/文字/选色器，后端用它校验 color 字段的合法性。
// DB 只存预设 id；未知 id 由 getFamily/getBadge 回退默认值。

// ── 账簿色系家族 ──────────────────────────────────────────────
// 每个家族是一组同色相配套色调：
//   card    账簿卡片背景（浅色多重渐变，深色文字压在其上）
//   page    明细账页面/弹窗背景（同色相更浅的底色）
//   ink     正文文字色（同色相深色调，代替通用灰黑）
//   inkSoft 次要文字色（表头注释、日期、余额列）
//   accent  强调色（按钮、余额高亮、选中描边，配白字）
//   blobA/blobB 卡片光斑颜色（叠在渐变上做层次与动画）
//   badges  推荐搭配的深色 badge 主题 id
export const FAMILIES = [
  {
    id: 'peach', name: '蜜桃',
    card: 'linear-gradient(135deg, #ffe8dd 0%, #ffd7e0 48%, #f3d9ff 100%)',
    page: 'linear-gradient(165deg, #fff6f1 0%, #ffedf2 55%, #faf0ff 100%)',
    ink: '#7e2f3a', inkSoft: '#a05c66', accent: '#b84453',
    blobA: 'rgba(255, 170, 160, 0.55)', blobB: 'rgba(255, 214, 165, 0.50)',
    badges: ['wine', 'caramel', 'graphite', 'magenta'],
  },
  {
    id: 'sakura', name: '樱花',
    card: 'linear-gradient(135deg, #ffe6ee 0%, #ffd9e8 48%, #ffe9dd 100%)',
    page: 'linear-gradient(165deg, #fff5f8 0%, #ffedf3 55%, #fff3ec 100%)',
    ink: '#8e3050', inkSoft: '#aa5f78', accent: '#c14b74',
    blobA: 'rgba(255, 175, 200, 0.55)', blobB: 'rgba(255, 220, 180, 0.50)',
    badges: ['wine', 'berry', 'graphite', 'magenta'],
  },
  {
    id: 'coral', name: '珊瑚橘',
    card: 'linear-gradient(135deg, #ffe8d6 0%, #ffd4ba 50%, #ffc9cf 100%)',
    page: 'linear-gradient(165deg, #fff6ee 0%, #ffeee2 55%, #ffedea 100%)',
    ink: '#8a4122', inkSoft: '#a8694a', accent: '#bd5a2d',
    blobA: 'rgba(255, 180, 130, 0.55)', blobB: 'rgba(255, 150, 150, 0.45)',
    badges: ['caramel', 'wine', 'graphite', 'olive'],
  },
  {
    id: 'cream', name: '奶油',
    card: 'linear-gradient(135deg, #fff3d6 0%, #ffe9b8 50%, #f6ecc9 100%)',
    page: 'linear-gradient(165deg, #fffaeb 0%, #fff4d9 55%, #fbf6e2 100%)',
    ink: '#75570f', inkSoft: '#96792f', accent: '#a3791b',
    blobA: 'rgba(255, 215, 130, 0.50)', blobB: 'rgba(255, 240, 180, 0.60)',
    badges: ['caramel', 'olive', 'graphite', 'pine'],
  },
  {
    id: 'rosegold', name: '玫瑰金',
    card: 'linear-gradient(135deg, #f9dfd6 0%, #f2cfc6 50%, #e8d5dc 100%)',
    page: 'linear-gradient(165deg, #fdf3ef 0%, #f8e9e4 55%, #f3e8ec 100%)',
    ink: '#84483b', inkSoft: '#a37367', accent: '#b56a57',
    blobA: 'rgba(233, 180, 160, 0.55)', blobB: 'rgba(220, 180, 200, 0.50)',
    badges: ['wine', 'graphite', 'berry', 'caramel'],
  },
  {
    id: 'mint', name: '薄荷',
    card: 'linear-gradient(135deg, #dcf5e4 0%, #c2ecd0 48%, #b9e6e0 100%)',
    page: 'linear-gradient(165deg, #f0faf3 0%, #e5f6ea 55%, #e4f5f2 100%)',
    ink: '#1f6247', inkSoft: '#417f64', accent: '#2e7d58',
    blobA: 'rgba(150, 220, 180, 0.50)', blobB: 'rgba(150, 215, 215, 0.50)',
    badges: ['pine', 'teal', 'graphite', 'indigo'],
  },
  {
    id: 'matcha', name: '抹茶',
    card: 'linear-gradient(135deg, #e6ecc8 0%, #d3e0ac 50%, #c9dfa8 100%)',
    page: 'linear-gradient(165deg, #f4f7e4 0%, #ebf2d8 55%, #e9f1d2 100%)',
    ink: '#4f6018', inkSoft: '#6c7c34', accent: '#67761f',
    blobA: 'rgba(185, 205, 120, 0.50)', blobB: 'rgba(150, 205, 150, 0.45)',
    badges: ['olive', 'pine', 'caramel', 'graphite'],
  },
  {
    id: 'apple', name: '青苹果',
    card: 'linear-gradient(135deg, #d9f2cf 0%, #bfe7b8 48%, #c5ecd4 100%)',
    page: 'linear-gradient(165deg, #eef9e9 0%, #e2f4dc 55%, #e5f6ec 100%)',
    ink: '#38661f', inkSoft: '#577f3d', accent: '#4a7f2b',
    blobA: 'rgba(160, 215, 130, 0.50)', blobB: 'rgba(140, 210, 170, 0.45)',
    badges: ['pine', 'olive', 'teal', 'graphite'],
  },
  {
    id: 'sky', name: '天空',
    card: 'linear-gradient(135deg, #dbeafe 0%, #c4dbfe 48%, #cfc8fd 100%)',
    page: 'linear-gradient(165deg, #eff6ff 0%, #e5efff 55%, #eceafd 100%)',
    ink: '#274c88', inkSoft: '#4a6ba0', accent: '#3460ae',
    blobA: 'rgba(150, 190, 250, 0.50)', blobB: 'rgba(185, 160, 250, 0.45)',
    badges: ['indigo', 'navy', 'teal', 'graphite'],
  },
  {
    id: 'mist', name: '雾灰蓝',
    card: 'linear-gradient(135deg, #e3e9f2 0%, #d3dceb 50%, #dde4f0 100%)',
    page: 'linear-gradient(165deg, #f2f5fa 0%, #e9eef6 55%, #edf1f8 100%)',
    ink: '#3b4d64', inkSoft: '#5b6d85', accent: '#4c688f',
    blobA: 'rgba(175, 195, 225, 0.45)', blobB: 'rgba(200, 205, 235, 0.50)',
    badges: ['navy', 'slate', 'indigo', 'graphite'],
  },
  {
    id: 'lavender', name: '薰衣草',
    card: 'linear-gradient(135deg, #e9e2ff 0%, #d9ccfd 48%, #e3d3fb 100%)',
    page: 'linear-gradient(165deg, #f5f1ff 0%, #ede6fe 55%, #f2e9fe 100%)',
    ink: '#533893', inkSoft: '#715cab', accent: '#6548b4',
    blobA: 'rgba(195, 170, 245, 0.50)', blobB: 'rgba(230, 170, 235, 0.40)',
    badges: ['plum', 'indigo', 'berry', 'graphite'],
  },
  {
    id: 'lilac', name: '淡紫灰',
    card: 'linear-gradient(135deg, #ece9f4 0%, #ded8ec 50%, #e6ddf0 100%)',
    page: 'linear-gradient(165deg, #f5f3f9 0%, #edeaf4 55%, #f1ecf6 100%)',
    ink: '#52456a', inkSoft: '#6e6286', accent: '#665689',
    blobA: 'rgba(200, 185, 230, 0.45)', blobB: 'rgba(225, 195, 225, 0.45)',
    badges: ['plum', 'slate', 'berry', 'graphite'],
  },
];

// ── 核算 badge 主题（深色底 + 白字）──────────────────────────
export const BADGES = [
  { id: 'graphite', name: '石墨', css: 'linear-gradient(135deg, #3f4a5a, #262e3b)' },
  { id: 'indigo', name: '靛青', css: 'linear-gradient(135deg, #4062d6, #2b3f92)' },
  { id: 'pine', name: '松针绿', css: 'linear-gradient(135deg, #2e7d4f, #1d5637)' },
  { id: 'wine', name: '酒红', css: 'linear-gradient(135deg, #b23a52, #7e2438)' },
  { id: 'plum', name: '深紫', css: 'linear-gradient(135deg, #7d4bc8, #563193)' },
  { id: 'magenta', name: '洋红', css: 'linear-gradient(135deg, #b03a96, #7c2270)' },
  { id: 'caramel', name: '焦茶', css: 'linear-gradient(135deg, #b06a2e, #7e4718)' },
  { id: 'teal', name: '墨青', css: 'linear-gradient(135deg, #22787f, #135054)' },
  { id: 'slate', name: '深灰', css: 'linear-gradient(135deg, #5b6470, #3a414c)' },
  { id: 'berry', name: '莓紫', css: 'linear-gradient(135deg, #963563, #6a2145)' },
  { id: 'navy', name: '藏蓝', css: 'linear-gradient(135deg, #2f4a7d, #1d3057)' },
  { id: 'olive', name: '橄榄', css: 'linear-gradient(135deg, #6e7a2e, #4b551b)' },
];

export const DEFAULT_FAMILY = 'peach';
export const DEFAULT_BADGE = 'graphite';

export const FAMILY_IDS = FAMILIES.map((f) => f.id);
export const BADGE_IDS = BADGES.map((b) => b.id);

export function getFamily(id) {
  return FAMILIES.find((f) => f.id === id) ?? FAMILIES[0];
}

export function getBadge(id) {
  return BADGES.find((b) => b.id === id) ?? BADGES[0];
}
