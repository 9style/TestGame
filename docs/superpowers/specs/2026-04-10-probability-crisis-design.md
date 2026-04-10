# 危机事件概率化设计

**日期:** 2026-04-10
**状态:** 待实施

## 问题

当前危机事件使用纯数值判定：`crisis_check: { "武": { "min": 50 } }` — 达到50就100%成功，低于50就100%失败。

这导致：
- 玩家可以精确计算，失去紧张感
- 低属性玩家完全绝望，高属性玩家完全无风险
- 缺少"以弱胜强"的传奇感

## 方案概述

将危机事件的纯数值判定改为**概率化判定**：
- 达到阈值 = 100%成功（保留确定性奖励）
- 低于阈值 = 按比例计算成功率，最低10%保底
- 线性增长：40%属性 = 40%成功率（相对于阈值）

## 一、概率计算公式

```
if (属性值 >= 阈值):
    成功率 = 100%
else:
    成功率 = max(10%, (属性值 / 阈值) * 100%)
```

### 示例（阈值50）

| 属性值 | 计算 | 成功率 |
|--------|------|--------|
| 60 | >=50 | 100% |
| 50 | >=50 | 100% |
| 40 | 40/50 = 0.8 | 80% |
| 30 | 30/50 = 0.6 | 60% |
| 20 | 20/50 = 0.4 → 保底 | 10% |
| 10 | 10/50 = 0.2 → 保底 | 10% |

### 示例（阈值30）

| 属性值 | 成功率 |
|--------|--------|
| 40 | 100% |
| 30 | 100% |
| 24 | 80% |
| 15 | 50% |
| 5 | 10%（保底）|

## 二、数据格式变更

### 当前格式（纯数值）

```json
{
  "text": "奋起反抗，与刺客搏斗",
  "crisis_check": { "武": { "min": 30 } },
  "success_result": "...",
  "success_effects": { "武": 3, "命运": 5 },
  "fail_result": "...",
  "death_ending": "death_assassinated"
}
```

### 新格式（概率化）

```json
{
  "text": "奋起反抗，与刺客搏斗",
  "crisis_check": {
    "武": {
      "target": 30,
      "mode": "probability"
    }
  },
  "success_result": "...",
  "success_effects": { "武": 3, "命运": 5 },
  "fail_result": "...",
  "death_ending": "death_assassinated"
}
```

**变更点：**
- `min` → `target`（语义更明确：这是100%成功的目标值）
- 新增 `mode: "probability"`（为未来扩展其他模式预留）

### 多属性检查

```json
{
  "crisis_check": {
    "智": { "target": 35, "mode": "probability" },
    "魅": { "target": 25, "mode": "probability" }
  }
}
```

**多属性成功率计算：** 取各属性成功率的平均值

示例：智40/目标35=100%，魅20/目标25=80%（20/25=0.8，但保底10%→实际80%），最终成功率 = (100% + 80%) / 2 = 90%

## 三、代码变更

### js/game.js

修改 `_checkCrisisConditions()` 方法（或用于危机检查的方法）：

```javascript
_checkCrisisConditions(check) {
  // 如果已经是概率模式，直接返回true让上层处理
  // 或者修改返回值为成功率百分比
  
  // 新实现：返回成功率 (0-1)
  let totalProbability = 0;
  let count = 0;
  
  for (const [attr, config] of Object.entries(check)) {
    const value = this.state.attrs[attr] ?? this.state.hidden[attr];
    if (value === undefined) continue;
    
    const target = config.target ?? config.min; // 兼容旧数据
    const mode = config.mode ?? 'threshold'; // 默认阈值模式兼容旧数据
    
    if (mode === 'probability') {
      // 概率模式
      if (value >= target) {
        totalProbability += 1; // 100%
      } else {
        const ratio = value / target;
        const probability = Math.max(0.1, ratio); // 保底10%
        totalProbability += probability;
      }
    } else {
      // 阈值模式（兼容旧数据）
      if (value < target) return 0; // 失败
      totalProbability += 1;
    }
    count++;
  }
  
  return count > 0 ? totalProbability / count : 1;
}
```

修改 `_applyCrisisChoice()` 或调用检查的地方：

```javascript
_applyCrisisChoice(choiceIndex) {
  // ...
  const successRate = this._checkCrisisConditions(choice.crisis_check);
  
  // 随机判定
  const roll = Math.random();
  const passed = roll < successRate;
  
  // 可以显示成功率给玩家（增加紧张感）
  // 或者隐藏，让玩家自己感受
  
  if (passed) {
    // 成功处理
  } else {
    // 失败处理
  }
}
```

## 四、数据文件变更

### 需要修改的文件

| 文件 | 事件数 | 说明 |
|------|--------|------|
| `data/events-crisis.json` | 4个危机事件 | 全部改为概率模式 |
| `data/events-youth.json` | 1个（曹操刺董） | 改为概率模式 |
| `data/events-rise-*.json` | 若干 | 检查并修改 |
| `data/events-war-*.json` | 若干 | 检查并修改 |
| `data/events-final-*.json` | 若干 | 检查并修改 |

### 修改策略

**方案A（推荐）：** 渐进式迁移
- 先改 `events-crisis.json`（4个核心危机事件）
- 其他文件保持 `min` 格式（阈值模式，代码兼容）
- 后续再逐步迁移

**方案B：** 全部一次性修改
- 搜索所有包含 `crisis_check` 的文件
- 全部改为 `target` + `mode: "probability"`

## 五、用户体验

### 是否显示成功率？

**选项1（推荐）：显示预估成功率**
- 在选项上显示："成功率: 75%"
- 让玩家做知情决策
- 增加策略性（是否要赌一把）

**选项2：隐藏成功率**
- 玩家只能凭感觉判断
- 更紧张刺激
- 但可能让玩家觉得"不公平"

建议：**显示成功率**，但用模糊的描述：
- 90%+："胜算很大"
- 70-89%："颇有把握"
- 50-69%："胜负难料"
- 30-49%："胜算渺茫"
- 10-29%："九死一生"

## 六、实施顺序

1. **修改 js/game.js** — 添加概率计算逻辑，保持对旧 `min` 格式的兼容
2. **修改 data/events-crisis.json** — 4个危机事件改为概率模式
3. **（可选）修改其他文件** — 其他危机事件
4. **（可选）UI显示** — 在选项上显示成功率描述
