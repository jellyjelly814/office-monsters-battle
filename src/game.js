/**
 * src/game.js — v1.0 主循环 + 状态机
 *
 * v1.0 调整版：
 *   - 4 种敌人只有 HP / 速度 / 伤害差异（无远程 / 反弹等特殊行为）
 *   - 摸鱼值 ≥ 20 → 咖啡机发光,玩家走过去自动喝一杯 +4 HP
 *   - 厕所连点点击半径加大到 140,每次点击有视觉反馈
 */

import {
  CANVAS_W, CANVAS_H, GAME_DURATION,
  PLAYER, MOYU, COFFEE_MACHINE, TOILET_EGG,
  WEAPON, XP, DIFFICULTY_CURVE,
} from './balance.js';
import { Player } from './player.js';
import { Weapon } from './weapon.js';
import { spawnEnemy, pickSpawnPoint } from './enemy.js';
import { recomputeFlowField } from './pathfinding.js';
import { Progression } from './progression.js';
import { TRIGGERS } from './map.js';

function getTriggerPx(id) {
  const tr = TRIGGERS.find(t => t.id === id);
  if (!tr) return null;
  return {
    x: tr.x * CANVAS_W,
    y: tr.y * CANVAS_H,
    r: tr.radius * CANVAS_W,
  };
}

/** 按权重字典随机抽 key（{b1:45, b2:20, ...}）*/
function pickByWeights(weights) {
  let total = 0;
  for (const k in weights) total += weights[k];
  let r = Math.random() * total;
  for (const k in weights) {
    r -= weights[k];
    if (r <= 0) return k;
  }
  return Object.keys(weights)[0]; // 兜底
}

export class Game {
  constructor(canvas, images, callbacks = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.images = images || {};
    this.onStateChange = callbacks.onStateChange || (() => {});
    this.onChaosChange = callbacks.onChaosChange || (() => {});
    this._audioChaosOn = false;

    this.state = 'idle';
    this.elapsed = 0;
    this.spawnTimer = 0;
    this.kills = 0;
    this.player = null;
    this.weapon = null;
    this.progression = null;
    this.enemies = [];

    this.moyu = 0;
    this.coffeeAnims = []; // [{startX,startY,endX,endY,startTime,duration}]
    this.coffeeWasReady = false; // 上一帧 ready 状态,用于触发 "咖啡 ready!" 提示

    this.coffeeTriggerPx = getTriggerPx('coffee_machine');
    this.toiletTriggerPx = getTriggerPx('toilet_door');
    this.toiletClicks = [];
    this.chaosUntil = 0;
    this.resignationAnim = null; // {startTime, duration}：彩蛋触发时居中放大的离职信

    this.flashTexts = [];
    this.spawnedKinds = new Set();
    this.lastHitBy = null;

    this.lastFrameTime = 0;
  }

  start(playerSprite, winUrl, loseUrl) {
    this.state = 'playing';
    this.elapsed = 0;
    this.spawnTimer = 0;
    this.kills = 0;
    this.moyu = 0;
    this.coffeeAnims = [];
    this.coffeeWasReady = false;
    this.toiletClicks = [];
    this.chaosUntil = 0;
    this.resignationAnim = null;
    this.flashTexts = [];
    this.spawnedKinds = new Set();
    this.lastHitBy = null;
    // v2.7：玩家 sprite 由角色选择决定;同时记下胜利 / 失败头像 URL 供结算页用
    this.winAvatarUrl = winUrl || null;
    this.loseAvatarUrl = loseUrl || null;
    this.player = new Player(playerSprite || this.images.player);
    this.weapon = new Weapon(this.player, this.images.weaponSprites);
    this.progression = new Progression(this.weapon);
    this.enemies = [];
    this.lastFrameTime = performance.now();
    requestAnimationFrame(this._loop);
  }

  onCanvasClick(canvasX, canvasY) {
    if (this.state !== 'playing') return;
    if (!this.toiletTriggerPx) return;
    const dx = canvasX - this.toiletTriggerPx.x;
    const dy = canvasY - this.toiletTriggerPx.y;
    if (dx * dx + dy * dy <= TOILET_EGG.CLICK_RADIUS_PX * TOILET_EGG.CLICK_RADIUS_PX) {
      this._registerToiletClick();
    }
  }

