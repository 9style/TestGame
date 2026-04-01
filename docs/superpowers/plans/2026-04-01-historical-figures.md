# Historical Figures & Faction System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 25+ historical Three Kingdoms figures as NPCs and a faction affinity system (魏/蜀/吴) to the text adventure game, including 19 new events, 10+ event rewrites, 3 faction endings, and faction UI display.

**Architecture:** Faction values (魏/蜀/吴) stored as hidden attributes alongside existing 命运/忠义, fully leveraging the existing `hidden_effects`/`hidden_conditions` system with zero logic changes. Historical NPC events added to each phase's JSON pool. Individual NPC relationships tracked via existing flag system.

**Tech Stack:** Vanilla JS (ES modules), JSON data files, CSS, HTML — no build tools or frameworks.

**Spec:** `docs/superpowers/specs/2026-04-01-historical-figures-design.md`

---

### Task 1: Add Faction Attributes to Data Layer

**Files:**
- Modify: `data/characters.json` — add 魏/蜀/吴 to each character's `hidden` object
- Modify: `js/game.js:322-332` — backward compatibility for old saves

- [ ] **Step 1: Add faction attrs to characters.json**

Add `"魏"`, `"蜀"`, `"吴"` keys to the `hidden` object of every character. Most start at 50 (neutral). Scholar gets `蜀: 55`, merchant gets `魏: 55`.

```json
// farmer
"hidden": { "命运": 35, "忠义": 42, "魏": 50, "蜀": 50, "吴": 50 }

// scholar
"hidden": { "命运": 42, "忠义": 48, "魏": 50, "蜀": 55, "吴": 50 }

// soldier
"hidden": { "命运": 30, "忠义": 40, "魏": 50, "蜀": 50, "吴": 50 }

// wanderer
"hidden": { "命运": 45, "忠义": 30, "魏": 50, "蜀": 50, "吴": 50 }

// merchant
"hidden": { "命运": 52, "忠义": 20, "魏": 55, "蜀": 50, "吴": 50 }

// craftsman
"hidden": { "命运": 38, "忠义": 45, "魏": 50, "蜀": 50, "吴": 50 }
```

- [ ] **Step 2: Add backward compat in game.js load()**

In `js/game.js`, after line 331 (`if (this.state.crisisEvent === undefined) this.state.crisisEvent = null;`), add:

```js
      // Backward compat: add faction attrs if missing
      if (this.state.hidden) {
        this.state.hidden['魏'] ??= 50;
        this.state.hidden['蜀'] ??= 50;
        this.state.hidden['吴'] ??= 50;
      }
```

- [ ] **Step 3: Verify**

Start a local server (`python -m http.server 8080`), open the game, select a character, and confirm the game loads without errors. Open browser console and verify no errors. Check that `JSON.parse(localStorage.getItem('sgwjl_save')).hidden` contains 魏/蜀/吴 keys.

- [ ] **Step 4: Commit**

```bash
git add data/characters.json js/game.js
git commit -m "feat: add faction attributes (魏/蜀/吴) to character data layer"
```

---

### Task 2: Add Faction Endings

**Files:**
- Modify: `data/endings.json` — insert 3 faction endings after `unify`

- [ ] **Step 1: Add 3 faction endings to endings.json**

Insert these 3 endings into the `endings` array in `data/endings.json`, immediately after the `unify` ending (after the object ending at approximately line 49, before the `benevolent` ending). The order matters — they must be checked before other normal endings.

```json
    {
      "id": "wei_minister",
      "name": "魏国重臣",
      "icon": "🏛️",
      "epitaph": "辅佐曹氏，铁腕治世",
      "story": "你以过人的智谋和坚定的立场，成为曹魏朝廷不可或缺的核心人物。从许昌到洛阳，你辅佐曹氏一统北方，以铁腕与智谋闻名天下。朝堂之上，你运筹帷幄；沙场之外，你治国安民。后世史书记载：此人胸怀天下，虽非帝王之尊，实有帝王之才。",
      "conditions": {
        "魏": { "min": 80 },
        "智": { "min": 70 },
        "蜀": { "max": 35 },
        "吴": { "max": 35 }
      }
    },
    {
      "id": "shu_guardian",
      "name": "蜀汉柱石",
      "icon": "🛡️",
      "epitaph": "仁德为本，鞠躬尽瘁",
      "story": "你追随刘备的仁德理想，从颠沛流离到三分天下，始终不离不弃。你以德服人，以忠报国，成为蜀汉基业的柱石。即便在风雨飘摇之际，你依然坚守着那份匡扶汉室的信念。后世评价你为蜀汉最后的守护者，青史留名，万古流芳。",
      "conditions": {
        "蜀": { "min": 80 },
        "德": { "min": 70 },
        "忠义": { "min": 65 },
        "魏": { "max": 35 }
      }
    },
    {
      "id": "wu_admiral",
      "name": "东吴都督",
      "icon": "⛵",
      "epitaph": "据江东之地，成不世之功",
      "story": "你在江东建功立业，从一介布衣成长为统领水师的大都督。赤壁之上，你指挥若定；长江之畔，你开疆拓土。你延续了周瑜、陆逊的传奇，让东吴在三国鼎立中牢牢占据一席之地。江东父老世代传颂你的功业，称你为继周公瑾之后最伟大的都督。",
      "conditions": {
        "吴": { "min": 80 },
        "智": { "min": 65 },
        "武": { "min": 60 },
        "魏": { "max": 35 },
        "蜀": { "max": 40 }
      }
    },
```

- [ ] **Step 2: Verify ending count**

After editing, the endings array should have 20 entries total: 4 death + 16 normal (including 3 new faction endings). The order from top should be: death_illness, death_assassinated, death_battle, death_executed, unify, **wei_minister, shu_guardian, wu_admiral**, benevolent, strategist, ..., ordinary.

- [ ] **Step 3: Commit**

```bash
git add data/endings.json
git commit -m "feat: add 3 faction endings (魏国重臣/蜀汉柱石/东吴都督)"
```

---

### Task 3: Add Faction Display to UI

**Files:**
- Modify: `index.html:42-47` — add faction bar HTML
- Modify: `js/ui.js:86-101` — render faction values in event screen
- Modify: `js/ui.js:226-235` — show faction values on ending screen
- Modify: `css/style.css:173-185` — faction bar styles

- [ ] **Step 1: Add faction bar HTML**

In `index.html`, after the `attr-bar` div (line 47, after `</div>` closing the attr-bar), add a new faction bar:

```html
      <div class="faction-bar">
        <span>⚔ 魏 <b id="faction-wei">50</b></span>
        <span>🏯 蜀 <b id="faction-shu">50</b></span>
        <span>⛵ 吴 <b id="faction-wu">50</b></span>
      </div>
```

- [ ] **Step 2: Add faction bar CSS**

In `css/style.css`, after the `#attr-mei` color rule (around line 185), add:

```css
.faction-bar {
  display: flex;
  justify-content: space-around;
  padding: 6px 15px;
  font-size: 12px;
  background: var(--bg-dark);
  border-bottom: 1px solid var(--border);
}

#faction-wei { color: #5b9bd5; }
#faction-shu { color: #e74c3c; }
#faction-wu { color: #2ecc71; }
```

- [ ] **Step 3: Update ui.js renderEvent() to set faction values**

In `js/ui.js`, in the `renderEvent` method, after line 101 (`document.getElementById('attr-mei').textContent = attrs['魅'];`), add faction rendering. The method receives `attrs` (visible attrs only), so we need to also pass `hidden` attrs. 

First, update the `renderEvent` method signature from:
```js
renderEvent(event, phaseLabel, characterName, attrs) {
```
to:
```js
renderEvent(event, phaseLabel, characterName, attrs, hidden) {
```

Then after line 101 add:
```js
    document.getElementById('faction-wei').textContent = hidden?.['魏'] ?? 50;
    document.getElementById('faction-shu').textContent = hidden?.['蜀'] ?? 50;
    document.getElementById('faction-wu').textContent = hidden?.['吴'] ?? 50;
```

- [ ] **Step 4: Update main.js to pass hidden attrs to renderEvent**

In `js/main.js`, find ALL calls to `ui.renderEvent(...)` and add `game.state.hidden` as the 5th argument. Search for `renderEvent(` in main.js and update each call site from:
```js
ui.renderEvent(event, phaseLabel, charName, game.state.attrs)
```
to:
```js
ui.renderEvent(event, phaseLabel, charName, game.state.attrs, game.state.hidden)
```

