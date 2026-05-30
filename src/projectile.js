/**
 * src/projectile.js — 远程弹幕系统
 *
 * 两种来源：
 *   - B2 画饼弹（命中玩家：扣 HP + 5s 减速）
 *   - B3 反弹"锅"（命中玩家：扣 HP）
 *
 * 弹幕直线飞行,撞玩家或越界后消失。
 */

import { CANVAS_W, CANVAS_H } from './balance.js';

let nextId = 1;

export class Projectile {
  /**
   * @param {object} cfg
   *   { x, y, vx, vy, damage, slowDuration?, slowPct?, color, sizePx }
   */
  constructor(cfg) {
    this.id = `proj_${nextId++}`;
    this.x = cfg.x;
    this.y = cfg.y;
    this.vx = cfg.vx;
    this.vy = cfg.vy;
    this.damage = cfg.damage;
    this.slowDuration = cfg.slowDuration || 0;
    this.slowPct = cfg.slowPct || 0;
    this.color = cfg.color || '#ffaa00';
    this.sizePx = cfg.sizePx || 14;
    this.lifeRemaining = cfg.life || 3.0; // 秒,防止永远飞
    this.dead = false;
  }

  update(dt, player, now) {
    if (this.dead) return;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.lifeRemaining -= dt;
    if (this.lifeRemaining <= 0 ||
        this.x < -50 || this.x > CANVAS_W + 50 ||
        this.y < -50 || this.y > CANVAS_H + 50) {
      this.dead = true;
      return;
    }
    // 撞玩家?
    const dx = this.x - player.x;
    const dy = this.y - player.y;
    const r = this.sizePx / 2 + 16; // 玩家半径 16
    if (dx * dx + dy * dy <= r * r) {
      if (player.takeHit(this.damage, now)) {
        // 减速效果
        if (this.slowDuration > 0) {
          player.applySlow(this.slowPct, this.slowDuration, now);
        }
      }
      this.dead = true;
    }
  }

  render(ctx) {
    if (this.dead) return;
    const s = this.sizePx;
    // 圆形弹幕带光晕
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, s / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.stroke();
    // 小高光
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.arc(this.x - s * 0.15, this.y - s * 0.15, s * 0.18, 0, Math.PI * 2);
    ctx.fill();
  }
}