  _registerToiletClick() {
    const now = this.elapsed;
    this.toiletClicks = this.toiletClicks.filter(t => now - t < TOILET_EGG.CLICK_WINDOW);
    this.toiletClicks.push(now);
    // 视觉反馈:每次点击在厕所位置飘 "+1"
    this.flashTexts.push({
      text: `🚽 摸鱼 ${this.toiletClicks.length}/${TOILET_EGG.CLICKS_REQUIRED}`,
      x: this.toiletTriggerPx.x,
      y: this.toiletTriggerPx.y - 40 - this.toiletClicks.length * 8,
      color: '#7cf7ff',
      until: now + 0.7,
    });
    if (this.toiletClicks.length >= TOILET_EGG.CLICKS_REQUIRED) {
      this._triggerChaos(now);
      this.toiletClicks = [];
    }
  }

  _triggerChaos(now) {
    this.chaosUntil = now + TOILET_EGG.CHAOS_DURATION;
    this.player.forcedInvul = true;
    this.resignationAnim = { startTime: now, duration: 1.0 };
    this.flashTexts.push({
      text: '📩 已发送辞职信！',
      x: CANVAS_W / 2, y: CANVAS_H / 2,
      color: '#ffcc00',
      until: now + 1.6,
      large: true,
    });
  }

  _isInChaos() { return this.elapsed < this.chaosUntil; }

  _loop = (now) => {
    const dtMs = now - this.lastFrameTime;
    this.lastFrameTime = now;
    const dt = Math.min(dtMs / 1000, 0.05);

    if (this.state === 'playing') {
      this.update(dt);
    }
    this.render();

    if (this.state === 'playing') {
      requestAnimationFrame(this._loop);
    } else {
      this._showEndScreen();
    }
  };

  update(dt) {
    this.elapsed += dt;
    const now = this.elapsed;

    const inChaos = this._isInChaos();
    if (inChaos !== this._audioChaosOn) {
      this._audioChaosOn = inChaos;
      this.onChaosChange(inChaos);
    }
    if (!inChaos && this.player.forcedInvul) {
      this.player.forcedInvul = false;
    }
    const enemySpeedMult = inChaos ? TOILET_EGG.CHAOS_ENEMY_SPEED_MULT : 1;
    const weaponSpeedMult = inChaos ? TOILET_EGG.CHAOS_WEAPON_MULT : 1;
    const spawnMult = inChaos ? TOILET_EGG.CHAOS_SPAWN_MULT : 1;

    recomputeFlowField(this.player.x, this.player.y);
    this.player.update(dt, now);

    this.weapon.update(dt, weaponSpeedMult);
    const { killCount, killedXp, killedAt } = this.weapon.checkCollisions(this.enemies, now);
    if (killCount > 0) {
      this.kills += killCount;
      this.moyu += killCount;
      const newLevelUps = this.progression.addXp(killedXp, now);
      this._showLevelUpFlashes(newLevelUps, now);
      if (killedAt) {
        for (const pos of killedAt) {
          this.flashTexts.push({
            text: '摸鱼值+1',
            x: pos.x,
            y: pos.y - 32,
            color: '#ffe066',
            until: now + 1.0,
          });
        }
      }
    }

    // 咖啡机 ready 切换提示
    const isReady = this.moyu >= MOYU.PER_COFFEE;
    if (isReady && !this.coffeeWasReady) {
      this.flashTexts.push({
        text: '☕ Token 急救包 ready · 走到咖啡机充电',
        x: this.coffeeTriggerPx.x,
        y: this.coffeeTriggerPx.y + 80,
        color: '#ffcc66',
        until: now + 2.0,
      });
    }
    this.coffeeWasReady = isReady;

    // 玩家接触敌人
    const ctxObj = { enemySpeedMult };
    for (const e of this.enemies) {
      e.update(dt, now, this.player, ctxObj);
      if (!e.dead && e.touchesPlayer(this.player)) {
        this.player.takeHit(e.contactDmg, now);
        this.lastHitBy = e;
      }
    }

    this.enemies = this.enemies.filter(e => !e.dead);

    this._updateCoffeeMachine(now);
    this._updateSpawner(dt, spawnMult);

    this.flashTexts = this.flashTexts.filter(f => f.until > now);
    this.coffeeAnims = this.coffeeAnims.filter(a => now - a.startTime < a.duration);

    if (this.player.isDead()) {
      this.state = 'lose';
      this.onStateChange('lose');
    } else if (this.elapsed >= GAME_DURATION) {
      this.state = 'win';
      this.onStateChange('win');
    }
  }

