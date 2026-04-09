# Faction Storyline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add faction commitment at end of youth phase with fully divergent storylines for Shu/Wei/Wu across rise/war/final phases.

**Architecture:** After youth phase ends, player chooses a faction via a new full-screen UI. data-loader gains a `loadFactionData(faction)` method that fetches faction-specific JSON files on demand. game.js stores `state.faction` and uses it in `_pickPhaseEvents` to select from faction-specific event pools and character events.

**Tech Stack:** Vanilla JS (ES modules), static JSON data files, CSS, HTML

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `js/data-loader.js` | Modify | Add `loadFactionData(faction)` for on-demand loading |
| `js/game.js` | Modify | Add `state.faction`, `selectFaction()`, `loadFactionPhases()`, modify `_pickPhaseEvents()` |
| `js/ui.js` | Modify | Add `renderFactionChoice()` method |
| `js/main.js` | Modify | Wire faction selection between youth-end and rise-start |
| `index.html` | Modify | Add `screen-faction` div |
| `css/style.css` | Modify | Add faction choice screen styles |
| `data/events-rise-shu.json` | Create | Shu rise phase events (~15) |
| `data/events-rise-wei.json` | Create | Wei rise phase events (~15) |
| `data/events-rise-wu.json` | Create | Wu rise phase events (~15) |
| `data/events-war-shu.json` | Create | Shu war phase events (~18) |
| `data/events-war-wei.json` | Create | Wei war phase events (~18) |
| `data/events-war-wu.json` | Create | Wu war phase events (~18) |
| `data/events-final-shu.json` | Create | Shu final phase events (~13) |
| `data/events-final-wei.json` | Create | Wei final phase events (~13) |
| `data/events-final-wu.json` | Create | Wu final phase events (~13) |
| `data/events-character.json` | Modify | Expand rise/war/final entries to `{shu:{...}, wei:{...}, wu:{...}}` |

---

### Task 1: Add `loadFactionData()` to data-loader.js

**Files:**
- Modify: `js/data-loader.js`

- [ ] **Step 1: Add the `loadFactionData` export function**

Open `js/data-loader.js`. After the existing `loadAllData()` function (line 36), add:

```javascript
export async function loadFactionData(faction) {
  const phaseNames = ['rise', 'war', 'final'];
  const results = await Promise.all(
    phaseNames.map(phase => {
      const path = `data/events-${phase}-${faction}.json`;
      return fetch(path).then(r => {
        if (!r.ok) throw new Error(`Failed to load ${path}: ${r.status}`);
        return r.json();
      });
    })
  );
  return results; // [risePhase, warPhase, finalPhase]
}
```

- [ ] **Step 2: Verify no syntax errors**

Open `http://localhost:8080` in browser, open console. Confirm no module import errors.

- [ ] **Step 3: Commit**

```bash
git add js/data-loader.js
git commit -m "feat: add loadFactionData() for on-demand faction event loading"
```

---

### Task 2: Add faction state and methods to game.js

**Files:**
- Modify: `js/game.js`

- [ ] **Step 1: Add `faction` to initial state**

In `selectCharacter()` (line 77-91), add `faction: null` to the state object. Insert after `crisisEvent: null,` (line 90):

```javascript
      crisisEvent: null,
      faction: null,            // 'shu' | 'wei' | 'wu' | null
```

- [ ] **Step 2: Add backward compat in `load()`**

In `load()` (after line 388), add:

```javascript
      if (this.state.faction === undefined) this.state.faction = null;
```

- [ ] **Step 3: Add `selectFaction()` method**

After the `advancePhase()` method (line 331), add:

```javascript
  selectFaction(factionId) {
    if (!this.state) return;
    this.state.faction = factionId;

    // Big boost to chosen faction, small penalty to others
    const factionMap = { shu: '\u8700', wei: '\u9b4f', wu: '\u5434' };
    const allFactions = ['\u8700', '\u9b4f', '\u5434'];
    const chosen = factionMap[factionId];

    this.state.hidden[chosen] = Math.min(100, (this.state.hidden[chosen] || 50) + 20);
    for (const f of allFactions) {
      if (f !== chosen) {
        this.state.hidden[f] = Math.max(0, (this.state.hidden[f] || 50) - 5);
      }
    }

    // Set faction flag
    this.state.flags.push(`faction_${factionId}`);

    this.save();
  }
```

- [ ] **Step 4: Add `loadFactionPhases()` method**

After `selectFaction()`, add:

