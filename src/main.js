/**
 * src/main.js — 启动入口
 *
 * v1.0：加 canvas 点击转发（厕所彩蛋）+ 预加载所有资产
 * v2.7：开始页角色选择（男/女打工人）+ 胜利结算页对应胜利形象
 */

import { Game } from './game.js';
import { setEnemySprites } from './enemy.js';
import { setJoystick } from './input.js';
import { Joystick } from './joystick.js';
import { audio } from './audio.js';
import { CANVAS_W, CANVAS_H, WEAPON, ENEMY_B1, ENEMY_B2, ENEMY_B3, ENEMY_B4 } from './balance.js';

const canvas = document.getElementById('game-canvas');
canvas.width = CANVAS_W;
canvas.height = CANVAS_H;

function loadImage(src) {
  const img = new Image();
  img.src = src;
  return img;
}

// 角色档案（idle = 游戏中走位形象,winUrl = 胜利结算页形象,loseUrl = 失败结算页形象）
const CHAR_PROFILES = {
  man:   { idle: loadImage('assets/player-man.png'),   winUrl: 'assets/player-man-win.png',   loseUrl: 'assets/player-man-lose.png',   label: '打工男' },
  woman: { idle: loadImage('assets/player-woman.png'), winUrl: 'assets/player-woman-win.png', loseUrl: 'assets/player-woman-lose.png', label: '打工女' },
};

// 预加载图片
const bgImage = loadImage('assets/workspace.png');
const weaponSprites = WEAPON.SPRITE_PATHS.map(loadImage);
const coffeeImage = loadImage('assets/coffee.png');
const resignationImage = loadImage('assets/ui_resignation_letter.png');
const enemySprites = {
  b1: loadImage(ENEMY_B1.SPRITE_PATH),
  b2: loadImage(ENEMY_B2.SPRITE_PATH),
  b3: loadImage(ENEMY_B3.SPRITE_PATH),
  b4: loadImage(ENEMY_B4.SPRITE_PATH),
};
setEnemySprites(enemySprites);

const game = new Game(canvas, {
  bg: bgImage,
  weaponSprites,
  coffee: coffeeImage,
  resignation: resignationImage,
  // player 通过 game.start(playerSprite, winUrl) 在选择后传入
}, {
  onStateChange: (state) => {
    if (state === 'win') audio.play('win');
    else if (state === 'lose') audio.play('lose');
  },
  onChaosChange: (on) => audio.setChaos(on),
});

// 覆盖层
const startOverlay = document.getElementById('start-overlay');
const endOverlay = document.getElementById('end-overlay');
const replayBtn = document.getElementById('btn-replay');
const startBtn = document.getElementById('btn-start');
const charButtons = document.querySelectorAll('.char-btn');

let selectedChar = null; // 'man' | 'woman'

function startGame(charKey) {
  const profile = CHAR_PROFILES[charKey];
  if (!profile) return;
  selectedChar = charKey;
  startOverlay.style.display = 'none';
  endOverlay.style.display = 'none';
  audio.play('progress');
  game.start(profile.idle, profile.winUrl, profile.loseUrl);
}

// 角色选择：单击 = 选中（高亮）;再点开始游戏才进入
charButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    selectedChar = btn.dataset.char;
    charButtons.forEach(b => b.classList.toggle('selected', b === btn));
    if (startBtn) startBtn.disabled = false;
  });
});

// 开始游戏按钮
if (startBtn) {
  startBtn.addEventListener('click', () => {
    if (!selectedChar) return;
    startGame(selectedChar);
  });
}

// 再来一把（沿用上次选的角色）
replayBtn.addEventListener('click', () => {
  if (selectedChar) {
    startGame(selectedChar);
  } else {
    endOverlay.style.display = 'none';
    startOverlay.style.display = 'flex';
  }
});

// 首次用户手势 → 解锁 audio + 播放初始化界面 BGM
const unlockAudio = () => {
  audio.unlock();
  if (!audio.current) audio.play('intro');
};
document.addEventListener('click', unlockAudio, { once: true });
document.addEventListener('touchstart', unlockAudio, { once: true });
document.addEventListener('keydown', unlockAudio, { once: true });

// 启动前预览背景
bgImage.onload = () => {
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(bgImage, 0, 0, CANVAS_W, CANVAS_H);
};
if (bgImage.complete) bgImage.onload();

// 转发 canvas 点击（厕所彩蛋）
function clientToCanvas(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  };
}

canvas.addEventListener('click', e => {
  const p = clientToCanvas(e.clientX, e.clientY);
  game.onCanvasClick(p.x, p.y);
});

canvas.addEventListener('touchstart', e => {
  if (e.touches.length === 0) return;
  const t = e.touches[0];
  const p = clientToCanvas(t.clientX, t.clientY);
  game.onCanvasClick(p.x, p.y);
}, { passive: true });

// 虚拟摇杆：动态位置（触在哪就以哪为中心）,跟键盘并存
const joystick = new Joystick();
// 排除热区:不在厕所点击半径内才允许召唤摇杆,避免互相冲突
joystick.setActivationGuard((x, y) => {
  // 排除顶部 HUD 条
  if (y < 60) return false;
  // 排除厕所触发圆（取 map.js TRIGGERS 里 toilet_door 的画布坐标 + click_radius）
  const tx = 0.917 * CANVAS_W;
  const ty = 0.133 * CANVAS_H;
  const dx = x - tx, dy = y - ty;
  if (dx * dx + dy * dy <= 140 * 140) return false;
  return true;
});
joystick.attach(canvas, clientToCanvas);
setJoystick(joystick);
game.joystick = joystick;
