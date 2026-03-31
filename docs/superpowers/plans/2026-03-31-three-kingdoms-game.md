# 三国武将录 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a playable H5 text-adventure game where players choose a Three Kingdoms general, experience random events across life phases, and reach one of 8 endings based on attribute values.

**Architecture:** JSON data-driven engine. All game content (characters, events, endings) lives in JSON files. A JS game engine reads data, manages state, and drives the event loop. A separate UI module renders screens and handles interaction. Single-page app with no build tools.

**Tech Stack:** Vanilla HTML5, CSS3, JavaScript (ES modules via `<script type="module">`). No frameworks, no bundler. Data in JSON. Persistence via localStorage.

---

## File Structure

```
G:/TestGame/
├── index.html                 # Single-page entry point, all screen containers
├── css/
│   └── style.css              # Global styles: dark ancient-Chinese theme, responsive
├── js/
│   ├── data-loader.js         # Fetches and caches all JSON data files
│   ├── game.js                # Game state, event selection, attribute logic, ending check
│   ├── ui.js                  # DOM rendering for all 5 screens, transitions, animations
│   └── main.js                # Entry point: wires data-loader, game, and ui together
├── data/
│   ├── characters.json        # 6 generals with attrs + hidden attrs + metadata
│   ├── endings.json           # 8 endings with conditions, stories, priority order
│   ├── events-youth.json      # 少年期 event pool (8 events, pick 5)
│   ├── events-rise.json       # 崛起期 event pool (8 events, pick 6)
│   ├── events-war.json        # 争霸期 event pool (8 events, pick 6)
│   └── events-final.json      # 终局期 event pool (6 events, pick 3)
└── img/                       # Placeholder directory for future art assets
```

**Module responsibilities:**
- `data-loader.js` — exports `loadAllData()` returning `{ characters, endings, events }`. Pure data fetching, no game logic.
- `game.js` — exports a `Game` class. Manages `GameState`, provides methods: `selectCharacter(id)`, `getNextEvent()`, `applyChoice(choiceIndex)`, `checkEnding()`, `save()`, `load()`, `getPhaseConfig()`. No DOM access.
- `ui.js` — exports a `UI` class. Renders screens into DOM containers, listens for clicks, calls game methods via callbacks. No game logic.
- `main.js` — glues everything: loads data, creates Game and UI instances, wires callbacks, handles screen flow.

---

### Task 1: Project Scaffolding — HTML + CSS Theme

**Files:**
- Create: `index.html`
- Create: `css/style.css`

- [ ] **Step 1: Create index.html with all screen containers**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>三国武将录</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <div id="app">
    <div id="screen-title" class="screen active">
      <div class="title-content">
        <p class="title-subtitle">乱世群雄</p>
        <h1 class="title-main">三国武将录</h1>
        <p class="title-tagline">—— 你的选择，决定你的命运 ——</p>
        <div class="title-buttons">
          <button id="btn-start" class="btn btn-primary">开始征途</button>
          <button id="btn-gallery" class="btn btn-secondary">结局图鉴 (<span id="gallery-count">0</span>/8)</button>
        </div>
      </div>
    </div>

    <div id="screen-select" class="screen">
      <h2 class="screen-heading">选择你的武将</h2>
      <div id="character-grid" class="character-grid"></div>
    </div>

    <div id="screen-event" class="screen">
      <div class="status-bar">
        <span id="phase-label">📍 少年期 · 第 1/5 回</span>
        <span id="char-name"></span>
      </div>
      <div class="attr-bar">
        <span>⚔️ 武 <b id="attr-wu">0</b></span>
        <span>📖 智 <b id="attr-zhi">0</b></span>
        <span>🏛️ 德 <b id="attr-de">0</b></span>
        <span>✨ 魅 <b id="attr-mei">0</b></span>
      </div>
      <div class="event-content">
        <h3 id="event-title" class="event-title"></h3>
        <p id="event-desc" class="event-desc"></p>
        <div id="choices-container" class="choices"></div>
      </div>
    </div>

    <div id="screen-result" class="screen">
      <div class="result-content">
        <p id="result-text" class="result-text"></p>
        <div id="result-effects" class="result-effects"></div>
        <button id="btn-continue" class="btn btn-primary">继续</button>
      </div>
    </div>

    <div id="screen-ending" class="screen">
      <div class="ending-content">
        <p class="ending-label">—— 结局 ——</p>
        <h2 id="ending-name" class="ending-name"></h2>
        <p id="ending-char" class="ending-char"></p>
        <p id="ending-story" class="ending-story"></p>
        <div id="ending-attrs" class="ending-attrs"></div>
        <div class="ending-buttons">
          <button id="btn-replay" class="btn btn-primary">再来一局</button>
          <button id="btn-ending-gallery" class="btn btn-secondary">结局图鉴</button>
        </div>
      </div>
    </div>

    <div id="screen-gallery" class="screen">
      <h2 class="screen-heading">结局图鉴</h2>
      <div id="gallery-grid" class="gallery-grid"></div>
      <button id="btn-gallery-back" class="btn btn-secondary gallery-back">返回</button>
    </div>

    <div id="screen-transition" class="screen">
      <p id="transition-text" class="transition-text"></p>
    </div>
  </div>

  <script type="module" src="js/main.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create css/style.css with the dark ancient-Chinese theme**

```css
/* === Reset & Base === */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg-deep: #1a1a2e;
  --bg-mid: #16213e;
  --bg-dark: #0f0f23;
  --bg-card: #12122a;
  --gold: #c4a24e;
  --gold-dark: #8b6914;
  --text-primary: #e0c097;
  --text-secondary: #b8a888;
  --text-muted: #7a6a5a;
  --text-dim: #5a4a3a;
  --border: #2a2a4a;
  --red: #e74c3c;
  --blue: #3498db;
  --green: #2ecc71;
  --orange: #f39c12;
}

html, body {
  height: 100%;
  font-family: "Songti SC", "Noto Serif SC", "SimSun", serif;
  background: var(--bg-deep);
  color: var(--text-primary);
  overflow: hidden;
}

#app {
  width: 100%;
  height: 100%;
  max-width: 480px;
  margin: 0 auto;
  position: relative;
  overflow: hidden;
}

/* === Screens === */
.screen {
  position: absolute;
  inset: 0;
  display: none;
  flex-direction: column;
  overflow-y: auto;
}
.screen.active { display: flex; }

/* === Title Screen === */
.title-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  background: linear-gradient(180deg, var(--bg-deep), var(--bg-mid));
}
.title-subtitle {
  font-size: 12px;
  letter-spacing: 6px;
  color: var(--text-dim);
  margin-bottom: 10px;
}
.title-main {
  font-size: 32px;
  font-weight: bold;
  color: var(--text-primary);
  margin-bottom: 5px;
}
.title-tagline {
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 40px;
}
.title-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 200px;
}

/* === Buttons === */
.btn {
  padding: 12px 24px;
  border-radius: 6px;
  font-size: 14px;
  font-family: inherit;
  cursor: pointer;
  transition: opacity 0.2s;
  text-align: center;
}
.btn:active { opacity: 0.7; }
.btn-primary {
  background: var(--gold-dark);
  color: #fff;
  border: 1px solid var(--gold);
}
.btn-secondary {
  background: transparent;
  color: var(--text-muted);
  border: 1px solid var(--text-dim);
}

/* === Character Select === */
.screen-heading {
  text-align: center;
  padding: 20px;
  font-size: 18px;
  color: var(--text-primary);
}
.character-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  padding: 0 15px 20px;
}
.char-card {
  border: 1px solid var(--text-dim);
  border-radius: 8px;
  padding: 14px;
  text-align: center;
  background: var(--bg-mid);
  cursor: pointer;
  transition: border-color 0.2s;
}
.char-card:active { border-color: var(--gold); }
.char-icon { font-size: 28px; margin-bottom: 6px; }
.char-name { font-weight: bold; font-size: 15px; margin-bottom: 4px; }
.char-attrs { font-size: 11px; color: var(--text-muted); margin-bottom: 4px; }
.char-desc { font-size: 10px; color: var(--text-dim); }

/* === Event Screen === */
.status-bar {
  display: flex;
  justify-content: space-between;
  padding: 10px 15px;
  background: var(--bg-dark);
  font-size: 12px;
  border-bottom: 1px solid var(--border);
}
.attr-bar {
  display: flex;
  justify-content: space-around;
  padding: 8px 10px;
  background: var(--bg-card);
  font-size: 12px;
  border-bottom: 1px solid var(--border);
}
.attr-bar b { margin-left: 2px; }
#attr-wu { color: var(--red); }
#attr-zhi { color: var(--blue); }
#attr-de { color: var(--green); }
#attr-mei { color: var(--orange); }

.event-content { padding: 20px 15px; }
.event-title {
  font-size: 16px;
  color: var(--gold);
  margin-bottom: 12px;
}
.event-desc {
  font-size: 13px;
  line-height: 1.9;
  color: var(--text-secondary);
  margin-bottom: 20px;
}
.choices { display: flex; flex-direction: column; gap: 10px; }
.choice-btn {
  border: 1px solid var(--text-dim);
  border-radius: 8px;
  padding: 12px;
  background: var(--bg-mid);
  cursor: pointer;
  text-align: left;
  color: var(--text-primary);
  font-family: inherit;
  font-size: 13px;
  transition: border-color 0.2s;
}
.choice-btn:active { border-color: var(--gold); }
.choice-text { font-weight: bold; margin-bottom: 4px; }
.choice-effects { font-size: 11px; color: var(--text-muted); }

/* === Result Screen === */
.result-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 30px 20px;
}
.result-text {
  font-size: 13px;
  line-height: 1.9;
  color: var(--text-secondary);
  margin-bottom: 24px;
  text-align: left;
  width: 100%;
}
.result-effects {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  margin-bottom: 30px;
}
.effect-badge {
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
}
.effect-badge.positive { background: #1a3a1a; border: 1px solid var(--green); color: var(--green); }
.effect-badge.negative { background: #3a1a1a; border: 1px solid var(--red); color: var(--red); }

/* === Ending Screen === */
.ending-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
  overflow-y: auto;
}
.ending-label {
  font-size: 12px;
  letter-spacing: 4px;
  color: var(--text-dim);
  margin-bottom: 8px;
}
.ending-name {
  font-size: 26px;
  color: var(--gold);
  margin-bottom: 5px;
}
.ending-char {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 24px;
}
.ending-story {
  font-size: 13px;
  line-height: 2;
  color: var(--text-secondary);
  text-align: left;
  margin-bottom: 24px;
  width: 100%;
}
.ending-attrs {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 15px;
  background: var(--bg-card);
  width: 100%;
  margin-bottom: 24px;
}
.ending-attrs-label {
  font-size: 12px;
  color: var(--text-muted);
  text-align: center;
  margin-bottom: 8px;
}
.ending-attrs-values {
  display: flex;
  justify-content: space-around;
  font-size: 13px;
}
.ending-buttons {
  display: flex;
  gap: 10px;
}

/* === Gallery Screen === */
.gallery-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  padding: 0 15px 20px;
  flex: 1;
}
.gallery-card {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 16px;
  background: var(--bg-card);
  text-align: center;
}
.gallery-card.locked { opacity: 0.4; }
.gallery-card-name { font-size: 14px; font-weight: bold; margin-bottom: 6px; color: var(--gold); }
.gallery-card-desc { font-size: 11px; color: var(--text-muted); line-height: 1.6; }
.gallery-back { margin: 0 15px 20px; }

/* === Transition Screen === */
.transition-text {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: var(--gold);
  text-align: center;
  padding: 40px;
  line-height: 2;
  animation: fadeIn 1s ease-in;
}

/* === Animations === */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes fadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}
.screen.fade-in { animation: fadeIn 0.4s ease-in; }
.screen.fade-out { animation: fadeOut 0.3s ease-out; }

/* === Responsive === */
@media (min-width: 481px) {
  #app { border-left: 1px solid var(--border); border-right: 1px solid var(--border); }
}
```

