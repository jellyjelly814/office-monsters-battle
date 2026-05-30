/**
 * src/enemy.js — 4 种敌人（v1.0：纯统计差异化）
 *
 * 全 4 种行为完全相同：流场寻路追玩家 + 接触伤害。
 * 差异在 HP / 速度 / 接触伤害 / 半径 / XP / 颜色 / sprite。
 * sprite 由 setEnemySprites({b1,b2,b3,b4}) 注入,render 时按 kind 取。
 */

import {
  ENEMY_B1, ENEMY_B2, ENEMY_B3, ENEMY_B4,
  CANVAS_W, CANVAS_H,
} from './balance.js';
import { isBlocked } from './map.js';
import { getDirectionTo } from './pathfinding.js';

let nextId = 1;

// sprite 注册表:由 main.js 通过 setEnemySprites 注入
const SPRITES = {};
export function setEnemySprites(spritesByKind) {
  Object.assign(SPRITES, spritesByKind);
}

// 源图原生宽高比例（621x830）—— 用于按 width 推 height
const SPRITE_ASPECT = 830 / 621;

class EnemyBase {
  constructor(x, y, config) {
    this.id = `${config.ID}_${nextId++}`;
    this.kind = config.ID;
    this.x = x;
    this.y = y;
    this.hp = config.HP;
    this.maxHp = config.HP;
    this.speed = config.SPEED;
    this.contactDmg = config.CONTACT_DMG;
    this.radius = config.RADIUS;
    this.xpDrop = config.XP_DROP;
    this.color = config.COLOR;
    this.label = config.LABEL;
    this.name = config.NAME;
    this.spawnTaunt = config.SPAWN_TAUNT;
    this.killTaunts = config.KILL_TAUNTS || [];
    this.spriteScale = config.SPRITE_SCALE || 3.2;
    this.dead = false;
    this.hitFlashUntil = 0;
  }

  update(dt, now, player, ctx) {
    if (this.dead) return;
    const dir = getDirectionTo(this.x, this.y);
    if (dir.x === 0 && dir.y === 0) return;
    const mult = (ctx && ctx.enemySpeedMult) || 1;
    const step = this.speed * mult * dt;
    this.x += dir.x * step;
    this.y += dir.y * step;
  }

  takeDamage(dmg, now) {
    this.hp -= dmg;
    this.hitFlashUntil = (now || performance.now() / 1000) + 0.08;
    if (this.hp <= 0) this.dead = true;
  }

  touchesPlayer(player) {
    const dx = this.x - player.x;
    const dy = this.y - player.y;
    const r = this.radius + 16;
    return dx * dx + dy * dy <= r * r;
  }

  /** 返回 sprite 显示的宽高（基于 radius * scale）*/
  _spriteSize() {
    const w = this.radius * this.spriteScale * 2;
    const h = w * SPRITE_ASPECT;
    return { w, h };
  }

  render(ctx, now) {
    if (this.dead) return;
    const sprite = SPRITES[this.kind];
    const flash = now < this.hitFlashUntil;
    const { w, h } = this._spriteSize();
    const drawX = this.x - w / 2;
    const drawY = this.y - h / 2; // 中心对齐于 hitbox 中心
    const visualTop = drawY;       // 用于血条 / 气泡定位

    if (sprite && sprite.complete && sprite.naturalWidth > 0) {
      // 闪白:用 brightness 滤镜
      if (flash) ctx.filter = 'brightness(2.2)';
      ctx.drawImage(sprite, drawX, drawY, w, h);
      if (flash) ctx.filter = 'none';
    } else {
      // 回退占位（缺图时）
      const r = this.radius;
      ctx.fillStyle = flash ? '#fff' : this.color;
      ctx.fillRect(this.x - r, this.y - r, r * 2, r * 2);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.strokeRect(this.x - r, this.y - r, r * 2, r * 2);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.label, this.x, this.y);
    }

