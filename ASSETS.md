# Assets Checklist — 职场牛鬼蛇神大作战 v2.7

> 极简素材清单。所有视觉资产统一：8-bit 像素风、DawnBringer 32 调色板、PNG 透明背景、nearest neighbor 缩放。

---

## 总览

| 阶段 | PNG 新增 | PNG 累计 | 音频累计 | 字体 | 状态 |
|---|---|---|---|---|---|
| 已有 ✓ | — | **15** | 0 | 0 | 完成 |
| 失败专属形象 | +2 | 17 | 0 | 0 | 待生成 |
| 启动页背景 | +1 | 18 | 0 | 0 | 待生成 |
| v0.1 音频 | — | 18 | 5 SFX + 1 BGM | 1 | 待生成 |
| v1.0 完整 | +7 | 25 | 9 SFX + 2 BGM | 1 | 待生成 |
| v2.0+ 选配 | 按需 | — | — | — | 远期 |

> 数字按"PNG 文件数"统计：1 个 sprite sheet（含多帧动画）= 1 个文件。

---

## 1. 已有素材 ✓（15 张 PNG）

### 1.1 场景 / 互动物（3 张）

| 资产 | 路径 | 源图尺寸 | 用途 |
|---|---|---|---|
| 办公室背景 | `assets/workspace.png` | 2816×1504 | 含咖啡机、WC 门、4 工位群、中央会议桌 |
| 咖啡杯 | `assets/coffee.png` | 2048×2048 | 摸鱼值满 20 / Token 充电触发的飞入动画素材 |
| 离职信彩蛋图 | `assets/ui_resignation_letter.png` | 100×100 | 像素风信封 + "离职信"信纸字样，连点 5 下 WC 后居中弹出 1s 淡出 |

### 1.2 玩家角色（4 张，男女各 idle + win）

| 资产 | 路径 | 源图尺寸 | 用途 |
|---|---|---|---|
| 打工男 idle | `assets/player-man.png` | 100×100 | 启动页角色选择 + 游戏内走位形象（v2.7 默认 112×112 显示）|
| 打工男 胜利 | `assets/player-man-win.png` | 100×100 | 胜利结算页 endAvatar（含彩蛋胜利复用 + 装饰特效叠加）|
| 打工女 idle | `assets/player-woman.png` | 100×100 | 启动页角色选择 + 游戏内走位形象 |
| 打工女 胜利 | `assets/player-woman-win.png` | 100×100 | 胜利结算页 endAvatar |

### 1.3 武器（4 张 AI 工具图标）

| 资产 | 路径 | 用途 |
|---|---|---|
| AI 工具 #1–#4 | `assets/weapon1.png` ~ `weapon4.png` | 玩家身边旋转的 AI 提效图标，开局 3 件，Lv.2 升级解锁第 4 件 |

### 1.4 敌人（4 张 sprite）

| 资产 | 路径 | 源图尺寸 | 形象 |
|---|---|---|---|
| B1 绩效面谈 | `assets/enemy_b1.png` | 621×830 | 黑帮老大型肥胖高管 + 粗金链 + 凶狠 |
| B2 画饼大师 | `assets/enemy_b2.png` | 621×830 | 傲慢中年女高管 + 单手托举"大饼" |
| B3 遇事甩锅 | `assets/enemy_b3.png` | 621×830 | 慌乱西装职员 + 满头汗 + 推沉重文件堆 |
| B4 死催进度 | `assets/enemy_b4.png` | 621×830 | 愤怒流汗 + 持 DEADLINE NOW! 闹钟 |

> **核心闭环已通**：启动 → 角色选择 → 战斗 → Token 充电 → 彩蛋 → 结算全流程能跑。

---

## 2. v2.7 真实缺口（必做项，3 张视觉）

### 2.1 失败专属形象（2 张）

| ID | 用途 | 尺寸 | 形象建议 |
|---|---|---|---|
| `assets/player-man-lose.png` | 失败结算页 endAvatar 失败版 | 100×100 | 被打趴 / 头发凌乱 / 黑眼圈加深 / TIRED 背心更脏 |
| `assets/player-woman-lose.png` | 失败结算页 endAvatar 失败版 | 100×100 | 同上女版，跟 idle/win 同绘画风格 |

