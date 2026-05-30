/**
 * src/joystick.js — 动态虚拟摇杆（触在哪就以哪为中心）
 *
 * 行为:
 *   - 触摸/点击 canvas 任意点（排除区域除外）→ 在该点生成摇杆中心 + 滑块
 *   - 拖动 → 滑块跟手指,最远 MAX_KNOB
 *   - 抬起 → 摇杆隐藏,输出归 0
 *   - 跟键盘并存（input.js 优先用摇杆）
 *
 * 排除区域: main.js 注册 shouldActivate 回调,把厕所等点击热区排掉,
 *          避免点厕所时意外召出摇杆。
 *
 * 视觉: 半透明圆环底盘 + 内圈滑块,仅在活跃时绘制。
 */

const MAX_KNOB = 55;      // 滑块最大偏移
const BASE_RADIUS = 70;   // 视觉底盘半径
const KNOB_SIZE = 32;
const DEAD_ZONE = 8;

export class Joystick {
  constructor() {
    this.cx = 0;
    this.cy = 0;
    this.dx = 0;
    this.dy = 0;
    this.active = false;
    this.pointerId = null;        // touch.identifier 或 'mouse'
    this.shouldActivate = null;   // (x, y) => bool, 由 main.js 注册
  }

  /** 注册激活前置检查；返回 false 则该位置不召唤摇杆（让给其他点击）*/
  setActivationGuard(fn) {
    this.shouldActivate = fn;
  }

  attach(canvas, clientToCanvas) {
    canvas.addEventListener('touchstart', (e) => this._touchStart(e, clientToCanvas), { passive: false });
    canvas.addEventListener('touchmove',  (e) => this._touchMove(e, clientToCanvas),  { passive: false });
    canvas.addEventListener('touchend',   (e) => this._touchEnd(e));
    canvas.addEventListener('touchcancel',(e) => this._touchEnd(e));
    canvas.addEventListener('mousedown',  (e) => this._mouseDown(e, clientToCanvas));
    window.addEventListener('mousemove',  (e) => this._mouseMove(e, clientToCanvas));
    window.addEventListener('mouseup',    () => this._end('mouse'));
  }

  _canActivateAt(x, y) {
    return !this.shouldActivate || this.shouldActivate(x, y);
  }

  _activate(x, y, pointerId) {
    if (!this._canActivateAt(x, y)) return false;
    this.cx = x;
    this.cy = y;
    this.dx = 0;
    this.dy = 0;
    this.active = true;
    this.pointerId = pointerId;
    return true;
  }

  _touchStart(e, clientToCanvas) {
    if (this.active) return; // 已有手指在控,忽略其他
    for (const t of e.changedTouches) {
      const p = clientToCanvas(t.clientX, t.clientY);
      if (this._activate(p.x, p.y, t.identifier)) {
        e.preventDefault();
        return;
      }
    }
  }

  _touchMove(e, clientToCanvas) {
    if (!this.active) return;
    for (const t of e.changedTouches) {
      if (t.identifier !== this.pointerId) continue;
      const p = clientToCanvas(t.clientX, t.clientY);
      this._updateKnob(p.x, p.y);
      e.preventDefault();
      return;
    }
  }

  _touchEnd(e) {
    for (const t of e.changedTouches) {
      if (t.identifier === this.pointerId) {
        this._end(this.pointerId);
        return;
      }
    }
  }

  _mouseDown(e, clientToCanvas) {
    if (this.active) return;
    const p = clientToCanvas(e.clientX, e.clientY);
    if (this._activate(p.x, p.y, 'mouse')) {
      e.preventDefault();
    }
  }

  _mouseMove(e, clientToCanvas) {
    if (this.pointerId !== 'mouse') return;
    const p = clientToCanvas(e.clientX, e.clientY);
    this._updateKnob(p.x, p.y);
  }

  _end(id) {
    if (this.pointerId === id) {
      this.active = false;
      this.dx = 0;
      this.dy = 0;
      this.pointerId = null;
    }
  }

  _updateKnob(x, y) {
    let dx = x - this.cx;
    let dy = y - this.cy;
    const len = Math.hypot(dx, dy);
    if (len > MAX_KNOB) {
      dx = dx / len * MAX_KNOB;
      dy = dy / len * MAX_KNOB;
    }
    this.dx = dx;
    this.dy = dy;
  }

  /** 归一化方向向量 ∈ [-1, 1]^2,空闲返回 (0, 0) */
  getVector() {
    if (!this.active) return { x: 0, y: 0 };
    const len = Math.hypot(this.dx, this.dy);
    if (len < DEAD_ZONE) return { x: 0, y: 0 };
    return { x: this.dx / MAX_KNOB, y: this.dy / MAX_KNOB };
  }

  /** 仅在活跃时绘制（动态位置）*/
  render(ctx) {
    if (!this.active) return;

    // 底盘
    ctx.beginPath();
    ctx.arc(this.cx, this.cy, BASE_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.stroke();

    // 中心十字
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.cx - 6, this.cy);
    ctx.lineTo(this.cx + 6, this.cy);
    ctx.moveTo(this.cx, this.cy - 6);
    ctx.lineTo(this.cx, this.cy + 6);
    ctx.stroke();

    // 滑块（浅灰）
    ctx.beginPath();
    ctx.arc(this.cx + this.dx, this.cy + this.dy, KNOB_SIZE, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(220, 220, 220, 0.85)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#000';
    ctx.stroke();
  }
}
