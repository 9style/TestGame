# Faction Transition Narrative Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static faction selection menu with a narrative "诸侯散盟" event that makes the youth-to-faction transition feel natural, and add a semi-locking mechanism where youth choices can lock certain factions.

**Architecture:** A new JSON data file holds the crossroads event template. `game.js` builds the dynamic event at runtime (personalized description + locked choices based on faction affinity). `main.js` orchestrates: show transition text → show crossroads event → on choice, trigger faction loading. The old static faction selection screen (`renderFactionChoice()`, `screen-faction` DOM) is removed.

**Tech Stack:** Vanilla JS ES modules, static JSON data, CSS

**Spec:** `docs/superpowers/specs/2026-04-09-faction-transition-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `data/event-crossroads.json` | Create | Crossroads event template (static text, hooks, choices with lock thresholds) |
| `js/data-loader.js` | Modify | Load crossroads event and pass it in returned data object |
| `js/game.js` | Modify | `getCrossroadsEvent()`, `applyCrossroadsChoice()`, `getAffinityBonus()` + constructor change |
| `js/main.js` | Modify | Flow: transition → crossroads event → faction loading. Remove old `onFactionSelected` |
| `js/ui.js` | Modify | Locked choice rendering in `renderEvent()`. Remove `renderFactionChoice()` |
| `css/style.css` | Modify | Add locked choice styles. Remove old `.faction-*` styles |
| `index.html` | Modify | Remove `screen-faction` DOM block |

---

### Task 1: Create crossroads event data file

**Files:**
- Create: `data/event-crossroads.json`

- [ ] **Step 1: Create the event data file**

```json
{
  "id": "crossroads",
  "year": 191,
  "title": "诸侯散盟",
  "description_base": "讨伐董卓的联盟终于走到了尽头。各路诸侯表面共讨逆贼，实则各怀鬼胎。盟主袁绍按兵不动，孙坚独自攻入洛阳，曹操追击董卓却遭伏击惨败……\n\n联盟大营中，争吵声此起彼伏。你站在营帐外，看着一支支军队拔营而去——天下，即将陷入真正的大乱。",
  "description_hooks": {
    "befriend_guanyu": "远处，刘备的小队正在收拾行装。关羽看见你，微微颔首——桃园之约，犹在耳畔。",
    "high_wei": "曹操的亲信悄悄递来一封信：'主公说，此间事了，愿与足下共图大业。'",
    "high_wu": "孙坚的战旗已经指向南方。他曾拍着你的肩膀说：'江东有你一席之地。'",
    "default": "三面旗帜，三条路。没有人等你，但每条路都向你敞开。"
  },
  "description_tail": "\n\n风云变幻，你必须做出选择。",
  "choices": [
    {
      "faction": "shu",
      "text": "追随刘备南下——大丈夫当以仁义立世",
      "result": "你翻身上马，向刘备的旗帜奔去。关羽远远地看见了你，微微一笑。张飞则大声吆喝：'好！又多一位兄弟！'从此，你的命运与这支仁义之师紧紧相连。",
      "lock_threshold": 40,
      "lock_reason": "刘备虽仁德待人，但你与他素无交集，他的队伍已经出发，没有人认识你。"
    },
    {
      "faction": "wei",
      "text": "投奔曹操东归——唯有铁腕方能平乱",
      "result": "你拨马东行，曹操的军营就在前方。一名校尉将你引入中帐，曹操抬头看了你一眼，放下手中兵书：'乱世用人，不拘一格。你来了，正好。'",
      "lock_threshold": 40,
      "lock_reason": "你曾向董卓告发曹操的行踪，此仇不共戴天。曹营的大门，已对你永远关闭。"
    },
    {
      "faction": "wu",
      "text": "随孙坚渡江南下——江东天险，大有可为",
      "result": "你加入了南下的队伍。孙坚骑在马上，望着滔滔江水说：'过了这条江，就是我们的天下。'长江天堑之后，一片新天地等待着你。",
      "lock_threshold": 40,
      "lock_reason": "你与江东毫无渊源，孙坚的部将不会接纳一个陌生人。"
    }
  ]
}
```

- [ ] **Step 2: Verify JSON is valid**

Run: `python -c "import json; json.load(open('data/event-crossroads.json', encoding='utf-8')); print('OK')"`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add data/event-crossroads.json
git commit -m "feat: add crossroads event data template"
```

