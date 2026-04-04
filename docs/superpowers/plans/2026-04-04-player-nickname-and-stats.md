# 玩家昵称系统 + 后端游戏统计 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans

**Goal:** 为三国武将录增加玩家昵称输入、按昵称隔离存档/图鉴，以及 Node.js 后端统计服务和后台管理界面。

**Architecture:** 子项目1为纯前端改动，game.js 中 localStorage key 动态拼接昵称，标题页新增昵称输入 UI。子项目2新建 server/ 目录，Express + SQLite 后端，前端达成结局时上报数据，/admin 页面展示统计。

**Tech Stack:** Vanilla JS (ES Modules), Node.js, Express, better-sqlite3

---

## Task 1: index.html 标题页增加昵称输入区域

**Files:** Modify `index.html:11-21`

- [ ] **Step 1:** 在 `screen-title` 中 `<p class="title-tagline">` 之后、`<div class="title-buttons">` 之前，插入昵称输入区域：

```html
<div id="nickname-area" class="nickname-area">
  <input type="text" id="nickname-input" class="nickname-input" placeholder="请输入你的名号" maxlength="8">
  <button id="btn-set-name" class="btn btn-primary nickname-btn">确认名号</button>
</div>
<div id="welcome-area" class="welcome-area" style="display:none">
  <p class="welcome-text">欢迎，<span id="player-name-display"></span></p>
  <button id="btn-change-name" class="btn btn-secondary nickname-change-btn">更换名号</button>
</div>
```

- [ ] **Step 2:** `git add index.html && git commit -m "feat: 标题页新增昵称输入区域"`

---

## Task 2: CSS 昵称样式

**Files:** Modify `css/style.css`

- [ ] **Step 1:** 在 `.title-buttons` 规则之前添加：

```css
.nickname-area {
  display: flex; flex-direction: column; align-items: center;
  gap: 10px; margin-bottom: 20px; width: 200px;
}
.nickname-input {
  width: 100%; padding: 10px 14px; border-radius: 6px;
  border: 1px solid var(--text-dim); background: var(--bg-card);
  color: var(--text-primary); font-family: inherit; font-size: 14px;
  text-align: center; outline: none; transition: border-color 0.2s;
}
.nickname-input:focus { border-color: var(--gold); }
.nickname-input::placeholder { color: var(--text-dim); }
.nickname-btn { width: 100%; }
.welcome-area {
  display: flex; flex-direction: column; align-items: center;
  gap: 8px; margin-bottom: 20px;
}
.welcome-text { font-size: 14px; color: var(--gold); }
.nickname-change-btn { font-size: 11px; padding: 6px 16px; }
```

- [ ] **Step 2:** `git add css/style.css && git commit -m "feat: 添加昵称输入区域样式"`

---

## Task 3: game.js 动态 localStorage key + 旧数据迁移

**Files:** Modify `js/game.js`

- [ ] **Step 1:** 删除文件顶部的 `const SAVE_KEY` 和 `const ENDINGS_KEY` 常量

- [ ] **Step 2:** 在 constructor 末尾添加 `this.playerName = null;`

- [ ] **Step 3:** 在 constructor 之后添加 key 计算方法：

```js
_saveKey() {
  return this.playerName ? `sgwjl_save_${this.playerName}` : 'sgwjl_save';
}
_endingsKey() {
  return this.playerName ? `sgwjl_endings_${this.playerName}` : 'sgwjl_endings';
}
```

- [ ] **Step 4:** 全局替换：`SAVE_KEY` → `this._saveKey()`，`ENDINGS_KEY` → `this._endingsKey()`（涉及 save/load/clearSave/getUnlockedEndings/_unlockEnding）

- [ ] **Step 5:** 添加昵称管理和旧数据迁移方法：

