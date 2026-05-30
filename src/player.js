/**
 * src/player.js — 玩家「人人」
 *
 * v2.7：sprite 比例从 sprite.naturalWidth/Height 动态读,自动适配方形(100×100)或竖图。
 *       玩家 sprite 由 main.js 角色选择决定（player-man.png / player-woman.png）。
 */

import { PLAYER, CANVAS_W, CANVAS_H } from './balance.js';
import { getMoveVector } from './input.js';
import { moveWithCollision } from './map.js';

export class Player {
  constructor(sprite) {
    this.x = PLAYER.START_X_NORM * CANVAS_W;
    this.y = PLAYER.START_Y_NORM * CANVAS_H;
    this.hp = PLAYER.HP_MAX;
    this.invulUntil = 0;
    this.slowUntil = 0;
    this.slowPct = 0;
    this.forcedInvul = false;
    this.sprite = sprite;
  }

  update(dt, now) {
    const v = getMoveVector();
    if (v.x === 0 && v.y === 0) return;

    let speedMult = 1;
    if (now < this.slowUntil) speedMult = 1 - this.slowPct;

    const dx = v.x * PLAYER.SPEED * speedMult * dt;
    const dy = v.y * PLAYER.SPEED * speedMult * dt;

    const fromNX = this.x / CANVAS_W;
    const fromNY = this.y / CANVAS_H;
    const toNX = (this.x + dx) / CANVAS_W;
    const toNY = (this.y + dy) / CANVAS_H;

    const next = moveWithCollision(fromNX, fromNY, toNX, toNY);
    this.x = next.x * CANVAS_W;
    this.y = next.y * CANVAS_H;

    const r = PLAYER.RADIUS;
    this.x = Math.max(r, Math.min(CANVAS_W - r, this.x));
    this.y = Math.max(r, Math.min(CANVAS_H - r, this.y));
  }

  takeHit(dmg, now) {
    if (this.forcedInvul) return false;
    if (now < this.invulUntil) return false;
    this.hp -= dmg;
    this.invulUntil = now + PLAYER.INVUL_TIME;
    return true;
  }

  applySlow(pct, durationSec, now) {
    if (pct > this.slowPct) this.slowPct = pct;
    const newUntil = now + durationSec;
    if (newUntil > this.slowUntil) this.slowUntil = newUntil;
  }

  heal(amount) {
    this.hp = Math.min(PLAYER.HP_MAX, this.hp + amount);
  }

  isDead() { return this.hp <= 0; }
  isInvul(now) { return this.forcedInvul || now < this.invulUntil; }
  isSlowed(now) { return now < this.slowUntil; }

  render(ctx, now) {
    const useSprite = this.sprite && this.sprite.complete && this.sprite.naturalWidth > 0;
    const scale = PLAYER.SPRITE_SCALE || 3.2;
    const w = PLAYER.RADIUS * scale * 2;
    // 严格按 sprite 真实长宽比渲染 (100×100 → 1:1, 不会拉伸)
    const aspect = useSprite ? (this.sprite.naturalHeight / this.sprite.naturalWidth) : 1;
    const h = w * aspect;
    const drawX = this.x - w / 2;
    const drawY = this.y - h / 2;
    this.visualTop = drawY;

    if (useSprite) {
      let filter = 'none';
      if (this.forcedInvul) {
        const hue = (Math.floor(now * 12) % 3) * 30;
        filter = `brightness(1.3) hue-rotate(${hue}deg) saturate(1.6)`;
      } else if (this.isInvul(now)) {
        const flash = Math.floor(now * 14) % 2;
        filter = flash ? 'brightness(2.2) saturate(0.4)' : 'brightness(0.9)';
      } else if (this.isSlowed(now)) {
        filter = 'hue-rotate(-30deg) saturate(0.7) brightness(0.9)';
      }
      if (filter !== 'none') ctx.filter = filter;
      ctx.drawImage(this.sprite, drawX, drawY, w, h);
      if (filter !== 'none') ctx.filter = 'none';
    } else {
      // 缺图回退（不应该出现 —— main.js 一定传 sprite 进来）
      const r = PLAYER.RADIUS;
      ctx.fillStyle = '#e63946';
      ctx.fillRect(this.x - r, this.y - r, r * 2, r * 2);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.strokeRect(this.x - r, this.y - r, r * 2, r * 2);
    }
  }
}