```javascript
  loadFactionPhases(factionPhases) {
    // factionPhases is [risePhase, warPhase, finalPhase] from loadFactionData()
    // Replace phases[1], [2], [3] with faction-specific data
    this.phases[1] = factionPhases[0];
    this.phases[2] = factionPhases[1];
    this.phases[3] = factionPhases[2];
  }
```

- [ ] **Step 5: Modify `_pickPhaseEvents()` for faction-aware character events**

In `_pickPhaseEvents()` (line 472-473), change the character event lookup:

```javascript
    // Get character-specific event for this phase
    const charId = this.state.characterId;
    const charEventData = this.characterEvents[charId]?.[phaseName];
    // For youth (phase 0), charEventData is the event directly.
    // For later phases, charEventData is {shu: event, wei: event, wu: event}.
    const charEvent = (phaseIndex === 0 || !this.state.faction)
      ? charEventData
      : charEventData?.[this.state.faction];
```

- [ ] **Step 6: Add faction transition text helper and detection methods**

After `getTransitionText()` (line 337), add:

```javascript
  getFactionTransition(factionId) {
    const texts = {
      shu: '\u4f60\u8ddf\u968f\u5218\u5907\uff0c\u8f97\u8f6c\u6d41\u79bb\uff0c\u867d\u5c61\u906d\u632b\u8d25\uff0c\u5374\u59cb\u7ec8\u4e0d\u5fd8\u5321\u6276\u6c49\u5ba4\u4e4b\u5fd7\u3002\u4e71\u4e16\u4e4b\u4e2d\uff0c\u4e49\u5b57\u5f53\u5148\u2026\u2026',
      wei: '\u4f60\u6295\u8eab\u66f9\u64cd\u9ebd\u4e0b\uff0c\u5357\u5f81\u5317\u6218\uff0c\u4ee5\u96f7\u9706\u624b\u6bb5\u8361\u5e73\u7fa4\u96c4\u3002\u8fd9\u662f\u4e00\u6761\u94c1\u8840\u94f8\u5c31\u7684\u9053\u8def\u2026\u2026',
      wu: '\u4f60\u8ffd\u968f\u5b59\u6c0f\uff0c\u624e\u6839\u6c5f\u4e1c\u3002\u957f\u6c5f\u5929\u5891\u4e4b\u540e\uff0c\u4e00\u7247\u65b0\u5929\u5730\u6b63\u7b49\u5f85\u4f60\u53bb\u5f00\u62d3\u2026\u2026',
    };
    return texts[factionId] || '';
  }

  needsFactionChoice() {
    return this.state && this.state.phaseIndex === 0 && !this.state.faction;
  }

  needsRetroactiveFactionChoice() {
    return this.state && this.state.phaseIndex > 0 && !this.state.faction;
  }
```

- [ ] **Step 7: Commit**

```bash
git add js/game.js
git commit -m "feat: add faction state, selectFaction(), loadFactionPhases() to game engine"
```

---

### Task 3: Add faction choice screen to HTML and CSS

**Files:**
- Modify: `index.html`
- Modify: `css/style.css`

- [ ] **Step 1: Add screen-faction div to index.html**

After `screen-transition` closing div (line 101) and before `</div>` closing #app (line 102), insert:

```html
    <div id="screen-faction" class="screen">
      <div class="faction-content">
        <h2 class="faction-title">\u4e71\u4e16\u5c06\u81f3</h2>
        <p class="faction-subtitle">\u4f60\u5fc5\u987b\u9009\u62e9\u6548\u5fe0\u7684\u4e3b\u516c</p>
        <div id="faction-cards" class="faction-cards"></div>
      </div>
    </div>
```

- [ ] **Step 2: Add CSS for faction choice screen**

At the end of `css/style.css`, add:

```css
/* === Faction Choice Screen === */
.faction-content {
  padding: 30px 15px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100%;
}
.faction-title {
  color: var(--gold);
  font-size: 22px;
  margin-bottom: 6px;
}
.faction-subtitle {
  color: var(--text-secondary);
  font-size: 14px;
  margin-bottom: 24px;
}
.faction-cards {
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 100%;
}
.faction-card {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 18px 16px;
  background: var(--bg-mid);
  cursor: pointer;
  transition: border-color 0.2s, transform 0.15s;
}
.faction-card:active {
  border-color: var(--gold);
  transform: scale(0.98);
}
.faction-card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.faction-card-icon { font-size: 28px; }
.faction-card-name {
  font-size: 18px;
  font-weight: bold;
  color: var(--gold);
}
.faction-card-leader {
  font-size: 13px;
  color: var(--text-secondary);
  margin-left: auto;
}
.faction-card-motto {
  font-size: 13px;
  color: var(--text-primary);
  margin-bottom: 8px;
  font-style: italic;
}
.faction-card-preview {
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.6;
}
```