There should be 2-3 call sites in main.js (initial event render, continue after result, crisis event render).

- [ ] **Step 5: Update renderEnding() to show faction values**

In `js/ui.js`, update the `renderEnding` method signature from:
```js
renderEnding(ending, characterName, attrs) {
```
to:
```js
renderEnding(ending, characterName, attrs, hidden) {
```

Then update the attrs display HTML (around line 229) to include faction values:
```js
    const attrsContainer = document.getElementById('ending-attrs');
    attrsContainer.innerHTML = `
      <div class="ending-attrs-label">${ending.isDeath ? '临终属性' : '最终属性'}</div>
      <div class="ending-attrs-values">
        <span>⚔️ 武 <b>${attrs['武']}</b></span>
        <span>📖 智 <b>${attrs['智']}</b></span>
        <span>🏛️ 德 <b>${attrs['德']}</b></span>
        <span>✨ 魅 <b>${attrs['魅']}</b></span>
      </div>
      <div class="ending-attrs-label" style="margin-top: 8px;">势力倾向</div>
      <div class="ending-attrs-values ending-faction-values">
        <span>⚔ 魏 <b style="color:#5b9bd5">${hidden?.['魏'] ?? 50}</b></span>
        <span>🏯 蜀 <b style="color:#e74c3c">${hidden?.['蜀'] ?? 50}</b></span>
        <span>⛵ 吴 <b style="color:#2ecc71">${hidden?.['吴'] ?? 50}</b></span>
      </div>
    `;
```

Also update the `renderEnding` call site in `main.js` to pass `game.state.hidden` as the 4th argument.

- [ ] **Step 6: Update gallery grid for 20 endings**

No code changes needed — the gallery grid is already dynamic (iterates over `endingsGallery` array). The 3 new endings will appear automatically. Optionally, add a CSS class for faction endings in `renderGallery` in `js/ui.js` (around line 255):

After the line `if (e.isDeath) card.classList.add('gallery-death');`, add:
```js
        if (['wei_minister', 'shu_guardian', 'wu_admiral'].includes(e.id)) card.classList.add('gallery-faction');
```

And add CSS:
```css
.gallery-faction { border-color: #5b9bd5; }
.gallery-faction .gallery-card-name { color: #5b9bd5; }
```

- [ ] **Step 7: Verify UI**

Start the game, select a character, and confirm:
1. Faction bar appears below the attr bar showing `⚔ 魏 50 | 🏯 蜀 50 | ⛵ 吴 50`
2. Values update correctly (will be static 50 until events with faction effects are added)
3. Ending screen shows faction values
4. Gallery shows 20 slots

- [ ] **Step 8: Commit**

```bash
git add index.html js/ui.js js/main.js css/style.css
git commit -m "feat: add faction display to game UI and ending screen"
```

---

### Task 4: Rewrite Existing Events with Historical Figures

**Files:**
- Modify: `data/events-youth.json` — rewrite youth_01, youth_doctor
- Modify: `data/events-rise.json` — rewrite rise_04, war_01 title reference in rise events
- Modify: `data/events-war.json` — rewrite war_01
- Modify: `data/events-final.json` — rewrite final_assassination

This task rewrites 5 existing events to include named historical figures and add faction effects. Existing mechanics (attr effects, crisis triggers) are preserved. Only text and `hidden_effects` change.

- [ ] **Step 1: Rewrite youth_01 (虎牢关前的少年)**

In `data/events-youth.json`, replace the `youth_01` event object (lines 6-30) with:

```json
    {
      "id": "youth_01",
      "title": "虎牢关前的少年",
      "description": "你随师父途经虎牢关，目睹一场惊天动地的激战。吕布手持方天画戟，一人独战刘备、关羽、张飞三位豪杰，战马嘶鸣，沙尘漫天。联军旗号之下，曹操、袁绍、孙坚等各路诸侯注视着这场对决。一名伤兵倒在路旁，向你伸出求救之手……",
      "conditions": {},
      "choices": [
        {
          "text": "上前救治伤兵",
          "effects": { "武": -2, "德": 5, "魅": 3 },
          "hidden_effects": { "忠义": 5, "蜀": 3 },
          "result": "你毫不犹豫地上前救治伤兵。他是刘备麾下的士卒，感激涕零，从怀中掏出一卷泛黄的兵法——那是他从军多年珍藏的《孙子兵法》残卷。\"小兄弟，此书赠你，愿你日后成为仁义之将。\"远处，关羽注意到了你的善举，微微颔首。"
        },
        {
          "text": "趁乱捡起战场上的名刀",
          "effects": { "武": 5, "德": -3 },
          "hidden_effects": { "命运": 2, "魏": 2 },
          "result": "你敏捷地从战场边缘捡起一把精良的战刀，刀柄上刻着曹军的铭文。刀身寒光闪烁，入手沉稳。师父看见了，微微皱眉，但没有说什么。这把刀将伴随你很长一段时光。"
        },
        {
          "text": "冷静观察战局，分析各路诸侯",
          "effects": { "智": 5, "武": 1 },
          "hidden_effects": {},
          "set_flags": ["joined_coalition"],
          "result": "你蹲在高处仔细观察战局。吕布虽勇猛无双，但董卓军终究寡不敌众。你注意到曹操的部队令行禁止，袁绍虽为盟主却优柔寡断，孙坚骁勇善战但孤立无援。这场战斗让你对天下群雄有了初步的认识。"
        }
      ]
    }
```

- [ ] **Step 2: Rewrite youth_doctor (路遇行医 → 路遇华佗)**

In `data/events-youth.json`, replace the `youth_doctor` event object with:

```json
    {
      "id": "youth_doctor",
      "title": "路遇华佗",
      "description": "你在山间小路上遇见一位落魄的中年郎中，他背着一个沉重的药箱，衣衫褴褛，面有菜色。你认出他腰间悬挂的银针——那是传说中神医华佗独有的九转银针。他低声说自己被山贼劫去了盘缠和药材，已经三天没有进食，恳求你施以援手。",
      "conditions": {},
      "choices": [
        {
          "text": "将干粮和盘缠分一半给他",
          "effects": { "德": 4, "魅": 2 },
          "hidden_effects": { "命运": 5 },
          "set_flags": ["saved_doctor", "helped_huatuo"],
          "result": "你把干粮分了一半，又掏出仅有的几枚铜钱塞给他。华佗接过食物，感激涕零，从药箱夹层里取出一个小瓷瓶：\"此为我亲手炼制的续命丹，关键时刻可救你一命。\"你摆手推辞，他硬塞在你手里。\"小友心善，华佗记住了。\"他踉跄而去的背影，你不曾想到日后还会与他重逢。"
        },
        {
          "text": "帮他找到山贼，夺回被抢的东西",
          "effects": { "武": 4, "德": 3 },
          "hidden_effects": { "忠义": 3 },
          "set_flags": ["helped_huatuo"],
          "result": "你循着华佗描述的方向追踪山贼，在一处山洞中找到了他们。一番搏斗后你击退了山贼，夺回了药箱和大部分药材。华佗千恩万谢，为你包扎了搏斗中受的伤，手法出神入化。临别他赠你一本手抄的《青囊经》残卷：\"此书虽非武功秘籍，但懂医术之人在乱世中多一条活路。\""
        },
        {
          "text": "指点他去镇上药铺求助，自己赶路",
          "effects": { "智": 2 },
          "hidden_effects": { "命运": -2 },
          "result": "你告诉他前面五里有个小镇，镇上的药铺老板心善，或许愿意收留他。华佗点点头，目送你远去。你继续赶路，心里有些不是滋味——你隐约觉得错过了什么重要的缘分。"
        }
      ]
    }
```

- [ ] **Step 3: Rewrite rise_04 (结义兄弟 → with 刘备)**

In `data/events-rise.json`, replace the `rise_04` event object (lines 85-103) with:

