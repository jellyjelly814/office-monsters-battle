/**
 * src/input.js — 键盘输入（WASD / 方向键）+ 虚拟摇杆
 *
 * 暴露 getMoveVector() 返回 {x, y}：
 *   - 摇杆有位移时优先用摇杆向量
 *   - 否则用键盘 8 方向（已归一化）
 */

const keys = new Set();
let _joystick = null;

window.addEventListener('keydown', e => {
  keys.add(e.key.toLowerCase());
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) {
    e.preventDefault();
  }
});

window.addEventListener('keyup', e => {
  keys.delete(e.key.toLowerCase());
});

window.addEventListener('blur', () => keys.clear());

/** main.js 启动时把摇杆实例注入,getMoveVector() 会优先读它 */
export function setJoystick(j) {
  _joystick = j;
}

/** 返回归一化方向向量 {x, y} */
export function getMoveVector() {
  // 摇杆优先（手机用户主要靠它）
  if (_joystick) {
    const v = _joystick.getVector();
    if (v.x !== 0 || v.y !== 0) return v;
  }
  // 键盘 fallback
  let x = 0, y = 0;
  if (keys.has('w') || keys.has('arrowup'))    y -= 1;
  if (keys.has('s') || keys.has('arrowdown'))  y += 1;
  if (keys.has('a') || keys.has('arrowleft'))  x -= 1;
  if (keys.has('d') || keys.has('arrowright')) x += 1;
  const len = Math.hypot(x, y);
  if (len > 0) { x /= len; y /= len; }
  return { x, y };
}

export function isKeyDown(key) {
  return keys.has(key.toLowerCase());
}