  _updateCoffeeMachine(now) {
    if (!this.coffeeTriggerPx) return;
    // 需要 ready (摸鱼值 >= 20) + 玩家在咖啡机半径内 → 自动消费
    if (this.moyu < MOYU.PER_COFFEE) return;
    const dx = this.player.x - this.coffeeTriggerPx.x;
    const dy = this.player.y - this.coffeeTriggerPx.y;
    const r = this.coffeeTriggerPx.r;
    if (dx * dx + dy * dy > r * r) return;
    // 喝一杯
    this.moyu -= MOYU.PER_COFFEE;
    this.player.heal(MOYU.HEAL_AMOUNT);
    // 咖啡杯上升动画（从咖啡机到玩家头顶,渐隐渐放大）
    this.coffeeAnims.push({
      startX: this.coffeeTriggerPx.x,
      startY: this.coffeeTriggerPx.y,
      endX: this.player.x,
      endY: this.player.y - 60,
      startTime: now,
      duration: COFFEE_MACHINE.ANIM_DURATION,
    });
    // 拆成两条独立飘字,主题色对齐进度条
    this.flashTexts.push({
      text: `Token + ${MOYU.HEAL_AMOUNT}`,
      x: this.player.x,
      y: this.player.y - 50,
      color: '#7cf7ff',                  // 青色,贴 Token 进度条
      until: now + 1.0,
      large: true,
    });
    this.flashTexts.push({
      text: `班味 + ${MOYU.HEAL_AMOUNT}`,
      x: this.player.x,
      y: this.player.y - 20,
      color: '#ffcc66',                  // 金黄,贴摸鱼/咖啡 ready 主题
      until: now + 1.0,
      large: true,
    });
  }

  _updateSpawner(dt, spawnMult) {
    const seg = DIFFICULTY_CURVE.find(s => this.elapsed < s.until)
                || DIFFICULTY_CURVE[DIFFICULTY_CURVE.length - 1];
    const cap = seg.cap;
    const rate = seg.rate * spawnMult;

    this.spawnTimer += dt;
    const interval = 1 / rate;
    while (this.spawnTimer >= interval && this.enemies.length < cap) {
      this.spawnTimer -= interval;
      const kind = pickByWeights(seg.weights);
      const p = pickSpawnPoint();
      const enemy = spawnEnemy(kind, p.x, p.y);
      this.enemies.push(enemy);
      // 每种敌人首次出场:标记 spawnTime + isFirstOfKind,enemy.render() 会在出生 2s 后
      // 自动在它头顶画"NAME · 口头禅"气泡（持续 3s）
      if (!this.spawnedKinds.has(kind) && enemy.name) {
        this.spawnedKinds.add(kind);
        enemy.spawnTime = this.elapsed;
        enemy.isFirstOfKind = true;
      }
    }
  }

  _showLevelUpFlashes(newLevelUps, now) {
    const COUNT_TAUNTS = [
      'MiniMax 新人到岗 +1',
      'MiniMax 参战就位 +1',
      'MiniMax 正式上岗 +1',
      'MiniMax 上手开工 +1',
      'MiniMax 全力干活 +1',
      'MiniMax 组队配合 +1',
      'MiniMax 正式入队 +1',
      'MiniMax 内测解锁 +1',
    ];
    const SPEED_TAUNTS = [
      'AI 上下文 +100K',
      'Token 输出 +20%',
      'Thinking 模式开启',
      'Sonnet → Opus 升级',
      'context engineering 见效',
      '推理速度翻倍',
    ];
    const MAX_TAUNTS = [
      '🤖 AI 小队全员满编 · 你已成为 AI 包工头',
      '🤖 AI 小队全员满编 · 班味浓度归零中',
      '🤖 AI 小队全员满编 · 老板已读未回',
      '🤖 AI 小队全员满编・摸鱼自由达成',
    ];
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    for (const r of newLevelUps) {
      let text;
      if (r.type === 'count') text = pick(COUNT_TAUNTS);
      else if (r.type === 'count_max') text = pick(MAX_TAUNTS);
      else text = `${pick(SPEED_TAUNTS)}（旋转 ${r.value.toFixed(2)}x）`;
      this.flashTexts.push({
        text,
        x: this.player.x, y: this.player.y - 60,
        color: '#ffcc00',
        until: now + 1.5,
        large: true,
      });
    }
  }