```json
    {
      "id": "rise_04",
      "title": "桃园结义",
      "description": "你在一次战斗中与刘备并肩作战，共退强敌。战后，刘备拉着你的手说：\"今日同生共死，足见兄台肝胆。不知可愿与备结为兄弟？\"他身旁的关羽和张飞也抱拳相邀。营外正有一片桃林，花开正艳。",
      "conditions": {},
      "choices": [
        {
          "text": "欣然同意，桃园结义",
          "effects": { "魅": 4, "德": 3 },
          "hidden_effects": { "忠义": 6, "蜀": 10 },
          "set_flags": ["befriend_guanyu"],
          "result": "你们在桃林中焚香祭天，誓同生死。刘备为兄，关羽、张飞与你为弟。从此以后，你不仅多了三位以命相托的兄弟，更踏上了一条追随仁义的道路。关羽拍着你的肩膀说：\"兄弟，日后有难，关某万死不辞。\""
        },
        {
          "text": "婉拒结义，但表达敬意",
          "effects": { "智": 3, "魅": 1 },
          "hidden_effects": { "命运": 2, "蜀": 3 },
          "result": "你委婉地拒绝了。乱世之中，承诺太重——你不想做出自己可能无法兑现的誓言。刘备叹了口气，但表示理解：\"兄台虽不结义，备仍视你为知己。\"你们依然是很好的朋友。"
        }
      ]
    }
```

- [ ] **Step 4: Rewrite war_01 (赤壁风云 → 强化周瑜/诸葛亮)**

In `data/events-war.json`, replace the `war_01` event object (lines 7-31) with:

```json
    {
      "id": "war_01",
      "title": "赤壁风云",
      "description": "曹操率八十万大军南下，势如破竹。孙刘联军在赤壁对峙曹军。周瑜意气风发，指挥东吴水师严阵以待；诸葛亮羽扇纶巾，在帐中运筹帷幄。你被两位军师同时召见，各有任务交付。",
      "conditions": {},
      "choices": [
        {
          "text": "助周瑜火攻破敌",
          "effects": { "智": 4, "武": 3, "魅": 2 },
          "hidden_effects": { "命运": 4, "吴": 8, "蜀": 3, "魏": -5 },
          "result": "你协助周瑜准备火船和引火之物。当东风骤起，你亲自点燃了第一艘火船。漫天火光映红了整个江面，曹操大军灰飞烟灭。周瑜拍着你的肩笑道：\"赤壁之功，你当居首！\""
        },
        {
          "text": "随诸葛亮联络盟友",
          "effects": { "智": 3, "魅": 5 },
          "hidden_effects": { "忠义": 3, "命运": 2, "蜀": 8, "吴": 3, "魏": -3 },
          "result": "你随诸葛亮出使各方，以三寸不烂之舌说服了犹豫不决的将领们坚定抗曹之心。诸葛亮对你说：\"舌战群儒，非口才之功，乃大义所向。\" 联军合力大破曹操，你的外交才能为孙刘双方所称道。"
        },
        {
          "text": "暗中向曹操传递情报",
          "effects": { "智": 2, "魅": -3 },
          "hidden_effects": { "魏": 12, "蜀": -8, "吴": -8, "忠义": -5 },
          "result": "你暗中向曹操通报了火攻计划。然而曹操对你的情报半信半疑，最终仍未能避免大败。但曹操记住了你的\"忠心\"，密信许你事后高官厚禄。只是你知道，若此事败露，万死莫赎。"
        }
      ]
    }
```

- [ ] **Step 5: Rewrite final_assassination (鸿门之宴 → 曹丕)**

In `data/events-final.json`, replace the `final_assassination` event object (lines 197-226) with:

```json
    {
      "id": "final_assassination",
      "title": "鸿门之宴",
      "description": "魏帝曹丕设宴邀你入宫赴饮。然而你的心腹送来密报：宴会上已暗伏刀斧手，这是一场鸿门宴。曹丕忌惮你的威望和兵权，决心在宴上除掉你。赴宴则可能身死，不赴则等同公然反叛。",
      "conditions": {},
      "choices": [
        {
          "text": "坦然赴宴，以胸襟折服曹丕",
          "effects": { "德": 5, "魅": 5 },
          "hidden_effects": { "忠义": 8, "命运": 3, "魏": 5 },
          "hidden_conditions": { "魅": { "min": 70 } },
          "result": "你孤身入宫，面对暗伏的刀斧手毫无惧色。你举杯对曹丕说：\"陛下若疑臣，臣愿当场卸甲解印。\"你的坦荡让曹丕无地自容，当场撤走了刀斧手，君臣二人推杯换盏，嫌隙尽消。曹丕感叹：\"天下能臣，唯君一人！\""
        },
        {
          "text": "⚠️ 赴宴并先发制人，制服曹丕亲信",
          "effects": {},
          "hidden_effects": {},
          "crisis_trigger": true,
          "crisis_check": { "武": { "min": 60 }, "智": { "min": 45 } },
          "success_result": "你带着三名暗藏兵器的亲卫赴宴。酒过三巡，刀斧手刚要动手，你已先一步制住了曹丕身旁的大将军。你冷冷地对曹丕说：\"陛下，我来赴宴是带着诚意的，但诚意不代表毫无防备。\"曹丕额头冷汗直冒，连忙改口说这是误会。你全身而退，从此曹丕再也不敢轻举妄动。",
          "fail_result": "你试图先发制人，但曹丕的侍卫武艺远超你的预料。混乱之中，你的亲卫被一一制服，你自己也身中数刀。曹丕看着倒在血泊中的你，冷冷地说：\"果然有反心。\"你含恨而终，一世英名毁于这场鸿门之宴。",
          "death_ending": "death_assassinated"
        },
        {
          "text": "称病不去，暗中准备退路",
          "effects": { "智": 4, "武": -2 },
          "hidden_effects": { "命运": 3, "忠义": -3, "魏": -5 },
          "result": "你以旧伤复发为由推辞，同时暗中将家眷和财产转移出京城。曹丕虽然不悦，但一时也奈何不了你。你虽保住了性命，但与曹魏朝廷的裂痕已不可弥合，此后只能在猜忌和提防中度日。"
        }
      ]
    }
```

- [ ] **Step 6: Add minor faction effects to 5+ existing events**

For the following existing events, add `hidden_effects` entries for faction values to their choices WITHOUT changing any existing text or mechanics. This is purely additive — find each event by ID and add faction keys to its existing `hidden_effects` objects:

**events-youth.json:**
- `youth_03` (市集风波): "挺身而出" choice → add `"蜀": 2` to hidden_effects (righteous act aligns with 蜀)
- `youth_05` (if it involves military): any combat choice → add small `"魏": 2` (military prowess aligns with 魏)

**events-rise.json:**
- `rise_01`: if involves political maneuvering → add `"魏": 3` to the shrewd choice
- `rise_spy` (无间暗影): "信任他" choice → add `"魏": 3` (spy networks align with 曹魏 style)
- `rise_06`: if references 三顾茅庐 → add `"蜀": 3` to relevant choice

**events-war.json:**
- `war_05` (盟友背叛): "宽恕叛徒" → add `"蜀": 3, "德" effect already exists`; "处决" → add `"魏": 3`

**events-final.json:**
- `final_01`: if has 连环计 → add `"智": already exists, "魏": 3` or `"吴": 3` depending on context

For each, read the event, identify which faction a choice thematically aligns with, and add `+2` to `+5` of the matching faction to `hidden_effects`. Keep changes small and thematically consistent.

- [ ] **Step 7: Commit**

```bash
git add data/events-youth.json data/events-rise.json data/events-war.json data/events-final.json
git commit -m "feat: rewrite existing events with historical figures and faction effects"
```

---

### Task 5: Add Youth Phase Historical Events (4 new)

**Files:**
- Modify: `data/events-youth.json` — append 4 events to the `events` array

- [ ] **Step 1: Add 4 new youth events**

Append these 4 events to the `events` array in `data/events-youth.json` (after the last existing event, before the closing `]`):

