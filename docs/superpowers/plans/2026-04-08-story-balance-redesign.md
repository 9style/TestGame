# Story & Balance Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebalance ending thresholds, boost late-game stat rewards, and add narrative condition gates to final-phase events so that diverse endings are achievable and story progression is coherent.

**Architecture:** Pure JSON data changes across 3 files — no JS code modifications. Endings get reordered and thresholds lowered; final-phase events get condition gates and boosted rewards; war-phase faction events get boosted faction rewards.

**Tech Stack:** JSON data files only

---

### Task 1: Reorder and rebalance endings in `endings.json`

**Files:**
- Modify: `data/endings.json`

- [ ] **Step 1: Reorder the non-death endings and adjust thresholds**

The endings array must be reordered (death endings stay first, then the new priority order) and each ending's conditions updated. Replace the entire `endings` array content after the 4 death endings with the new order and thresholds:

**New order and thresholds (after the 4 death endings, which remain unchanged):**

```
5. unify:        武.min:75, 智.min:75, 魅.min:70       (was 80,80,75)
6. benevolent:   武.min:65, 智.min:65, 德.min:70, 忠义.min:60  (was 70,70,75,65; moved from position 9)
7. wei_minister: 魏.min:60, 智.min:55, 蜀.max:50, 吴.max:50   (was 70,65,45,45)
8. shu_guardian: 蜀.min:60, 德.min:55, 忠义.min:50, 魏.max:50  (was 70,65,55,45)
9. wu_admiral:   吴.min:55, 智.min:50, 武.min:45, 魏.max:55, 蜀.max:55  (was 65,60,55,45,50)
10. invincible:  武.min:72, 智.max:58        (was 82,52; moved before strategist)
11. strategist:  智.min:70, 魅.min:55, 武.max:65   (was 80,62,60)
12. martyr:      忠义.min:68, 命运.max:50    (was 78,45)
13. chancellor:  智.min:65, 魅.min:58, 德.max:50, 忠义.max:45  (was 75,68,45,38)
14. warlord:     武.min:58, 智.min:58, 德.max:48   (was 68,68,42)
15. loyal:       武.min:50, 德.min:60, 忠义.min:55  (was 62,72,65)
16. hermit:      德.min:55, 命运.min:50, 武.min:20, 武.max:90, 智.min:20, 智.max:90, 魅.min:20, 魅.max:90  (was 68,55,25-88,25-88,25-88)
17. fallen:      武.min:58, 智.max:60, 忠义.min:40  (was 72,55,48)
18. bandit:      武.min:38, 德.max:42, 命运.max:45  (was 45,35,38)
19. betrayed:    德.max:40, 忠义.max:40      (was 35,35)
20. ordinary:    no conditions (unchanged)
```

Concrete edits — for each ending object, update only the `conditions` field. For reordering, move the `benevolent` object from after `wu_admiral` to after `unify`, and move `invincible` from after `strategist` to before `strategist`. All other relative ordering stays the same.

Specific JSON condition changes (showing old → new):

**unify:**
```json
"conditions": { "武": { "min": 75 }, "智": { "min": 75 }, "魅": { "min": 70 } }
```

**benevolent** (also move to position right after unify):
```json
"conditions": { "武": { "min": 65 }, "智": { "min": 65 }, "德": { "min": 70 }, "忠义": { "min": 60 } }
```

**wei_minister:**
```json
"conditions": { "魏": { "min": 60 }, "智": { "min": 55 }, "蜀": { "max": 50 }, "吴": { "max": 50 } }
```

**shu_guardian:**
```json
"conditions": { "蜀": { "min": 60 }, "德": { "min": 55 }, "忠义": { "min": 50 }, "魏": { "max": 50 } }
```

**wu_admiral:**
```json
"conditions": { "吴": { "min": 55 }, "智": { "min": 50 }, "武": { "min": 45 }, "魏": { "max": 55 }, "蜀": { "max": 55 } }
```

**invincible** (move before strategist):
```json
"conditions": { "武": { "min": 72 }, "智": { "max": 58 } }
```

**strategist:**
```json
"conditions": { "智": { "min": 70 }, "魅": { "min": 55 }, "武": { "max": 65 } }
```

**martyr:**
```json
"conditions": { "忠义": { "min": 68 }, "命运": { "max": 50 } }
```

**chancellor:**
```json
"conditions": { "智": { "min": 65 }, "魅": { "min": 58 }, "德": { "max": 50 }, "忠义": { "max": 45 } }
```

**warlord:**
```json
"conditions": { "武": { "min": 58 }, "智": { "min": 58 }, "德": { "max": 48 } }
```

**loyal:**
```json
"conditions": { "武": { "min": 50 }, "德": { "min": 60 }, "忠义": { "min": 55 } }
```