  // ============ 渲染 ============
  render() {
    const ctx = this.ctx;
    if (this.images.bg && this.images.bg.complete) {
      ctx.drawImage(this.images.bg, 0, 0, CANVAS_W, CANVAS_H);
    } else {
      ctx.fillStyle = '#3a2a1a';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }
    if (!this.player) return;

    if (this._isInChaos()) {
      ctx.fillStyle = 'rgba(255, 80, 200, 0.15)';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }

    this._renderTriggerHints();
    for (const e of this.enemies) e.render(ctx, this.elapsed);
    this.weapon.render(ctx);
    this.player.render(ctx, this.elapsed);
    this._renderPlayerTokenBar();
    this._renderCoffeeAnims();
    this._renderFlashTexts();
    this._renderResignationLetter();
    this._renderHUD();
    // 虚拟摇杆（最上层,任何状态都画）
    if (this.joystick) this.joystick.render(this.ctx);
  }

  _renderTriggerHints() {
    const ctx = this.ctx;

    // 咖啡机：只在 ready 时发光
    if (this.coffeeTriggerPx) {
      const t = this.coffeeTriggerPx;
      const ready = this.moyu >= MOYU.PER_COFFEE;
      if (ready) {
        // 脉冲光晕
        const pulse = (Math.sin(this.elapsed * 5) + 1) / 2;
        const radius = t.r + 10 + pulse * 18;
        const grad = ctx.createRadialGradient(t.x, t.y, t.r * 0.5, t.x, t.y, radius);
        grad.addColorStop(0, `rgba(255, 220, 80, ${0.35 + 0.25 * pulse})`);
        grad.addColorStop(1, 'rgba(255, 220, 80, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(t.x, t.y, radius, 0, Math.PI * 2);
        ctx.fill();
        // 内边虚线提示走过来
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffcc00';
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // 厕所：彩蛋不对外提示,玩家点过一次后才显示进度
    if (this.toiletTriggerPx && this.toiletClicks.length > 0) {
      const t = this.toiletTriggerPx;
      const label = `🚽 ${this.toiletClicks.length}/${TOILET_EGG.CLICKS_REQUIRED}`;
      ctx.font = 'bold 16px -apple-system, monospace';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.strokeText(label, t.x, t.y - 12);
      ctx.fillText(label, t.x, t.y - 12);
    }
  }

  _renderCoffeeAnims() {
    const ctx = this.ctx;
    const now = this.elapsed;
    for (const a of this.coffeeAnims) {
      const t = (now - a.startTime) / a.duration;
      if (t < 0 || t > 1) continue;
      const easeT = 1 - (1 - t) * (1 - t); // easeOut
      const x = a.startX + (a.endX - a.startX) * easeT;
      const y = a.startY + (a.endY - a.startY) * easeT;
      const alpha = 1 - t;
      const size = 48 + t * 24; // 越升越大
      ctx.globalAlpha = alpha;
      if (this.images.coffee && this.images.coffee.complete) {
        ctx.drawImage(this.images.coffee, x - size / 2, y - size / 2, size, size);
      } else {
        ctx.font = `bold ${Math.round(size)}px -apple-system`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#a89060';
        ctx.fillText('☕', x, y);
      }
    }
    ctx.globalAlpha = 1;
  }

  _renderFlashTexts() {
    const ctx = this.ctx;
    const now = this.elapsed;
    for (const f of this.flashTexts) {
      const total = f.until - (f.until - 1.0); // 假定 1s 渐隐
      const elapsedFrac = 1 - (f.until - now);
      const alpha = Math.max(0, 1 - elapsedFrac);
      ctx.globalAlpha = alpha;
      ctx.font = f.large ? 'bold 28px -apple-system, "PingFang SC", monospace'
                         : 'bold 16px -apple-system, "PingFang SC", monospace';
      ctx.fillStyle = f.color || '#fff';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = f.large ? 5 : 3;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const lift = elapsedFrac * 30;
      ctx.strokeText(f.text, f.x, f.y - lift);
      ctx.fillText(f.text, f.x, f.y - lift);
    }
    ctx.globalAlpha = 1;
  }

  /** 彩蛋触发：离职信居中放大 1s 后消失。前 70% 时长 ease-out 放大,后 30% 渐隐。*/
  _renderResignationLetter() {
    if (!this.resignationAnim) return;
    const t = (this.elapsed - this.resignationAnim.startTime) / this.resignationAnim.duration;
    if (t >= 1) {
      this.resignationAnim = null;
      return;
    }
    const img = this.images.resignation;
    if (!img || !img.complete) return;

    const ctx = this.ctx;
    const MAX_SIZE = 480;
    let scale, alpha;
    if (t < 0.7) {
      const grow = t / 0.7;
      scale = 1 - (1 - grow) * (1 - grow); // ease-out
      alpha = 1;
    } else {
      scale = 1;
      alpha = 1 - (t - 0.7) / 0.3;
    }
    const size = MAX_SIZE * scale;
    const cx = CANVAS_W / 2;
    const cy = CANVAS_H / 2;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.imageSmoothingEnabled = false; // 保持像素风锐边
    ctx.drawImage(img, cx - size / 2, cy - size / 2, size, size);
    ctx.restore();
  }

  /** Player 头顶 Token 条 = HP 可视化（10 起递减），配色与顶部 HUD 的 Token 进度条完全一致 */
  _renderPlayerTokenBar() {
    if (!this.player) return;
    const ctx = this.ctx;
    const hp = Math.max(0, this.player.hp);
    const hpMax = PLAYER.HP_MAX;
    const ratio = hp / hpMax;

    // 定位：player sprite 视觉上沿之上 12px;visualTop 由 player.render() 写入
    const top = (this.player.visualTop != null ? this.player.visualTop : this.player.y - 50) - 12;
    const barW = 60, barH = 6;
    const barX = this.player.x - barW / 2;
    const barY = top;

    // 配色与 HUD 完全一致：主色青、50% 橙、30% 红
    let barColor = '#7cf7ff';
    if (ratio <= 0.3) barColor = '#ff5a3c';
    else if (ratio <= 0.5) barColor = '#ffaa3c';

    // 半透明黑底衬托
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);
    // 填充
    ctx.fillStyle = barColor;
    ctx.fillRect(barX, barY, barW * ratio, barH);
    // 边框
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);

    // 数值小标签（条上方）格式 "N / 10 B" 与 HUD 一致
    ctx.font = 'bold 10px -apple-system, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = `${hp} / ${hpMax} B`;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.strokeText(label, this.player.x, barY - 9);
    ctx.fillStyle = barColor;
    ctx.fillText(label, this.player.x, barY - 9);
  }

  _renderHUD() {
    const ctx = this.ctx;

    // 顶部黑条加高（从 44 → 52,容纳更大进度条）
    const hudH = 52;
    const barY = 16;
    const barH = 20;     // 加大: 12 → 20
    const barW = 220;    // 加大: 130 → 220
    const labelFont = 'bold 14px -apple-system, "PingFang SC", monospace';
    const numFont = 'bold 13px monospace';

    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(0, 0, CANVAS_W, hudH);

    // ============ Token 进度条（取代 HP 心型）============
    const tokLabelX = 12;
    ctx.fillStyle = '#7cf7ff';
    ctx.font = labelFont;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('Token', tokLabelX, barY + barH / 2);

    const tokBarX = tokLabelX + 56;
    const tokRatio = this.player.hp / PLAYER.HP_MAX;
    // 底
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(tokBarX, barY, barW, barH);
    // 填充（递减,低于 30% 变橙红警示）
    let tokFill = '#7cf7ff';
    if (tokRatio <= 0.3) tokFill = '#ff5a3c';
    else if (tokRatio <= 0.5) tokFill = '#ffaa3c';
    ctx.fillStyle = tokFill;
    ctx.fillRect(tokBarX, barY, barW * Math.max(0, tokRatio), barH);
    // 描边
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(tokBarX, barY, barW, barH);
    // 中央数字 "N/10 B"（白字 + 黑描边,任何背景下都可读）
    ctx.font = numFont;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#000';
    ctx.strokeText(`${this.player.hp} / 10 B`, tokBarX + barW / 2, barY + barH / 2);
    ctx.fillStyle = '#fff';
    ctx.fillText(`${this.player.hp} / 10 B`, tokBarX + barW / 2, barY + barH / 2);

    const tokRight = tokBarX + barW;

    // ============ 摸鱼值进度条 ============
    const moyuLabelX = tokRight + 20;
    ctx.fillStyle = '#ffcc66';
    ctx.font = labelFont;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('摸鱼值', moyuLabelX, barY + barH / 2);

    const moyuBarX = moyuLabelX + 60;
    const ready = this.moyu >= MOYU.PER_COFFEE;
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(moyuBarX, barY, barW, barH);
    ctx.fillStyle = ready ? '#ffcc00' : '#7cf07c';
    ctx.fillRect(moyuBarX, barY, barW * Math.min(1, this.moyu / MOYU.PER_COFFEE), barH);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(moyuBarX, barY, barW, barH);
    ctx.font = numFont;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#000';
    const moyuLabel = ready ? `☕ READY` : `${this.moyu} / ${MOYU.PER_COFFEE}`;
    ctx.strokeText(moyuLabel, moyuBarX + barW / 2, barY + barH / 2);
    ctx.fillStyle = '#fff';
    ctx.fillText(moyuLabel, moyuBarX + barW / 2, barY + barH / 2);

    const moyuRight = moyuBarX + barW;

    // ============ 武器状态 ============
    const wpnX = moyuRight + 20;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      `AI 小队 ${this.weapon.count} 名 / ${this.weapon.rotSpeed.toFixed(2)}x`,
      wpnX, barY + barH / 2
    );

    // ============ 倒计时（右上）============
    ctx.textAlign = 'right';
    const remain = Math.max(0, GAME_DURATION - this.elapsed);
    ctx.fillStyle = remain < 10 ? '#ffcc00' : '#fff';
    ctx.font = 'bold 24px monospace';
    ctx.fillText(remain.toFixed(1) + 's', CANVAS_W - 16, barY + barH / 2);

    // 摆烂模式倒计时（强可见性：大字号 + 黑底圆角 + 脉冲粉色边框 + 黑色描边 + 末段红/黄闪警告）
    if (this._isInChaos()) {
      const chaosLeft = this.chaosUntil - this.elapsed;
      const text = `🔥 整顿职场 ${chaosLeft.toFixed(1)}s`;
      const cx = CANVAS_W / 2;
      const cy = 96;

      // 脉冲呼吸（约 1.3Hz）
      const pulse = (Math.sin(this.elapsed * 8) + 1) / 2; // 0..1
      const fontSize = 40 + pulse * 4; // 40..44

      ctx.save();
      ctx.font = `bold ${fontSize.toFixed(0)}px -apple-system, "PingFang SC", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // 量出框尺寸
      const metrics = ctx.measureText(text);
      const padX = 28, padY = 14;
      const boxW = metrics.width + padX * 2;
      const boxH = fontSize + padY * 2;
      const boxX = cx - boxW / 2;
      const boxY = cy - boxH / 2;
      const radius = 14;

      // roundRect 兼容 fallback
      const roundedPath = () => {
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(boxX, boxY, boxW, boxH, radius);
        } else {
          ctx.moveTo(boxX + radius, boxY);
          ctx.lineTo(boxX + boxW - radius, boxY);
          ctx.quadraticCurveTo(boxX + boxW, boxY, boxX + boxW, boxY + radius);
          ctx.lineTo(boxX + boxW, boxY + boxH - radius);
          ctx.quadraticCurveTo(boxX + boxW, boxY + boxH, boxX + boxW - radius, boxY + boxH);
          ctx.lineTo(boxX + radius, boxY + boxH);
          ctx.quadraticCurveTo(boxX, boxY + boxH, boxX, boxY + boxH - radius);
          ctx.lineTo(boxX, boxY + radius);
          ctx.quadraticCurveTo(boxX, boxY, boxX + radius, boxY);
          ctx.closePath();
        }
      };

      // 半透明黑底（衬托文字）
      ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
      roundedPath();
      ctx.fill();

      // 脉冲粉色边框（呼吸感）
      ctx.lineWidth = 4;
      ctx.strokeStyle = `rgba(255, 102, 204, ${0.55 + 0.45 * pulse})`;
      roundedPath();
      ctx.stroke();

      // 文字本体：黑色描边 + 主色填充（< 3s 红/黄闪烁警告）
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#000';
      ctx.strokeText(text, cx, cy);
      const warn = chaosLeft < 3;
      ctx.fillStyle = warn
        ? (Math.floor(this.elapsed * 10) % 2 === 0 ? '#ff3344' : '#ffcc00')
        : '#ff66cc';
      ctx.fillText(text, cx, cy);

      ctx.restore();
    }
  }

  _showEndScreen() {
    const overlay = document.getElementById('end-overlay');
    const title = document.getElementById('end-title');
    const detail = document.getElementById('end-detail');
    const playerImg = document.getElementById('end-player');
    const enemyImg = document.getElementById('end-enemy');
    if (!overlay) return;

    const triggeredEgg = this.chaosUntil > 0;

    // v2.7：左侧 enemy（与失败反讽文案对应的 lastHitBy）+ 右侧 player（按胜负选 win/lose）
    if (playerImg) {
      if (this.state === 'win' && this.winAvatarUrl) {
        playerImg.src = this.winAvatarUrl;
        playerImg.style.display = 'block';
      } else if (this.state === 'lose' && this.loseAvatarUrl) {
        playerImg.src = this.loseAvatarUrl;
        playerImg.style.display = 'block';
      } else {
        playerImg.style.display = 'none';
      }
    }
    if (enemyImg) {
      // 失败时左侧显示 KO 玩家的那只敌人（与下方反讽文案一一对应）；胜利时隐藏
      if (this.state === 'lose' && this.lastHitBy && this.lastHitBy.kind) {
        enemyImg.src = `assets/enemy_${this.lastHitBy.kind}.png`;
        enemyImg.style.display = 'block';
      } else {
        enemyImg.style.display = 'none';
      }
    }

    let subtitle;
    if (this.state === 'win') {
      title.style.fontSize = ''; // 胜利标题用 CSS 默认字号
      if (triggeredEgg) {
        title.textContent = '🚪 老子早就不干了！！！';
        title.style.color = '#ff66cc';
        subtitle = 'AI 替你写完了离职信 · 已发送';
      } else {
        title.textContent = '🎉 今天按时下班！！';
        title.style.color = '#ffcc00';
        subtitle = 'AI 提效 · 班味归零！';
      }
    } else {
      title.textContent = '今晚加班！！！';
      title.style.color = '#e63946';
      title.style.fontSize = '60px'; // 失败标题大字警示
      subtitle = '班味浓度超标 · AI 也救不了你';
    }

    // 死亡反讽：被哪只怨灵 KO 的,弹一句它的台词（独立元素,放在 title 下方大字红色）
    const tauntEl = document.getElementById('end-taunt');
    if (tauntEl) {
      if (this.state === 'lose' && this.lastHitBy && this.lastHitBy.killTaunts && this.lastHitBy.killTaunts.length > 0) {
        const t = this.lastHitBy.killTaunts[Math.floor(Math.random() * this.lastHitBy.killTaunts.length)];
        tauntEl.textContent = `${this.lastHitBy.name}：「${t}」`;
        tauntEl.style.display = 'block';
      } else {
        tauntEl.style.display = 'none';
        tauntEl.textContent = '';
      }
    }

    detail.innerHTML = `
      <div style="color:#aaa;font-size:14px;margin-bottom:10px;">${subtitle}</div>
      <div>摸鱼值: <b>${this.kills}</b></div>
      <div>存活: <b>${this.elapsed.toFixed(1)}s</b> / ${GAME_DURATION}s</div>
      ${triggeredEgg ? '<div style="color:#ff66cc;margin-top:8px;">🚽 解锁彩蛋成就「老登再见」</div>' : ''}
    `;
    overlay.style.display = 'flex';
  }
}
