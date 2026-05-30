/**
 * src/weapon.js — AI 工具栏（围绕玩家旋转）
 *
 * v1.0：4 张独立 sprite（assets/weapon1-4.png）按 iconIdx 取图,
 *      开局 3 件用 weapon1/2/3,Lv.2 升级解锁 weapon4。
 *      支持摸鱼模式 ×100 速度倍数。
 */

import { WEAPON } from './balance.js';

export class Weapon {
  constructor(player, sprites) {
    this.player = player;
    this.sprites = sprites || []; // HTMLImageElement[] 长度 4
    this.count = WEAPON.COUNT;
    this.rotSpeed = WEAPON.ROT_SPEED;
    this.angle = 0;
    this.lastHit = new Map();
  }

  /** speedMult 用于摸鱼模式 ×100 */
  update(dt, speedMult = 1) {
    this.angle += this.rotSpeed * speedMult * Math.PI * 2 * dt;
  }

  getPaperPositions() {
    const positions = [];
    for (let i = 0; i < this.count; i++) {
      const a = this.angle + (i / this.count) * Math.PI * 2;
      positions.push({
        x: this.player.x + Math.cos(a) * WEAPON.RADIUS,
        y: this.player.y + Math.sin(a) * WEAPON.RADIUS,
        iconIdx: i,
      });
    }
    return positions;
  }

  checkCollisions(enemies, now) {
    const papers = this.getPaperPositions();
    let killCount = 0;
    let killedXp = 0;
    const killedAt = [];

    for (const enemy of enemies) {
      if (enemy.dead) continue;
      const hitTimes = this.lastHit.get(enemy.id) || new Array(this.count).fill(-999);

      for (let i = 0; i < papers.length; i++) {
        const p = papers[i];
        const dx = p.x - enemy.x;
        const dy = p.y - enemy.y;
        const halfPaper = WEAPON.SIZE / 2;
        const r = enemy.radius + halfPaper * 0.7;
        if (dx * dx + dy * dy <= r * r) {
          if (now - hitTimes[i] >= WEAPON.HIT_COOLDOWN) {
            enemy.takeDamage(WEAPON.DAMAGE, now);
            hitTimes[i] = now;
            if (enemy.dead) {
              killCount++;
              killedXp += enemy.xpDrop || 1;
              killedAt.push({ x: enemy.x, y: enemy.y });
            }
          }
        }
      }
      this.lastHit.set(enemy.id, hitTimes);
    }

    return { killCount, killedXp, killedAt };
  }

  render(ctx) {
    const papers = this.getPaperPositions();
    const s = WEAPON.SIZE;

    for (const p of papers) {
      const sprite = this.sprites[p.iconIdx % this.sprites.length];
      const useSprite = sprite && sprite.complete && sprite.naturalWidth > 0;
      if (useSprite) {
        // 整图渲染（不切片）
        ctx.drawImage(sprite, p.x - s / 2, p.y - s / 2, s, s);
      } else {
        // 回退占位
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 2;
        ctx.strokeRect(p.x - s / 2, p.y - s / 2, s, s);
      }
    }
  }
}