```js
setPlayerName(name) {
  this.playerName = name;
  localStorage.setItem('sgwjl_player', name);
  this._migrateOldData();
}
getPlayerName() { return this.playerName; }
loadPlayerName() {
  const saved = localStorage.getItem('sgwjl_player');
  if (saved) { this.playerName = saved; return saved; }
  return null;
}
_migrateOldData() {
  const oldEndings = localStorage.getItem('sgwjl_endings');
  if (oldEndings) {
    const newKey = this._endingsKey();
    const existing = localStorage.getItem(newKey);
    if (!existing) {
      localStorage.setItem(newKey, oldEndings);
    } else {
      try {
        const merged = [...new Set([...JSON.parse(existing), ...JSON.parse(oldEndings)])];
        localStorage.setItem(newKey, JSON.stringify(merged));
      } catch {}
    }
    localStorage.removeItem('sgwjl_endings');
  }
  const oldSave = localStorage.getItem('sgwjl_save');
  if (oldSave) {
    if (!localStorage.getItem(this._saveKey())) localStorage.setItem(this._saveKey(), oldSave);
    localStorage.removeItem('sgwjl_save');
  }
}
```

- [ ] **Step 6:** 在 `selectCharacter()` 的 state 对象中添加 `playerName: this.playerName,`

- [ ] **Step 7:** `git add js/game.js && git commit -m "feat: game.js 动态 localStorage key + 旧数据迁移"`

---

## Task 4: ui.js 改造标题页渲染

**Files:** Modify `js/ui.js`

- [ ] **Step 1:** 修改 `renderTitle(unlockedCount)` 为 `renderTitle(unlockedCount, playerName)`，实现昵称输入/欢迎双状态切换：

```js
renderTitle(unlockedCount, playerName) {
  document.getElementById('gallery-count').textContent = unlockedCount;
  const nicknameArea = document.getElementById('nickname-area');
  const welcomeArea = document.getElementById('welcome-area');
  const nicknameInput = document.getElementById('nickname-input');
  const btnStart = document.getElementById('btn-start');

  if (playerName) {
    nicknameArea.style.display = 'none';
    welcomeArea.style.display = '';
    document.getElementById('player-name-display').textContent = playerName;
    btnStart.disabled = false;
    btnStart.style.opacity = '1';
    document.getElementById('btn-change-name').onclick = () => {
      nicknameArea.style.display = '';
      welcomeArea.style.display = 'none';
      nicknameInput.value = playerName;
      btnStart.disabled = true;
      btnStart.style.opacity = '0.4';
      nicknameInput.focus();
    };
  } else {
    nicknameArea.style.display = '';
    welcomeArea.style.display = 'none';
    nicknameInput.value = '';
    btnStart.disabled = true;
    btnStart.style.opacity = '0.4';
  }

  document.getElementById('btn-set-name').onclick = () => {
    const name = nicknameInput.value.trim();
    if (name.length >= 1 && name.length <= 8) this.callbacks.onSetName?.(name);
  };
  nicknameInput.onkeydown = (e) => {
    if (e.key === 'Enter') document.getElementById('btn-set-name').click();
  };
  btnStart.onclick = () => { this.callbacks.onStart?.(); };
  document.getElementById('btn-gallery').onclick = () => { this.callbacks.onShowGallery?.(); };
  this.showScreen('title');
}
```

- [ ] **Step 2:** `git add js/ui.js && git commit -m "feat: ui.js renderTitle 支持昵称输入"`

---

## Task 5: main.js 连接昵称流程

**Files:** Modify `js/main.js`

- [ ] **Step 1:** 修改 `showTitle()`：

```js
function showTitle() {
  lastScreen = 'title';
  game.clearSave();
  const unlocked = game.getUnlockedEndings().length;
  const playerName = game.getPlayerName();
  ui.renderTitle(unlocked, playerName);
}
```

- [ ] **Step 2:** 注册 onSetName 回调：

```js
ui.on('onSetName', (name) => {
  game.setPlayerName(name);
  const unlocked = game.getUnlockedEndings().length;
  ui.renderTitle(unlocked, name);
});
```