```json
    {
      "id": "youth_huangjin",
      "title": "黄巾军围村",
      "description": "黄巾贼寇席卷州郡，你的家乡也未能幸免。烽火连天之际，一支义军赶到——为首的三人骑马而来，大耳垂肩的刘备居中，红脸长须的关羽持青龙偃月刀，豹头环眼的张飞挥丈八蛇矛。他们正在招募乡勇抵抗黄巾。",
      "conditions": {},
      "choices": [
        {
          "text": "加入刘备义军，共击黄巾",
          "effects": { "武": 5, "德": 2 },
          "hidden_effects": { "蜀": 5, "忠义": 3 },
          "result": "你拿起农具改制的武器加入了义军。在刘备的指挥下，你们成功击退了黄巾贼。张飞拍着你的后背大笑：\"这小子有胆量！\"关羽微微点头，递给你一壶酒。这是你第一次感受到战友的热血和兄弟的温暖。"
        },
        {
          "text": "救助被黄巾军伤害的村民",
          "effects": { "德": 5, "魅": 2 },
          "hidden_effects": { "命运": 3, "蜀": 2 },
          "result": "你没有加入战斗，而是奔走于村落之间，救助伤者、安置老幼。刘备注意到了你，战后特意找到你说：\"兄台仁心仁术，比战场杀敌更难能可贵。\"他留下了一些粮草和药材便离去了。"
        },
        {
          "text": "趁乱搜刮黄巾军遗留的物资",
          "effects": { "智": 2, "武": 2 },
          "hidden_effects": { "命运": 5, "德": -3 },
          "result": "你在混乱中搜刮了黄巾军遗留的兵器和钱粮。虽然获利不少，但你心里清楚，这些东西沾着同胞的鲜血。你把一部分分给了流离失所的村民，多少减轻了些愧疚。"
        }
      ]
    },
    {
      "id": "youth_dongzhuo",
      "title": "董卓进京",
      "description": "洛阳城中天翻地覆。董卓率西凉铁骑进京，废少帝、立献帝，独揽朝政。街头巷尾尸横遍野，百姓惶惶不可终日。你亲眼目睹董卓的士兵在街上肆意劫掠，一个老者因不愿交出粮食被当街斩杀。",
      "conditions": {},
      "choices": [
        {
          "text": "暗中联络反董义士",
          "effects": { "武": 3, "德": 5 },
          "hidden_effects": { "魏": 3, "忠义": 5 },
          "set_flags": ["joined_coalition"],
          "result": "你暗中联络了几位同样不满董卓暴行的义士，传递消息、筹集物资，为日后的讨董大业埋下了种子。你听说曹操已经发出矫诏，号召各路诸侯起兵讨伐董卓。你的内心燃起了希望之火。"
        },
        {
          "text": "隐忍旁观，保全自身",
          "effects": { "智": 3, "魅": 1 },
          "hidden_effects": { "命运": 3 },
          "result": "你咬紧牙关，低头快步穿过洒满鲜血的街道。你知道以自己现在的实力，贸然反抗只是白白送死。你选择韬光养晦，等待时机。但那个老者倒在血泊中的画面，你一辈子都忘不了。"
        },
        {
          "text": "投靠董卓军，换取生存",
          "effects": { "武": 5, "魅": -2 },
          "hidden_effects": { "德": -8, "忠义": -5 },
          "result": "你加入了董卓的西凉军。他们给你吃饱穿暖，还发了一把锋利的刀。但你很快发现，你的任务是帮助他们搜刮百姓的财物。每次执行命令时，你都能听到自己良心的拷问声。"
        }
      ]
    },
    {
      "id": "youth_caocao_young",
      "title": "少年曹操",
      "description": "你在洛阳的一间酒馆中偶遇一个眼神锐利的年轻人。他自称曹孟德，言谈间流露出对董卓的刻骨仇恨。酒过三巡，他压低声音说：\"我已弄到王允的七星宝刀，明日打算入相国府行刺董卓。兄台可愿助我一臂之力？\"",
      "conditions": {},
      "choices": [
        {
          "text": "⚠️ 协助曹操刺杀董卓",
          "effects": { "武": 3, "德": 2 },
          "hidden_effects": { "魏": 8, "忠义": 3 },
          "crisis_trigger": true,
          "crisis_check": { "武": { "min": 40 } },
          "success_result": "你和曹操潜入相国府，在董卓午睡之际拔出宝刀。然而铜镜映出了你们的身影，董卓猛然惊醒。千钧一发之际，你挡住了冲上来的侍卫，曹操趁机夺路而逃。你紧随其后翻墙而出，两人骑马狂奔出城。曹操紧握你的手：\"今日之恩，曹某没齿难忘！\"",
          "fail_result": "你和曹操潜入相国府，但被吕布的巡逻兵发现。混战之中，你身中数刀，血流不止。曹操想要救你，但敌众我寡。你用最后的力气推开曹操让他先走，自己倒在了相国府的台阶上。",
          "death_ending": "death_assassinated"
        },
        {
          "text": "劝他三思，刺杀太过冒险",
          "effects": { "智": 3, "魅": 2 },
          "hidden_effects": { "魏": 3, "命运": 3 },
          "result": "你分析了相国府的守卫情况，劝曹操不要冲动。\"孟德兄，董卓身旁有吕布护卫，行刺十死无生。不如积蓄力量，号召天下诸侯共讨之。\"曹操沉思良久，最终点头。他举杯向你敬酒：\"兄台见识过人，曹某受教了。\""
        },
        {
          "text": "向董卓告发此事",
          "effects": { "武": 2 },
          "hidden_effects": { "德": -5, "魏": -15, "忠义": -8 },
          "result": "你向董卓的手下告发了曹操的计划，换来了一笔赏金和一个小官职。但你心里清楚，你出卖了一个有血性的好汉。曹操虽然逃走了，但这份背叛将成为你一生的污点。"
        }
      ]
    },
    {
      "id": "youth_sunjian",
      "title": "初遇孙坚",
      "description": "讨董联军中，江东猛虎孙坚是最勇猛的一路。你在他率部经过你家乡时，见到了这位叱咤风云的将军。他的部队纪律严明，秋毫无犯，与其他诸侯的军队形成鲜明对比。孙坚注意到了路旁好奇观望的你，策马上前。",
      "conditions": {},
      "choices": [
        {
          "text": "请求加入孙坚的军队",
          "effects": { "武": 3, "魅": 2 },
          "hidden_effects": { "吴": 8, "忠义": 2 },
          "result": "你上前单膝跪地，请求追随孙坚。孙坚打量了你一番，笑道：\"有胆识！你虽年幼，但眼中有光。\"他让你跟在身边做个随从。在接下来的行军中，你亲眼见识了什么叫真正的将帅之风。孙坚对你说：\"江东之地，人杰地灵，日后你若有难，可来江东寻我。\""
        },
        {
          "text": "为军队提供补给和向导",
          "effects": { "德": 3, "智": 2, "魅": 2 },
          "hidden_effects": { "吴": 5, "命运": 2 },
          "result": "你组织乡亲们为孙坚的军队准备了粮草和清水，还主动充当向导，指引他们绕过前方的泥泞小路。孙坚大为赞赏，留下了一些银两作为酬谢，还让麾下的程普送了你一把短剑：\"小友义举，孙某铭记在心。\""
        },
        {
          "text": "冷眼旁观，不参与纷争",
          "effects": { "智": 2 },
          "hidden_effects": { "命运": 2 },
          "result": "你远远地看着军队经过，心想这些诸侯之间的争斗，与你这个小人物又有什么关系呢？但看着孙坚威风凛凛的背影消失在尘土中，你心中隐隐升起一股说不清的向往。"
        }
      ]
    }
```

- [ ] **Step 2: Verify JSON validity**

Open `data/events-youth.json` and ensure it is valid JSON (no trailing commas, matching brackets). The events array should now have 14 events total (10 original + 4 new).

- [ ] **Step 3: Commit**

```bash
git add data/events-youth.json
git commit -m "feat: add 4 youth phase historical events (黄巾/董卓/曹操/孙坚)"
```

---

### Task 6: Add Rise Phase Historical Events (5 new)

**Files:**
- Modify: `data/events-rise.json` — append 5 events to the `events` array

- [ ] **Step 1: Add 5 new rise events**

Append these 5 events to the `events` array in `data/events-rise.json`:

```json
    {
      "id": "rise_guandu",
      "title": "官渡之战",
      "description": "曹操与袁绍在官渡对峙，一场决定北方命运的大战即将打响。曹操兵少粮缺，却以奇谋应敌；袁绍兵多将广，但内部矛盾重重。双方都在暗中拉拢各方势力，你也被卷入了这场博弈。",
      "conditions": {},
      "choices": [
        {
          "text": "效力曹操，献计奇袭乌巢",
          "effects": { "武": 3, "智": 3 },
          "hidden_effects": { "魏": 12, "蜀": -3, "命运": 3 },
          "set_flags": ["served_caocao"],
          "result": "你向曹操献计，建议奇袭袁绍的粮草重地乌巢。曹操大喜，亲率精兵五千执行此计。火烧乌巢一战，袁绍大军崩溃。曹操拉着你的手说：\"孤得先生，如鱼得水！\"从此你成为曹操幕府中的重要谋士。"
        },
        {
          "text": "投靠袁绍，辅佐四世三公",
          "effects": { "武": 3, "魅": 3 },
          "hidden_effects": { "魏": -5, "命运": -2 },
          "result": "你看中袁绍的名望和实力，前往投靠。然而你很快发现，袁绍虽然兵多，却优柔寡断、不听良言。你的多次进谏都被搁置。官渡一败，你跟随残军仓皇北撤，深感识人之难。"
        },
        {
          "text": "保持中立，做情报商人",
          "effects": { "智": 5, "魅": 3 },
          "hidden_effects": { "命运": 3, "忠义": -2 },
          "result": "你不偏不倚，在两军之间传递消息，左右逢源。双方都认为你是自己人，你却把真正关键的情报留给了出价最高的一方。战后，无论谁胜谁负，你都毫发无伤。只是这份精明，让你离\"信义\"二字越来越远。"
        }
      ]
    },
    {
      "id": "rise_sangu",
      "title": "三顾茅庐",
      "description": "刘备为求贤才，三次亲往隆中拜访隐居的诸葛亮。你恰好在隆中一带游历，亲眼目睹了这场千古佳话。第三次拜访时，诸葛亮终于开门迎客。刘备邀你一同入内旁听。",
      "conditions": {},
      "choices": [
        {
          "text": "随刘备一同拜访，聆听隆中对",
          "effects": { "智": 3, "德": 2 },
          "hidden_effects": { "蜀": 10, "命运": 3 },
          "set_flags": ["studied_under_zhuge"],
          "result": "你随刘备进入草庐，听诸葛亮纵论天下大势。三分天下的战略构想让你如醍醐灌顶。诸葛亮注意到你频频点头，微笑道：\"这位小友悟性不凡，日后或可为大业出力。\"刘备让你留在隆中多住几日，向诸葛亮请教学问。这段经历让你受益终身。"
        },
        {
          "text": "先行拜访诸葛亮，毛遂自荐",
          "effects": { "智": 5, "魅": 2 },
          "hidden_effects": { "蜀": 5, "命运": 2 },
          "result": "你抢在刘备之前独自拜访诸葛亮。诸葛亮虽然婉拒出山，但与你对弈了一局棋，谈论了天下大势。他赠你一卷竹简：\"此乃我整理的用兵要诀，与君有缘，聊作纪念。\"你虽未能拜入他门下，但这次交谈让你的见识大为增长。"
        },
        {
          "text": "向曹操密报诸葛亮的行踪",
          "effects": { "智": 2 },
          "hidden_effects": { "魏": 8, "蜀": -10, "忠义": -3 },
          "result": "你将诸葛亮即将出山辅佐刘备的消息报告给了曹操的探子。曹操虽然派人前去招揽，但诸葛亮心意已决，终归刘备。你拿到了曹操赏赐的银两，但内心深处，你知道自己错失了一位绝世大才的友谊。"
        }
      ]
    },
    {
      "id": "rise_sunce_jiangdong",
      "title": "小霸王平江东",
      "description": "孙策承父志，以传国玉玺向袁术借兵，渡江南下平定江东。他以少胜多，所向披靡，被人称为\"小霸王\"。你与孙策在一次酒宴上偶遇，他豪爽地拍着桌子说：\"天下英雄，唯你我也！兄台可愿与策同行，共取江东？\"",
      "conditions": {},
      "choices": [
        {
          "text": "随孙策出征，共取江东",
          "effects": { "武": 5, "魅": 2 },
          "hidden_effects": { "吴": 10, "忠义": 3, "命运": 2 },
          "set_flags": ["allied_sunce"],
          "result": "你随孙策渡江南下，一路攻城拔寨。孙策勇猛过人，每战必身先士卒。你亲眼见证了他如何以区区数千兵马横扫江东六郡。周瑜骑马与你并行，笑道：\"伯符待人以诚，跟着他不会错的。\"你深感自己找到了一位值得追随的主公。"
        },
        {
          "text": "协助后勤筹划，支援孙策",
          "effects": { "智": 3, "德": 2, "魅": 2 },
          "hidden_effects": { "吴": 5, "命运": 2 },
          "result": "你不擅长冲锋陷阵，但你帮孙策筹措粮草、安抚降兵、治理新占之地。孙策打下城池后交给你管理，他拍着你的肩说：\"打天下靠武力，治天下靠你这样的人才。\"你在江东渐渐站稳了脚跟。"
        },
        {
          "text": "婉言谢绝，各走各路",
          "effects": { "智": 2 },
          "hidden_effects": { "命运": 2 },
          "result": "你谢绝了孙策的邀请。孙策虽有些失望，但还是爽快地与你干了三杯酒：\"兄台若改了主意，江东随时欢迎。\"你目送他策马远去，心中感慨：此人若非英年早逝，天下归属未可知也。"
        }
      ]
    },
    {
      "id": "rise_xunyu",
      "title": "荀彧论天下",
      "description": "曹操的首席谋士荀彧，人称\"王佐之才\"。你因才名远播，被荀彧邀入府中品茶论道。书房中墨香四溢，荀彧开门见山：\"当今天下纷乱，唯曹公可安社稷。足下大才，何不共襄大业？\"",
      "conditions": { "智": { "min": 35 } },
      "choices": [
        {
          "text": "赞同曹操路线，入幕为僚",
          "effects": { "智": 3, "魅": 2 },
          "hidden_effects": { "魏": 10, "命运": 3 },
          "set_flags": ["served_caocao"],
          "result": "你与荀彧相谈甚欢，最终决定加入曹操的幕府。荀彧亲自为你引荐，曹操接见时说：\"文若荐人，从无虚言。\"你被委以重任，开始在曹操麾下施展才华。荀彧后来告诉你：\"曹公重才，只要你忠心辅佐，必有一番作为。\""
        },
        {
          "text": "质疑曹操的野心，表达顾虑",
          "effects": { "德": 5, "智": 2 },
          "hidden_effects": { "魏": -5, "忠义": 5 },
          "result": "你直言曹操虽有雄才，但其\"挟天子以令诸侯\"的做法有违臣道。荀彧沉默良久，眼中闪过一丝复杂的神色。他轻声说：\"足下所言，彧何尝没有想过……\"你们的这次谈话，似乎触动了荀彧内心深处的某根弦。你感到荀彧并非完全赞同曹操的所有作为。"
        },
        {
          "text": "虚与委蛇，不表明立场",
          "effects": { "魅": 3, "智": 2 },
          "hidden_effects": { "命运": 2, "魏": 2 },
          "result": "你滴水不漏地应对，既不明确拒绝也不表示投靠。荀彧看穿了你的心思，微笑道：\"足下心思缜密，是做大事的料。不过，骑墙之人最终只会两面不讨好。\"你若有所思地离开了荀彧府邸。"
        }
      ]
    },
    {
      "id": "rise_diaochan",
      "title": "连环计",
      "description": "你无意中发现了司徒王允的一个惊天阴谋：他正在利用养女貂蝉，施展美人计离间董卓与吕布。貂蝉以倾城之姿周旋于二人之间，一场足以改变天下格局的连环计正在悄然展开。你目睹了貂蝉在月下独自垂泪的一幕。",
      "conditions": {},
      "choices": [
        {
          "text": "暗中协助王允的计划",
          "effects": { "智": 5, "魅": 3 },
          "hidden_effects": { "德": 2, "命运": 3 },
          "set_flags": ["witnessed_lianbuan"],
          "result": "你暗中帮助王允传递消息，确保计划不被泄露。当吕布最终怒杀董卓时，你知道这其中也有你的一份功劳。王允事后拉着你的手说：\"此计若非足下暗中周全，或有疏漏。\"你看着庆祝的人群，心中却想起了貂蝉的泪水——她的牺牲，又有几人在意？"
        },
        {
          "text": "告知吕布真相",
          "effects": { "武": 3, "德": 3 },
          "hidden_effects": { "忠义": 3 },
          "result": "你找到吕布，将连环计的真相和盘托出。吕布暴怒之下差点拔刀杀你，但冷静后反而感激你的坦诚。然而他对貂蝉的迷恋已深入骨髓，最终还是选择了杀死董卓。你叹了口气——有些事，不是真相能改变的。"
        },
        {
          "text": "趁机从中谋利",
          "effects": { "魅": 5, "智": 2 },
          "hidden_effects": { "德": -5, "命运": 3 },
          "result": "你利用掌握的秘密，分别向董卓和吕布出售\"情报\"，两头通吃。你赚得盆满钵满，却也给自己埋下了隐患。当董卓被杀后，你急忙销毁了所有与双方联络的证据，心惊胆战了好一阵子。"
        }
      ]
    }
```

