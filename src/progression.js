/**
 * src/progression.js — XP 升级系统
 *
 * - 每杀 1 怪 +XP_DROP 经验
 * - 满级公式 10 + (N-1)*2 = 升下一级所需打败数
 * - 升级交替：奇数级 +1 件武器；偶数级 +20% 转速
 * - 件数 / 转速 都有上限
 */

import { WEAPON, XP } from './balance.js';

export class Progression {
  constructor(weapon) {
    this.weapon = weapon;
    this.xp = 0;
    this.level = 1;
  }

  /**
   * 每杀一只敌人调用,addAmount 由敌人 XP_DROP 决定。
   * 返回这一帧新升的级数组（供 HUD 用）：[{lv, type, value}]
   */
  addXp(amount, now) {
    this.xp += amount;
    const newLevelUps = [];
    while (this.level < XP.MAX_LEVEL) {
      const need = XP.FORMULA(this.level);
      if (this.xp < need) break;
      this.xp -= need;
      this.level += 1;
      const ev = this._applyLevelUp(now);
      newLevelUps.push(ev);
    }
    return newLevelUps;
  }

  _applyLevelUp(now) {
    let type, value;
    if (this.level % 2 === 0) {
      if (this.weapon.count < WEAPON.MAX_COUNT) {
        this.weapon.count += 1;
        type = 'count';
        value = this.weapon.count;
      } else {
        type = 'count_max';
        value = this.weapon.count;
      }
    } else {
      const newSpeed = Math.min(
        this.weapon.rotSpeed * (1 + WEAPON.SPEED_PER_UPGRADE),
        WEAPON.MAX_SPEED
      );
      this.weapon.rotSpeed = newSpeed;
      type = 'speed';
      value = newSpeed;
    }
    return { lv: this.level, type, value };
  }

  cleanupRecent(now) { /* no-op now,保留接口 */ }

  getXpProgress() {
    if (this.level >= XP.MAX_LEVEL) return { current: 0, need: 0, ratio: 1 };
    const need = XP.FORMULA(this.level);
    return { current: this.xp, need, ratio: this.xp / need };
  }
}