- [ ] **Step 3:** 修改初始化部分（替换原 `if (game.load())` 逻辑）：

```js
game.loadPlayerName();
if (game.getPlayerName() && game.load()) {
  showCurrentEvent();
} else {
  showTitle();
}
```

- [ ] **Step 4:** `git add js/main.js && git commit -m "feat: main.js 连接昵称设置流程"`

---

## Task 6: 创建 server/package.json 并安装依赖

**Files:** Create `server/package.json`

- [ ] **Step 1:** 创建 `server/package.json`：

```json
{
  "name": "sgwjl-server",
  "version": "1.0.0",
  "description": "三国武将录后端统计服务",
  "main": "index.js",
  "scripts": { "start": "node index.js" },
  "dependencies": { "express": "^4.21.0", "better-sqlite3": "^11.0.0" }
}
```

- [ ] **Step 2:** `cd server && npm install`
- [ ] **Step 3:** `git add server/package.json server/package-lock.json && git commit -m "feat: 创建 server 项目和依赖"`

---

## Task 7: 创建 server/db.js

**Files:** Create `server/db.js`

- [ ] **Step 1:** 创建 SQLite 数据库模块，包含 `addRecord(playerName, characterId, endingId)` 和 `getStats()` 两个导出函数。建表语句：`CREATE TABLE IF NOT EXISTS game_records (id INTEGER PRIMARY KEY AUTOINCREMENT, player_name TEXT NOT NULL, character_id TEXT NOT NULL, ending_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')))`。getStats 返回 `{ totalGames, endingCounts, characterCounts, recentRecords }`。

- [ ] **Step 2:** `git add server/db.js && git commit -m "feat: 创建 SQLite 数据库模块"`

---

## Task 8: 创建 server/index.js

**Files:** Create `server/index.js`

- [ ] **Step 1:** Express 服务：端口 `process.env.PORT || 3000`，`express.static(path.join(__dirname, '..'))` serve 静态文件，`POST /api/record` 调用 `addRecord`，`GET /api/stats` 需 query param `password` 匹配 `process.env.ADMIN_PASSWORD || 'admin123'`，`GET /admin` 返回 admin.html。

- [ ] **Step 2:** `git add server/index.js && git commit -m "feat: 创建 Express 服务入口"`

---

## Task 9: 创建 server/admin.html

**Files:** Create `server/admin.html`

- [ ] **Step 1:** 独立 HTML 页面，深色主题样式匹配游戏风格。登录区：密码输入框 + 进入按钮，调用 `/api/stats?password=xxx` 验证。统计区：总游戏次数（大字）、结局表格（按次数降序）、角色表格（按次数降序）、最近50条记录表格。

- [ ] **Step 2:** `git add server/admin.html && git commit -m "feat: 创建后台统计页面"`

---

## Task 10: game.js 添加结局上报

**Files:** Modify `js/game.js`

- [ ] **Step 1:** 添加 `_reportRecord(ending)` 方法，POST 到 `/api/record`，body 含 `{ playerName, characterId, endingId }`，catch 空处理静默忽略。

- [ ] **Step 2:** 在 `checkEnding()` 的 3 处 `_unlockEnding()` 调用之后，各加一行 `this._reportRecord(ending/deathEnd/defaultEnding)`。

- [ ] **Step 3:** `git add js/game.js && git commit -m "feat: 结局达成时上报到后端"`

---

## Task 11: 更新 .gitignore

**Files:** Modify `.gitignore`

- [ ] **Step 1:** 追加 `server/node_modules/` 和 `server/data.db`
- [ ] **Step 2:** `git add .gitignore && git commit -m "chore: gitignore 添加 server 相关"`

---

## Task 12: 手动验证

- [ ] 启动 `cd server && node index.js`
- [ ] 访问 `http://localhost:3000`，验证昵称输入、图鉴隔离、换昵称独立
- [ ] 完成一局后访问 `http://localhost:3000/admin`，验证密码保护和统计数据