- [ ] **Step 2: Verify JSON validity**

Ensure `data/events-rise.json` is valid JSON. The events array should now have 15 events total (10 original + 5 new).

- [ ] **Step 3: Commit**

```bash
git add data/events-rise.json
git commit -m "feat: add 5 rise phase historical events (官渡/三顾/孙策/荀彧/连环计)"
```

---

### Task 7: Add War Phase Historical Events (6 new)

**Files:**
- Modify: `data/events-war.json` — append 6 events to the `events` array

- [ ] **Step 1: Add 6 new war events**

Append these 6 events to the `events` array in `data/events-war.json`:

```json
    {
      "id": "war_chibi",
      "title": "赤壁决战",
      "description": "赤壁之战进入最关键的时刻。周瑜已定下火攻大计，黄盖诈降接近曹操水寨。东南风起，火船即将出发。你站在岸边，面临最后的选择——是助孙刘联军一臂之力，还是暗中为曹操通风报信？",
      "conditions": {},
      "choices": [
        {
          "text": "登上火船，亲自参与火攻",
          "effects": { "武": 5, "智": 2 },
          "hidden_effects": { "蜀": 8, "吴": 8, "魏": -10, "命运": 3 },
          "result": "你跳上了黄盖的火船，手持火把冲在最前面。当火船撞上曹操的连环战船时，冲天大火照亮了整个长江。你从火海中游回岸边，浑身焦黑但毫发未伤。周瑜亲自为你倒酒庆功：\"今日之战，君功不可没！\""
        },
        {
          "text": "暗中向曹操传递火攻计划",
          "effects": { "智": 3 },
          "hidden_effects": { "魏": 12, "蜀": -8, "吴": -8, "忠义": -5 },
          "result": "你冒险向曹操派出密使，报告了火攻计划。然而曹操收到消息时已经太迟，加上他对火攻的可能性估计不足，最终仍然惨败。但曹操记住了你的\"忠心\"，派人传话：\"待孤重整旗鼓，定不忘先生今日之恩。\""
        },
        {
          "text": "趁乱两不相帮，伺机而动",
          "effects": { "智": 5, "魅": 3 },
          "hidden_effects": { "命运": 5 },
          "result": "你没有参与任何一方的行动，而是在混乱中搜集了大量情报和战利品。战后，无论是孙刘联军还是曹操残部，都无法指证你的立场。你像一条滑溜的泥鳅，在三方势力的夹缝中游刃有余。"
        }
      ]
    },
    {
      "id": "war_changbanpo",
      "title": "长坂坡",
      "description": "曹操大军追击刘备，在长坂坡展开惨烈的追杀。刘备的妻儿和百姓在乱军中失散。常山赵子龙单枪匹马杀入重围，在百万军中七进七出，怀抱阿斗杀出一条血路。你远远看到赵云浑身浴血，战马已经力竭，身后曹军追兵不止。",
      "conditions": {},
      "choices": [
        {
          "text": "驰援赵云，共战曹军",
          "effects": { "武": 5, "德": 3 },
          "hidden_effects": { "蜀": 8, "忠义": 5, "命运": 2 },
          "set_flags": ["saved_zhaoyun"],
          "result": "你纵马杀入战场，挡住了追击赵云的曹军先锋。赵云回头看了你一眼，满是感激，嘶声喊道：\"多谢壮士！\"你们并肩杀出重围，将阿斗安全送到刘备身边。赵云抱拳道：\"此恩赵云铭记在心，日后必当报答！\""
        },
        {
          "text": "⚠️ 亲自断后阻挡追兵",
          "effects": { "武": 3, "德": 5 },
          "hidden_effects": { "蜀": 10, "忠义": 8 },
          "crisis_trigger": true,
          "crisis_check": { "武": { "min": 55 } },
          "success_result": "你横刀立马挡在桥头，一夫当关。曹军先锋被你的气势所慑，竟然不敢上前。你怒目圆睁，大喝一声，声如惊雷。追兵迟疑之际，赵云已经带着阿斗远去。你且战且退，最终成功脱身。张飞后来听说了你的壮举，竖起大拇指：\"好汉子！\"",
          "fail_result": "你想要断后阻挡追兵，但曹操的虎豹骑精锐绝非浪得虚名。你虽奋力搏杀，终因寡不敌众，身中数箭倒在了长坂坡的尘土中。你最后看到的，是赵云护着阿斗远去的身影——至少，你的牺牲没有白费。",
          "death_ending": "death_battle"
        },
        {
          "text": "趁乱投奔曹营",
          "effects": { "智": 2, "武": 2 },
          "hidden_effects": { "魏": 10, "蜀": -10, "忠义": -5 },
          "result": "你看清了局势——刘备大势已去，此时投靠曹操才是明智之举。你混入曹军，凭借三寸不烂之舌获得了一个小小的官职。但每当夜深人静时，你都会想起赵云浴血奋战的身影，心中五味杂陈。"
        }
      ]
    },
    {
      "id": "war_dingjunshan",
      "title": "定军山之战",
      "description": "刘备与曹操争夺汉中，老将黄忠在定军山与曹魏大将夏侯渊对峙。黄忠虽年迈，但虎威不减，法正在山上举旗指挥，准备发动致命一击。你身处两军阵前，这一战将决定汉中的归属。",
      "conditions": {},
      "choices": [
        {
          "text": "随黄忠冲锋，斩将夺旗",
          "effects": { "武": 5, "魅": 2 },
          "hidden_effects": { "蜀": 5, "忠义": 3 },
          "result": "你跟随黄忠从山上俯冲而下，势如破竹。黄忠一刀斩下夏侯渊的帅旗，曹军大乱。你趁势掩杀，曹军溃不成军。黄忠哈哈大笑：\"老夫年近七十，犹能上阵杀敌，你年纪轻轻，日后成就必在老夫之上！\""
        },
        {
          "text": "在侧翼设伏，策应主力",
          "effects": { "智": 3, "武": 2 },
          "hidden_effects": { "蜀": 3, "命运": 3 },
          "result": "你率领一支偏师在侧翼设下埋伏。当黄忠正面冲锋时，曹军想要包抄，却一头扎进了你的伏击圈。你的策应让黄忠的突击更加顺利，法正在山上连连挥旗，示意你配合得当。战后，诸葛亮特意夸奖了你的布阵之才。"
        },
        {
          "text": "劝说夏侯渊撤退，减少伤亡",
          "effects": { "德": 3, "魅": 3 },
          "hidden_effects": { "魏": 5, "蜀": -3, "忠义": 2 },
          "hidden_conditions": { "requires_flags": ["served_caocao"] },
          "result": "你以曹操旧部的身份前往夏侯渊营中劝降。夏侯渊虽然拒绝投降，但你的话让他意识到地形不利。他下令部分士兵先行撤退，减少了不必要的伤亡。虽然夏侯渊最终还是战死了，但那些被你劝退的士兵保住了性命。"
        }
      ]
    },
    {
      "id": "war_hefei",
      "title": "合肥之战",
      "description": "张辽率八百骑兵突袭孙权十万大军于合肥，威震逍遥津。孙权的坐骑被困在断桥之上，险些被擒。整个江东为之震动。你正在合肥城外，亲眼目睹了这场以少胜多的经典战役。",
      "conditions": {},
      "choices": [
        {
          "text": "随张辽杀入吴军阵中",
          "effects": { "武": 5, "魅": 2 },
          "hidden_effects": { "魏": 8, "吴": -5, "命运": 3 },
          "result": "你跟随张辽冲入吴军大营，如入无人之境。张辽左冲右突，所到之处吴军纷纷溃逃。你紧随其后，护住他的侧翼。一日之内杀了个七进七出，吴军士气彻底崩溃。张辽拍着你的铠甲大笑：\"好兄弟，痛快！\""
        },
        {
          "text": "在东吴阵中抵抗张辽",
          "effects": { "武": 3, "德": 2 },
          "hidden_effects": { "吴": 8, "魏": -3, "忠义": 3 },
          "result": "你站在东吴的阵线上，奋力抵抗张辽的突袭。虽然最终未能阻止张辽的冲锋，但你组织了有效的防御，保护了孙权安全撤退。甘宁对你说：\"今日若非你挡住侧翼，主公恐怕已被擒获。\"你成为了东吴军中受人尊敬的勇士。"
        },
        {
          "text": "居中调停，劝双方罢兵",
          "effects": { "魅": 5, "德": 3 },
          "hidden_effects": { "命运": 3 },
          "result": "你冒着箭雨奔走于两军之间，试图劝和。虽然双方都没有听你的，但你的勇气赢得了两边将士的尊重。张辽说你是\"胆大的疯子\"，孙权说你是\"有仁心的义士\"。你两边不得罪，倒也落得个好名声。"
        }
      ]
    },
    {
      "id": "war_guanyu_maicheng",
      "title": "关羽败走麦城",
      "description": "关羽大意失荆州，被吕蒙白衣渡江偷袭后方。前有曹军徐晃拦截，后有东吴陆逊截断退路，关羽被困麦城，兵少粮尽。这位威震华夏的武圣，正面临人生最大的危机。消息传到你耳中——关羽正在等待救援。",
      "conditions": {},
      "choices": [
        {
          "text": "冒死前往麦城救援关羽",
          "effects": { "武": 3, "德": 5 },
          "hidden_effects": { "蜀": 10, "吴": -5, "忠义": 8 },
          "hidden_conditions": { "requires_flags": ["befriend_guanyu"] },
          "result": "你想起当年与关羽的交情，毅然率领少量人马杀向麦城。关羽见到你，虎目含泪：\"兄弟，关某一生不曾向人低头，但今日，关某谢你！\"你护送关羽突围，虽然损失惨重，但终于杀出了一条血路。关羽得以保全性命，你们的兄弟之情，成为了乱世中最动人的篇章。"
        },
        {
          "text": "⚠️ 独闯吴营，交涉释放关羽",
          "effects": { "魅": 3, "智": 3 },
          "hidden_effects": { "蜀": 5, "吴": -3 },
          "crisis_trigger": true,
          "crisis_check": { "魅": { "min": 60 }, "智": { "min": 50 } },
          "success_result": "你只身前往东吴大营，面见吕蒙和陆逊。你以利害相劝：\"杀关羽易，但蜀汉必举倾国之兵来伐。放关羽一条生路，方可保江东太平。\"吕蒙犹豫不决，你又以私交说动了鲁肃。最终，东吴放开了一条小路，关羽得以突围。",
          "fail_result": "你只身前往东吴大营交涉，但吕蒙铁了心要杀关羽。你的苦劝不但没有效果，反而被当作蜀汉的细作扣押。在关羽被害的那一夜，你也在吴军营中遇难。你最后的念头是：至少你试过了。",
          "death_ending": "death_assassinated"
        },
        {
          "text": "袖手旁观，不介入此事",
          "effects": { "智": 2 },
          "hidden_effects": { "命运": 3, "忠义": -5 },
          "result": "你权衡利弊后选择了沉默。关羽最终被东吴擒杀，首级被送往曹操面前。你听到这个消息时，内心翻江倒海，却只能对着月亮默默饮了一杯酒。你知道，从今以后，蜀汉与东吴之间的仇恨将永远无法化解。"
        }
      ]
    },
    {
      "id": "war_baiyi",
      "title": "白衣渡江",
      "description": "东吴大都督吕蒙装病退隐，暗中以陆逊替代。陆逊以书生之姿麻痹关羽，吕蒙则率精兵伪装商队白衣渡江，奇袭荆州。这场精心策划的阴谋正在你眼前展开——你提前得知了东吴的计划。",
      "conditions": {},
      "choices": [
        {
          "text": "协助东吴的奇袭行动",
          "effects": { "智": 5, "武": 2 },
          "hidden_effects": { "吴": 10, "蜀": -8, "忠义": -3 },
          "result": "你暗中为吕蒙的\"商队\"提供了沿途的守军分布情报。白衣渡江的计划完美执行，荆州守军在毫无防备的情况下被一一瓦解。吕蒙赞道：\"此计能成，足下当居首功。\"但你知道，关羽的悲剧因你而加速了。"
        },
        {
          "text": "向关羽报信，揭露东吴阴谋",
          "effects": { "德": 3, "魅": 2 },
          "hidden_effects": { "蜀": 10, "吴": -8, "忠义": 5 },
          "result": "你冒着生命危险星夜赶往荆州，将东吴的白衣渡江计划告知关羽。关羽虽然将信将疑，但还是加强了后方防御。东吴的奇袭计划因此受挫，关羽得以从容应对。你成为了蜀汉的恩人，但也彻底得罪了东吴。"
        },
        {
          "text": "保全自身，静观其变",
          "effects": { "智": 2 },
          "hidden_effects": { "命运": 3, "魅": 2 },
          "result": "你选择置身事外，远远地看着这场大戏上演。白衣渡江的消息传来时，你已经远离了是非之地。在这个乱世中，有时候活着本身就是最大的智慧——至少你是这样安慰自己的。"
        }
      ]
    }
```