---

### Task 2: Load crossroads event in data-loader

**Files:**
- Modify: `js/data-loader.js:3-11` (DATA_FILES) and `js/data-loader.js:29-35` (return object)

- [ ] **Step 1: Add crossroads to DATA_FILES**

In `js/data-loader.js`, add `'event-crossroads'` to the `DATA_FILES` object (line 11, before the closing brace):

```javascript
const DATA_FILES = {
  characters: 'data/characters.json',
  endings: 'data/endings.json',
  'events-youth': 'data/events-youth.json',
  'events-rise': 'data/events-rise.json',
  'events-war': 'data/events-war.json',
  'events-final': 'data/events-final.json',
  'events-character': 'data/events-character.json',
  'events-crisis': 'data/events-crisis.json',
  'event-crossroads': 'data/event-crossroads.json',
};
```

- [ ] **Step 2: Add crossroadsEvent to return object**

In the `loadAllData()` return object (around line 29-35), add `crossroadsEvent`:

```javascript
  return {
    characters: dataMap.characters,
    endings: dataMap.endings.endings,
    phases: PHASE_KEYS.map(key => dataMap[key]),
    characterEvents: dataMap['events-character'],
    crisisEvents: dataMap['events-crisis'],
    crossroadsEvent: dataMap['event-crossroads'],
  };
```

- [ ] **Step 3: Verify by starting dev server and checking browser console**

Run: `python -m http.server 8080`
Open browser, check no load errors in console. The game should still work normally (crossroads data is loaded but not yet used).

- [ ] **Step 4: Commit**

```bash
git add js/data-loader.js
git commit -m "feat: load crossroads event data in data-loader"
```

---

### Task 3: Add crossroads methods to game.js

**Files:**
- Modify: `js/game.js:5-13` (constructor)
- Modify: `js/game.js` (add 3 new methods after `needsRetroactiveFactionChoice()` around line 379)

- [ ] **Step 1: Store crossroadsEvent in constructor**

In the `Game` constructor (line 5-13 of `js/game.js`), add `this.crossroadsEvent` after the `this.crisisEvents` line:

```javascript
  constructor(data) {
    this.characters = data.characters;
    this.endings = data.endings;
    this.phases = data.phases;
    this.characterEvents = data.characterEvents || {};
    this.crisisEvents = data.crisisEvents || [];
    this.crossroadsEvent = data.crossroadsEvent || null;
    this.state = null;
    this.playerName = null;
  }
```

- [ ] **Step 2: Add `getCrossroadsEvent()` method**

Add this method after `needsRetroactiveFactionChoice()` (after line 379):

```javascript
  getCrossroadsEvent() {
    if (!this.crossroadsEvent) return null;
    const template = this.crossroadsEvent;
    const flags = this.state.flags;
    const hidden = this.state.hidden;

    // Build dynamic description
    let description = template.description_base + '\n\n';

    // Collect matching hooks
    const hooks = [];
    if (flags.includes('befriend_guanyu') && template.description_hooks.befriend_guanyu) {
      hooks.push(template.description_hooks.befriend_guanyu);
    }
    if ((hidden['魏'] || 50) >= 55 && template.description_hooks.high_wei) {
      hooks.push(template.description_hooks.high_wei);
    }
    if ((hidden['吴'] || 50) >= 55 && template.description_hooks.high_wu) {
      hooks.push(template.description_hooks.high_wu);
    }

    if (hooks.length > 0) {
      description += hooks.join('\n\n');
    } else {
      description += template.description_hooks.default || '';
    }

    description += template.description_tail || '';

    // Build choices with lock status
    const choices = template.choices.map(c => {
      const factionMap = { shu: '蜀', wei: '魏', wu: '吴' };
      const affinityValue = hidden[factionMap[c.faction]] || 50;
      const locked = affinityValue < (c.lock_threshold || 0);
      return {
        text: c.text,
        result: c.result,
        faction: c.faction,
        locked,
        lock_reason: locked ? c.lock_reason : null,
      };
    });

    // Safety valve: ensure at least 2 unlocked choices
    const unlockedCount = choices.filter(c => !c.locked).length;
    if (unlockedCount < 2) {
      // Force-unlock the locked choice with highest affinity
      const lockedChoices = choices.filter(c => c.locked);
      const factionMap = { shu: '蜀', wei: '魏', wu: '吴' };
      lockedChoices.sort((a, b) =>
        (hidden[factionMap[b.faction]] || 50) - (hidden[factionMap[a.faction]] || 50)
      );
      if (lockedChoices.length > 0) {
        const toUnlock = lockedChoices[0];
        toUnlock.locked = false;
        toUnlock.lock_reason = null;
        toUnlock.text += '（虽缘分浅薄，但尚可一试）';
      }
    }

    return {
      id: template.id,
      year: template.year,
      title: template.title,
      description,
      choices,
      isCrossroads: true,
    };
  }
```

