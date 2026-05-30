/**
 * src/balance.js — v1.0 数值常量（对齐 BALANCE.md v2.3）
 *
 * 四大功能：
 * - 茶水间咖啡机（路过自动回血）
 * - 厕所彩蛋（连点 5 下进摆烂模式）
 * - XP 升级系统（件数/转速 交替）
 * - B1/B2/B3/B4 四种敌人差异化
 */

// 画布与世界
export const CANVAS_W = 1408;
export const CANVAS_H = 752;

// 时长
export const GAME_DURATION = 60; // s

// 玩家
// 注：SPRITE_PATH 已删除（v2.7：玩家 sprite 由 main.js 角色选择决定）
//     SPRITE_SCALE 仍保留,控制显示尺寸（与 sprite 真实比例无关,只决定宽度）
export const PLAYER = {
  HP_MAX: 10,
  SPEED: 220,           // px/s（按 1408×752 画布）
  INVUL_TIME: 0.6,      // s
  RADIUS: 16,           // 用于碰撞与显示
  START_X_NORM: 0.50,
  START_Y_NORM: 0.50,   // 画面正中（中段水平走廊,无障碍）
  SPRITE_SCALE: 3.5,    // displayW = radius × scale × 2 = 112px（100×100 sprite 显示 112×112）
};

// 武器（AI 工具栏）
// v1.0：开局 3 件（weapon1/2/3.png），第 4 件（weapon4.png）随 Lv.2 升级解锁
export const WEAPON = {
  COUNT: 3,             // 开局 3 件
  ROT_SPEED: 0.5,       // 圈/s（v0.1 调慢:1.0→0.5）
  RADIUS: 80,           // 旋转半径
  SIZE: 36,             // 显示尺寸
  DAMAGE: 3,            // v1.0 调易:2→3,打败更快
  HIT_COOLDOWN: 0.5,
  // 升级上限
  MAX_COUNT: 4,                  // 上限 4 件（解锁后整圈 4 个 AI 图标）
  MAX_SPEED: 2.5,                // 圈/s
  SPEED_PER_UPGRADE: 0.20,
  // 4 张独立 sprite（按 iconIdx 取）
  SPRITE_PATHS: [
    'assets/weapon1.png',
    'assets/weapon2.png',
    'assets/weapon3.png',
    'assets/weapon4.png',
  ],
};

// XP / 升级
// 第 N 级到 N+1 级需要 (10 + (N-1)*2) 次打败
export const XP = {
  FORMULA: (n) => 10 + (n - 1) * 2,
  MAX_LEVEL: 14, // Lv.14 = 满级（含件数 + 转速封顶）
};

// 摸鱼值 → 咖啡（v1.0 调整：必须到咖啡机喝，HP +4）
export const MOYU = {
  PER_COFFEE: 20,       // 攒满 20 = 一杯咖啡 ready
  HEAL_AMOUNT: 4,       // 喝一杯 +4 HP（v1.0：1→4）
};

// 茶水间咖啡机（v1.0：不再自动回血,只是"消费点"）
// 流程：摸鱼值 ≥ 20 → 咖啡机发光 → 玩家走进半径自动喝 → +4 HP, moyu -= 20
export const COFFEE_MACHINE = {
  ANIM_DURATION: 0.8,   // 咖啡杯上升动画时长（秒）
};

// 厕所彩蛋
export const TOILET_EGG = {
  CLICKS_REQUIRED: 5,
  CLICK_WINDOW: 5,
  CLICK_RADIUS_PX: 140, // v1.0 改大:80→140（更容易点中）
  CHAOS_DURATION: 10,
  CHAOS_WEAPON_MULT: 100,
  CHAOS_ENEMY_SPEED_MULT: 5,
  CHAOS_SPAWN_MULT: 5,
};

// 4 种敌人（v1.0 简化：只保留速度 / 血量 / 伤害的差异化,不要特殊行为）
// v2.5 叙事重塑：新增 NAME / SPAWN_TAUNT / KILL_TAUNTS 字段（不改数值）
export const ENEMY_B1 = {
  ID: 'b1',
  COLOR: '#5b2b8a',
  LABEL: 'B1',
  NAME: '绩效面谈',
  SPAWN_TAUNT: '这季度只能给你 B',
  KILL_TAUNTS: [
    '年底优化名单见',
    '你态度有问题',
    '期望值不够',
    'OKR 完成度 60%',
    '我们考虑下调一级',
    '明年 P 序列冻结',
  ],
  HP: 4,                // v1.0 微调:3→4（稍难）
  SPEED: 85,
  CONTACT_DMG: 2,
  RADIUS: 18,
  XP_DROP: 1,
  SPRITE_PATH: 'assets/enemy_b1.png',
  SPRITE_SCALE: 2.22,   // RADIUS 18 → 显示宽 80px,与 B4 对齐
};