- [ ] **Step 3: Create empty img directory**

```bash
mkdir -p G:/TestGame/img
```

- [ ] **Step 4: Open index.html in browser to verify dark theme renders**

Open `index.html` in a browser (or use a local server). Verify:
- Dark blue background (#1a1a2e) fills the viewport
- Title screen shows: "乱世群雄", "三国武将录", tagline, two buttons
- Gold-on-dark color scheme is visible
- Layout is centered and max 480px wide

---

### Task 2: Game Data — Characters + Endings JSON

**Files:**
- Create: `data/characters.json`
- Create: `data/endings.json`

- [ ] **Step 1: Create data/characters.json**

```json
[
  {
    "id": "guanyu",
    "name": "关羽",
    "icon": "⚔️",
    "title": "武德双全",
    "desc": "一生忠义，武艺超群。青龙偃月刀名震天下。",
    "attrs": { "武": 95, "智": 70, "德": 90, "魅": 80 },
    "hidden": { "命运": 50, "忠义": 85 }
  },
  {
    "id": "zhugeliang",
    "name": "诸葛亮",
    "icon": "🪶",
    "title": "卧龙之智",
    "desc": "未出茅庐已知天下三分。羽扇纶巾，智冠群雄。",
    "attrs": { "武": 30, "智": 98, "德": 85, "魅": 90 },
    "hidden": { "命运": 60, "忠义": 75 }
  },
  {
    "id": "caocao",
    "name": "曹操",
    "icon": "👑",
    "title": "乱世枭雄",
    "desc": "治世之能臣，乱世之奸雄。唯才是举，志在天下。",
    "attrs": { "武": 80, "智": 92, "德": 40, "魅": 85 },
    "hidden": { "命运": 70, "忠义": 30 }
  },
  {
    "id": "zhaoyun",
    "name": "赵云",
    "icon": "🛡️",
    "title": "忠勇无双",
    "desc": "长坂坡七进七出，一身是胆。忠心耿耿，万军莫敌。",
    "attrs": { "武": 92, "智": 72, "德": 88, "魅": 75 },
    "hidden": { "命运": 45, "忠义": 80 }
  },
  {
    "id": "zhouyu",
    "name": "周瑜",
    "icon": "🔥",
    "title": "江东儒将",
    "desc": "赤壁一把火，奠定三分天下。文武兼备，风流倜傥。",
    "attrs": { "武": 75, "智": 95, "德": 65, "魅": 88 },
    "hidden": { "命运": 55, "忠义": 60 }
  },
  {
    "id": "lvbu",
    "name": "吕布",
    "icon": "💀",
    "title": "天下无双",
    "desc": "人中吕布，马中赤兔。武力天下第一，然反复无常。",
    "attrs": { "武": 99, "智": 35, "德": 20, "魅": 60 },
    "hidden": { "命运": 40, "忠义": 15 }
  }
]
```

- [ ] **Step 2: Create data/endings.json**

```json
{
  "endings": [
    {
      "id": "unify",
      "name": "一统天下",
      "conditions": {
        "武": { "min": 80 },
        "智": { "min": 80 },
        "魅": { "min": 75 }
      },
      "story": "你文韬武略，兼备仁德与雄才。在无数次生死抉择之后，你终于站在了天下之巅。各路诸侯或降或灭，百姓终于迎来了久违的太平。你登基称帝，定都洛阳，开创了一个崭新的王朝。史官提笔写下：「自桓灵以来，天下纷争数十载，至此终归一统。」你望着殿外的万里江山，心中感慨万千——这条路上，有太多人为此付出了生命。"
    },
    {
      "id": "loyal",
      "name": "忠臣良将",
      "conditions": {
        "武": { "min": 70 },
        "德": { "min": 85 },
        "忠义": { "min": 80 }
      },
      "story": "你一生追随明主，南征北战，从无二心。在最危急的时刻，你挺身而出，以一己之力力挽狂澜。虽然天下最终并非由你亲手统一，但你的忠义之名传遍四海。后世建庙祭祀，香火不绝。说书人讲起你的故事，总是感叹：「自古忠义两难全，唯有此人，忠义皆备，无愧于天地。」你的青龙偃月刀，成为了忠义的象征。"
    },
    {
      "id": "strategist",
      "name": "幕后军师",
      "conditions": {
        "智": { "min": 90 },
        "魅": { "min": 70 },
        "武": { "max": 59 }
      },
      "story": "你从不亲上战场，却是决定天下走势的关键人物。一张地图，一盏油灯，你在帐中运筹帷幄，千里之外的战局尽在掌握。你辅佐的主公最终成就大业，而你选择功成身退，留下一部兵法著作传于后世。世人评价你：「卧龙凤雏，得一可安天下。」你淡然一笑——天下事，不过棋局一盘。"
    },
    {
      "id": "warlord",
      "name": "乱世枭雄",
      "conditions": {
        "武": { "min": 75 },
        "智": { "min": 75 },
        "德": { "max": 39 }
      },
      "story": "你深谙乱世生存法则——仁义不过是弱者的遮羞布。你用计谋和武力铲除了一个又一个对手，背叛过盟友，利用过忠臣，但最终你确实做到了——半壁江山尽在掌握。后世对你褒贬不一：有人骂你奸诈无耻，有人赞你雄才大略。你不在乎。成王败寇，这就是乱世的规则。你举杯对月，吟诵着自己写的诗篇。"
    },
    {
      "id": "hermit",
      "name": "归隐山林",
      "conditions": {
        "德": { "min": 80 },
        "命运": { "min": 70 },
        "no_extreme": true
      },
      "story": "你见过了太多的尔虞我诈、生离死别。在乱世的漩涡中，你始终保持着一颗清明之心。当你意识到这场争斗没有真正的赢家时，你做出了一个让所有人意外的决定——挂印封金，归隐山林。你在终南山下结庐而居，每日读书种菜，偶尔有故人来访，便煮酒论天下大势。你将一生所学写成《乱世求生录》，成为后世文人墨客的枕边书。"
    },
    {
      "id": "fallen",
      "name": "战死沙场",
      "conditions": {
        "武": { "min": 85 },
        "智": { "max": 49 },
        "忠义": { "min": 60 }
      },
      "story": "你是战场上最耀眼的将星，每次冲锋都让敌人闻风丧胆。然而，勇武终究无法弥补谋略的不足。在一场关键战役中，你中了敌军的埋伏。漫天箭雨之下，你依然挥刀斩杀了数十敌军，但终因寡不敌众，力竭而亡。你倒下的那一刻，手中的武器仍然指向敌阵。三军将士含泪为你收殓，你的英勇事迹被编入军歌，代代传唱。"
    },
    {
      "id": "betrayed",
      "name": "众叛亲离",
      "conditions": {
        "德": { "max": 29 },
        "忠义": { "max": 29 }
      },
      "story": "你以为自己足够聪明，可以玩弄所有人于股掌之间。你背叛过誓言，出卖过兄弟，为了利益不惜一切代价。然而，当你最需要帮助的时候，身边却空无一人。昔日被你利用过的盟友联手将你围困，你曾经的部下打开了城门。在生命的最后时刻，你终于明白：在这个乱世里，信义才是最锋利的武器，而你早已将它丢弃。"
    },
    {
      "id": "ordinary",
      "name": "平凡一生",
      "conditions": {},
      "story": "你在这个乱世中艰难求存，既没有成就惊天伟业，也没有落得悲惨下场。你打过几场仗，交过几个朋友，经历过几次生死。最终，你回到了家乡，娶妻生子，在田间地头度过了余生。偶尔回忆起那段金戈铁马的岁月，你会对儿孙们讲起那些英雄的故事——关于忠义，关于智谋，关于那个群星璀璨的时代。平凡，但也算圆满。"
    }
  ]
}
```

- [ ] **Step 3: Verify JSON is valid**

```bash
cd G:/TestGame && node -e "JSON.parse(require('fs').readFileSync('data/characters.json','utf8')); JSON.parse(require('fs').readFileSync('data/endings.json','utf8')); console.log('All JSON valid')"
```

Expected: `All JSON valid`

- [ ] **Step 4: Commit**

```bash
git add index.html css/ data/characters.json data/endings.json img/
git commit -m "feat: project scaffolding with HTML structure, CSS theme, and game data"
```

---

### Task 3: Event Data — All Four Phase Event Pools

**Files:**
- Create: `data/events-youth.json`
- Create: `data/events-rise.json`
- Create: `data/events-war.json`
- Create: `data/events-final.json`

- [ ] **Step 1: Create data/events-youth.json (少年期, 8 events, pick 5)**

```json
{
  "phase": "少年期",
  "pickCount": 5,
  "transition": "少年时光转瞬即逝。你已不再是那个懵懂无知的孩子，乱世的风云正在向你招手……",
  "events": [
    {
      "id": "youth_01",
      "title": "虎牢关前的少年",
      "description": "你随师父途经虎牢关，目睹一场激战。三路诸侯联军与董卓精锐激战正酣。一名伤兵倒在路旁，向你伸出求救之手……",
      "conditions": {},
      "choices": [
        {
          "text": "上前救治伤兵",
          "effects": { "武": -2, "德": 5, "魅": 3 },
          "hidden_effects": { "忠义": 5 },
          "result": "你毫不犹豫地上前救治伤兵。他感激涕零，从怀中掏出一卷泛黄的兵法——那是他从军多年珍藏的《孙子兵法》残卷。"小兄弟，此书赠你，愿你日后成为仁义之将。""
        },
        {
          "text": "趁乱捡起战场上的名刀",
          "effects": { "武": 5, "德": -3 },
          "hidden_effects": { "命运": 2 },
          "result": "你敏捷地从战场边缘捡起一把精良的战刀。刀身寒光闪烁，入手沉稳。师父看见了，微微皱眉，但没有说什么。"
        },
        {
          "text": "冷静观察战局，分析双方战术",
          "effects": { "智": 5, "武": 1 },
          "hidden_effects": {},
          "result": "你蹲在高处仔细观察双方的阵型和调动。联军人多势众但各自为战，董卓军虽少却令行禁止。你从这场战斗中悟出了不少用兵之道。"
        }
      ]
    },
    {
      "id": "youth_02",
      "title": "拜师学艺",
      "description": "你的名声渐渐传开，两位名师同时向你抛出橄榄枝：一位是精通兵法韬略的隐士，一位是武艺高强的江湖侠客。",
      "conditions": {},
      "choices": [
        {
          "text": "拜隐士为师，研读兵法",
          "effects": { "智": 6, "魅": 2 },
          "hidden_effects": { "命运": 3 },
          "result": "隐士住在山间草庐，每日教你读《六韬》《三略》，分析古今战例。三个月后，你对天下大势有了全新的认识。"
        },
        {
          "text": "拜侠客为师，苦练武艺",
          "effects": { "武": 6, "德": 2 },
          "hidden_effects": { "忠义": 3 },
          "result": "侠客带你在山中苦练，每日天不亮就开始。他不仅教你武艺，还教你做人的道理：\"习武之人，当行侠仗义。\"你深以为然。"
        }
      ]
    },
    {
      "id": "youth_03",
      "title": "市集风波",
      "description": "你在市集上看到一个恶霸正在欺压一个卖菜的老者，强行压低菜价不说，还推搡老人。周围的人都敢怒不敢言。",
      "conditions": {},
      "choices": [
        {
          "text": "挺身而出，喝止恶霸",
          "effects": { "武": 2, "德": 4, "魅": 3 },
          "hidden_effects": { "忠义": 4 },
          "result": "你大步上前喝止恶霸。对方见你气势不凡，竟然灰溜溜地走了。老者感激不尽，围观的百姓纷纷叫好。你的名声在小镇上传开了。"
        },
        {
          "text": "暗中记下恶霸身份，事后举报官府",
          "effects": { "智": 4, "德": 2 },
          "hidden_effects": { "命运": 2 },
          "result": "你没有贸然行动，而是记下恶霸的面貌和行踪，随后向县衙举报。几日后恶霸被收押，老者上门致谢。有时候，智取胜于力敌。"
        },
        {
          "text": "装作没看见，不想惹麻烦",
          "effects": { "智": 1, "德": -4 },
          "hidden_effects": { "忠义": -5 },
          "result": "你低下头快步走过。身后传来老者的哀求声，你的心隐隐作痛。当晚你辗转难眠，不知道自己的选择是否正确。"
        }
      ]
    },
    {
      "id": "youth_04",
      "title": "山间猛虎",
      "description": "一日你独自上山采药，途中遇到一只猛虎拦路。猛虎双目赤红，显然正在饥饿之中。退路已被断绝……",
      "conditions": {},
      "choices": [
        {
          "text": "与猛虎搏斗",
          "effects": { "武": 5, "魅": 2 },
          "hidden_effects": { "命运": 3 },
          "result": "你握紧手中的棍棒，与猛虎搏斗良久。最终猛虎负伤退去，你也浑身是伤。下山后，"少年搏虎"的故事传遍了十里八乡。"
        },
        {
          "text": "利用地形设置陷阱",
          "effects": { "智": 5, "武": 1 },
          "hidden_effects": {},
          "result": "你迅速观察地形，发现一处悬崖边的枯木。你巧妙地将猛虎引向枯木，枯木断裂后猛虎跌落山崖。师父知道后赞你临危不乱。"
        },
        {
          "text": "缓慢后退，保持对峙",
          "effects": { "智": 2, "德": 3 },
          "hidden_effects": { "命运": 1 },
          "result": "你屏住呼吸，保持镇定，缓慢后退。猛虎似乎感受到了你的气势，犹豫片刻后转身离去。有时候，不战而退也需要莫大的勇气。"
        }
      ]
    },
    {
      "id": "youth_05",
      "title": "竹林论道",
      "description": "你偶遇几位游学的文士在竹林中辩论天下大势。他们邀请你加入讨论，问你一个问题："乱世之中，何为英雄？"",
      "conditions": {},
      "choices": [
        {
          "text": ""英雄者，以武定乱，以力服人。"",
          "effects": { "武": 3, "魅": 2 },
          "hidden_effects": { "忠义": 2 },
          "result": "文士们争论不已，有人赞同有人反对。但你言辞恳切，气度不凡，让几位文士对你刮目相看。一位年长者说："此子有将才之相。""
        },
        {
          "text": ""英雄者，运筹帷幄，以智取胜。"",
          "effects": { "智": 4, "魅": 2 },
          "hidden_effects": { "命运": 2 },
          "result": "你引经据典，从姜太公说到张良，论述智者在乱世中的作用。文士们频频点头，有人当场送你一套珍藏的竹简。"
        },
        {
          "text": ""英雄者，心怀天下，以德化人。"",
          "effects": { "德": 4, "魅": 3 },
          "hidden_effects": { "忠义": 3 },
          "result": "你的回答让众人沉默良久。一位白发老者站起身来，拍了拍你的肩膀："乱世之中能有此心，难得。望你日后莫忘今日之言。""
        }
      ]
    },
    {
      "id": "youth_06",
      "title": "流民之苦",
      "description": "连年战乱，大量流民涌入你所在的小镇。他们衣衫褴褛、饥寒交迫。镇上的粮食已经不多了……",
      "conditions": {},
      "choices": [
        {
          "text": "拿出自家存粮接济流民",
          "effects": { "德": 5, "魅": 3, "武": -2 },
          "hidden_effects": { "忠义": 4, "命运": 2 },
          "result": "你说服家人拿出大半存粮。流民们感激涕零，纷纷下跪道谢。虽然你自己也要勒紧裤腰带，但看到他们的笑容，你觉得值了。"
        },
        {
          "text": "组织流民开荒种地",
          "effects": { "智": 4, "魅": 4 },
          "hidden_effects": { "命运": 3 },
          "result": "你提出了一个计划：让流民在镇外的荒地上耕种，镇上提供种子和工具。几个月后，荒地变成了良田。你的组织能力令人刮目相看。"
        },
        {
          "text": "加入镇上民兵保护粮仓",
          "effects": { "武": 4, "德": -2 },
          "hidden_effects": { "忠义": -2 },
          "result": "你加入了守卫粮仓的民兵队伍。虽然保住了镇上的粮食，但看着城门外挨饿的流民，你心里并不好受。"
        }
      ]
    },
    {
      "id": "youth_07",
      "title": "夜读兵书",
      "description": "你偶然得到一本残缺的古代兵书。书中记载了两种截然不同的治军之道……",
      "conditions": {},
      "choices": [
        {
          "text": "研习"以严治军，令行禁止"",
          "effects": { "武": 4, "智": 2 },
          "hidden_effects": {},
          "result": "你花了整整一个月研读这一章节，还用树枝在沙地上模拟排兵布阵。严明的军纪是胜利的基础——这个道理深深刻在你脑海中。"
        },
        {
          "text": "研习"以仁治军，上下一心"",
          "effects": { "德": 4, "魅": 3 },
          "hidden_effects": { "忠义": 3 },
          "result": "你被书中"将者，士之心也"的理念打动。一个好将领应该让士兵心甘情愿地追随，而不仅仅是靠军法约束。"
        }
      ]
    },
    {
      "id": "youth_08",
      "title": "神秘旅人",
      "description": "一个神秘旅人路过你的村庄，他自称走遍天下，见识过各路诸侯。他愿意回答你一个问题。",
      "conditions": {},
      "choices": [
        {
          "text": ""天下英雄，谁最善战？"",
          "effects": { "武": 3, "智": 2 },
          "hidden_effects": { "命运": 2 },
          "result": "旅人详细描述了各路猛将的武艺特点和战斗风格。你从中学到了很多实战技巧，也对未来的对手有了初步了解。"
        },
        {
          "text": ""天下大势，将往何方？"",
          "effects": { "智": 4, "魅": 2 },
          "hidden_effects": { "命运": 4 },
          "result": "旅人沉吟良久，给你分析了各方势力的优劣。末了他说："能问出这个问题的年轻人，将来必成大器。"你的眼界一下子开阔了。"
        },
        {
          "text": ""如何才能在乱世中保护身边的人？"",
          "effects": { "德": 3, "魅": 2, "武": 1 },
          "hidden_effects": { "忠义": 4 },
          "result": "旅人看着你，目光柔和了几分："乱世之中，能说出这话的人不多了。"他教了你几招防身术，又叮嘱你保持这颗赤子之心。"
        }
      ]
    }
  ]
}
```

- [ ] **Step 2: Create data/events-rise.json (崛起期, 8 events, pick 6)**

```json
{
  "phase": "崛起期",
  "pickCount": 6,
  "transition": "你已崭露头角，天下诸侯纷纷注意到了你的存在。大争之世，正是英雄建功立业之时……",
  "events": [
    {
      "id": "rise_01",
      "title": "投奔明主",
      "description": "你的才能引起了几方势力的关注。一位使者带着重礼前来，邀你加入他的主公麾下。这是你踏入天下棋局的第一步。",
      "conditions": {},
      "choices": [
        {
          "text": "慨然应允，投身军旅",
          "effects": { "武": 3, "魅": 3 },
          "hidden_effects": { "忠义": 5 },
          "result": "你整装出发，加入了军队。主公亲自出营相迎，对你礼遇有加。你暗暗发誓，一定不辜负这份知遇之恩。"
        },
        {
          "text": "提出条件，要求独领一军",
          "effects": { "智": 3, "魅": 2, "德": -2 },
          "hidden_effects": { "命运": 3 },
          "result": "你提出了自己的条件。使者有些意外，但回去禀报后，主公竟然同意了。你带着自己招募的五百人马，开始了独立统兵的征途。"
        },
        {
          "text": "婉拒邀请，继续游历观察",
          "effects": { "智": 4, "德": 2 },
          "hidden_effects": { "命运": 4 },
          "result": "你觉得时机尚未成熟，婉拒了邀请。在接下来的游历中，你更深入地了解了各方势力的虚实，为将来做出了更好的准备。"
        }
      ]
    },
    {
      "id": "rise_02",
      "title": "初战告捷",
      "description": "你迎来了人生中的第一场大战。敌军来势汹汹，兵力是你方的两倍。主帅问你有何良策。",
      "conditions": {},
      "choices": [
        {
          "text": "请缨担任先锋，率骑兵突袭",
          "effects": { "武": 5, "魅": 2 },
          "hidden_effects": { "命运": 2 },
          "result": "你一马当先杀入敌阵，所到之处敌军纷纷溃逃。你的勇猛极大地鼓舞了己方士气，最终大获全胜。战后主帅拍着你的肩膀说："猛将也！""
        },
        {
          "text": "献策设伏，以逸待劳",
          "effects": { "智": 5, "魅": 3 },
          "hidden_effects": { "命运": 2 },
          "result": "你提出在河谷设伏的计策。主帅采纳后，敌军果然中计，损兵折将大半。你的谋略赢得了全军上下的尊敬。"
        },
        {
          "text": "建议坚守不出，等待敌军粮尽",
          "effects": { "智": 3, "德": 3 },
          "hidden_effects": { "忠义": 2 },
          "result": "你力排众议，建议坚守。半月之后，敌军果然粮草不继，被迫撤退。虽然不如速胜来得痛快，但己方伤亡极少。将士们对你的沉稳大加赞赏。"
        }
      ]
    },
    {
      "id": "rise_03",
      "title": "俘虏之争",
      "description": "一场大胜之后，你军俘虏了数千敌兵。关于如何处置俘虏，军中意见不一。主帅让你做出决定。",
      "conditions": {},
      "choices": [
        {
          "text": "善待俘虏，收编为己用",
          "effects": { "德": 4, "魅": 4 },
          "hidden_effects": { "忠义": 3 },
          "result": "你下令善待俘虏，为他们疗伤并提供食物。不少俘虏被你的仁义所感动，自愿加入你的军队。你的兵力不减反增。"
        },
        {
          "text": "全部处斩，以儆效尤",
          "effects": { "武": 3, "魅": -2, "德": -5 },
          "hidden_effects": { "忠义": -5 },
          "result": "你下令处斩所有俘虏。消息传出后，敌军闻风丧胆，但你自己的士兵也有不少人心生不安。有些事情一旦做了，就再也回不了头。"
        },
        {
          "text": "释放俘虏，让他们传播己方仁义之名",
          "effects": { "德": 5, "智": 2, "武": -2 },
          "hidden_effects": { "命运": 3, "忠义": 2 },
          "result": "你不仅释放了俘虏，还给了他们干粮盘缠。被释放的士兵回去后纷纷传颂你的仁义，不少敌方将领开始考虑归降。"
        }
      ]
    },
    {
      "id": "rise_04",
      "title": "结义兄弟",
      "description": "在一次战斗中，你和一位勇猛的武将并肩作战，结下了生死之交。他提议和你结为异姓兄弟。",
      "conditions": {},
      "choices": [
        {
          "text": "欣然同意，桃园结义",
          "effects": { "魅": 4, "德": 3 },
          "hidden_effects": { "忠义": 6 },
          "result": "你们在营外的桃林中焚香祭天，结为兄弟。从此以后，你多了一个可以以命相托的战友。他日后多次在危急时刻救你于水火之中。"
        },
        {
          "text": "婉拒结义，但保持密切合作",
          "effects": { "智": 3, "魅": 1 },
          "hidden_effects": { "命运": 2 },
          "result": "你委婉地拒绝了。乱世之中，承诺太重——你不想做出自己可能无法兑现的誓言。但你们依然是最好的战友和朋友。"
        }
      ]
    },
    {
      "id": "rise_05",
      "title": "粮草危机",
      "description": "大军驻扎数月，粮草即将告罄。补给线被敌军切断，军心开始动摇。你必须想办法解决粮草问题。",
      "conditions": {},
      "choices": [
        {
          "text": "亲率精锐突袭敌军粮仓",
          "effects": { "武": 5, "智": 2 },
          "hidden_effects": { "命运": 3 },
          "result": "你挑选三百精兵，趁夜色突袭了敌军的粮仓。一把火烧了敌军大半粮草，同时带回了足够己方半月之用的粮食。全军欢呼。"
        },
        {
          "text": "向附近百姓购粮，以高价收购",
          "effects": { "德": 3, "魅": 3, "智": 1 },
          "hidden_effects": { "忠义": 2 },
          "result": "你以公平甚至偏高的价格向百姓收购粮食，严禁抢掠。虽然花费不小，但百姓们主动送来更多粮食，还有人自愿参军。"
        },
        {
          "text": "下令减少口粮，与士兵同甘共苦",
          "effects": { "德": 4, "魅": 4, "武": -1 },
          "hidden_effects": { "忠义": 4 },
          "result": "你以身作则，将自己的口粮减到和普通士兵一样。将士们看在眼里，军心反而更加稳固。有将领私下说："跟着这样的主帅，饿死也值了。""
        }
      ]
    },
    {
      "id": "rise_06",
      "title": "谋士来投",
      "description": "一位自称精通天文地理、兵法谋略的文士前来投奔。他才华横溢但性格高傲，要求担任军师之位。",
      "conditions": {},
      "choices": [
        {
          "text": "虚心请教，以礼相待",
          "effects": { "智": 3, "德": 3, "魅": 2 },
          "hidden_effects": { "命运": 3 },
          "result": "你三顾茅庐般诚恳地请教。文士被你的诚意打动，不仅留下，还为你制定了一套长远的战略规划。从此你的决策更加精准。"
        },
        {
          "text": "先出题考验，通过才录用",
          "effects": { "智": 5, "武": 1 },
          "hidden_effects": {},
          "result": "你设置了三道难题考验他。文士不仅全部答对，还反问了你三个问题。你们一番激烈交锋后惺惺相惜，他成了你最信赖的谋士。"
        },
        {
          "text": "拒绝，你不需要一个骄傲的军师",
          "effects": { "武": 2, "德": -2 },
          "hidden_effects": { "忠义": 1, "命运": -3 },
          "result": "你拒绝了他。文士冷笑一声离去，日后竟成了你最强大的对手的谋士。你有时会想，如果当初……但后悔已经来不及了。"
        }
      ]
    },
    {
      "id": "rise_07",
      "title": "美人计",
      "description": "敌方派来一位绝色美人作为和亲使者，实则暗藏刺杀之意。你的侍卫发现了端倪，向你禀报。",
      "conditions": {},
      "choices": [
        {
          "text": "将计就计，假意接受和亲",
          "effects": { "智": 5, "魅": 2 },
          "hidden_effects": { "命运": 3 },
          "result": "你假装不知情，在接见时暗中布下埋伏。当刺客暴露时被一举擒获，你还从刺客口中套出了大量敌军情报。"
        },
        {
          "text": "直接揭穿阴谋，严词拒绝",
          "effects": { "武": 2, "德": 4, "魅": 1 },
          "hidden_effects": { "忠义": 3 },
          "result": "你当面揭穿了这个阴谋，并放美人回去传话："你们的主公若有诚意，就在战场上堂堂正正地较量。"你的磊落赢得了部下的尊敬。"
        }
      ]
    },
    {
      "id": "rise_08",
      "title": "攻城之战",
      "description": "你奉命攻取一座战略要城。城池坚固，守军拼死抵抗。连攻三日未下，将士疲惫不堪。",
      "conditions": {},
      "choices": [
        {
          "text": "亲自登云梯，身先士卒",
          "effects": { "武": 5, "魅": 3, "智": -1 },
          "hidden_effects": { "忠义": 2 },
          "result": "你身披重甲，第一个登上云梯。箭矢如雨，你却毫无惧色。在你的带领下，将士们士气大振，一鼓作气攻下了城池。"
        },
        {
          "text": "派人劝降城中守将",
          "effects": { "智": 3, "德": 4, "魅": 2 },
          "hidden_effects": { "命运": 2 },
          "result": "你写了一封情真意切的劝降书。守将读完后长叹一声，打开了城门。你不费一兵一卒就拿下了这座坚城，城中百姓秋毫无犯。"
        },
        {
          "text": "绕过此城，直取敌军后方",
          "effects": { "智": 5, "武": 2 },
          "hidden_effects": { "命运": 3 },
          "result": "你大胆决定绕过坚城，直插敌军后方粮道。敌军后方大乱，坚城守军不战而降。你的军事才能让所有人刮目相看。"
        }
      ]
    }
  ]
}
```

- [ ] **Step 3: Create data/events-war.json (争霸期, 8 events, pick 6)**

```json
{
  "phase": "争霸期",
  "pickCount": 6,
  "transition": "天下三分已成定局。你已是一方重臣，每一个决定都可能改变天下的走向……",
  "events": [
    {
      "id": "war_01",
      "title": "赤壁风云",
      "description": "一场决定天下命运的大战即将打响。你被委以重任，负责制定这场战役的核心策略。数十万大军的命运，握在你的手中。",
      "conditions": {},
      "choices": [
        {
          "text": "力主决战，以火攻破敌",
          "effects": { "智": 4, "武": 3, "魅": 2 },
          "hidden_effects": { "命运": 4 },
          "result": "你提出火攻之计，并亲自观测风向、准备火船。当东风起时，漫天火光照亮了整个江面。敌军大败，你一战成名。"
        },
        {
          "text": "建议联合其他势力共同抵抗",
          "effects": { "智": 3, "魅": 5 },
          "hidden_effects": { "忠义": 3, "命运": 2 },
          "result": "你亲自出使，以三寸不烂之舌说服了犹豫不决的盟友。联军合力之下，强敌被迫退兵。你的外交才能为人称道。"
        },
        {
          "text": "主张坚壁清野，以守代攻",
          "effects": { "德": 4, "智": 3 },
          "hidden_effects": { "忠义": 4 },
          "result": "你认为冒险决战风险太大，力主坚壁清野。虽然没有大胜的辉煌，但你成功保全了实力，为日后的发展奠定了基础。"
        }
      ]
    },
    {
      "id": "war_02",
      "title": "间谍风波",
      "description": "你的心腹部下被人揭发是敌方安插的间谍。证据确凿，但此人跟随你多年，立过不少战功……",
      "conditions": {},
      "choices": [
        {
          "text": "依军法处斩，绝不姑息",
          "effects": { "武": 3, "智": 2, "德": -2 },
          "hidden_effects": { "忠义": -3 },
          "result": "你强忍悲痛，下令处斩。全军上下为之震动，从此再无人敢有二心。但你失去了一个曾并肩作战的战友，心中五味杂陈。"
        },
        {
          "text": "暗中监视，利用他传递假情报",
          "effects": { "智": 6, "德": -1 },
          "hidden_effects": { "命运": 4 },
          "result": "你没有打草惊蛇，而是开始通过他向敌方传递精心编造的假情报。敌军因此做出了一系列错误判断，你不费一兵一卒就扭转了战局。"
        },
        {
          "text": "感化他，给他改过自新的机会",
          "effects": { "德": 5, "魅": 3 },
          "hidden_effects": { "忠义": 5 },
          "result": "你单独召见他，推心置腹地长谈了一夜。他痛哭流涕，供出了敌方全部情报网。从此他成了你最忠诚的部下，再无二心。",
          "hidden_conditions": { "忠义": { "min": 70 } }
        }
      ]
    },
    {
      "id": "war_03",
      "title": "权臣之争",
      "description": "你的功勋越来越大，朝中有人开始嫉妒。一位权臣在主公面前进谗言，说你有谋反之心。主公召你进宫问话。",
      "conditions": {},
      "choices": [
        {
          "text": "坦然面对，以功绩自证清白",
          "effects": { "德": 4, "魅": 3, "智": 1 },
          "hidden_effects": { "忠义": 5 },
          "result": "你带着一身戎装进宫，将历年战功一一陈述。主公看着你坚定的眼神，当场斥退了那位权臣。你的忠诚经受住了考验。"
        },
        {
          "text": "主动交出兵权，以退为进",
          "effects": { "智": 5, "德": 3 },
          "hidden_effects": { "命运": 4 },
          "result": "你出人意料地主动交出了兵权。主公大为感动，不仅没有收回，反而加封你为大将军。那位权臣反倒因此失了宠信。"
        },
        {
          "text": "暗中收集权臣的把柄，反戈一击",
          "effects": { "智": 4, "武": 2, "德": -3 },
          "hidden_effects": { "忠义": -2, "命运": 3 },
          "result": "你安排人手调查那位权臣，很快就发现了他贪污军饷的证据。你在朝堂上当众揭发，权臣被罢免入狱。从此无人敢再觊觎你的位置。"
        }
      ]
    },
    {
      "id": "war_04",
      "title": "百姓请命",
      "description": "你攻下一座城池后，发现城中百姓正在遭受瘟疫之苦。你的军医有限，如果全力救治百姓，军队的战斗力会受到影响。",
      "conditions": {},
      "choices": [
        {
          "text": "全力救治百姓，暂停军事行动",
          "effects": { "德": 6, "魅": 3, "武": -3 },
          "hidden_effects": { "忠义": 4, "命运": 3 },
          "result": "你下令全军驻扎，将军医全部派去救治百姓。一个月后瘟疫控制住了，百姓们在城门口焚香跪拜。你失去了一个月的进攻时间，但赢得了万民的心。"
        },
        {
          "text": "留下部分药材和军医，大军继续前进",
          "effects": { "智": 3, "德": 2, "武": 1 },
          "hidden_effects": { "命运": 1 },
          "result": "你做了折中的决定，留下一队军医和药材。虽然不够理想，但至少给了百姓一线生机。大军继续前进，没有耽误战机。"
        },
        {
          "text": "封锁城池防止瘟疫扩散，大军绕行",
          "effects": { "智": 4, "武": 2, "德": -4 },
          "hidden_effects": { "忠义": -3 },
          "result": "你从军事角度出发，封锁了城池并率军绕行。瘟疫最终夺去了城中大量百姓的生命。你避免了军队感染的风险，但你的名声受到了严重损害。"
        }
      ]
    },
    {
      "id": "war_05",
      "title": "盟友背叛",
      "description": "你最信任的盟友突然倒戈，率军偷袭了你的后方大营。你损失惨重，不得不面对一个痛苦的选择。",
      "conditions": {},
      "choices": [
        {
          "text": "怒而兴师，立刻率军反击",
          "effects": { "武": 5, "魅": 2, "智": -2 },
          "hidden_effects": { "忠义": 2 },
          "result": "你率领残兵反击，在一场惨烈的战斗中击败了叛徒。虽然损失不小，但你用行动告诉天下人：背叛你的人不会有好下场。"
        },
        {
          "text": "忍辱负重，先退守再图反击",
          "effects": { "智": 5, "德": 2 },
          "hidden_effects": { "命运": 4 },
          "result": "你咬牙退守，在极其困难的情况下保存了有生力量。半年后你卷土重来，用一场漂亮的反击战证明了自己的智慧和韧性。"
        },
        {
          "text": "派使者谈判，争取和解",
          "effects": { "智": 3, "魅": 3, "德": 3 },
          "hidden_effects": { "忠义": 3 },
          "result": "你压下怒火，派出使者谈判。你开出了优厚的条件，最终盟友被你的胸襟所折服，再次归附。你以德报怨，赢得了天下人的尊敬。",
          "hidden_conditions": { "忠义": { "min": 75 } }
        }
      ]
    },
    {
      "id": "war_06",
      "title": "称王之议",
      "description": "你的势力已经足够强大。部下们纷纷劝你称王建制，以正名分。这一步一旦迈出，就再也回不了头了。",
      "conditions": {},
      "choices": [
        {
          "text": "顺应民意，称王建制",
          "effects": { "魅": 4, "武": 2, "德": -2 },
          "hidden_effects": { "命运": 5 },
          "result": "你登台称王，建立自己的政权。天下为之震动。你的野心昭告天下，从此你不再是臣子，而是逐鹿天下的王者。"
        },
        {
          "text": "谦让推辞，表示时机未到",
          "effects": { "德": 5, "智": 2, "魅": 1 },
          "hidden_effects": { "忠义": 5 },
          "result": "你三次推辞不就。你的谦逊赢得了更多人的追随，也避免了成为众矢之的。韬光养晦，等待真正的时机。"
        }
      ]
    },
    {
      "id": "war_07",
      "title": "暗杀阴谋",
      "description": "一个深夜，你的贴身侍卫发现了一个潜入营帐的刺客。刺客被制服后，供出了幕后主使——竟是你阵营中的一位重要将领。",
      "conditions": {},
      "choices": [
        {
          "text": "秘密处理，不动声色地架空他",
          "effects": { "智": 5, "德": 1 },
          "hidden_effects": { "命运": 3 },
          "result": "你没有声张，而是暗中将那位将领的兵权一点点收回。等他察觉时已无力回天，只能黯然离去。你的手段让人不寒而栗。"
        },
        {
          "text": "公开审判，以儆效尤",
          "effects": { "武": 3, "德": 3, "魅": 2 },
          "hidden_effects": { "忠义": 2 },
          "result": "你在全军面前公开审判了这位将领。铁证如山之下，他低头认罪。你依法处置，既维护了军纪，也展示了你的公正。"
        },
        {
          "text": "私下约谈，以情理服之",
          "effects": { "德": 4, "魅": 4 },
          "hidden_effects": { "忠义": 5, "命运": 2 },
          "result": "你单独约见那位将领，没有愤怒也没有指责，只是问他为什么。一番长谈后，他痛哭流涕。你选择原谅他，他从此成为了你最坚定的支持者。",
          "hidden_conditions": { "忠义": { "min": 80 } }
        }
      ]
    },
    {
      "id": "war_08",
      "title": "天降大旱",
      "description": "连续三月大旱，田地龟裂，军粮告急。民间开始流传"天弃此主"的谣言。你的政权面临严峻考验。",
      "conditions": {},
      "choices": [
        {
          "text": "开仓放粮，与百姓共度难关",
          "effects": { "德": 5, "魅": 4, "武": -3 },
          "hidden_effects": { "忠义": 4, "命运": 2 },
          "result": "你打开所有军粮仓库，按人口平均分配。将士们也自愿减餐。百姓们感动得跪在雨中（天竟然真的下雨了）。谣言不攻自破。"
        },
        {
          "text": "征调民夫修建水利工程",
          "effects": { "智": 5, "魅": 2 },
          "hidden_effects": { "命运": 4 },
          "result": "你征调民夫，亲自带领他们修建引水渠。一个月后水渠完工，旱情大为缓解。你的远见和执行力为你赢得了"治世之才"的美名。"
        },
        {
          "text": "出兵攻打邻国，夺取他们的粮食",
          "effects": { "武": 4, "智": 2, "德": -5 },
          "hidden_effects": { "忠义": -4 },
          "result": "你以战养战，攻下了邻国的几座粮仓。军粮危机暂时解除了，但被掠夺的百姓对你恨之入骨。你开始理解为什么有些人走上了枭雄之路。"
        }
      ]
    }
  ]
}
```

- [ ] **Step 4: Create data/events-final.json (终局期, 6 events, pick 3)**

```json
{
  "phase": "终局期",
  "pickCount": 3,
  "transition": "岁月如刀，你已不再年轻。天下大势已定，最后的抉择摆在你面前……",
  "events": [
    {
      "id": "final_01",
      "title": "最终决战",
      "description": "天下最后的两大势力终于要做个了断。这将是一场决定天下归属的终极之战。你被推上了最前线。",
      "conditions": {},
      "choices": [
        {
          "text": "亲率大军，以绝对实力碾压",
          "effects": { "武": 5, "魅": 3 },
          "hidden_effects": { "命运": 3 },
          "result": "你集结了所有兵力，发起了猛烈的总攻。战斗持续了三天三夜，最终你以压倒性的优势获胜。天下，终于要定了。"
        },
        {
          "text": "用计谋瓦解敌方内部",
          "effects": { "智": 5, "魅": 2 },
          "hidden_effects": { "命运": 4 },
          "result": "你使出了连环计，策反了敌方数位重要将领。当大军压境时，敌方已从内部崩溃。不战而屈人之兵，善之善者也。"
        },
        {
          "text": "提出和平谈判，划江而治",
          "effects": { "德": 5, "智": 3, "魅": 2 },
          "hidden_effects": { "忠义": 4, "命运": 2 },
          "result": "你提议和平谈判，以苍生为念。经过艰难的协商，双方达成了划江而治的协议。虽然天下未能一统，但百姓终于不用再流血了。"
        }
      ]
    },
    {
      "id": "final_02",
      "title": "托孤之重",
      "description": "你的主公病重，将年幼的世子托付给你。朝中大臣有的支持你辅政，有的心怀叵测暗中结党。",
      "conditions": {},
      "choices": [
        {
          "text": "鞠躬尽瘁，忠心辅佐幼主",
          "effects": { "德": 6, "智": 2 },
          "hidden_effects": { "忠义": 8 },
          "result": "你日夜操劳，事必躬亲。朝政在你的治理下井井有条，幼主也在你的教导下渐渐成长。你用一生践行了"鞠躬尽瘁，死而后已"。"
        },
        {
          "text": "趁机掌权，取而代之",
          "effects": { "武": 3, "智": 3, "德": -6, "魅": 2 },
          "hidden_effects": { "忠义": -10, "命运": 5 },
          "result": "你抓住了这个千载难逢的机会，逼迫幼主禅让。从此你不再是臣子，而是这个国家的主人。但你知道，历史会如何评价你。"
        }
      ]
    },
    {
      "id": "final_03",
      "title": "功臣末路",
      "description": "天下初定，新帝开始清除功高震主的老臣。你收到密报：你的名字就在那份黑名单上。",
      "conditions": {},
      "choices": [
        {
          "text": "主动交出兵权，告老还乡",
          "effects": { "德": 4, "智": 4, "武": -3 },
          "hidden_effects": { "命运": 5, "忠义": 3 },
          "result": "你果断地交出了一切权力，带着家人离开了京城。新帝对你的识趣非常满意，封你为侯，世代享受荣华富贵。急流勇退，方为上策。"
        },
        {
          "text": "联合其他功臣，向新帝施压",
          "effects": { "智": 3, "魅": 3, "德": -2 },
          "hidden_effects": { "命运": 2, "忠义": -3 },
          "result": "你联合了几位同样不安的功臣，一起面见新帝。新帝被迫做出让步，暂时搁置了清洗计划。但你知道，这只是暂时的安全。"
        },
        {
          "text": "起兵反抗，宁死不屈",
          "effects": { "武": 5, "魅": 2, "德": -4 },
          "hidden_effects": { "忠义": -5, "命运": -3 },
          "result": "你举起了反旗。虽然你战功赫赫，但与整个帝国对抗终究是以卵击石。这场叛乱改变了你一生的评价。"
        }
      ]
    },
    {
      "id": "final_04",
      "title": "传道授业",
      "description": "你年事已高，开始思考如何将一生所学传承下去。几位年轻人慕名前来拜师。",
      "conditions": {},
      "choices": [
        {
          "text": "著书立说，将毕生智慧写成兵法",
          "effects": { "智": 4, "德": 4 },
          "hidden_effects": { "命运": 4 },
          "result": "你闭关一年，写出了一部融合实战经验与哲学思考的兵法著作。此书日后成为军事经典，被后世将领奉为圭臬。"
        },
        {
          "text": "亲自教导弟子，传授实战技艺",
          "effects": { "武": 3, "魅": 4, "德": 2 },
          "hidden_effects": { "忠义": 3 },
          "result": "你收了几位天资聪颖的弟子，将一身武艺和用兵之道倾囊相授。他们中有人日后成为一代名将，你的传说通过他们延续。"
        }
      ]
    },
    {
      "id": "final_05",
      "title": "故人重逢",
      "description": "多年未见的故人突然造访。他如今是敌对阵营的重臣，冒着生命危险来见你最后一面。他问你："这一切，值得吗？"",
      "conditions": {},
      "choices": [
        {
          "text": ""值得。我做的每一个选择，都无愧于心。"",
          "effects": { "德": 4, "魅": 3 },
          "hidden_effects": { "忠义": 5, "命运": 3 },
          "result": "故人沉默良久，最终举杯："不管立场如何，我始终敬你是条汉子。"你们痛饮一夜，天亮后各奔东西，此生再未相见。"
        },
        {
          "text": ""不知道。但如果重来一次，我还是会这样选。"",
          "effects": { "智": 3, "德": 2, "魅": 2 },
          "hidden_effects": { "命运": 5 },
          "result": "你的坦诚让故人动容。他说："也许这就是英雄与常人的区别——明知前路艰险，依然义无反顾。"这一夜，你们仿佛回到了年少时光。"
        },
        {
          "text": ""不值得。但已经走到这一步，只能继续走下去。"",
          "effects": { "智": 2, "武": 2, "德": -1 },
          "hidden_effects": { "命运": 2, "忠义": -2 },
          "result": "故人叹了口气："你变了。"你苦笑——乱世之中，谁又能不变呢？他留下一壶酒就离开了。你独自饮完，望着远方出神。"
        }
      ]
    },
    {
      "id": "final_06",
      "title": "最终抉择",
      "description": "一切尘埃落定。你站在城楼上望着远方，回想这一路走来的种种。此刻，你终于可以做一个只为自己的选择。",
      "conditions": {},
      "choices": [
        {
          "text": "继续征战，直到天下太平",
          "effects": { "武": 4, "智": 2, "魅": 2 },
          "hidden_effects": { "命运": 3 },
          "result": "你选择了战斗到最后一刻。也许你永远等不到太平，但你知道，每一场胜利都让这一天更近了一些。"
        },
        {
          "text": "解甲归田，回到一切开始的地方",
          "effects": { "德": 5, "魅": 2 },
          "hidden_effects": { "命运": 5, "忠义": 3 },
          "result": "你脱下了穿了大半辈子的战甲，回到了少年时的家乡。村口的老槐树还在，只是你已两鬓斑白。你终于可以过上平静的日子了。"
        },
        {
          "text": "留在朝堂，用政治手段巩固和平",
          "effects": { "智": 4, "德": 3, "魅": 2 },
          "hidden_effects": { "命运": 3, "忠义": 2 },
          "result": "你选择留在权力中心，用你的智慧和威望维持来之不易的和平。也许这不是最浪漫的选择，但这是最负责任的选择。"
        }
      ]
    }
  ]
}
```

- [ ] **Step 5: Verify all event JSON files are valid**

```bash
cd G:/TestGame && for f in data/events-*.json; do node -e "JSON.parse(require('fs').readFileSync('$f','utf8')); console.log('$f OK')"; done
```

Expected: All four files show OK.

- [ ] **Step 6: Commit**

```bash
git add data/events-*.json
git commit -m "feat: add event data for all four game phases (30 events total)"
```

---

### Task 4: Data Loader Module

**Files:**
- Create: `js/data-loader.js`

- [ ] **Step 1: Create js/data-loader.js**

```javascript
// data-loader.js — Fetches and caches all game JSON data

const DATA_FILES = {
  characters: 'data/characters.json',
  endings: 'data/endings.json',
  'events-youth': 'data/events-youth.json',
  'events-rise': 'data/events-rise.json',
  'events-war': 'data/events-war.json',
  'events-final': 'data/events-final.json',
};

const PHASE_KEYS = ['events-youth', 'events-rise', 'events-war', 'events-final'];

export async function loadAllData() {
  const entries = Object.entries(DATA_FILES);
  const results = await Promise.all(
    entries.map(([key, path]) =>
      fetch(path).then(r => {
        if (!r.ok) throw new Error(`Failed to load ${path}: ${r.status}`);
        return r.json().then(data => [key, data]);
      })
    )
  );

  const dataMap = Object.fromEntries(results);

  return {
    characters: dataMap.characters,
    endings: dataMap.endings.endings,
    phases: PHASE_KEYS.map(key => dataMap[key]),
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add js/data-loader.js
git commit -m "feat: add data loader module for fetching game JSON"
```

---

### Task 5: Game Engine

**Files:**
- Create: `js/game.js`

- [ ] **Step 1: Create js/game.js**

```javascript
// game.js — Game state management, event selection, attribute logic, ending determination

const SAVE_KEY = 'sgwjl_save';
const ENDINGS_KEY = 'sgwjl_endings';

export class Game {
  constructor(data) {
    this.characters = data.characters;
    this.endings = data.endings;
    this.phases = data.phases; // array of phase objects, each with .events, .pickCount, .transition, .phase
    this.state = null;
  }

  // --- Character Selection ---

  selectCharacter(characterId) {
    const char = this.characters.find(c => c.id === characterId);
    if (!char) throw new Error(`Unknown character: ${characterId}`);

    this.state = {
      characterId: char.id,
      characterName: char.name,
      phaseIndex: 0,
      eventIndex: 0,
      attrs: { ...char.attrs },
      hidden: { ...char.hidden },
      history: [],
      phaseEvents: this._pickPhaseEvents(0),
    };
    this.save();
    return this.state;
  }

  // --- Event Flow ---

  getCurrentPhase() {
    return this.phases[this.state.phaseIndex];
  }

  getPhaseLabel() {
    const phase = this.getCurrentPhase();
    const total = this.state.phaseEvents.length;
    const current = this.state.eventIndex + 1;
    return `📍 ${phase.phase} · 第 ${current}/${total} 回`;
  }

  getNextEvent() {
    const events = this.state.phaseEvents;
    if (this.state.eventIndex >= events.length) return null;

    const event = events[this.state.eventIndex];
    // Filter choices: remove hidden choices whose hidden_conditions are not met
    const visibleChoices = event.choices.filter(c => {
      if (!c.hidden_conditions) return true;
      return this._checkConditions(c.hidden_conditions);
    });
    return { ...event, choices: visibleChoices };
  }

  applyChoice(choiceIndex) {
    const event = this.state.phaseEvents[this.state.eventIndex];
    // Get the actual choice from the filtered list
    const visibleChoices = event.choices.filter(c => {
      if (!c.hidden_conditions) return true;
      return this._checkConditions(c.hidden_conditions);
    });
    const choice = visibleChoices[choiceIndex];
    if (!choice) throw new Error(`Invalid choice index: ${choiceIndex}`);

    // Apply visible effects
    const appliedEffects = {};
    if (choice.effects) {
      for (const [attr, delta] of Object.entries(choice.effects)) {
        if (delta === 0) continue;
        this.state.attrs[attr] = this._clamp(this.state.attrs[attr] + delta);
        appliedEffects[attr] = delta;
      }
    }

    // Apply hidden effects
    if (choice.hidden_effects) {
      for (const [attr, delta] of Object.entries(choice.hidden_effects)) {
        if (delta === 0) continue;
        this.state.hidden[attr] = this._clamp(this.state.hidden[attr] + delta);
      }
    }

    // Record history
    this.state.history.push(`${event.id}:${choiceIndex}`);
    this.state.eventIndex++;
    this.save();

    return {
      result: choice.result,
      effects: appliedEffects,
    };
  }

  // --- Phase Progression ---

  isPhaseComplete() {
    return this.state.eventIndex >= this.state.phaseEvents.length;
  }

  isGameComplete() {
    return this.state.phaseIndex >= this.phases.length - 1 && this.isPhaseComplete();
  }

  advancePhase() {
    const nextIndex = this.state.phaseIndex + 1;
    if (nextIndex >= this.phases.length) return null;

    this.state.phaseIndex = nextIndex;
    this.state.eventIndex = 0;
    this.state.phaseEvents = this._pickPhaseEvents(nextIndex);
    this.save();

    return this.phases[nextIndex].transition;
  }

  getTransitionText() {
    const nextIndex = this.state.phaseIndex + 1;
    if (nextIndex >= this.phases.length) return null;
    return this.phases[nextIndex].transition;
  }

  // --- Ending Determination ---

  checkEnding() {
    const attrs = this.state.attrs;
    const hidden = this.state.hidden;

    for (const ending of this.endings) {
      if (this._matchesEnding(ending, attrs, hidden)) {
        this._unlockEnding(ending.id);
        return ending;
      }
    }

    // Default ending (last in the array, "ordinary")
    const defaultEnding = this.endings[this.endings.length - 1];
    this._unlockEnding(defaultEnding.id);
    return defaultEnding;
  }

  // --- Save / Load ---

  save() {
    if (!this.state) return;
    localStorage.setItem(SAVE_KEY, JSON.stringify(this.state));
  }

  load() {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    try {
      this.state = JSON.parse(raw);
      return true;
    } catch {
      return false;
    }
  }

  clearSave() {
    localStorage.removeItem(SAVE_KEY);
    this.state = null;
  }

  // --- Endings Gallery ---

  getUnlockedEndings() {
    const raw = localStorage.getItem(ENDINGS_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  getEndingsGallery() {
    const unlocked = new Set(this.getUnlockedEndings());
    return this.endings.map(e => ({
      id: e.id,
      name: e.name,
      story: e.story,
      unlocked: unlocked.has(e.id),
    }));
  }

  // --- Private Helpers ---

  _pickPhaseEvents(phaseIndex) {
    const phase = this.phases[phaseIndex];
    // Filter events by conditions
    const eligible = phase.events.filter(e => this._checkConditions(e.conditions));
    // Shuffle and pick
    const shuffled = this._shuffle(eligible);
    return shuffled.slice(0, phase.pickCount);
  }

  _checkConditions(conditions) {
    if (!conditions || Object.keys(conditions).length === 0) return true;

    // Special flag for "no extreme values"
    if (conditions.no_extreme) {
      const allAttrs = Object.values(this.state.attrs);
      if (allAttrs.some(v => v < 30 || v > 85)) return false;
    }

    for (const [attr, range] of Object.entries(conditions)) {
      if (attr === 'no_extreme') continue;
      const value = this.state.attrs[attr] ?? this.state.hidden[attr];
      if (value === undefined) continue;
      if (range.min !== undefined && value < range.min) return false;
      if (range.max !== undefined && value > range.max) return false;
    }
    return true;
  }

  _matchesEnding(ending, attrs, hidden) {
    const conditions = ending.conditions;
    if (!conditions || Object.keys(conditions).length === 0) return true;

    if (conditions.no_extreme) {
      const allAttrs = Object.values(attrs);
      if (allAttrs.some(v => v < 30 || v > 85)) return false;
    }

    for (const [attr, range] of Object.entries(conditions)) {
      if (attr === 'no_extreme') continue;
      const value = attrs[attr] ?? hidden[attr];
      if (value === undefined) continue;
      if (range.min !== undefined && value < range.min) return false;
      if (range.max !== undefined && value > range.max) return false;
    }
    return true;
  }

  _unlockEnding(endingId) {
    const unlocked = this.getUnlockedEndings();
    if (!unlocked.includes(endingId)) {
      unlocked.push(endingId);
      localStorage.setItem(ENDINGS_KEY, JSON.stringify(unlocked));
    }
  }

  _clamp(value) {
    return Math.max(0, Math.min(100, value));
  }

  _shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}
```

- [ ] **Step 2: Verify module syntax**

```bash
cd G:/TestGame && node -e "import('./js/game.js').then(() => console.log('game.js syntax OK')).catch(e => console.error(e.message))"
```

Expected: `game.js syntax OK`

- [ ] **Step 3: Commit**

```bash
git add js/game.js
git commit -m "feat: add game engine with state management, events, and ending logic"
```

---

### Task 6: UI Renderer

**Files:**
- Create: `js/ui.js`

- [ ] **Step 1: Create js/ui.js**

```javascript
// ui.js — DOM rendering for all game screens, transitions, and animations

export class UI {
  constructor() {
    this.screens = {
      title: document.getElementById('screen-title'),
      select: document.getElementById('screen-select'),
      event: document.getElementById('screen-event'),
      result: document.getElementById('screen-result'),
      ending: document.getElementById('screen-ending'),
      gallery: document.getElementById('screen-gallery'),
      transition: document.getElementById('screen-transition'),
    };
    this.callbacks = {};
  }

  // --- Screen Navigation ---

  showScreen(name) {
    for (const screen of Object.values(this.screens)) {
      screen.classList.remove('active', 'fade-in');
    }
    const target = this.screens[name];
    target.classList.add('active', 'fade-in');
    target.scrollTop = 0;
  }

  // --- Callback Registration ---

  on(event, callback) {
    this.callbacks[event] = callback;
  }

  // --- Title Screen ---

  renderTitle(unlockedCount) {
    document.getElementById('gallery-count').textContent = unlockedCount;

    document.getElementById('btn-start').onclick = () => {
      this.callbacks.onStart?.();
    };
    document.getElementById('btn-gallery').onclick = () => {
      this.callbacks.onShowGallery?.();
    };

    this.showScreen('title');
  }

  // --- Character Select ---

  renderCharacterSelect(characters) {
    const grid = document.getElementById('character-grid');
    grid.innerHTML = '';

    for (const char of characters) {
      const card = document.createElement('div');
      card.className = 'char-card';
      card.innerHTML = `
        <div class="char-icon">${char.icon}</div>
        <div class="char-name">${char.name}</div>
        <div class="char-attrs">武${char.attrs.武} 智${char.attrs.智} 德${char.attrs.德} 魅${char.attrs.魅}</div>
        <div class="char-desc">${char.title}</div>
      `;
      card.onclick = () => {
        this.callbacks.onSelectCharacter?.(char.id);
      };
      grid.appendChild(card);
    }

    this.showScreen('select');
  }

  // --- Event Screen ---

  renderEvent(event, phaseLabel, characterName, attrs) {
    document.getElementById('phase-label').textContent = phaseLabel;
    document.getElementById('char-name').textContent = characterName;
    document.getElementById('attr-wu').textContent = attrs.武;
    document.getElementById('attr-zhi').textContent = attrs.智;
    document.getElementById('attr-de').textContent = attrs.德;
    document.getElementById('attr-mei').textContent = attrs.魅;

    document.getElementById('event-title').textContent = event.title;
    document.getElementById('event-desc').textContent = event.description;

    const container = document.getElementById('choices-container');
    container.innerHTML = '';

    event.choices.forEach((choice, index) => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';

      const effectsText = Object.entries(choice.effects)
        .filter(([, v]) => v !== 0)
        .map(([k, v]) => `${k}${v > 0 ? '+' : ''}${v}`)
        .join(' · ');

      btn.innerHTML = `
        <div class="choice-text">${choice.text}</div>
        <div class="choice-effects">${effectsText || '—'}</div>
      `;
      btn.onclick = () => {
        this.callbacks.onChoice?.(index);
      };
      container.appendChild(btn);
    });

    this.showScreen('event');
  }

  // --- Result Screen ---

  renderResult(resultText, effects) {
    document.getElementById('result-text').textContent = resultText;

    const container = document.getElementById('result-effects');
    container.innerHTML = '';

    for (const [attr, delta] of Object.entries(effects)) {
      const badge = document.createElement('span');
      badge.className = `effect-badge ${delta > 0 ? 'positive' : 'negative'}`;
      badge.textContent = `${attr} ${delta > 0 ? '+' : ''}${delta}`;
      container.appendChild(badge);
    }

    document.getElementById('btn-continue').onclick = () => {
      this.callbacks.onContinue?.();
    };

    this.showScreen('result');
  }

  // --- Transition Screen ---

  renderTransition(text, durationMs = 2500) {
    document.getElementById('transition-text').textContent = text;
    this.showScreen('transition');

    return new Promise(resolve => {
      setTimeout(resolve, durationMs);
    });
  }

  // --- Ending Screen ---

  renderEnding(ending, characterName, attrs) {
    document.getElementById('ending-name').textContent = ending.name;
    document.getElementById('ending-char').textContent = `${characterName} · 已解锁`;
    document.getElementById('ending-story').textContent = ending.story;

    const attrsContainer = document.getElementById('ending-attrs');
    attrsContainer.innerHTML = `
      <div class="ending-attrs-label">最终属性</div>
      <div class="ending-attrs-values">
        <span>⚔️ 武 <b>${attrs.武}</b></span>
        <span>📖 智 <b>${attrs.智}</b></span>
        <span>🏛️ 德 <b>${attrs.德}</b></span>
        <span>✨ 魅 <b>${attrs.魅}</b></span>
      </div>
    `;

    document.getElementById('btn-replay').onclick = () => {
      this.callbacks.onReplay?.();
    };
    document.getElementById('btn-ending-gallery').onclick = () => {
      this.callbacks.onShowGallery?.();
    };

    this.showScreen('ending');
  }

  // --- Gallery Screen ---

  renderGallery(endingsGallery, fromScreen = 'title') {
    const grid = document.getElementById('gallery-grid');
    grid.innerHTML = '';

    for (const ending of endingsGallery) {
      const card = document.createElement('div');
      card.className = `gallery-card ${ending.unlocked ? '' : 'locked'}`;
      card.innerHTML = `
        <div class="gallery-card-name">${ending.unlocked ? ending.name : '???'}</div>
        <div class="gallery-card-desc">${ending.unlocked ? ending.story.slice(0, 40) + '……' : '尚未解锁'}</div>
      `;
      grid.appendChild(card);
    }

    document.getElementById('btn-gallery-back').onclick = () => {
      if (fromScreen === 'ending') {
        this.callbacks.onReplay?.();
      } else {
        this.callbacks.onBackToTitle?.();
      }
    };

    this.showScreen('gallery');
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add js/ui.js
git commit -m "feat: add UI renderer for all game screens"
```

---

### Task 7: Main Entry Point — Wiring Everything Together

**Files:**
- Create: `js/main.js`

- [ ] **Step 1: Create js/main.js**

```javascript
// main.js — Entry point: wires data-loader, game engine, and UI together

import { loadAllData } from './data-loader.js';
import { Game } from './game.js';
import { UI } from './ui.js';

async function init() {
  const data = await loadAllData();
  const game = new Game(data);
  const ui = new UI();

  function showTitle() {
    game.clearSave();
    const unlocked = game.getUnlockedEndings().length;
    ui.renderTitle(unlocked);
  }

  function showCharacterSelect() {
    ui.renderCharacterSelect(game.characters);
  }

  function showCurrentEvent() {
    const event = game.getNextEvent();
    if (!event) {
      handlePhaseEnd();
      return;
    }
    ui.renderEvent(
      event,
      game.getPhaseLabel(),
      game.state.characterName,
      game.state.attrs
    );
  }

  async function handlePhaseEnd() {
    if (game.isGameComplete()) {
      const ending = game.checkEnding();
      ui.renderEnding(ending, game.state.characterName, game.state.attrs);
      return;
    }

    const transitionText = game.advancePhase();
    if (transitionText) {
      await ui.renderTransition(transitionText);
    }
    showCurrentEvent();
  }

  function showGallery(fromScreen) {
    const gallery = game.getEndingsGallery();
    ui.renderGallery(gallery, fromScreen);
  }

  // --- Wire callbacks ---

  ui.on('onStart', () => {
    showCharacterSelect();
  });

  ui.on('onSelectCharacter', (characterId) => {
    game.selectCharacter(characterId);
    showCurrentEvent();
  });

  ui.on('onChoice', (choiceIndex) => {
    const { result, effects } = game.applyChoice(choiceIndex);
    ui.renderResult(result, effects);
  });

  ui.on('onContinue', () => {
    if (game.isPhaseComplete()) {
      handlePhaseEnd();
    } else {
      showCurrentEvent();
    }
  });

  ui.on('onReplay', () => {
    showTitle();
  });

  ui.on('onShowGallery', () => {
    const fromScreen = game.state ? 'ending' : 'title';
    showGallery(fromScreen);
  });

  ui.on('onBackToTitle', () => {
    showTitle();
  });

  // --- Initialize ---

  // Check for saved game
  if (game.load()) {
    // Resume saved game
    showCurrentEvent();
  } else {
    showTitle();
  }
}

init().catch(err => {
  console.error('Game initialization failed:', err);
  document.body.innerHTML = `<div style="color:#e74c3c;padding:20px;">游戏加载失败: ${err.message}</div>`;
});
```

- [ ] **Step 2: Start a local server and test the full game flow**

```bash
cd G:/TestGame && npx serve . -l 3000
```

Open `http://localhost:3000` in a browser. Test the complete flow:
1. Title screen shows with correct gold-on-dark theme
2. Click "开始征途" → character select screen with 6 generals
3. Click a general → event screen with status bar, attrs, event text, choices
4. Click a choice → result screen with effects badges
5. Click "继续" → next event
6. After phase events complete → transition text → next phase
7. After all phases → ending screen with ending name, story, final attrs
8. Click "结局图鉴" → gallery with 1 unlocked ending
9. Click "返回" → title screen with updated count

- [ ] **Step 3: Commit**

```bash
git add js/main.js
git commit -m "feat: add main entry point wiring game engine, UI, and data loader"
```

---

### Task 8: Bug Fixes and Polish

This task covers issues likely found during Task 7's manual testing.

**Files:**
- Modify: `js/ui.js` (if callbacks don't fire — the `on()` method stores callbacks but they're called via `this.callbacks.onX?.()`)
- Modify: `js/main.js` (fix callback wiring if needed)

- [ ] **Step 1: Fix UI callback wiring**

The `UI.on()` method stores callbacks in `this.callbacks`, but the render methods call them as `this.callbacks.onStart?.()`. The `main.js` wiring uses `ui.on('onStart', fn)` which stores with the `onStart` key. This is correct — verify it works. If callbacks are not firing, check that the key names match exactly between `ui.on('onX', ...)` calls and `this.callbacks.onX?.()` calls.

- [ ] **Step 2: Test edge cases**

Open the game in browser and verify:
1. **Attribute clamping**: attrs never go below 0 or above 100
2. **Hidden choices**: if a choice has `hidden_conditions` and the condition is not met, that choice should not appear
3. **Save/Load**: refresh the page mid-game — it should resume at the same event
4. **Gallery persistence**: complete a game, refresh, go to gallery — ending should still be unlocked
5. **Default ending**: play with a character and make choices that don't match any ending condition — should get "平凡一生"

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: address issues found during manual testing"
```

---

### Task 9: Final Integration Test — Full Playthrough

**Files:** None (testing only)

- [ ] **Step 1: Clear localStorage and do a full playthrough**

Open browser DevTools console:
```javascript
localStorage.clear();
location.reload();
```

Play through the entire game as each of these characters and verify the expected ending tendency:
1. **关羽** (high 武/德/忠义) → should tend toward "忠臣良将"
2. **曹操** (high 武/智, low 德) → should tend toward "乱世枭雄"
3. **诸葛亮** (high 智, low 武) → should tend toward "幕后军师"

- [ ] **Step 2: Verify gallery shows unlocked endings**

After completing 3 playthroughs, the gallery should show 3 unlocked endings (or more depending on choices).

- [ ] **Step 3: Test on mobile viewport**

Open browser DevTools, switch to responsive mode (375×667 iPhone SE). Verify:
- All screens fit without horizontal scroll
- Buttons are tappable (large enough touch targets)
- Text is readable
- Character grid shows 2 columns

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: final integration testing complete"
```