- [ ] **Step 3: Add `applyCrossroadsChoice(choiceIndex)` method**

Add this method right after `getCrossroadsEvent()`:

```javascript
  applyCrossroadsChoice(choiceIndex) {
    const event = this.getCrossroadsEvent();
    if (!event) throw new Error('No crossroads event available');

    const unlocked = event.choices.filter(c => !c.locked);
    const choice = unlocked[choiceIndex];
    if (!choice) throw new Error(`Invalid crossroads choice index: ${choiceIndex}`);

    const factionId = choice.faction;

    // Apply affinity bonus if this is the player's highest-affinity faction
    const bonus = this.getAffinityBonus(factionId);

    // Select faction (existing method: sets state.faction, adjusts hidden attrs, adds flag)
    this.selectFaction(factionId);

    // Apply affinity bonus after selectFaction
    if (bonus.hasBonus) {
      const factionMap = { shu: '蜀', wei: '魏', wu: '吴' };
      this.state.hidden[factionMap[factionId]] = this._clamp(
        this.state.hidden[factionMap[factionId]] + 3
      );
    }

    this.state.history.push(`crossroads:${factionId}`);
    this.save();

    let resultText = choice.result;
    if (bonus.hasBonus) {
      resultText += '\n\n' + bonus.bonusText;
    }

    return {
      result: resultText,
      effects: {},
      factionSelected: factionId,
    };
  }
```

- [ ] **Step 4: Add `getAffinityBonus(factionId)` method**

Add this method right after `applyCrossroadsChoice()`:

```javascript
  getAffinityBonus(factionId) {
    const factionMap = { shu: '蜀', wei: '魏', wu: '吴' };
    const chosen = factionMap[factionId];
    const chosenValue = this.state.hidden[chosen] || 50;

    // Check if chosen faction has the highest (or tied highest) affinity
    const allValues = Object.entries(factionMap).map(([, name]) => this.state.hidden[name] || 50);
    const maxValue = Math.max(...allValues);

    if (chosenValue >= maxValue && chosenValue > 50) {
      return {
        hasBonus: true,
        bonusText: '你与此间众人一见如故，如鱼得水。',
      };
    }
    return { hasBonus: false, bonusText: '' };
  }
```

- [ ] **Step 5: Commit**

```bash
git add js/game.js
git commit -m "feat: add crossroads event generation and faction choice logic"
```

---

### Task 4: Add locked choice rendering to UI

**Files:**
- Modify: `js/ui.js:188-202` (choice rendering loop in `renderEvent()`)

- [ ] **Step 1: Update the choice rendering loop**

In `js/ui.js`, replace the `event.choices.forEach(...)` block (lines 188-202) with this updated version that handles locked choices:

```javascript
    // Filter to only unlocked choices for click indexing (crossroads)
    const unlockedChoices = event.isCrossroads
      ? event.choices.filter(c => !c.locked)
      : event.choices;

    event.choices.forEach((choice, _originalIndex) => {
      const btn = document.createElement('button');

      // Handle locked choices (crossroads event)
      if (choice.locked) {
        btn.className = 'choice-btn choice-locked';
        btn.innerHTML = `
          <div class="choice-text">🔒 ${choice.text}</div>
          <div class="choice-lock-reason">${choice.lock_reason}</div>
        `;
        btn.disabled = true;
        container.appendChild(btn);
        return;
      }

      // Normal choice rendering
      const isDanger = choice.crisis_trigger || choice.crisis_check;
      btn.className = `choice-btn${isDanger ? ' choice-danger' : ''}`;

      btn.innerHTML = `
        <div class="choice-text">${choice.text}${isDanger ? ' <span class="choice-danger-tag">⚠️ 危险</span>' : ''}</div>
      `;

      // For crossroads, use unlocked index; for normal events, use filtered visible index
      const clickIndex = event.isCrossroads
        ? unlockedChoices.indexOf(choice)
        : Array.from(container.children).filter(c => !c.disabled).length;

      btn.onclick = () => {
        this.callbacks.onChoice?.(clickIndex);
      };
      container.appendChild(btn);
    });
```

Wait — the original code uses `index` from `forEach` and the `onChoice` callback in `main.js` passes that index to `game.applyChoice()`. For crossroads events, we need to pass the index among **unlocked** choices only (since `applyCrossroadsChoice` filters to unlocked). Let me simplify:

Actually, the cleaner approach: track the unlocked index with a counter variable:

```javascript
    let unlockedIndex = 0;

    event.choices.forEach((choice) => {
      const btn = document.createElement('button');

      // Handle locked choices (crossroads event)
      if (choice.locked) {
        btn.className = 'choice-btn choice-locked';
        btn.innerHTML = `
          <div class="choice-text">🔒 ${choice.text}</div>
          <div class="choice-lock-reason">${choice.lock_reason}</div>
        `;
        btn.disabled = true;
        container.appendChild(btn);
        return;
      }

      // Normal choice rendering
      const isDanger = choice.crisis_trigger || choice.crisis_check;
      btn.className = `choice-btn${isDanger ? ' choice-danger' : ''}`;
      btn.innerHTML = `
        <div class="choice-text">${choice.text}${isDanger ? ' <span class="choice-danger-tag">⚠️ 危险</span>' : ''}</div>
      `;

      const idx = unlockedIndex;
      unlockedIndex++;
      btn.onclick = () => {
        this.callbacks.onChoice?.(idx);
      };
      container.appendChild(btn);
    });
```

This works for both crossroads (locked choices skipped in index) and normal events (no locked choices, so index matches original behavior).

- [ ] **Step 2: Commit**

```bash
git add js/ui.js
git commit -m "feat: render locked choices in event screen"
```

---

### Task 5: Add locked choice CSS styles

**Files:**
- Modify: `css/style.css` (add after `.choice-danger-tag` block around line 256)

- [ ] **Step 1: Add locked choice styles**

Add these styles after the `.choice-danger-tag` rule (after line 256 of `css/style.css`):

```css
/* === Locked Choices === */
.choice-btn.choice-locked {
  opacity: 0.4;
  cursor: not-allowed;
  border-color: var(--text-dim);
  background: var(--bg-dark);
}
.choice-btn.choice-locked:active {
  border-color: var(--text-dim);
}
.choice-lock-reason {
  font-size: 11px;
  color: var(--text-muted);
  font-style: italic;
  margin-top: 4px;
  line-height: 1.6;
}
```

- [ ] **Step 2: Commit**

```bash
git add css/style.css
git commit -m "feat: add locked choice CSS styles"
```

---

### Task 6: Rewire main.js flow for crossroads event

**Files:**
- Modify: `js/main.js:54-82` (handlePhaseEnd)
- Modify: `js/main.js:108-128` (onFactionSelected callback — remove)
- Modify: `js/main.js:130-135` (onChoice callback — add crossroads handling)
- Modify: `js/main.js:171-187` (initialization — retroactive faction choice)

This is the core wiring task. The crossroads event is shown as a regular event via `renderEvent()`, and the choice callback detects `factionSelected` to trigger faction data loading.