**hermit:**
```json
"conditions": { "德": { "min": 55 }, "命运": { "min": 50 }, "武": { "min": 20, "max": 90 }, "智": { "min": 20, "max": 90 }, "魅": { "min": 20, "max": 90 } }
```

**fallen:**
```json
"conditions": { "武": { "min": 58 }, "智": { "max": 60 }, "忠义": { "min": 40 } }
```

**bandit:**
```json
"conditions": { "武": { "min": 38 }, "德": { "max": 42 }, "命运": { "max": 45 } }
```

**betrayed:**
```json
"conditions": { "德": { "max": 40 }, "忠义": { "max": 40 } }
```

**ordinary:** unchanged (empty conditions).

- [ ] **Step 2: Verify the JSON is valid**

Run: `python -c "import json; json.load(open('data/endings.json', encoding='utf-8')); print('OK')"`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add data/endings.json
git commit -m "balance: reorder endings and lower thresholds for diverse outcomes"
```

---

### Task 2: Add condition gates to final-phase events in `events-final.json`

**Files:**
- Modify: `data/events-final.json`

- [ ] **Step 1: Add conditions to 4 events**

For event `final_07` (绝境求生), change:
```json
"conditions": {}
```
to:
```json
"conditions": { "武": { "min": 40 } }
```

For event `final_02` (托孤之重), change:
```json
"conditions": {}
```
to:
```json
"conditions": { "忠义": { "min": 40 } }
```

For event `final_03` (功臣末路), change:
```json
"conditions": {}
```
to:
```json
"conditions": { "魅": { "min": 40 } }
```

For event `final_04` (传道授业), change:
```json
"conditions": {}
```
to:
```json
"conditions": { "智": { "min": 45 } }
```

Events `final_01` (最终决战), `final_05` (故人重逢), `final_06` (最终抉择), `final_unification` (三国归晋) keep `"conditions": {}` unchanged.

Events `final_scroll`, `final_wuzhangyuan`, `final_simayi`, `final_jiangwei` already have conditions — leave unchanged.

- [ ] **Step 2: Verify JSON validity**

Run: `python -c "import json; json.load(open('data/events-final.json', encoding='utf-8')); print('OK')"`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add data/events-final.json
git commit -m "story: add narrative condition gates to final-phase events"
```

---

### Task 3: Boost final-phase event stat rewards in `events-final.json`

**Files:**
- Modify: `data/events-final.json`

- [ ] **Step 1: Update stat rewards for all final-phase event choices**

For each event, update the `effects` and `hidden_effects` of each choice as follows:

**final_07 (绝境求生):**
- Choice 0 "以己为饵": effects `武:3→5, 魅:7→9` (智 and 德 unchanged)
- Choice 1 "先行突围": effects `武:4→6, 智:3→5` (德 unchanged)

**final_01 (最终决战):**
- Choice 0 "亲率大军": effects `武:7→10, 魅:3→4`
- Choice 1 "用计谋": effects `智:6→9, 魅:2→3`
- Choice 2 "和平谈判": effects `德:6→8, 智:3→4, 魅:2→3`

**final_02 (托孤之重):**
- Choice 0 "忠心辅佐": effects `德:7→10, 智:2→3`, hidden_effects `忠义:10→12`
- Choice 1 "取而代之": effects `武:3→5, 智:3→5, 魅:2→3` (德 unchanged)

**final_03 (功臣末路):**
- Choice 0 "交出兵权": effects `德:4→7, 智:4→6` (武 unchanged)
- Choice 1 "联合功臣": effects `智:3→6, 魅:3→5`
- Choice 2 "起兵反抗": effects `武:5→8, 魅:2→3`

**final_04 (传道授业):**
- Choice 0 "著书立说": effects `智:5→8, 德:6→8`
- Choice 1 "亲自教导": effects `武:4→6, 魅:5→7, 德:3→4`

**final_05 (故人重逢):**
- Choice 0 "值得": effects `德:5→7, 魅:3→5`
- Choice 1 "不知道": effects `智:3→5, 德:2→3, 魅:2→3`
- Choice 2 "不值得": effects `智:2→4, 武:2→4`

**final_06 (最终抉择):**
- Choice 0 "继续征战": effects `武:5→8, 智:2→3, 魅:2→3`
- Choice 1 "解甲归田": effects `德:6→9, 魅:2→3`
- Choice 2 "留在朝堂": effects `智:5→8, 德:3→4, 魅:2→3`

**final_scroll (兵法至境):**
- Choice 0 "融入治国": effects `智:8→10, 德:5→7`
- Choice 1 "著书创学": effects `智:6→8, 魅:5→7`
- Choice 2 "公之于世": effects `德:8→10, 魅:3→5`

**final_wuzhangyuan (五丈原):**
- Choice 0 "继承遗志": effects `德:6→8, 武:3→5`, hidden_effects `蜀:10→12`
- Choice 1 "建议撤军": effects `智:5→7, 魅:2→3`
- Choice 2 "联络司马懿": unchanged (betrayal path should not be rewarded more)

