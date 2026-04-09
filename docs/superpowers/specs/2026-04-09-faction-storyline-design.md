# 阵营故事线系统设计

**日期:** 2026-04-09  
**状态:** 待实施

## 问题

当前游戏的阵营系统是被动的——玩家在整个游戏过程中默默积累魏/蜀/吴属性值，从未有"我选择跟随刘备"这样的明确时刻。崛起期到终局期的事件池对所有玩家完全相同，无论阵营倾向如何，导致：

1. **缺乏代入感** — 玩家感觉不到自己"属于"某个阵营
2. **叙事违和** — 一会帮蜀一会帮魏，故事线混乱
3. **选择无重量** — 阵营属性只在最终结局才生效，中间过程没有反馈

## 方案概述

在少年期结束后引入**阵营承诺机制**，玩家明确选择加入蜀/魏/吴之一。选择后，崛起期、争霸期、终局期使用**完全独立的阵营事件池**，故事线沿该阵营的历史脉络展开。角色专属事件也按阵营完全适配。

## 一、阵营承诺机制

### 触发时机

少年期 5 个事件全部完成 → 少年期危机检测（现有逻辑不变）→ **阵营选择界面** → 崛起期过渡动画 → 崛起期开始。

### 阵营选择界面

独立全屏界面，展示三个势力卡片：

```
┌──────────────────────────────┐
│  "乱世将至，你必须选择效忠的主公"  │
├──────────────────────────────┤
│  🛡️ 蜀 — 刘备                │
│  "桃园结义，共扶汉室"          │
│  故事预告: 共破黄巾 → 流离新野   │
│  → 入川建业 → 北伐中原         │
├──────────────────────────────┤
│  ⚔️ 魏 — 曹操                │
│  "共举义兵，平定乱世"          │
│  故事预告: 青州平乱 → 官渡大战   │
│  → 征伐四方 → 曹魏立国         │
├──────────────────────────────┤
│  ⛵ 吴 — 孙坚                │
│  "据江东之地，成不世之功"       │
│  故事预告: 平定山越 → 赤壁抗曹   │
│  → 夺取荆州 → 东吴霸业         │
└──────────────────────────────┘
```

界面风格与现有深色水墨主题统一，三个卡片竖排展示。

### 选择效果

| 效果 | 蜀 | 魏 | 吴 |
|------|----|----|-----|
| `state.faction` | `"shu"` | `"wei"` | `"wu"` |
| 阵营属性 | 蜀+20 | 魏+20 | 吴+20 |
| 其他阵营 | 魏-5, 吴-5 | 蜀-5, 吴-5 | 蜀-5, 魏-5 |
| 设置 flag | `faction_shu` | `faction_wei` | `faction_wu` |

### 过渡文本

选择阵营后显示阵营专属过渡文本（替代原崛起期通用过渡文本）：

- **蜀:** "你跟随刘备，辗转流离，虽屡遭挫败，却始终不忘匡扶汉室之志。乱世之中，义字当先……"
- **魏:** "你投身曹操麾下，南征北战，以雷霆手段荡平群雄。这是一条铁血铸就的道路……"
- **吴:** "你追随孙氏，扎根江东。长江天堑之后，一片新天地正等待你去开拓……"

## 二、事件池完全分化

### 数据文件结构

```
data/
  events-youth.json           ← 不变（15个通用事件）
  events-rise-shu.json        ← 蜀线崛起期（~15个事件）
  events-rise-wei.json        ← 魏线崛起期（~15个事件）
  events-rise-wu.json         ← 吴线崛起期（~15个事件）
  events-war-shu.json         ← 蜀线争霸期（~18个事件）
  events-war-wei.json         ← 魏线争霸期（~18个事件）
  events-war-wu.json          ← 吴线争霸期（~18个事件）
  events-final-shu.json       ← 蜀线终局期（~13个事件）
  events-final-wei.json       ← 魏线终局期（~13个事件）
  events-final-wu.json        ← 吴线终局期（~13个事件）
  events-rise.json            ← 保留作为存档/参考（不再加载）
  events-war.json             ← 同上
  events-final.json           ← 同上
  events-character.json       ← 结构变更（见下文）
  events-crisis.json          ← 不变
  characters.json             ← 不变
  endings.json                ← 不变
```

### 现有事件的分配

将现有 46 个事件（15+18+13）按内容归属分配到对应阵营线：

**蜀线可复用的现有事件：**
- `rise_04` 桃园结义 → 已在youth中，可以设计蜀线后续
- `war_dingjunshan` 定军山之战
- `war_guanyu_jingzhou` 关羽失荆州
- `final_wuzhangyuan` 五丈原
- `final_jiangwei` 姜维北伐
- 以及其他蜀相关事件

**魏线可复用的现有事件：**
- `rise_guandu` 官渡之战
- `war_xiaoyaojin` 逍遥津之战
- `final_simayi` 高平陵之变
- 以及其他魏相关事件