- [ ] **Step 2: Verify JSON validity**

Ensure `data/events-war.json` is valid JSON. The events array should now have 18 events total (12 original + 6 new).

- [ ] **Step 3: Commit**

```bash
git add data/events-war.json
git commit -m "feat: add 6 war phase historical events (赤壁/长坂坡/定军山/合肥/麦城/白衣渡江)"
```

---

### Task 8: Add Final Phase Historical Events (4 new)

**Files:**
- Modify: `data/events-final.json` — append 4 events to the `events` array

- [ ] **Step 1: Add 4 new final events**

Append these 4 events to the `events` array in `data/events-final.json`:

```json
    {
      "id": "final_wuzhangyuan",
      "title": "五丈原",
      "description": "诸葛亮第六次北伐，屯兵五丈原与司马懿对峙。然而丞相积劳成疾，命不久矣。秋风萧瑟的营帐中，诸葛亮躺在病榻上，将最后的嘱托交付众将。他看向你，苍白的脸上露出一丝微笑：\"事到如今，你意如何？\"",
      "conditions": { "蜀": { "min": 40 } },
      "choices": [
        {
          "text": "继承丞相遗志，誓死北伐",
          "effects": { "德": 5, "武": 2 },
          "hidden_effects": { "蜀": 8, "忠义": 8 },
          "result": "你跪在诸葛亮的病榻前，泪流满面：\"丞相放心，北伐大业，纵我粉身碎骨也要完成！\"诸葛亮欣慰地点点头，将自己的羽扇交到你手中：\"此扇伴我半生，今交与你。望你不忘初心……\"秋风吹灭了帐中的烛火，巨星陨落。你握紧羽扇，在风中伫立了整整一夜。"
        },
        {
          "text": "建议撤军，保全蜀汉实力",
          "effects": { "智": 5, "魅": 2 },
          "hidden_effects": { "命运": 5, "蜀": 2 },
          "result": "你含泪进言：\"丞相，蜀汉国小民疲，不宜再战。撤军休养，方为上策。\"诸葛亮长叹一声：\"你说的或许是对的。可惜，亮再也看不到那一天了。\"丞相去世后，你主持了有序撤军，以空城计吓退了追击的司马懿。你保全了蜀汉最后的精锐。"
        },
        {
          "text": "暗中联络司马懿，另谋出路",
          "effects": { "智": 3 },
          "hidden_effects": { "魏": 10, "蜀": -15, "忠义": -10 },
          "result": "你趁诸葛亮病重之际，暗中派人联络了对面的司马懿。你以蜀汉军情作为投名状，换取了司马懿的庇护承诺。诸葛亮去世的那一夜，你悄然离开了蜀军大营，消失在五丈原的秋风中。你背叛了一个伟大的人，这份愧疚将伴随你终生。"
        }
      ]
    },
    {
      "id": "final_simayi",
      "title": "高平陵之变",
      "description": "司马懿终于按捺不住野心，趁大将军曹爽随魏帝外出祭祖之机，发动政变控制了洛阳。曹魏宗室人人自危，朝堂之上暗流涌动。你在这场惊天巨变中，必须立刻选择立场——站在司马氏一边，还是效忠曹氏正统？",
      "conditions": { "魏": { "min": 40 } },
      "choices": [
        {
          "text": "支持司马懿，顺应大势",
          "effects": { "智": 5, "魅": 2 },
          "hidden_effects": { "魏": 5, "忠义": -5, "命运": 3 },
          "result": "你判断司马懿已经大权在握，抵抗无异于以卵击石。你第一时间表态支持，并帮助司马懿稳定了洛阳局势。司马懿满意地说：\"识时务者为俊杰。\"你从此成为司马氏的核心幕僚，但你也清楚——效忠的对象从曹氏变成了司马氏，你的\"忠\"字，已经打了折扣。"
        },
        {
          "text": "⚠️ 效忠曹氏，抵抗司马懿",
          "effects": { "武": 3, "德": 3 },
          "hidden_effects": { "魏": 3, "忠义": 8 },
          "crisis_trigger": true,
          "crisis_check": { "武": { "min": 50 } },
          "success_result": "你率领忠于曹氏的将士据守城门，与司马懿的军队对峙。经过一番激战和谈判，司马懿不得不做出让步，保留了部分曹氏宗室的地位。你虽然没能彻底阻止政变，但你的忠诚赢得了天下人的尊敬。",
          "fail_result": "你试图组织抵抗，但司马懿早已控制了所有要害部门。你被叛军包围，寡不敌众。司马懿看着被押上来的你，冷冷地说：\"忠臣？在我看来，不过是不识时务罢了。\"你被处以极刑，成为了这场政变中最后的殉道者。",
          "death_ending": "death_executed"
        },
        {
          "text": "趁乱脱身，远离权力中心",
          "effects": { "智": 3 },
          "hidden_effects": { "命运": 5 },
          "result": "你敏锐地察觉到了危险的气息，在政变的第一时间就带着家人悄然离开了洛阳。你隐姓埋名，在一个偏远的小镇上安顿下来。朝堂上的腥风血雨与你再无关系——至少表面上如此。"
        }
      ]
    },
    {
      "id": "final_jiangwei",
      "title": "姜维北伐",
      "description": "蜀汉后期，姜维继承诸葛亮遗志，九伐中原。然而蜀汉国力日衰，朝中黄皓弄权，前线粮草不济。姜维独木难支，仍然执意北伐。他找到了你，眼中燃烧着不灭的火焰：\"先帝与丞相的遗志不可废。你愿与我同行吗？\"",
      "conditions": { "蜀": { "min": 50 } },
      "choices": [
        {
          "text": "追随姜维，誓死北伐",
          "effects": { "武": 3, "德": 3 },
          "hidden_effects": { "蜀": 8, "忠义": 5 },
          "result": "你与姜维并肩作战，转战于祁山、段谷之间。虽然屡战屡败、屡败屡战，但你们从未放弃。姜维常在篝火旁对你说：\"丞相生前最后看的那颗星，就是北方。只要那颗星还在，我们就不能停。\"你知道这注定是一场无法获胜的战争，但你选择了与信念同行。"
        },
        {
          "text": "劝姜维止戈，保全蜀汉",
          "effects": { "智": 5, "德": 3 },
          "hidden_effects": { "蜀": 3, "命运": 3 },
          "result": "你苦劝姜维：\"将军之志可敬，但蜀汉民力已竭，再战只会加速灭亡。不如修养生息，待天时变化。\"姜维沉默良久，最终摇头：\"你说的我都懂。但丞相临终前托付于我，我若不战，九泉之下有何面目见他？\"你叹了口气，知道自己无法改变他的决心。"
        },
        {
          "text": "密谋投降曹魏，结束战争",
          "effects": { "智": 2 },
          "hidden_effects": { "魏": 8, "蜀": -15, "忠义": -10 },
          "result": "你暗中与曹魏使者接触，商议投降事宜。你告诉自己，这是为了拯救蜀汉百姓免受更多战火之苦。但当你看到姜维得知消息后怒发冲冠的表情，你不确定自己做的是对还是错了。"
        }
      ]
    },
    {
      "id": "final_unification",
      "title": "三国归晋",
      "description": "天下大势，分久必合。司马氏篡魏立晋，随后灭蜀平吴，三国归于一统。新朝初立，百废待兴。你站在洛阳城头，望着飘扬的晋旗，回想起自己这一路走来的风风雨雨。身边的旧友已所剩无几，你需要为自己的余生做出最后的选择。",
      "conditions": {},
      "choices": [
        {
          "text": "入朝为官，辅佐新朝",
          "effects": { "魅": 3, "智": 2 },
          "hidden_effects": { "魏": 5, "命运": 3 },
          "result": "你接受了晋朝的征召，入朝为官。你以多年的经验和人脉，帮助新朝稳定了局势。同僚们尊称你为\"三朝元老\"。你在朝堂上如鱼得水，却在夜深人静时常常梦见那些逝去的英雄——曹操的雄心、刘备的仁义、孙权的守成……这一切，都随着时光消逝了。"
        },
        {
          "text": "著书立说，记录三国风云",
          "effects": { "智": 5, "德": 5 },
          "hidden_effects": { "命运": 5 },
          "result": "你拒绝了朝廷的征召，隐居于洛阳郊外的一间草庐中，开始撰写自己亲历的三国故事。你把那些英雄的豪情壮志、那些战场上的生死抉择、那些乱世中的人性光辉，一笔一划地记录下来。多年后，你的著作传遍天下，后人称之为乱世的真实见证。"
        },
        {
          "text": "归隐田园，了此余生",
          "effects": { "德": 3 },
          "hidden_effects": { "命运": 5, "忠义": 3 },
          "result": "你回到了家乡，在一片竹林边建了一间小屋。你种菜、钓鱼、品茶，过着与世无争的生活。偶尔有年轻人来拜访你，请你讲述那个英雄辈出的时代。你坐在藤椅上，望着远山，缓缓地说：\"那时候啊，天下虽乱，但人心是热的……\""
        }
      ]
    }
```