    // 血条（贴在视觉上沿）
    if (this.hp > 0 && this.hp < this.maxHp) {
      const barW = Math.max(w * 0.6, 32);
      const barH = 4;
      const ratio = this.hp / this.maxHp;
      const barX = this.x - barW / 2;
      const barY = visualTop - 8;
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
      ctx.fillStyle = '#7cf07c';
      ctx.fillRect(barX, barY, barW * ratio, barH);
    }

    // 首次出现:出生 2s 后头顶飘出场台词,持续 3s
    if (this.isFirstOfKind && this.spawnTime !== undefined && this.spawnTaunt) {
      const sinceSpawn = now - this.spawnTime;
      if (sinceSpawn >= 2.0 && sinceSpawn < 5.0) {
        this._renderTaunt(ctx, sinceSpawn - 2.0, visualTop);
      }
    }
  }

  _renderTaunt(ctx, tInWindow, visualTop) {
    const totalDur = 3.0;
    let alpha = 1;
    if (tInWindow < 0.2) alpha = tInWindow / 0.2;
    else if (tInWindow > totalDur - 0.4) alpha = (totalDur - tInWindow) / 0.4;
    alpha = Math.max(0, Math.min(1, alpha));

    const taunt = this.spawnTaunt;
    // 气泡放在 sprite 视觉上沿之上
    const headY = visualTop - 18;

    ctx.save();
    ctx.globalAlpha = alpha;

    ctx.font = 'bold 16px -apple-system, "PingFang SC", monospace';
    const tauntW = ctx.measureText(taunt).width;
    const padX = 10;
    const bubbleW = tauntW + padX * 2;
    const bubbleH = 26;
    const bubbleX = this.x - bubbleW / 2;
    const bubbleY = headY - bubbleH;

    ctx.fillStyle = 'rgba(0,0,0,0.78)';
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    this._roundRect(ctx, bubbleX, bubbleY, bubbleW, bubbleH, 6);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(this.x - 5, headY);
    ctx.lineTo(this.x + 5, headY);
    ctx.lineTo(this.x, headY + 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 16px -apple-system, "PingFang SC", monospace';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(taunt, this.x, bubbleY + bubbleH / 2);

    ctx.restore();
  }

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}

export class EnemyB1 extends EnemyBase { constructor(x, y) { super(x, y, ENEMY_B1); } }
export class EnemyB2 extends EnemyBase { constructor(x, y) { super(x, y, ENEMY_B2); } }
export class EnemyB3 extends EnemyBase { constructor(x, y) { super(x, y, ENEMY_B3); } }
export class EnemyB4 extends EnemyBase { constructor(x, y) { super(x, y, ENEMY_B4); } }

const ENEMY_CTORS = { b1: EnemyB1, b2: EnemyB2, b3: EnemyB3, b4: EnemyB4 };

export function spawnEnemy(kind, x, y) {
  const Ctor = ENEMY_CTORS[kind] || EnemyB1;
  return new Ctor(x, y);
}

export function pickSpawnPoint() {
  const r = 20;
  const isSafe = (x, y) =>
    !isBlocked(x / CANVAS_W, y / CANVAS_H) &&
    !isBlocked((x - r) / CANVAS_W, y / CANVAS_H) &&
    !isBlocked((x + r) / CANVAS_W, y / CANVAS_H) &&
    !isBlocked(x / CANVAS_W, (y - r) / CANVAS_H) &&
    !isBlocked(x / CANVAS_W, (y + r) / CANVAS_H);

  for (let tries = 0; tries < 50; tries++) {
    const edge = Math.floor(Math.random() * 4);
    let x, y;
    const margin = 40;
    switch (edge) {
      case 0: x = Math.random() * CANVAS_W; y = margin; break;
      case 1: x = Math.random() * CANVAS_W; y = CANVAS_H - margin; break;
      case 2: x = margin; y = Math.random() * CANVAS_H; break;
      case 3: x = CANVAS_W - margin; y = Math.random() * CANVAS_H; break;
    }
    if (isSafe(x, y)) return { x, y };
  }
  return { x: CANVAS_W / 2, y: CANVAS_H - 40 };
}
