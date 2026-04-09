# 阵营过渡叙事优化设计

**日期:** 2026-04-09
**状态:** 待实施

## 问题

当前游戏在少年期结束后直接弹出一个静态的阵营三选一菜单界面，造成叙事断裂：

1. **没有过渡呼吸** — 少年期最后一个事件结果页点"继续"后，直接跳到机械化的阵营选择界面。代码跳过了少年期的过渡文本（"少年时光转瞬即逝……"），没有给玩家心理过渡。
2. **隐藏铺垫感知不到** — 少年期已有桃园结义（蜀+10）、协助曹操刺董（魏+8）、初遇孙坚（吴+8）等事件悄悄积累阵营亲和，但玩家无法感知这些选择的方向性，到选阵营时感觉是"凭空"选择。
3. **选择界面缺乏个人化** — 三张阵营卡片是静态的，无论少年期做了什么，看到的内容完全一样。

## 方案概述

用一个**叙事事件"诸侯散盟"**替代静态阵营选择界面。玩家不是在"选菜单"，而是在故事中做了一个决定。同时引入**半锁定机制**——少年期的关键选择会关闭某些阵营的大门。

## 一、流程改动

### 当前流程

```
少年期第5事件结果 → [继续] → 阵营三选一菜单（screen-faction） → 选择 → 阵营过渡文本
```

### 改进后流程

```
少年期第5事件结果 → [继续] → 过渡画面"少年时光转瞬即逝……" 
→ "诸侯散盟"叙事事件（与普通事件外观一致） → 选择 = 加入阵营 
→ 阵营过渡文本 → 崛起期开始
```

## 二、"诸侯散盟"叙事事件

### 事件数据

新建 `data/event-crossroads.json`，存放事件的静态骨架。动态部分（个性化段落、锁定判断）由 `game.js` 在运行时注入。

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
  "description_tail": "风云变幻，你必须做出选择。",
  "choices": [
    {
      "faction": "shu",
      "text": "追随刘备南下——大丈夫当以仁义立世",
      "result": "你翻身上马，向刘备的旗帜奔去。关羽远远地看见了你，微微一笑。张飞则大声吆喝：'好！又多一位兄弟！'从此，你的命运与这支仁义之师紧紧相连。",
      "lock_threshold": 40,
      "lock_reason": "刘备已不再信任你"
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
      "lock_reason": "你与江东毫无渊源"
    }
  ]
}
```

### 动态描述生成逻辑

`game.js` 新增 `getCrossroadsEvent()` 方法，组装最终事件：

1. 以 `description_base` 为基础
2. 检查 `state.flags` 和阵营亲和值，选择最匹配的 `description_hooks` 条目插入：
   - 有 `befriend_guanyu` flag → 插入桃园相关文本
   - `魏` 亲和 >= 55 → 插入曹操招揽文本
   - `吴` 亲和 >= 55 → 插入孙坚邀请文本
   - 若以上均不满足 → 使用 `default` 文本
   - 可叠加多条（如同时有桃园flag和高魏亲和，则两条都显示）
3. 追加 `description_tail`
4. 对每个 choice 检查锁定条件（亲和值 < `lock_threshold`），标记 `locked: true` 和 `lock_reason`
5. 安全阀：若锁定导致可选项 < 2，强制解锁亲和值最高的那个

### 亲和加成

若玩家选择的阵营恰好是亲和值最高的，进入崛起期时获得一个小buff（对应阵营亲和+3），result 文本追加："你与此间众人一见如故，如鱼得水。"

## 三、半锁定机制

### 锁定判定

基于阵营亲和值：`hidden[阵营] < 40` → 该选项锁定。

起始值均为 50。少年期能显著影响亲和的事件：

| 事件 | 选择 | 效果 |
|------|------|------|
| 桃园结义 `rise_04` | 接受结义 | 蜀+10 |
| 曹操刺董 `youth_caocao_young` | 协助 | 魏+8 |
| 曹操刺董 `youth_caocao_young` | **告发曹操** | **魏-15**（50→35，触发锁定） |
| 初遇孙坚 `youth_sunjian` | 请求加入 | 吴+8 |
| 黄巾围村 `youth_huangjin` | 加入刘备 | 蜀+5 |

实际上只有**告发曹操**会导致魏线被锁（50-15=35 < 40）。蜀/吴无大幅降低事件，几乎不会被锁。这符合叙事逻辑——曹操不会接纳叛徒，而刘备仁德不拒人、孙家广纳贤才。

### 锁定的表现

锁定选项**不隐藏**，灰显+不可点击+显示锁定原因：

```
[正常] 追随刘备南下——大丈夫当以仁义立世