- [ ] **Step 3: Commit**

```bash
git add index.html css/style.css
git commit -m "feat: add faction choice screen HTML structure and styles"
```

---

### Task 4: Add `renderFactionChoice()` to ui.js

**Files:**
- Modify: `js/ui.js`

- [ ] **Step 1: Register the new screen in the constructor**

In the constructor (line 39-48), add `faction` to `this.screens`. Change line 47 from:

```javascript
      transition: document.getElementById('screen-transition'),
    };
```

to:

```javascript
      transition: document.getElementById('screen-transition'),
      faction: document.getElementById('screen-faction'),
    };
```

- [ ] **Step 2: Add `renderFactionChoice()` method**

After `renderTransition()` (line 278), add:

```javascript
  // --- Faction Choice Screen ---

  renderFactionChoice() {
    const factions = [
      {
        id: 'shu',
        icon: '\ud83d\udee1\ufe0f',
        name: '\u8700',
        leader: '\u5218\u5907',
        motto: '\u6843\u56ed\u7ed3\u4e49\uff0c\u5171\u6276\u6c49\u5ba4',
        preview: '\u5171\u7834\u9ec4\u5dfe \u2192 \u6d41\u79bb\u65b0\u91ce \u2192 \u5165\u5ddd\u5efa\u4e1a \u2192 \u5317\u4f10\u4e2d\u539f',
      },
      {
        id: 'wei',
        icon: '\u2694\ufe0f',
        name: '\u9b4f',
        leader: '\u66f9\u64cd',
        motto: '\u5171\u4e3e\u4e49\u5175\uff0c\u5e73\u5b9a\u4e71\u4e16',
        preview: '\u9752\u5dde\u5e73\u4e71 \u2192 \u5b98\u6e21\u5927\u6218 \u2192 \u5f81\u4f10\u56db\u65b9 \u2192 \u66f9\u9b4f\u7acb\u56fd',
      },
      {
        id: 'wu',
        icon: '\u26f5',
        name: '\u5434',
        leader: '\u5b59\u575a',
        motto: '\u636e\u6c5f\u4e1c\u4e4b\u5730\uff0c\u6210\u4e0d\u4e16\u4e4b\u529f',
        preview: '\u5e73\u5b9a\u5c71\u8d8a \u2192 \u8d64\u58c1\u6297\u66f9 \u2192 \u593a\u53d6\u8346\u5dde \u2192 \u4e1c\u5434\u9738\u4e1a',
      },
    ];

    const container = document.getElementById('faction-cards');
    container.innerHTML = '';

    for (const f of factions) {
      const card = document.createElement('div');
      card.className = 'faction-card';
      card.innerHTML = `
        <div class="faction-card-header">
          <span class="faction-card-icon">${f.icon}</span>
          <span class="faction-card-name">${f.name}</span>
          <span class="faction-card-leader">\u2014 ${f.leader}</span>
        </div>
        <p class="faction-card-motto">\u201c${f.motto}\u201d</p>
        <p class="faction-card-preview">\ud83d\udcdc ${f.preview}</p>
      `;
      card.onclick = () => this.callbacks.onFactionSelected?.(f.id);
      container.appendChild(card);
    }

    this.showScreen('faction');
  }
```

- [ ] **Step 3: Commit**

```bash
git add js/ui.js
git commit -m "feat: add renderFactionChoice() to UI with three faction cards"
```

---

### Task 5: Wire faction selection flow in main.js

**Files:**
- Modify: `js/main.js`

- [ ] **Step 1: Add `loadFactionData` import**

At line 3, change:

```javascript
import { loadAllData } from './data-loader.js';
```

to:

```javascript
import { loadAllData, loadFactionData } from './data-loader.js';
```

- [ ] **Step 2: Modify `handlePhaseEnd()` to insert faction choice**

Replace the `handlePhaseEnd` function (lines 54-76) with:

```javascript
  async function handlePhaseEnd() {
    if (game.isGameComplete()) {
      const ending = game.checkEnding();
      lastScreen = 'ending';
      ui.renderEnding(ending, game.state.characterName, game.state.attrs, game.state.hidden);
      return;
    }

    // Check for crisis before advancing to next phase
    const crisisEvent = game.checkCrisis();
    if (crisisEvent) {
      game.enterCrisis(crisisEvent);
      showCurrentEvent();
      return;
    }

    // After youth phase (index 0), show faction choice before advancing
    if (game.needsFactionChoice()) {
      ui.renderFactionChoice();
      return;
    }

    const transitionText = game.advancePhase();
    if (transitionText) {
      const phaseName = PHASE_IMAGE_NAMES[game.state.phaseIndex];
      await ui.renderTransition(transitionText, phaseName);
    }
    showCurrentEvent();
  }
```