> 当前失败时 endAvatar 隐藏只显示文字，加这 2 张可与胜利形象反差强烈。

### 2.2 启动页背景插画（1 张）

| ID | 用途 | 尺寸 |
|---|---|---|
| `assets/ui_start_bg.png` | 启动页全屏背景，衬托 h2 + 角色选择按钮 + 现有 lead 文字 | 1408×752 |

> Prompt 已写在 [`ILLUSTRATIONS_PROMPTS.md`](./ILLUSTRATIONS_PROMPTS.md) §1（办公楼大堂 + 打卡机 + 电梯门 + 周一忧郁）。

> 彩蛋胜利不出新图：复用 `-win.png` + 代码层叠加"霓虹粉光环 + 飘离职信"装饰特效（详见 §6 不出图清单）。

---

## 3. 完整化增量（v1.0，按性价比排序）

### 3.1 移动端必需（出图 = 解锁手机玩法，2 张）

| ID | 用途 | 尺寸 |
|---|---|---|
| `ui_joystick_base.png` | 手机虚拟摇杆底盘 | 100×100 |
| `ui_joystick_knob.png` | 手机虚拟摇杆头 | 50×50 |

### 3.2 锦上添花（5 张，可砍）

| ID | 用途 | 尺寸 | 备注 |
|---|---|---|---|
| `vfx_levelup_ripple_*.png` | 升级波纹特效 8 帧 | 全屏 | 也可 Canvas 绘制 |
| `ui_taunt_red.png` / `_green.png` | 反讽气泡底框 9-slice（敌方红 / 玩家绿） | 200×40 | 当前 Canvas 黑底 + 描边已够用 |
| `ui_toilet.png` | 茶水间厕所图标按钮 | 24×24 | 当前用 workspace 自带 WC 门 + 代码判定 |
| `ui_coffee_overhead.png` | Token 充电半径内头顶 ☕ 提示 | 16×16 | 可省 |

---

## 4. 音频（零产出 — 接入立刻有"游戏感"）

### 4.1 v0.1 必需（5 SFX + 1 BGM）

| ID | 用途 | 来源 |
|---|---|---|
| `sfx_kill.wav` | 打败音效 | ElevenLabs SFX |
| `sfx_hurt.wav` | 玩家受击 | ElevenLabs SFX |
| `sfx_levelup.wav` | 升级 jingle | ElevenLabs SFX |
| `sfx_win.wav` | 胜利提示（飞书消息风格） | ElevenLabs SFX |
| `sfx_lose.wav` | 失败提示（老板冷笑） | ElevenLabs SFX |
| `bgm_main.mp3` | 主 BGM，60–90s 循环 | Suno V3 |

### 4.2 v1.0 增量（4 SFX + 1 BGM）

| ID | 用途 | 来源 |
|---|---|---|
| `sfx_ai_ping.wav` | AI 工具命中音 | ElevenLabs SFX |
| `sfx_coffee_pickup.wav` | Token 充电音 | ElevenLabs SFX |
| `sfx_toilet_flush.wav` | 厕所点击反馈 | ElevenLabs SFX |
| `sfx_resignation.wav` | 离职信彩蛋触发 | ElevenLabs SFX |
| `bgm_chaos.mp3` | 摆烂模式 BGM，10s 循环，癫狂电子摇滚 | Suno V3 |

---

## 5. 字体（1 个）

