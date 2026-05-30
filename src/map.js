/**
 * src/map.js — workspace.png 地图数据
 *
 * 使用归一化坐标 (0-1)，渲染时按图像实际尺寸缩放。
 * 当前背景图 assets/workspace.png 原生尺寸 2816 × 1504。
 *
 * 坐标系：原点左上，x 向右，y 向下。
 */

export const MAP = {
  background: 'assets/workspace.png',
  nativeWidth: 2816,
  nativeHeight: 1504,
};

/**
 * 不可通行的矩形障碍物（归一化坐标）
 * 每个矩形: { id, x, y, w, h, label }
 * - x, y 是左上角
 * - w, h 是宽高
 * - 都在 [0, 1] 区间
 */
export const OBSTACLES = [
  { id: 'top_counter', x: 0.000, y: 0.000, w: 1.000, h: 0.189, label: '顶部 counter' },
  { id: 'desk_TL', x: 0.000, y: 0.319, w: 0.348, h: 0.233, label: '左上工位群' },
  { id: 'desk_TR', x: 0.755, y: 0.329, w: 0.245, h: 0.228, label: '右上工位群' },
  { id: 'desk_BL', x: 0.000, y: 0.702, w: 0.352, h: 0.225, label: '左下工位群' },
  { id: 'desk_BR', x: 0.754, y: 0.680, w: 0.246, h: 0.242, label: '右下工位群' },
  { id: 'meeting_table', x: 0.480, y: 0.617, w: 0.120, h: 0.240, label: '中央会议桌' },
];

/**
 * 触发点（不阻挡通行，但进入半径触发效果）
 * radius 是触发半径（归一化）
 */
export const TRIGGERS = [
  { id: 'coffee_machine', x: 0.524, y: 0.131, radius: 0.078, effect: 'heal_per_3s', label: '☕ 咖啡机（Token 充电）' },
  { id: 'toilet_door', x: 0.917, y: 0.133, radius: 0.068, effect: 'toilet_easter_egg', label: '🚽 厕所（彩蛋）' },
];

/**
 * 判断某点 (px, py) 是否被障碍物阻挡
 * 输入是归一化坐标 (0-1)
 */
export function isBlocked(px, py) {
  for (const ob of OBSTACLES) {
    if (px >= ob.x && px <= ob.x + ob.w &&
        py >= ob.y && py <= ob.y + ob.h) {
      return true;
    }
  }
  return false;
}

/**
 * 判断玩家是否在某触发点的范围内
 * 返回该触发点对象 或 null
 */
export function getTriggerAt(px, py) {
  for (const tr of TRIGGERS) {
    const dx = px - tr.x;
    const dy = py - tr.y;
    // y 半径用 aspect-ratio 修正，让圆形触发区在画面上是圆而不是椭圆
    const aspect = MAP.nativeWidth / MAP.nativeHeight;
    if (dx * dx + (dy * aspect) * (dy * aspect) <= tr.radius * tr.radius) {
      return tr;
    }
  }
  return null;
}

/**
 * 玩家移动约束：尝试从 (fromX, fromY) 移动到 (toX, toY)
 * 如果目标位置被阻挡，会沿轴向尝试滑动（贴墙走）
 * 返回最终可达位置 { x, y }
 */
export function moveWithCollision(fromX, fromY, toX, toY) {
  // 完全可达
  if (!isBlocked(toX, toY)) return { x: toX, y: toY };

  // 尝试只走 x
  if (!isBlocked(toX, fromY)) return { x: toX, y: fromY };

  // 尝试只走 y
  if (!isBlocked(fromX, toY)) return { x: fromX, y: toY };

  // 两轴都堵 → 原地不动
  return { x: fromX, y: fromY };
}