- [ ] **Step 2: Verify JSON validity**

Ensure `data/events-final.json` is valid JSON. The events array should now have 13 events total (9 original + 4 new).

- [ ] **Step 3: Commit**

```bash
git add data/events-final.json
git commit -m "feat: add 4 final phase historical events (五丈原/高平陵/姜维/归晋)"
```

---

### Task 9: Final Integration Verification

**Files:** None (testing only)

- [ ] **Step 1: Verify all JSON files are valid**

Run a quick validation by loading the game:
```bash
python -m http.server 8080
```
Open `http://localhost:8080` in a browser. Open browser DevTools console (F12). If any JSON file has syntax errors, the console will show fetch/parse errors.

- [ ] **Step 2: Play through a full game**

1. Select any character and play through all 4 phases
2. Verify new events appear in the event pool (they should rotate randomly)
3. Verify faction values change when making choices in historical events
4. Verify the faction bar updates correctly
5. Verify ending screen shows faction values
6. Verify gallery shows 20 ending slots

- [ ] **Step 3: Test faction ending reachability**

To quickly test a faction ending, use browser console to set faction values:
```js
// Get game instance from module scope
const state = JSON.parse(localStorage.getItem('sgwjl_save'));
state.hidden['魏'] = 85;
state.hidden['蜀'] = 20;
state.hidden['吴'] = 20;
state.attrs['智'] = 75;
localStorage.setItem('sgwjl_save', JSON.stringify(state));
// Reload and finish the game - should get 魏国重臣 ending
```

- [ ] **Step 4: Test backward compatibility**

1. Clear localStorage completely
2. Start a new game, play a few events
3. Manually edit localStorage to remove faction keys from hidden:
```js
const state = JSON.parse(localStorage.getItem('sgwjl_save'));
delete state.hidden['魏'];
delete state.hidden['蜀'];
delete state.hidden['吴'];
localStorage.setItem('sgwjl_save', JSON.stringify(state));
```
4. Reload the page — game should load without errors, faction values should default to 50

- [ ] **Step 5: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: integration fixes for historical figures and faction system"
```