**吴线可复用的现有事件：**
- `war_chibi` 赤壁之战
- `war_baiyi` 白衣渡江
- 以及其他吴相关事件

**通用事件（可分配给多线或改写视角）：**
- 赤壁之战 → 主要放吴线（从吴方视角），但蜀线/魏线也可有"赤壁"相关事件（不同视角）
- 其他战争事件按参与方归属

**每条线不足的数量用新写的阵营专属事件补齐。**

### 阵营故事线内容大纲

**蜀线（崛起→争霸→终局）：**
| 阶段 | 故事节点 |
|------|---------|
| 崛起期 | 共破黄巾 → 辗转流离 → 依附刘表 → 新野练兵 → 三顾茅庐 → 联吴抗曹 |
| 争霸期 | 赤壁之战(蜀视角) → 入川之战 → 汉中之战 → 定军山 → 关羽失荆州 → 夷陵之败 |
| 终局期 | 白帝托孤 → 诸葛治蜀 → 北伐中原 → 五丈原 |

**魏线（崛起→争霸→终局）：**
| 阶段 | 故事节点 |
|------|---------|
| 崛起期 | 青州平乱 → 挟天子令诸侯 → 官渡之战 → 征乌桓 → 南下荆州 → 收降荆州 |
| 争霸期 | 赤壁之败(魏视角) → 合肥防守 → 汉中争夺 → 逍遥津 → 曹丕代汉 → 南征北战 |
| 终局期 | 魏国内政 → 司马崛起 → 高平陵之变 → 天下归晋 |

**吴线（崛起→争霸→终局）：**
| 阶段 | 故事节点 |
|------|---------|
| 崛起期 | 平定山越 → 建设江东 → 世家整合 → 周瑜献策 → 赤壁备战 → 赤壁大战 |
| 争霸期 | 荆州之争 → 逍遥津(吴视角) → 白衣渡江 → 夷陵之战(吴视角) → 石亭之战 → 建国称帝 |
| 终局期 | 东吴内政 → 世家纷争 → 诸葛恪北伐 → 东吴兴衰 |

### 事件JSON格式

每个阵营事件文件与现有格式完全一致：

```json
{
  "phase": "崛起期",
  "pickCount": 6,
  "transition": "（阵营专属过渡文本）",
  "events": [
    {
      "id": "rise_shu_01",
      "year": 192,
      "title": "共破黄巾",
      "description": "你跟随刘备...",
      "conditions": {},
      "choices": [...]
    }
  ]
}
```

## 三、角色事件完全适配阵营

### 数据结构变更

`events-character.json` 从二层结构扩展为三层：

**少年期（不变）：**
```json
{
  "farmer": {
    "youth": {
      "id": "char_farmer_youth",
      "title": "离乡赴难",
      ...
    }
  }
}
```

**后三阶段（按阵营分支）：**
```json
{
  "farmer": {
    "rise": {
      "shu": {
        "id": "char_farmer_rise_shu",
        "title": "刘备麾下的农家子",
        "description": "你以农家子弟的身份加入了刘备的义军...",
        "choices": [...]
      },
      "wei": {
        "id": "char_farmer_rise_wei",
        "title": "曹营中的屯田官",
        "description": "凭借丰富的农事经验，你被委任为曹军屯田...",
        "choices": [...]
      },
      "wu": {
        "id": "char_farmer_rise_wu",
        "title": "江东的水寨粮长",
        "description": "江东水乡与你的农耕技能相得益彰...",
        "choices": [...]
      }
    },
    "war": { "shu": {...}, "wei": {...}, "wu": {...} },
    "final": { "shu": {...}, "wei": {...}, "wu": {...} }
  }
}
```

### 数量统计

| 类别 | 现有 | 新版 | 新增 |
|------|------|------|------|
| 少年期角色事件 | 6 | 6 | 0 |
| 后三阶段角色事件 | 18 | 54 | **36** |
| **角色事件总计** | **24** | **60** | **36** |

### Flag 系统适配

现有的角色 flag 链（如 `farmer_led_villagers` → 后续解锁特殊选项）需要按阵营分化：
- 少年期 flag 保持不变（选阵营前设置）
- 后三阶段的 flag 可以带阵营前缀或保持通用，取决于是否需要跨阵营引用
- 推荐：保持通用 flag 名（如 `farmer_led_villagers`），因为同一角色无论在哪个阵营都可能经历类似的个人成长

## 四、代码变更

### `js/game.js`

**新增：**
1. `state.faction` 字段（值为 `"shu"` / `"wei"` / `"wu"` / `null`）
2. `selectFaction(factionId)` 方法 — 设置 faction、调整属性、设置 flag、触发保存
3. `loadFactionPhases(factionId)` 方法 — 选择阵营后加载对应事件数据并替换 phases[1-3]
4. `getFactionTransition(factionId)` — 返回阵营专属过渡文本

