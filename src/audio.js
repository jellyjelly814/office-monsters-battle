/**
 * src/audio.js — BGM 管理
 *
 * 4 段循环背景音乐 + 彩蛋加速:
 *   intro    → bgm/intro.mp3    初始化界面
 *   progress → bgm/progress.mp3 游戏过程 (彩蛋时 1.5×)
 *   win      → bgm/success.mp3  胜利结算
 *   lose     → bgm/lose.mp3     失败结算
 *
 * 浏览器 autoplay policy:必须先有用户手势才能 play()。
 * main.js 在首次 click/touchstart/keydown 时调 unlock() 解锁。
 */

const TRACKS = {
  intro:    'bgm/intro.mp3',
  progress: 'bgm/progress.mp3',
  win:      'bgm/success.mp3',
  lose:     'bgm/lose.mp3',
};

const DEFAULT_VOLUME = 0.55;

class AudioManager {
  constructor() {
    this.elements = {};
    for (const [key, src] of Object.entries(TRACKS)) {
      const el = new Audio(src);
      el.loop = true;
      el.preload = 'auto';
      el.volume = DEFAULT_VOLUME;
      this.elements[key] = el;
    }
    this.current = null;          // 'intro' | 'progress' | 'win' | 'lose' | null
    this.unlocked = false;
    this.pendingTrack = null;     // 解锁前调 play() 时记下,解锁后补播
    this._wasPaused = false;      // pause() 设 true,resume() 才执行(避免误 resume)
  }

  unlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    if (this.pendingTrack) {
      const track = this.pendingTrack;
      this.pendingTrack = null;
      this.play(track);
    }
  }

  play(key) {
    if (!this.elements[key]) return;
    if (!this.unlocked) {
      this.pendingTrack = key;
      return;
    }
    if (this.current === key) return;
    if (this.current && this.elements[this.current]) {
      const prev = this.elements[this.current];
      prev.pause();
      prev.currentTime = 0;
      prev.playbackRate = 1.0;
    }
    this.current = key;
    const el = this.elements[key];
    el.playbackRate = 1.0;
    el.currentTime = 0;
    el.play().catch(err => console.warn('[audio] play failed:', key, err));
  }

  setChaos(on) {
    const el = this.elements.progress;
    if (el) el.playbackRate = on ? 1.5 : 1.0;
  }

  pause() {
    if (this.current && this.elements[this.current]) {
      this.elements[this.current].pause();
      this._wasPaused = true;
    }
  }

  resume() {
    if (!this._wasPaused) return;
    this._wasPaused = false;
    if (this.current && this.elements[this.current]) {
      this.elements[this.current].play().catch(err => console.warn('[audio] resume failed:', err));
    }
  }
}

export const audio = new AudioManager();
