# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在此仓库中工作时提供指引。

## 项目概述

**三国武将录** —— 一款基于浏览器的三国文字冒险游戏。玩家从 6 位角色中选择出身，在人生的 4 个阶段（少年期/崛起期/争霸期/终局期）中做出抉择，最终根据累计属性值达成 20 种结局之一：4 种死亡结局（游戏中途因危机触发）和 16 种正常结局（游戏结束时按属性顺序匹配，末项为兜底）。

## 运行游戏

本项目是使用 ES 模块和 `fetch()` 的静态站点，**不能直接通过 `file://` 打开**，必须通过 HTTP 服务运行：

```bash
python -m http.server 8080
# 或
npx serve .
```

没有构建步骤、没有 package.json、没有测试套件、没有 linter。

已部署至 GitHub Pages（存在 `.nojekyll` 文件）。

## 架构

严格 MVC 分离，共 4 个 JS 模块 —— **`main.js` 中无任何游戏逻辑**，**`ui.js` 中无任何游戏状态**：

- **`js/main.js`** — 入口文件。创建 `Game` + `UI` 实例，通过 `ui.on(event, handler)` 连接回调，管理页面跳转。不含逻辑。
- **`js/game.js`** — 全部游戏逻辑：状态机、事件筛选（`_pickPhaseEvents`、`_checkConditions`）、属性计算（限制在 [0,100]）、危机检测、结局判定、localStorage 持久化。唯一的数据来源。
- **`js/ui.js`** — 纯 DOM 渲染。除元素引用和回调外无状态，从不直接读取游戏状态——所有数据由 `main.js` 以参数形式传入。
- **`js/data-loader.js`** — 并行 `fetch()` 拉取 8 个 JSON 文件，组装为 `{ characters, endings, phases[], characterEvents{}, crisisEvents[] }`。

### 数据流

```
data-loader → Game(data) → main.js 连接回调 → UI 渲染
                ↕
           localStorage
```

`main.js` 在 `ui.on()` 回调中调用 `game.method()`，再将结果传给 `ui.renderX()` 方法。UI 永远不与 Game 直接通信。

## 游戏数据（`data/`）

| 文件 | 数量 | 每局使用 |
|------|------|----------|
| `characters.json` | 6 种出身（农夫/书生/士卒/游侠/商贾/匠人） | 选 1 |
| `endings.json` | 20 种结局（4 死亡 + 16 正常，顺序匹配） | 达成 1 |
| `events-youth.json` | 15 个事件 | 抽取 5 |
| `events-rise.json` | 15 个事件 | 抽取 6 |
| `events-war.json` | 18 个事件 | 抽取 6 |
| `events-final.json` | 13 个事件 | 抽取 3 |
| `events-character.json` | 24 个事件（6 角色 × 4 阶段） | 4 个（每阶段 1 个，始终排首位） |
| `events-crisis.json` | 4 种危机类型 | 0–3 个（低属性触发） |

**每局总事件数：** 24（4 个角色专属 + 20 个随机池抽取）。

### 属性系统

- **可见属性：** 武、智、德、魅
- **隐藏属性：** 命运、忠义、魏/蜀/吴（阵营亲和度）
- 所有属性值限制在 [0, 100] 范围内

### 事件/选项数据结构

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

关键机制：
- 事件 `conditions` → 控制该事件是否进入 `_pickPhaseEvents()` 候选池
- 选项 `hidden_conditions` → 控制该选项是否对玩家可见
- `no_extreme` → 若任意可见属性 <30 或 >85 则不满足
- `requires_flags` / `excludes_flags` → 基于标记的分支系统
- `crisis_trigger` + `crisis_check` → 即死赌博；属性不满足则触发 `death_ending`

### 危机系统

`game.checkCrisis()` 在每个阶段结束后执行（少年期免疫）。触发阈值：

| 危机 | 触发条件 | 生效阶段 |
|------|----------|----------|
| 病殁 | 命运 < 15 | 1–3 |
| 暗杀 | 德 < 12 且 魅 < 20 | 1–3 |
| 战死 | 武 < 12 | 仅 2–3 |
| 处斩 | 忠义 < 12 且 德 < 20 | 1–3 |

危机事件提供"安全退出"选项（存活但有代价）和"赌博"选项（属性判定，失败则死亡）。`saved_doctor` 标记会为病殁危机添加一个高成功率选项。

### 结局判定

`game.checkEnding()`：优先返回死亡结局（若已设置）→ 按顺序遍历正常结局（首个匹配即返回）→ `ordinary` 兜底。阵营结局（wei_minister/shu_guardian/wu_admiral）要求对应阵营属性 ≥ 80。

### 持久化

- `localStorage['sgwjl_save']` — 当前游戏状态 JSON（每次选择后保存）
- `localStorage['sgwjl_endings']` — 已解锁结局 ID 数组（累计）

## 工具链

### 图片生成（`generate_images.py`）

通过火山引擎 ARK API 批量生成约 105 张游戏插画（WebP 格式），统一中国水墨画风格。输出至 `images/` 各子目录。读取环境变量 `ARK_API_KEY`。

### 攻略生成（`guide/`）

`guide/generate_guide.py` 读取游戏数据 JSON + `guide/templates/manual_content.py` 中的手写内容，输出 `guide/guide.md`。通过 `guide/build_pdf.bat` 转换为 PDF（需要 Pandoc + XeLaTeX）。

## 视觉设计

深色中国水墨画风格主题。移动端优先布局（最大宽度 480px）。所有游戏美术均为 WebP 格式。`index.html` 中定义 8 个页面，通过 CSS 淡入淡出过渡切换。