**修改：**
1. `_pickPhaseEvents(phaseIndex)` — 事件池来源改为按阵营加载的数据
2. 角色事件获取逻辑：
   ```javascript
   const charEvent = (phaseIndex === 0)
     ? this.data.characterEvents[charId]?.[phaseName]
     : this.data.characterEvents[charId]?.[phaseName]?.[this.state.faction];
   ```
3. `save()` / `load()` — 包含 `faction` 字段的序列化/反序列化
4. `load()` 需要处理旧存档兼容（`faction` 为 `undefined` 时不崩溃）

### `js/data-loader.js`

**修改加载策略：**

方案A（推荐 — 按需加载）：
```javascript
// 初始加载（游戏启动）
async function loadInitialData() {
  // 只加载少年期 + 角色 + 危机 + 角色 + 结局
  return { characters, endings, youthPhase, characterEvents, crisisEvents };
}

// 阵营加载（选择阵营后）
async function loadFactionData(faction) {
  // 加载对应阵营的 3 个事件文件
  const [rise, war, final] = await Promise.all([
    fetch(`data/events-rise-${faction}.json`),
    fetch(`data/events-war-${faction}.json`),
    fetch(`data/events-final-${faction}.json`)
  ]);
  return [rise, war, final]; // 替换 phases[1], [2], [3]
}
```

方案B（全量预加载）：
- 启动时加载全部 12 个事件文件（youth + 3×3阵营）
- 简单但浪费带宽（多加载了 2/3 的无用数据）

**选择方案A**，因为按需加载对移动端更友好，加载时间可用阵营选择过渡动画掩盖。

### `js/ui.js`

**新增：**
1. `renderFactionChoice(factions)` — 渲染阵营选择界面
2. 阵营选择界面的 DOM 引用和事件绑定
3. 阵营选择页面到崛起期的过渡动画

**修改：**
1. 阶段过渡文本使用阵营专属版本（从 `game.getFactionTransition()` 获取）

### `js/main.js`

**修改流程：**
```
原流程: completePhase → checkCrisis → advancePhase
新流程: completePhase → checkCrisis → 
  if (phaseIndex === 0) → showFactionChoice → loadFactionData → advancePhase
  else → advancePhase
```

**新增回调：**
```javascript
ui.on('factionSelected', async (factionId) => {
  game.selectFaction(factionId);
  await game.loadFactionPhases(factionId);
  // 继续进入崛起期
});
```

### `index.html`

新增阵营选择页面 DOM：
```html
<div id="faction-page" class="page">
  <div class="faction-header">...</div>
  <div class="faction-cards">
    <div class="faction-card" data-faction="shu">...</div>
    <div class="faction-card" data-faction="wei">...</div>
    <div class="faction-card" data-faction="wu">...</div>
  </div>
</div>
```

### `css/style.css`

新增阵营选择界面样式，延续现有深色水墨主题：
- 三张卡片竖排排列
- 悬停高亮效果
- 阵营配色：蜀绿/魏蓝/吴红（或采用现有色调体系）

## 五、存档兼容

| 场景 | 处理 |
|------|------|
| 新游戏 | 正常流程，少年期→阵营选择→崛起期 |
| 旧存档（少年期中） | `faction` 为 null，正常进行少年期，结束后触发阵营选择 |
| 旧存档（崛起期+） | `faction` 为 null，需要**强制触发阵营选择**后再继续 |
| 新存档读取 | `faction` 已设置，直接按阵营加载对应数据 |

对于旧存档在崛起期+的情况：加载后检测 `faction === null && phaseIndex > 0`，弹出阵营选择界面，选择后：
- 如果当前阶段尚未开始任何事件（`eventIndex === 0`）→ 用阵营事件池重新抽取本阶段事件
- 如果当前阶段已经进行中（`eventIndex > 0`）→ 保留当前阶段已有事件不变，从下一阶段开始使用阵营事件池
- 这确保玩家不会因为存档迁移而丢失当前进度

## 六、工作量估算

### 代码变更
| 模块 | 工作量 |
|------|--------|
| game.js | 中等（新增方法 + 修改事件选择逻辑） |
| data-loader.js | 中等（按需加载机制） |
| ui.js | 中等（阵营选择界面） |
| main.js | 较小（流程编排） |
| index.html + CSS | 较小（新页面结构和样式） |

### 内容创作（最大工作量）
| 内容 | 数量 |
|------|------|
| 阵营专属事件（3线×3阶段） | ~90个新事件（含复用改写） |
| 角色阵营事件（6角色×3阶段×3阵营 - 现有） | ~36个新角色事件 |
| 阵营选择界面文案 | 3段介绍 + 3段过渡文本 |
| **总新增事件** | **~126个** |

## 七、实施顺序建议

1. **代码框架** — 先实现阵营选择机制和事件池切换逻辑，用占位事件测试
2. **蜀线内容** — 先完成一条线，验证完整体验
3. **魏线内容** — 第二条线
4. **吴线内容** — 第三条线
5. **角色事件** — 6角色×3阵营×3阶段的角色事件
6. **打磨** — 平衡调整、文案润色、存档兼容测试