export const ENEMY_B2 = {
  ID: 'b2',
  COLOR: '#0a8a5e',
  LABEL: 'B2',
  NAME: '画饼大师',
  SPAWN_TAUNT: '再扛半年期权兑现',
  KILL_TAUNTS: [
    '明年咱们就上市',
    '上市了你能买套房',
    '这事关公司未来',
    '再加一把劲',
    '年终包够你过年',
    '期权 1:100 拆分',
  ],
  HP: 6,                // v1.0 微调:5→6（稍难）
  SPEED: 50,
  CONTACT_DMG: 1,
  RADIUS: 20,
  XP_DROP: 1,
  SPRITE_PATH: 'assets/enemy_b2.png',
  SPRITE_SCALE: 2.0,    // RADIUS 20 → 显示宽 80px,与 B4 对齐
};

export const ENEMY_B3 = {
  ID: 'b3',
  COLOR: '#b89000',
  LABEL: 'B3',
  NAME: '遇事甩锅',
  SPAWN_TAUNT: '这个不归我管',
  KILL_TAUNTS: [
    '这事你应该早提一周',
    '我以为你会做',
    '之前没人告诉我',
    '锅不该我背',
    '你 owner 这事吧',
    '我这边一直在等你',
  ],
  HP: 7,                // v1.0 微调:6→7（稍难,仍是最肉的）
  SPEED: 65,
  CONTACT_DMG: 1,
  RADIUS: 20,
  XP_DROP: 2,
  SPRITE_PATH: 'assets/enemy_b3.png',
  SPRITE_SCALE: 2.0,    // RADIUS 20 → 显示宽 80px,与 B4 对齐
};

export const ENEMY_B4 = {
  ID: 'b4',
  COLOR: '#d62828',
  LABEL: 'B4',
  NAME: '死催进度',
  SPAWN_TAUNT: '今晚 9 点前必须上线',
  KILL_TAUNTS: [
    '客户在催了！！！',
    '明早 review，今晚必须出',
    'P0 事故，马上来',
    '现在！立刻！马上！',
    '我已经回复客户了',
    '来不及解释了快',
  ],
  HP: 2,                // v1.0 调易:4→2,真正的玻璃大炮
  SPEED: 140,
  CONTACT_DMG: 2,       // v1.0 调易：3→2（仍是最快敌人,但不再单击 30% HP）
  RADIUS: 16,
  XP_DROP: 1,
  SPRITE_PATH: 'assets/enemy_b4.png',
  SPRITE_SCALE: 2.5,
};

// 难度曲线（按时间段）
// rate = 总刷新频率（只/s）；weights = 各类型权重百分比
// 敌人入场时间表（用户指定）：
//   B1 0s+, B2 3s+, B3 6s+（9s 起占比拉高）, B4 12s+
export const DIFFICULTY_CURVE = [
  { until: 3,  cap: 6,  rate: 1.4, weights: { b1: 100 } },                        // 0-3s: 仅 B1, 让玩家熟悉
  { until: 6,  cap: 10, rate: 1.6, weights: { b1: 70, b2: 30 } },                 // 3s+: B2 入场
  { until: 9,  cap: 12, rate: 1.8, weights: { b1: 55, b2: 25, b3: 20 } },         // 6s+: B3 加入(占比低)
  { until: 12, cap: 14, rate: 1.9, weights: { b1: 45, b2: 20, b3: 35 } },         // 9s+: B3 占比上升(35%)
  { until: 20, cap: 18, rate: 2.0, weights: { b1: 35, b2: 20, b3: 25, b4: 20 } }, // 12s+: B4 入场, 4 种全员
  { until: 30, cap: 24, rate: 2.1, weights: { b1: 25, b2: 15, b3: 20, b4: 40 } },
  { until: 40, cap: 28, rate: 2.4, weights: { b1: 18, b2: 12, b3: 10, b4: 60 } },
  { until: 50, cap: 32, rate: 2.8, weights: { b1: 12, b2: 8,  b3: 10, b4: 70 } },
  { until: 60, cap: 38, rate: 3.3, weights: { b1: 8,  b2: 7,  b3: 5,  b4: 80 } },
];