- [ ] **Step 3: Add `onFactionSelected` callback**

After the `onSelectCharacter` callback (line 100), add:

```javascript
  ui.on('onFactionSelected', async (factionId) => {
    game.selectFaction(factionId);

    // Load faction-specific event data
    const factionPhases = await loadFactionData(factionId);
    game.loadFactionPhases(factionPhases);

    // Show faction transition text, then advance to rise phase
    const transitionText = game.getFactionTransition(factionId);
    game.advancePhase();
    const phaseName = PHASE_IMAGE_NAMES[game.state.phaseIndex];
    await ui.renderTransition(transitionText, phaseName);

    showCurrentEvent();
  });
```

- [ ] **Step 4: Handle saved games that need faction data reload**

In the startup section (lines 146-152), replace the saved game check with:

```javascript
  // Check for saved game
  if (game.getPlayerName() && game.load()) {
    if (game.needsRetroactiveFactionChoice()) {
      // Old save without faction - force selection
      ui.renderFactionChoice();
    } else if (game.state.faction && game.state.phaseIndex > 0) {
      // Has faction - reload faction data before resuming
      const factionPhases = await loadFactionData(game.state.faction);
      game.loadFactionPhases(factionPhases);
      showCurrentEvent();
    } else {
      showCurrentEvent();
    }
  } else {
    showTitle();
  }
```

- [ ] **Step 5: Commit**

```bash
git add js/main.js
git commit -m "feat: wire faction selection flow between youth and rise phases"
```

---

### Task 6: Create placeholder faction event files for testing

**Files:**
- Create: `data/events-rise-shu.json`, `data/events-rise-wei.json`, `data/events-rise-wu.json`
- Create: `data/events-war-shu.json`, `data/events-war-wei.json`, `data/events-war-wu.json`
- Create: `data/events-final-shu.json`, `data/events-final-wei.json`, `data/events-final-wu.json`

- [ ] **Step 1: Create 9 placeholder JSON files with 2-3 events each**

Each file follows existing phase JSON format: `{ "phase": "崛起期", "pickCount": 6, "transition": "...", "events": [...] }`.

Use pickCount values: rise=6, war=6, final=3. Each placeholder event uses standard schema: `id`, `year`, `title`, `description`, `conditions: {}`, `choices` array with 2 options each having `text`, `effects`, `hidden_effects`, `result`.

Event IDs follow pattern: `rise_shu_01`, `war_wei_02`, `final_wu_03`.

- [ ] **Step 2: Manual test — full pipeline verification**

1. Start game at `http://localhost:8080`
2. Enter name, select character, play through all 5 youth events
3. Verify faction choice screen appears after youth phase ends
4. Pick a faction, verify transition text shows
5. Verify rise events from the correct faction file appear
6. Play through all phases to ending

- [ ] **Step 3: Commit**

```bash
git add data/events-rise-*.json data/events-war-*.json data/events-final-*.json
git commit -m "feat: add placeholder faction event files for all 9 faction-phase combos"
```

---

### Task 7: Update character events for faction branching

**Files:**
- Modify: `data/events-character.json`

- [ ] **Step 1: Restructure rise/war/final entries to faction branches**

For each of the 6 characters, change `rise`, `war`, and `final` entries from flat event objects to `{ "shu": event, "wei": event, "wu": event }` objects. Keep `youth` entries unchanged.

Place existing event under natural faction (farmer→shu, scholar→shu, soldier→wei, wanderer→wu, merchant→wei, craftsman→wu). Create placeholder events for the other two factions per character per phase.

- [ ] **Step 2: Manual test — verify character events load per faction**

Play through youth → pick faction. In rise phase, verify first event is the correct character+faction variant. Try different factions and verify different character events appear.

- [ ] **Step 3: Commit**

```bash
git add data/events-character.json
git commit -m "feat: restructure character events with faction variants for rise/war/final"
```

---

### Task 8: Write full Shu storyline events

**Files:**
- Modify: `data/events-rise-shu.json` (replace placeholders with ~15 events)
- Modify: `data/events-war-shu.json` (replace placeholders with ~18 events)
- Modify: `data/events-final-shu.json` (replace placeholders with ~13 events)

- [ ] **Step 1: Write Shu rise events (~15)**

Story arc: 共破黄巾 → 辗转流离 → 依附刘表 → 新野练兵 → 三顾茅庐 → 联吴抗曹.