[正常] 随孙坚渡江南下——江东天险，大有可为

[🔒 锁定] 投奔曹操东归
  "你曾向董卓告发曹操的行踪，此仇不共戴天。曹营的大门，已对你永远关闭。"
```

### 安全阀

若锁定导致可选项 < 2，强制解锁亲和值最高的被锁选项，显示文本改为"虽缘分浅薄，但尚可一试"。

## 四、代码变更

### 新增文件

| 文件 | 说明 |
|------|------|
| `data/event-crossroads.json` | 诸侯散盟事件模板数据 |

### `js/data-loader.js`

在 `loadAllData()` 中新增加载 `event-crossroads.json`，将结果挂到返回对象的 `crossroadsEvent` 字段。

### `js/game.js`

**构造函数变更：**
- 接收 `data.crossroadsEvent` 并保存到 `this.crossroadsEvent`

**新增方法：**
1. `getCrossroadsEvent()` — 读取模板，根据 `state.flags` 和阵营亲和值：
   - 生成动态描述（插入个性化段落）
   - 标记每个 choice 的 `locked` 状态和 `lock_reason`
   - 执行安全阀检查
   - 返回完整事件对象（含 `isCrossroads: true` 标记）

2. `applyCrossroadsChoice(choiceIndex)` — 处理阵营选择：
   - 获取对应 choice 的 `faction` 字段
   - 调用已有的 `selectFaction(faction)`
   - 判断亲和加成并应用
   - 返回 `{ result, effects, factionSelected: factionId }`

3. `getAffinityBonus(factionId)` — 判断所选阵营是否为亲和最高，返回 `{ hasBonus, bonusText }`

**无需修改的方法：**
- `selectFaction()` — 已有，复用
- `loadFactionPhases()` — 已有，复用
- `getFactionTransition()` — 已有，复用
- `needsFactionChoice()` — 已有，复用（仍用于判断是否需要阵营选择）
- `_pickPhaseEvents()` — 无需修改
- `applyChoice()` — 无需修改（crossroads 走独立路径）

### `js/main.js`

**修改 `handlePhaseEnd()`：**

```
当前: needsFactionChoice() → ui.renderFactionChoice()
改后: needsFactionChoice() → ui.renderTransition(过渡文本) → 显示crossroads事件
```

先显示少年期过渡文本（"少年时光转瞬即逝……"），然后渲染 crossroads 事件。

**修改 `onChoice` 回调：**

检测返回值中是否包含 `factionSelected` 字段。若存在，走阵营加载流程（复用现有的 `loadFactionData` → `loadFactionPhases` → 过渡动画逻辑）。

**修改初始化逻辑：**

旧存档兼容：`needsRetroactiveFactionChoice()` 时也显示 crossroads 事件而非旧的选择界面。

### `js/ui.js`

**修改 `renderEvent()`：**

新增对 `choice.locked` 的处理：若 choice 带 `locked: true`，渲染为灰色不可点击状态，显示 `lock_reason` 文本。

**可删除：**
- `renderFactionChoice()` 方法
- 相关的 `screen-faction` 页面引用

### `index.html`

可选：移除 `<div id="screen-faction">` DOM 节点（被叙事事件完全替代）。

### `css/style.css`

**新增锁定选项样式：**

```css
.choice-btn.choice-locked {
  opacity: 0.4;
  cursor: not-allowed;
  border-color: var(--text-dim);
}
.choice-lock-reason {
  font-size: 11px;
  color: var(--text-muted);
  font-style: italic;
  margin-top: 4px;
}
```

**可删除：** `.faction-content`、`.faction-card` 等旧阵营选择界面样式（约60行）。

## 五、工作量估算

| 模块 | 工作量 |
|------|--------|
| `data/event-crossroads.json` | 小（事件模板数据） |
| `js/game.js` | 中等（3个新方法 + 构造函数改动） |
| `js/main.js` | 较小（流程编排调整） |
| `js/ui.js` | 较小（锁定选项渲染 + 删除旧代码） |
| `js/data-loader.js` | 很小（加载1个新文件） |
| `css/style.css` | 很小（新增锁定样式 + 删除旧样式） |
| `index.html` | 很小（可选删除旧DOM） |
