/**
 * src/pathfinding.js — 流场寻路（Flow Field）
 *
 * 工作原理：
 * 1. 把画布切成 COLS×ROWS 网格
 * 2. 每帧从玩家所在格 BFS 算出"到玩家最短距离"距离场
 * 3. 敌人只需查自己当前格的 8 邻居,选距离最小的方向走
 *
 * 优势 vs 角度扫描：
 * - 自动绕复杂障碍（沿真实可行路径走,不会被凹角卡住）
 * - O(cells) 一次计算,N 个敌人共享 → 多敌人效率更高
 * - 永不卡顿（除非真的没有可行路径）
 */

import { CANVAS_W, CANVAS_H } from './balance.js';
import { isBlocked } from './map.js';

// 网格分辨率（粗一点性能好,细一点路径平滑）
// 80×42 ≈ 17.6×17.9 px/cell,跟敌人尺寸(36px)同一数量级,既能挤过窄门又不会爆 BFS
const COLS = 80;
const ROWS = 42;
const CELL_W = CANVAS_W / COLS;
const CELL_H = CANVAS_H / ROWS;

// walkable[cy*COLS+cx] = true/false; 静态数据,只算一次
// 关键：cell 被标记为 walkable 要求"以敌人半径外扩"后还可走,
//      避免敌人卡在"中心可走但边缘伸进障碍"的格子里
let walkable = null;
const AGENT_RADIUS = 18; // 等同 ENEMY_B1.RADIUS,作为障碍膨胀距离

function initWalkable() {
  walkable = new Uint8Array(COLS * ROWS);
  for (let cy = 0; cy < ROWS; cy++) {
    for (let cx = 0; cx < COLS; cx++) {
      const px = (cx + 0.5) * CELL_W;
      const py = (cy + 0.5) * CELL_H;
      // 中心 + 4 角 + 4 边中点 = 9 个采样点
      // 任何一个落在障碍内就标记为不可走
      const r = AGENT_RADIUS;
      const samples = [
        [px,     py],
        [px - r, py - r], [px + r, py - r],
        [px - r, py + r], [px + r, py + r],
        [px - r, py    ], [px + r, py    ],
        [px,     py - r], [px,     py + r],
      ];
      let allClear = true;
      for (const [sx, sy] of samples) {
        if (isBlocked(sx / CANVAS_W, sy / CANVAS_H)) {
          allClear = false;
          break;
        }
      }
      walkable[cy * COLS + cx] = allClear ? 1 : 0;
    }
  }
}

// 距离场（每帧覆写）
const distances = new Int32Array(COLS * ROWS);
const UNREACHED = -1;

// BFS 队列复用（避免每帧 new Array）
const queueX = new Int32Array(COLS * ROWS);
const queueY = new Int32Array(COLS * ROWS);

/**
 * 重算流场：从 (playerX, playerY) 向外 BFS,填充距离
 * 一帧一次,O(walkable cells)
 */
export function recomputeFlowField(playerX, playerY) {
  if (!walkable) initWalkable();

  // 重置距离
  distances.fill(UNREACHED);

  const pcx = Math.floor(playerX / CELL_W);
  const pcy = Math.floor(playerY / CELL_H);
  if (pcx < 0 || pcx >= COLS || pcy < 0 || pcy >= ROWS) return;

  // 玩家可能站在障碍物边缘外的可走格,直接以玩家所在格为起点
  // （如果玩家所在格不可走,从最近的可走格起算）
  let startCx = pcx, startCy = pcy;
  if (!walkable[startCy * COLS + startCx]) {
    // 找最近的可走格（小范围搜索）
    let found = false;
    for (let r = 1; r <= 5 && !found; r++) {
      for (let dy = -r; dy <= r && !found; dy++) {
        for (let dx = -r; dx <= r && !found; dx++) {
          const nx = pcx + dx;
          const ny = pcy + dy;
          if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS &&
              walkable[ny * COLS + nx]) {
            startCx = nx;
            startCy = ny;
            found = true;
          }
        }
      }
    }
    if (!found) return;
  }

  distances[startCy * COLS + startCx] = 0;
  queueX[0] = startCx;
  queueY[0] = startCy;
  let head = 0;
  let tail = 1;

  while (head < tail) {
    const cx = queueX[head];
    const cy = queueY[head];
    head++;
    const d = distances[cy * COLS + cx];

    // 8 邻居
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue;
        const nIdx = ny * COLS + nx;
        if (!walkable[nIdx]) continue;
        if (distances[nIdx] !== UNREACHED) continue;

        // 防止对角穿过"棋盘角"漏 isBlocked 的薄壁（罕见,但稳）
        if (dx !== 0 && dy !== 0) {
          // 对角通行需要两边的正交格也可走
          if (!walkable[cy * COLS + nx] && !walkable[ny * COLS + cx]) continue;
        }

        distances[nIdx] = d + 1;
        queueX[tail] = nx;
        queueY[tail] = ny;
        tail++;
      }
    }
  }
}

/**
 * 给敌人位置 (px, py),返回归一化方向 {x, y} 朝向玩家最优下一步
 * 找不到路径时返回 {x: 0, y: 0}
 */
export function getDirectionTo(px, py) {
  const cx = Math.floor(px / CELL_W);
  const cy = Math.floor(py / CELL_H);
  if (cx < 0 || cx >= COLS || cy < 0 || cy >= ROWS) return { x: 0, y: 0 };

  let curD = distances[cy * COLS + cx];

  // 如果敌人所在格不可达（例如刷在墙边缘）,尝试取临近可达格的方向
  if (curD === UNREACHED) {
    let best = Infinity;
    let bestCx = cx, bestCy = cy;
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue;
        const nd = distances[ny * COLS + nx];
        if (nd !== UNREACHED && nd < best) {
          best = nd;
          bestCx = nx;
          bestCy = ny;
        }
      }
    }
    if (best === Infinity) return { x: 0, y: 0 };
    // 朝向 (bestCx, bestCy) 中心走
    const tx = (bestCx + 0.5) * CELL_W;
    const ty = (bestCy + 0.5) * CELL_H;
    const dx = tx - px;
    const dy = ty - py;
    const len = Math.hypot(dx, dy) || 1;
    return { x: dx / len, y: dy / len };
  }

  if (curD === 0) return { x: 0, y: 0 }; // 已经在玩家所在格

  // 找 8 邻居中距离最小的
  let bestD = curD;
  let bestDx = 0, bestDy = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue;
      const nIdx = ny * COLS + nx;
      const nd = distances[nIdx];
      if (nd === UNREACHED) continue;
      if (nd < bestD) {
        bestD = nd;
        bestDx = dx;
        bestDy = dy;
      }
    }
  }

  if (bestDx === 0 && bestDy === 0) return { x: 0, y: 0 };

  // 归一化
  const len = Math.hypot(bestDx, bestDy);
  return { x: bestDx / len, y: bestDy / len };
}