Reuse existing Shu-related events from `events-rise.json` where applicable. Write new events following existing JSON schema. Include `set_flags` and `hidden_conditions` for narrative depth.

- [ ] **Step 2: Write Shu war events (~18)**

Story arc: 赤壁之战(蜀视角) → 入川之战 → 汉中之战 → 定军山 → 关羽失荆州 → 夷陵之败.

- [ ] **Step 3: Write Shu final events (~13)**

Story arc: 白帝托孤 → 诸葛治蜀 → 北伐中原 → 五丈原.

- [ ] **Step 4: Manual test full Shu playthrough**

- [ ] **Step 5: Commit**

```bash
git add data/events-rise-shu.json data/events-war-shu.json data/events-final-shu.json
git commit -m "content: write full Shu storyline events for rise/war/final phases"
```

---

### Task 9: Write full Wei storyline events

**Files:**
- Modify: `data/events-rise-wei.json`, `data/events-war-wei.json`, `data/events-final-wei.json`

- [ ] **Step 1: Write Wei rise events (~15)**

Story arc: 青州平乱 → 挟天子令诸侯 → 官渡之战 → 征乌桓 → 南下荆州 → 收降荆州.

- [ ] **Step 2: Write Wei war events (~18)**

Story arc: 赤壁之败(魏视角) → 合肥防守 → 汉中争夺 → 逍遥津 → 曹丕代汉 → 南征北战.

- [ ] **Step 3: Write Wei final events (~13)**

Story arc: 魏国内政 → 司马崛起 → 高平陵之变 → 天下归晋.

- [ ] **Step 4: Manual test full Wei playthrough**

- [ ] **Step 5: Commit**

```bash
git add data/events-rise-wei.json data/events-war-wei.json data/events-final-wei.json
git commit -m "content: write full Wei storyline events for rise/war/final phases"
```

---

### Task 10: Write full Wu storyline events

**Files:**
- Modify: `data/events-rise-wu.json`, `data/events-war-wu.json`, `data/events-final-wu.json`

- [ ] **Step 1: Write Wu rise events (~15)**

Story arc: 平定山越 → 建设江东 → 世家整合 → 周瑜献策 → 赤壁备战 → 赤壁大战.

- [ ] **Step 2: Write Wu war events (~18)**

Story arc: 荆州之争 → 逍遥津(吴视角) → 白衣渡江 → 夷陵之战(吴视角) → 石亭之战 → 建国称帝.

- [ ] **Step 3: Write Wu final events (~13)**

Story arc: 东吴内政 → 世家纷争 → 诸葛恪北伐 → 东吴兴衰.

- [ ] **Step 4: Manual test full Wu playthrough**

- [ ] **Step 5: Commit**

```bash
git add data/events-rise-wu.json data/events-war-wu.json data/events-final-wu.json
git commit -m "content: write full Wu storyline events for rise/war/final phases"
```

---

### Task 11: Write full faction-specific character events

**Files:**
- Modify: `data/events-character.json`

- [ ] **Step 1: Replace all placeholder character events with full content**

54 total events (6 characters × 3 post-youth phases × 3 factions). Each event reflects character background in faction context with 2-3 choices, appropriate effects/hidden_effects, and optional flag-gated bonus choices.

Design guidelines:
- Natural faction events (farmer in shu, soldier in wei, etc.) should feel most fitting
- Cross-faction events should create interesting fish-out-of-water narratives
- Preserve existing flag chains where applicable (e.g., `farmer_led_villagers`)

- [ ] **Step 2: Manual test — spot check several character+faction combos**

- [ ] **Step 3: Commit**

```bash
git add data/events-character.json
git commit -m "content: write all 54 faction-specific character events"
```

---

### Task 12: Balance tuning and polish

**Files:**
- Possibly modify: all event JSON files, `js/game.js`

- [ ] **Step 1: Verify faction endings are achievable per faction line**

Play through each faction and verify:
- Shu line can reach `shu_guardian` ending (蜀≥60, 德≥55, 忠义≥50, 魏≤50)
- Wei line can reach `wei_minister` ending (魏≥60, 智≥55, 蜀≤50, 吴≤50)
- Wu line can reach `wu_admiral` ending (吴≥55, 智≥50, 武≥45, 魏≤55, 蜀≤55)

- [ ] **Step 2: Verify save/load works with faction**

1. Save mid-game after faction choice → close → reopen → verify resume works with correct faction data loaded
2. Test old save without faction → verify faction choice screen appears
3. Test new game → verify full flow works end to end

- [ ] **Step 3: Commit any balance tweaks**

```bash
git add -A
git commit -m "fix: balance tuning for faction storyline system"
```