- [ ] **Step 1: Modify `handlePhaseEnd()` to show transition then crossroads event**

Replace the `handlePhaseEnd()` function (lines 54-82 of `js/main.js`) with:

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

    // After youth phase (index 0), show transition then crossroads event
    if (game.needsFactionChoice()) {
      const transitionText = game.getTransitionText();
      if (transitionText) {
        await ui.renderTransition(transitionText, 'youth');
      }
      showCrossroadsEvent();
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

- [ ] **Step 2: Add `showCrossroadsEvent()` helper function**

Add this function right after `handlePhaseEnd()` (before `showGallery()`):

```javascript
  function showCrossroadsEvent() {
    const event = game.getCrossroadsEvent();
    if (!event) {
      // Fallback: skip crossroads if data missing, advance normally
      handlePhaseEnd();
      return;
    }
    ui.renderEvent(
      event,
      '📍 少年期 · 抉择',
      game.state.characterName,
      game.state.attrs,
      game.state.hidden
    );
  }
```

- [ ] **Step 3: Modify `onChoice` callback to handle crossroads**

Replace the `onChoice` callback (lines 130-135 of `js/main.js`) with:

```javascript
  ui.on('onChoice', async (choiceIndex) => {
    // Handle crossroads event choice (faction selection)
    if (game.needsFactionChoice()) {
      // Guard against double-click during async load
      if (game.state.faction) return;

      try {
        const result = game.applyCrossroadsChoice(choiceIndex);
        const factionId = result.factionSelected;

        // Load faction data
        const factionPhases = await loadFactionData(factionId);
        game.loadFactionPhases(factionPhases);

        // Show result text first
        ui.renderResult(result.result, result.effects);

        // After continue, show faction transition then advance
      } catch (err) {
        console.error('Failed to load faction data:', err);
      }
      return;
    }

    // Normal event choice
    const result = game.applyChoice(choiceIndex);
    ui.renderResult(result.result, result.effects, result.isDeath, result.crisisResolved);
  });
```

- [ ] **Step 4: Modify `onContinue` callback to handle post-crossroads flow**

Replace the `onContinue` callback (lines 137-155 of `js/main.js`) with:

```javascript
  ui.on('onContinue', async () => {
    // Check if player just died
    if (game.isDead()) {
      showDeathEnding(game.state.deathEnding);
      return;
    }

    // After crossroads choice: faction is set but phase not yet advanced
    if (game.state.faction && game.state.phaseIndex === 0 && game.isPhaseComplete()) {
      const transitionText = game.getFactionTransition(game.state.faction);
      game.advancePhase();
      const phaseName = PHASE_IMAGE_NAMES[game.state.phaseIndex];
      await ui.renderTransition(transitionText, phaseName);
      showCurrentEvent();
      return;
    }

    // Normal flow
    if (game.isPhaseComplete()) {
      handlePhaseEnd();
    } else if (game.state.inCrisis) {
      showCurrentEvent();
    } else {
      showCurrentEvent();
    }
  });
```

- [ ] **Step 5: Remove the old `onFactionSelected` callback**

Delete the entire `ui.on('onFactionSelected', ...)` block (lines 108-128 of `js/main.js`). It is no longer needed — faction selection is now handled inside `onChoice`.

- [ ] **Step 6: Update initialization for retroactive faction choice**

Replace the initialization section (lines 171-187 of `js/main.js`) with:

```javascript
  // --- Initialize ---

  // Load player name first
  game.loadPlayerName();

  // Check for saved game
  if (game.getPlayerName() && game.load()) {
    if (game.needsRetroactiveFactionChoice()) {
      // Old save without faction — show crossroads event
      showCrossroadsEvent();
    } else if (game.state.faction && game.state.phaseIndex > 0) {
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

- [ ] **Step 7: Commit**

```bash
git add js/main.js
git commit -m "feat: rewire game flow to use crossroads narrative event"
```

---

### Task 7: Remove old faction selection UI and cleanup

**Files:**
- Modify: `js/ui.js:48` (remove faction screen reference)
- Modify: `js/ui.js:283-331` (remove `renderFactionChoice()` method)
- Modify: `index.html:103-109` (remove `screen-faction` DOM)
- Modify: `css/style.css:615-678` (remove old faction styles)

- [ ] **Step 1: Remove faction from screens dict in ui.js**

In `js/ui.js` line 48, remove the `faction` entry from `this.screens`:

```javascript
    this.screens = {
      title: document.getElementById('screen-title'),
      intro: document.getElementById('screen-intro'),
      select: document.getElementById('screen-select'),
      event: document.getElementById('screen-event'),
      result: document.getElementById('screen-result'),
      ending: document.getElementById('screen-ending'),
      gallery: document.getElementById('screen-gallery'),
      transition: document.getElementById('screen-transition'),
    };
```

- [ ] **Step 2: Remove `renderFactionChoice()` method from ui.js**

Delete the entire `renderFactionChoice()` method (lines 283-331 of `js/ui.js`), including the comment `// --- Faction Choice Screen ---` above it.

- [ ] **Step 3: Remove `screen-faction` DOM from index.html**

Delete lines 103-109 of `index.html`:

```html
    <div id="screen-faction" class="screen">
      <div class="faction-content">
        <h2 class="faction-title">乱世将至</h2>
        <p class="faction-subtitle">你必须选择效忠的主公</p>
        <div id="faction-cards" class="faction-cards"></div>
      </div>
    </div>
```

- [ ] **Step 4: Remove old faction CSS styles**

Delete the `/* === Faction Choice Screen === */` section from `css/style.css` (lines 615-678), which includes all `.faction-content`, `.faction-title`, `.faction-subtitle`, `.faction-cards`, `.faction-card`, `.faction-card-header`, `.faction-card-icon`, `.faction-card-name`, `.faction-card-leader`, `.faction-card-motto`, and `.faction-card-preview` rules.

- [ ] **Step 5: Commit**

```bash
git add js/ui.js index.html css/style.css
git commit -m "refactor: remove old static faction selection screen"
```

---

### Task 8: Manual end-to-end testing

**Files:** None (testing only)

- [ ] **Step 1: Test normal flow — youth → crossroads → faction**

1. Start dev server: `python -m http.server 8080`
2. Open browser to `http://localhost:8080`
3. Enter a nickname, start a new game
4. Select any character
5. Play through all 5 youth events
6. **Verify:** After the last youth event result, clicking "继续" shows the transition screen ("少年时光转瞬即逝……")
7. **Verify:** After the transition, the "诸侯散盟" event appears — it looks like a regular event with title, description, and 3 choices
8. **Verify:** The description contains personalized text based on youth choices (if you did the Peach Garden Oath, you should see the 关羽 reference)
9. **Verify:** All 3 faction choices are visible (unless you triggered a lock)
10. Select a faction
11. **Verify:** Result text displays, then clicking "继续" shows the faction transition text, then rise phase begins normally

- [ ] **Step 2: Test semi-locking — betray Cao Cao → Wei locked**

1. Start a new game
2. During youth, when the "曹操刺董" event appears, choose "向董卓告发" (betray Cao Cao)
3. **Verify:** At the crossroads event, the Wei choice appears grayed out with 🔒 icon and the lock reason text about betraying Cao Cao
4. **Verify:** The locked choice is not clickable
5. **Verify:** The other 2 choices work normally

- [ ] **Step 3: Test affinity bonus**

1. Start a new game, accumulate high Shu affinity (do Peach Garden Oath, help Liu Bei in Yellow Turban event)
2. At crossroads, choose Shu
3. **Verify:** Result text includes "你与此间众人一见如故，如鱼得水。"

- [ ] **Step 4: Test saved game compatibility**

1. Start a game, play through youth, select a faction, play a few rise events
2. Refresh the page
3. **Verify:** Game resumes correctly from saved state (faction data reloaded, events continue)

- [ ] **Step 5: Test retroactive faction choice (old save without faction)**

This can be simulated by manually editing localStorage to set `faction: null` on a save that has `phaseIndex > 0`:
1. Open browser console
2. Edit the save to remove faction
3. Refresh
4. **Verify:** Crossroads event appears for retroactive faction selection