| 名称 | 用途 | 来源 |
|---|---|---|
| Fusion Pixel | 中文像素字体：UI / 反讽气泡 / 飘字 | [GitHub 开源](https://github.com/TakWolf/fusion-pixel-font) |

---

## 6. 不出图，由代码实现

| 元素 | 实现方式 |
|---|---|
| HUD Token 进度条（青 / 50% 橙 / 30% 红） | Canvas 直绘 |
| HUD 摸鱼值进度条（绿 / ready 金黄） | Canvas 直绘 |
| Player 头顶 mini Token 条 | Canvas 直绘，同 HUD 配色 |
| 整顿职场倒计时（脉冲粉色 + 末段红黄闪） | Canvas 直绘 + 圆角矩形 fallback |
| 离职信弹出动画（0.7s 放大 + 0.3s 淡出） | `_renderResignationLetter` 调 `ui_resignation_letter.png` |
| 打败绿色飘字（"已读不回 / OOO" 等） | Fusion Pixel 字体 + 上浮淡出 |
| 敌人出场反讽气泡 | Canvas 黑底圆角 + 描边 + 字体渲染 |
| 升级飘字（"Sonnet → Opus" 等 AI 模型升级） | Canvas 字体直绘 |
| **彩蛋胜利装饰特效**（霓虹粉光环 + 飘离职信） | 在 `player-X-win.png` 之上叠加 Canvas 粒子 + 离职信图缩略 |
| 场景内功能性边界（打印机掩体、会议室）| 已含在 `workspace.png` + 代码碰撞 |
| 受击 / 减速 / 摆烂 状态滤镜 | `ctx.filter = brightness / hue-rotate / saturate` |

---

## 7. v2.0+ 选配（远期 / 社交留存阶段）

- 排行榜 UI（飞书风格）
- 分享卡片模板（截图 + 摸鱼值 + 等级）
- 玩家换装（多职业、节日皮肤、第 3-N 个角色）
- 周常挑战图标

---

## 8. 命名规范

- **角色档案**（含状态后缀）用中划线：`player-man.png` / `player-man-win.png` / `player-man-lose.png`
- **其他素材**用下划线：`enemy_b1.png` / `ui_resignation_letter.png` / `weapon1.png`
- **类别前缀**：`player-` / `enemy_` / `weapon` (编号) / `ui_` / `vfx_` / `sfx_` / `bgm_`
- **多帧序列**：`vfx_xxx_*.png` 表示同一动画的多个帧文件
- **尺寸**：像素，格式 `width × height`，与 Canvas 坐标系一致

---

## 9. 生成 pipeline

| 类别 | 工具链 |
|---|---|
| 角色失败形象 `player-X-lose.png` | 跟现有 player-X.png 同作者 / 同风格，保证一致性 |
| 启动页全屏 `ui_start_bg.png` | 见 [`ILLUSTRATIONS_PROMPTS.md`](./ILLUSTRATIONS_PROMPTS.md) §1 — Midjourney v6 / DALL·E 3 |
| 摇杆 / UI 小图 | Figma + 像素字体直出，导出 PNG |
| SFX | ElevenLabs Sound Effects |
| BGM | Suno V3，prompt：`chiptune 8-bit office survival, BPM 130, loopable` |

---

## 10. 出图后接入步骤

### 失败形象接入
1. 把 `player-man-lose.png` / `player-woman-lose.png` 丢进 `assets/`
2. `src/main.js` 在 `CHAR_PROFILES` 中加 `loseUrl`：
   ```js
   man:   { idle: ..., winUrl: '...', loseUrl: 'assets/player-man-lose.png', label: '打工男' },
   ```
3. `game.start(...)` 接收 `loseUrl` 参数，结算时按 state 选用：
   - `state === 'lose'` → endAvatar 用 loseUrl
   - `state === 'win'` → endAvatar 用 winUrl

### 启动页背景接入
1. 把 `ui_start_bg.png` 丢进 `assets/`
2. `index.html` `#start-overlay` 的 CSS 加 `background-image: url(assets/ui_start_bg.png); background-size: cover;`
3. 调整 overlay 半透黑度（0.78 → 0.55）让背景透出来

### 彩蛋胜利装饰特效接入（不出图）
1. `src/game.js` `_showEndScreen` 检测 `triggeredEgg` 时给 endAvatar 加 CSS 类 `.with-resignation-aura`
2. CSS 加霓虹粉光环 + 几个小尺寸 `ui_resignation_letter.png` 飘落动画

---

*本清单同步 DESIGN.md v2.7。新增 / 删减元素时回更本文档。*
