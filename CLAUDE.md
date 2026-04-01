# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在此仓库中工作时提供指引。

## 项目概述

**三国武将录** —— 一款基于浏览器的三国文字冒险游戏。玩家选择一位历史武将，在人生的 4 个阶段中做出抉择，最终根据属性值达成 13 种正常结局之一，或在途中因危机事件夭折（4 种死亡结局）。共 17 种结局。

## 运行游戏

本项目是使用 ES 模块和 `fetch()` 的静态站点，**不能直接通过 `file://` 打开**，必须通过 HTTP 服务运行：

```bash
# Python（最简单）
python -m http.server 8080

# Node.js
npx serve .
```

然后访问 `http://localhost:8080`。

项目没有构建步骤、没有 package.json、也没有测试套件。

## 架构

### 模块职责

- **`js/main.js`** — 仅作为入口。初始化 `Game` 和 `UI`，通过 `ui.on(event, handler)` 连接两者的回调，并管理页面跳转。此处不含任何游戏逻辑。
- **`js/game.js`** — 全部游戏逻辑：状态管理、事件筛选、属性计算、结局判定、localStorage 持久化。`Game` 类是唯一的数据来源。
- **`js/ui.js`** — 纯 DOM 渲染。除屏幕引用和回调外无状态，从不直接读取游戏状态，所有数据均由 `main.js` 以参数形式传入。
- **`js/data-loader.js`** — 并行拉取所有 JSON 文件，组装成 `{ characters, endings, phases }` 对象传给 `Game`。

### 数据文件（`data/`）

| 文件 | 内容 |
|------|------|
| `characters.json` | 6 位可选武将，含可见属性（`武/智/德/魅`）和隐藏属性（`命运/忠义`）|
| `endings.json` | 17 种结局（4 种死亡 + 13 种正常），死亡结局带 `isDeath: true` 标记，正常结局按顺序匹配，最后一项（`ordinary`）为兜底 |
| `events-youth.json` | 第 1 阶段事件池（少年期，每局抽取 5 个）|
| `events-rise.json` | 第 2 阶段事件池（崛起期，每局抽取 6 个）|
| `events-war.json` | 第 3 阶段事件池（争霸期，每局抽取 6 个）|
| `events-final.json` | 第 4 阶段事件池（终局期，每局抽取 3 个）|
| `events-character.json` | 角色专属事件（6 角色 × 4 阶段 = 24 个），每阶段作为第一个必选事件插入 |
| `events-crisis.json` | 4 种危机事件（病殁/暗杀/战死/处斩），阶段结束时根据属性阈值触发 |

### 游戏状态与持久化

- **当前游戏状态**（`state`）在每次选择后存入 `localStorage`，键名为 `sgwjl_save`
- **已解锁结局**累计存入 `localStorage`，键名为 `sgwjl_endings`
- 启动时 `game.load()` 恢复存档；`game.clearSave()` 重置存档

### 事件 / 选项数据结构

各阶段 JSON 文件中每个事件的格式：

```json
{
  "id": "unique_id",
  "title": "...",
  "description": "...",
  "conditions": { "武": { "min": 60 }, "no_extreme": true, "requires_flags": ["flag_name"] },
  "choices": [
    {
      "text": "...",
      "effects": { "武": 5, "德": -2 },
      "hidden_effects": { "忠义": 3 },
      "hidden_conditions": { "忠义": { "min": 50 }, "requires_flags": ["flag"] },
      "set_flags": ["new_flag"],
      "result": "选择后显示的叙述文本"
    },
    {
      "text": "⚠️ 危险选项",
      "crisis_trigger": true,
      "crisis_check": { "武": { "min": 50 } },
      "success_result": "判定成功文本",
      "fail_result": "判定失败文本",
      "death_ending": "death_battle"
    }
  ]
}
```

- 事件上的 `conditions` 控制该事件是否进入 `_pickPhaseEvents()` 的候选池
- 选项上的 `hidden_conditions` 决定该选项是否对玩家可见
- `no_extreme` 是特殊条件：若任意可见属性 <30 或 >85 则不满足
- `requires_flags` / `excludes_flags`：标记系统，选项 `set_flags` 设置标记，后续事件/选项可据此显示或隐藏
- `crisis_trigger` + `crisis_check`：即死选项，属性不满足 `crisis_check` 则触发 `death_ending` 指定的死亡结局
- 所有属性值限制在 [0, 100] 范围内

### 危机系统

阶段结束时 `game.checkCrisis()` 检测属性阈值（少年期免疫），触发后进入危机事件。危机事件有"安全退出"选项（有代价但必定存活）和"属性判定"选项（失败则死亡）。`saved_doctor` 标记会为病殁危机添加额外的高成功率选项。

### 结局判定

`game.checkEnding()` 先检查 `state.deathEnding`（中途夭折），若有则直接返回对应死亡结局。否则按顺序遍历 `this.endings`（跳过 `isDeath` 结局），返回第一个 `conditions` 与最终 `attrs` + `hidden` 值匹配的结局。最后一项结局（`ordinary`）条件为空，始终命中。