**final_simayi (高平陵之变):**
- Choice 0 "支持司马懿": effects `智:5→7`, hidden_effects `魏:5→8`
- Choice 1 "效忠曹氏" (crisis): unchanged (crisis choice)
- Choice 2 "趁乱脱身": effects `智:3→5`, hidden_effects `命运:5→7`

**final_jiangwei (姜维北伐):**
- Choice 0 "追随姜维": effects `武:3→5, 德:4→6`, hidden_effects `蜀:10→12`
- Choice 1 "劝止戈": effects `智:5→7, 德:3→5`
- Choice 2 "密谋投降": unchanged (betrayal path)

**final_unification (三国归晋):**
- Choice 0 "入朝为官": effects `魅:3→5, 智:2→4`, hidden_effects `魏:8→10`
- Choice 1 "著书立说": effects `智:6→8, 德:6→8`
- Choice 2 "归隐田园": effects `德:3→6`, hidden_effects `命运:5→7`
- Choice 3 "南渡江东": effects `智:2→4`, hidden_effects `吴:10→12`

- [ ] **Step 2: Verify JSON validity**

Run: `python -c "import json; json.load(open('data/events-final.json', encoding='utf-8')); print('OK')"`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add data/events-final.json
git commit -m "balance: boost final-phase event stat rewards"
```

---

### Task 4: Boost war-phase faction event rewards in `events-war.json`

**Files:**
- Modify: `data/events-war.json`

- [ ] **Step 1: Update faction rewards for war-phase historical events**

**war_dingjunshan (定军山之战):**
- Choice 0 "随黄忠冲锋": hidden_effects `蜀:5→8`

**war_hefei (合肥之战):**
- Choice 0 "随张辽杀入": hidden_effects `魏:8→10` (was already 8, boost to 10 for consistency)
- Choice 1 "在东吴阵中": hidden_effects `吴:8→10` (was already 8, boost to 10)

**war_guanyu_maicheng (关羽败走麦城):**
- Choice 0 "冒死营救": hidden_effects `蜀:10→12` (was already 10, boost to 12)

**war_baiyi (白衣渡江):**
- Choice 0 "协助东吴": hidden_effects `吴:10→12` (was already 10, boost to 12)
- Choice 1 "向关羽报信": hidden_effects `蜀:10→12` (was already 10, boost to 12)

- [ ] **Step 2: Verify JSON validity**

Run: `python -c "import json; json.load(open('data/events-war.json', encoding='utf-8')); print('OK')"`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add data/events-war.json
git commit -m "balance: boost war-phase faction event rewards"
```

---

### Task 5: Smoke test the full game flow

**Files:**
- No file changes — manual verification

- [ ] **Step 1: Validate all 3 JSON files parse correctly**

Run:
```bash
python -c "
import json
for f in ['data/endings.json', 'data/events-final.json', 'data/events-war.json']:
    data = json.load(open(f, encoding='utf-8'))
    print(f'{f}: OK')
"
```
Expected: All 3 files print OK.

- [ ] **Step 2: Verify ending order and count**

Run:
```bash
python -c "
import json
data = json.load(open('data/endings.json', encoding='utf-8'))
endings = data['endings']
print(f'Total endings: {len(endings)}')
for i, e in enumerate(endings):
    death = ' (DEATH)' if e.get('isDeath') else ''
    print(f'{i+1}. {e[\"id\"]}: {e[\"name\"]}{death}')
"
```
Expected: 20 endings total. Order should be:
1-4: death endings, 5: unify, 6: benevolent, 7: wei_minister, 8: shu_guardian, 9: wu_admiral, 10: invincible, 11: strategist, 12: martyr, 13: chancellor, 14: warlord, 15: loyal, 16: hermit, 17: fallen, 18: bandit, 19: betrayed, 20: ordinary.

- [ ] **Step 3: Verify final-phase event conditions**

Run:
```bash
python -c "
import json
data = json.load(open('data/events-final.json', encoding='utf-8'))
for e in data['events']:
    conds = e.get('conditions', {})
    has_conds = bool(conds) and conds != {}
    print(f'{e[\"id\"]}: {\"HAS conditions\" if has_conds else \"no conditions\"} {conds if has_conds else \"\"}')
"
```
Expected: final_07, final_02, final_03, final_04 should show conditions. final_01, final_05, final_06, final_unification should show no conditions. final_scroll, final_wuzhangyuan, final_simayi, final_jiangwei should show their existing conditions.

- [ ] **Step 4: Start local server and play-test**

Run: `python -m http.server 8080`

Open browser to `http://localhost:8080`, play through a full game focusing on one attribute direction (e.g., always pick 武 choices as soldier). Verify the ending is NOT "乱世浮沉" but a relevant achievement ending.

- [ ] **Step 5: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: address issues found during smoke testing"
```
