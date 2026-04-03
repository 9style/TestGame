# 事件插画生成 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 generate_images.py 中追加 25 个事件插画提示词，在事件 JSON 中添加 image 字段，修改 ui.js 展示事件插画。

**Architecture:** 复用现有 generate_images.py 的生成逻辑，追加 PROMPTS 条目；在 4 个阶段 JSON 中给精选事件加 `"image"` 字段；扩展 ui.js 已有的危机插画逻辑支持普通事件插画。

**Tech Stack:** Python 3 + requests（图片生成），原生 JS ES Modules（UI）

---

## 文件结构

| 文件 | 操作 | 职责 |
|------|------|------|
| `generate_images.py` | 修改 | 追加 25 个事件提示词，subdirs 加 `"events"` |
| `data/events-youth.json` | 修改 | 6 个事件加 `"image"` 字段 |
| `data/events-rise.json` | 修改 | 7 个事件加 `"image"` 字段 |
| `data/events-war.json` | 修改 | 7 个事件加 `"image"` 字段 |
| `data/events-final.json` | 修改 | 5 个事件加 `"image"` 字段 |
| `js/ui.js` | 修改 | 扩展事件插画显示逻辑 |

---

## Task 1: 在 generate_images.py 中追加事件提示词

**Files:**
- Modify: `generate_images.py:193` (PROMPTS 字典末尾)
- Modify: `generate_images.py:254` (subdirs 列表)

- [ ] **Step 1: 在 PROMPTS 字典末尾追加 25 个事件条目**

在 `generate_images.py` 中，找到 PROMPTS 字典最后一个条目（`"phases/final"` 结尾的 `},`）后面、字典闭合 `}` 之前，插入以下内容：

```python
    # ----------------------------------------------------------
    # 事件插画 (16:9 宽幅 1920x1080)
    # ----------------------------------------------------------

    # 少年期
    "events/youth_01": {
        "prompt": f"三国时期虎牢关前，吕布手持方天画戟独战刘关张三人，远处少年在土丘上惊叹旁观，尘土飞扬战马嘶鸣，{STYLE}，宽银幕电影画面",
        "size": "1920x1080",
    },
    "events/youth_04": {
        "prompt": f"三国时期山间小路，少年手持木棍与一只饥饿猛虎对峙，密林中光影斑驳，紧张凝重的气氛，{STYLE}，宽银幕电影画面",
        "size": "1920x1080",
    },
    "events/youth_huangjin": {
        "prompt": f"三国时期黄巾贼寇火烧村庄，三骑英雄从远处疾驰而来救援，村民奔逃火光冲天，烽烟乱世，{STYLE}，宽银幕电影画面",
        "size": "1920x1080",
    },
    "events/youth_dongzhuo": {
        "prompt": f"三国时期洛阳城门，董卓率西凉铁骑鱼贯入城，铁甲森严旌旗蔽日，百姓惊恐退避街旁，阴云压城，{STYLE}，宽银幕电影画面",
        "size": "1920x1080",
    },
    "events/youth_doctor": {
        "prompt": f"三国时期山间小路，一位衣衫褴褛的中年郎中背着沉重药箱独行，身旁少年上前搀扶，晨雾弥漫宁静祥和，{STYLE}，宽银幕电影画面",
        "size": "1920x1080",
    },
    "events/youth_sunjian": {
        "prompt": f"三国时期讨董联军营地，孙坚身披战甲骑高头大马率部经过，旌旗猎猎铁骑如龙，少年在路旁仰望英雄，{STYLE}，宽银幕电影画面",
        "size": "1920x1080",
    },

    # 崛起期
    "events/rise_02": {
        "prompt": f"三国时期战场，年轻将领第一次率兵出战，面对两倍敌军严阵以待，战鼓擂响旌旗飘扬，紧张而热血沸腾，{STYLE}，宽银幕电影画面",
        "size": "1920x1080",
    },
    "events/rise_04": {
        "prompt": f"三国时期桃花盛开的园中，三位英雄焚香跪拜结为兄弟，桃花纷飞香烟缭绕，义薄云天的庄严时刻，{STYLE}，宽银幕电影画面",
        "size": "1920x1080",
    },
    "events/rise_08": {
        "prompt": f"三国时期攻城战，士兵架云梯攀登高大城墙，城上箭矢如雨滚木齐下，攻守双方激烈搏杀，硝烟弥漫，{STYLE}，宽银幕电影画面",
        "size": "1920x1080",
    },
    "events/rise_guandu": {
        "prompt": f"三国时期官渡之战，曹操与袁绍两军隔河对峙，营帐绵延旌旗如林，夜色中曹军偷袭粮仓火光映天，{STYLE}，宽银幕电影画面",
        "size": "1920x1080",
    },
    "events/rise_sangu": {
        "prompt": f"三国时期隆冬大雪纷飞，刘备恭敬站在茅庐门前叩门求见，草庐覆雪竹林银装素裹，求贤若渴的虔诚，{STYLE}，宽银幕电影画面",
        "size": "1920x1080",
    },
    "events/rise_sunce_jiangdong": {
        "prompt": f"三国时期孙策率骑兵渡江南下，白马银枪意气风发，身后战船铺满江面，所向披靡平定江东的霸气，{STYLE}，宽银幕电影画面",
        "size": "1920x1080",
    },
    "events/rise_diaochan": {
        "prompt": f"三国时期月夜花园中，貂蝉翩翩起舞美若天仙，月光如水洒在亭台楼阁间，暗处吕布凝望，美人计暗流涌动，{STYLE}，宽银幕电影画面",
        "size": "1920x1080",
    },

    # 争霸期
    "events/war_01": {
        "prompt": f"三国时期赤壁长江之上，孙刘联军战船与曹操水寨隔江对峙，江面雾气弥漫战旗猎猎，大战一触即发，{STYLE}，宽银幕电影画面",
        "size": "1920x1080",
    },
    "events/war_chibi": {
        "prompt": f"三国时期赤壁之战，东南风起火船冲入曹操连环水寨，冲天大火映红长江水面，战船在火海中燃烧，史诗级决战，{STYLE}，宽银幕电影画面",
        "size": "1920x1080",
    },
    "events/war_changbanpo": {
        "prompt": f"三国时期长坂坡，赵子龙白马银枪怀抱幼主在曹军万马中左冲右突，血染战袍英勇无双，尘土漫天，{STYLE}，宽银幕电影画面",
        "size": "1920x1080",
    },
    "events/war_dingjunshan": {
        "prompt": f"三国时期定军山，老将黄忠居高临下策马冲锋，大刀高举斩向夏侯渊，山势险峻军旗猎猎，以老胜壮的气魄，{STYLE}，宽银幕电影画面",
        "size": "1920x1080",
    },
    "events/war_hefei": {
        "prompt": f"三国时期合肥城外，张辽率八百骑兵冲入孙权十万大军阵中，以少击多势不可挡，威震逍遥津的霸气，{STYLE}，宽银幕电影画面",
        "size": "1920x1080",
    },
    "events/war_guanyu_maicheng": {
        "prompt": f"三国时期麦城之夜，关羽手提青龙偃月刀立于残破城头，身边仅余数十残兵，四面楚歌形容憔悴，英雄末路的悲壮，{STYLE}，宽银幕电影画面",
        "size": "1920x1080",
    },
    "events/war_baiyi": {
        "prompt": f"三国时期长江上，数艘商船在夜色中悄然渡江，船上白衣兵士隐藏兵器伪装商人，月光照水暗流涌动，{STYLE}，宽银幕电影画面",
        "size": "1920x1080",
    },

    # 终局期
    "events/final_01": {
        "prompt": f"三国时期最终决战，两支大军在平原上正面对决，万马奔腾战旗遮天，铁骑冲锋尘土蔽日，决定天下的终极之战，{STYLE}，宽银幕电影画面",
        "size": "1920x1080",
    },
    "events/final_02": {
        "prompt": f"三国时期白帝城，病榻上的主公握着重臣的手将幼子托付，烛光摇曳泪眼朦胧，沉重而感人的托孤场景，{STYLE}，宽银幕电影画面",
        "size": "1920x1080",
    },
    "events/final_wuzhangyuan": {
        "prompt": f"三国时期五丈原军帐中，诸葛亮病卧帐中手持羽扇，案上摊开的北伐地图和未燃尽的蜡烛，秋风吹入帐帘，{STYLE}，宽银幕电影画面",
        "size": "1920x1080",
    },
    "events/final_simayi": {
        "prompt": f"三国时期洛阳城，司马懿率甲兵控制宫门发动政变，黎明时分宫殿前刀兵林立紧张肃杀，权力更迭的关键时刻，{STYLE}，宽银幕电影画面",
        "size": "1920x1080",
    },
    "events/final_unification": {
        "prompt": f"三国时期天下归一，新朝大殿上百官朝拜新帝，阳光穿过殿门照亮大殿，三面降旗陈列殿侧，统一的庄严时刻，{STYLE}，宽银幕电影画面",
        "size": "1920x1080",
    },
```

- [ ] **Step 2: 在 subdirs 列表中追加 `"events"`**

在 `generate_images.py` 中，找到：
```python
    subdirs = ["characters", "endings", "crisis", "phases"]
```
改为：
```python
    subdirs = ["characters", "endings", "crisis", "phases", "events"]
```

- [ ] **Step 3: 验证脚本语法正确**

```bash
cd G:/TestGame
python -c "import generate_images; print(f'Total prompts: {len(generate_images.PROMPTS)}')"
```

预期输出：`Total prompts: 59`（原 34 + 新 25）

- [ ] **Step 4: 提交**

```bash
cd G:/TestGame
git add generate_images.py
git commit -m "feat: 添加25个事件插画提示词到generate_images.py"
```

---

## Task 2: 在事件 JSON 中添加 image 字段

**Files:**
- Modify: `data/events-youth.json`
- Modify: `data/events-rise.json`
- Modify: `data/events-war.json`
- Modify: `data/events-final.json`

- [ ] **Step 1: 修改 `data/events-youth.json`，给 6 个事件加 `"image"` 字段**

在以下 6 个事件中，在 `"title"` 行之后、`"description"` 行之前，插入 `"image"` 字段：

对于 id 为 `youth_01` 的事件，找到：
```json
      "id": "youth_01",
      "title": "虎牢关前的少年",
      "description":
```
改为：
```json
      "id": "youth_01",
      "title": "虎牢关前的少年",
      "image": "images/events/youth_01.png",
      "description":
```

同样处理以下 5 个事件（每个都在 `"title"` 后插入 `"image"` 行）：
- `youth_04`：`"image": "images/events/youth_04.png"`
- `youth_huangjin`：`"image": "images/events/youth_huangjin.png"`
- `youth_dongzhuo`：`"image": "images/events/youth_dongzhuo.png"`
- `youth_doctor`：`"image": "images/events/youth_doctor.png"`
- `youth_sunjian`：`"image": "images/events/youth_sunjian.png"`

- [ ] **Step 2: 修改 `data/events-rise.json`，给 7 个事件加 `"image"` 字段**

同样方式，在 `"title"` 后、`"description"` 前插入：
- `rise_02`：`"image": "images/events/rise_02.png"`
- `rise_04`：`"image": "images/events/rise_04.png"`
- `rise_08`：`"image": "images/events/rise_08.png"`
- `rise_guandu`：`"image": "images/events/rise_guandu.png"`
- `rise_sangu`：`"image": "images/events/rise_sangu.png"`
- `rise_sunce_jiangdong`：`"image": "images/events/rise_sunce_jiangdong.png"`
- `rise_diaochan`：`"image": "images/events/rise_diaochan.png"`

- [ ] **Step 3: 修改 `data/events-war.json`，给 7 个事件加 `"image"` 字段**

- `war_01`：`"image": "images/events/war_01.png"`
- `war_chibi`：`"image": "images/events/war_chibi.png"`
- `war_changbanpo`：`"image": "images/events/war_changbanpo.png"`
- `war_dingjunshan`：`"image": "images/events/war_dingjunshan.png"`
- `war_hefei`：`"image": "images/events/war_hefei.png"`
- `war_guanyu_maicheng`：`"image": "images/events/war_guanyu_maicheng.png"`
- `war_baiyi`：`"image": "images/events/war_baiyi.png"`

- [ ] **Step 4: 修改 `data/events-final.json`，给 5 个事件加 `"image"` 字段**

- `final_01`：`"image": "images/events/final_01.png"`
- `final_02`：`"image": "images/events/final_02.png"`
- `final_wuzhangyuan`：`"image": "images/events/final_wuzhangyuan.png"`
- `final_simayi`：`"image": "images/events/final_simayi.png"`
- `final_unification`：`"image": "images/events/final_unification.png"`

- [ ] **Step 5: 验证 JSON 格式正确**

```bash
cd G:/TestGame
python -c "
import json
for f in ['events-youth.json','events-rise.json','events-war.json','events-final.json']:
    data = json.load(open(f'data/{f}', encoding='utf-8'))
    events = data['events']
    with_img = [e['id'] for e in events if 'image' in e]
    print(f'{f}: {len(with_img)} events with image')
"
```

预期输出：
```
events-youth.json: 6 events with image
events-rise.json: 7 events with image
events-war.json: 7 events with image
events-final.json: 5 events with image
```

- [ ] **Step 6: 提交**

```bash
cd G:/TestGame
git add data/events-youth.json data/events-rise.json data/events-war.json data/events-final.json
git commit -m "feat: 给25个精选事件添加image字段"
```

---

## Task 3: 修改 ui.js 支持事件插画显示

**Files:**
- Modify: `js/ui.js:110-121`

- [ ] **Step 1: 修改 `js/ui.js` 中的 `renderEvent` 方法**

在 `js/ui.js` 中，找到以下代码块（第 110-121 行）：

```javascript
    // Show crisis illustration if applicable
    const existingIllustration = document.querySelector('.event-illustration');
    if (existingIllustration) existingIllustration.remove();
    if (event.isCrisis && event.crisis_type) {
      const img = document.createElement('img');
      img.className = 'event-illustration';
      img.src = `images/crisis/${event.crisis_type}.png`;
      img.alt = event.title;
      img.onerror = () => img.remove();
      const eventContent = document.querySelector('.event-content');
      eventContent.insertBefore(img, document.getElementById('event-title'));
    }
```

替换为：

```javascript
    // Show event illustration (crisis or regular event image)
    const existingIllustration = document.querySelector('.event-illustration');
    if (existingIllustration) existingIllustration.remove();
    const imgSrc = event.isCrisis && event.crisis_type
      ? `images/crisis/${event.crisis_type}.png`
      : event.image || null;
    if (imgSrc) {
      const img = document.createElement('img');
      img.className = 'event-illustration';
      img.src = imgSrc;
      img.alt = event.title;
      img.style.opacity = '0';
      img.onload = () => { img.style.transition = 'opacity 0.5s'; img.style.opacity = '1'; };
      img.onerror = () => img.remove();
      const eventContent = document.querySelector('.event-content');
      eventContent.insertBefore(img, document.getElementById('event-title'));
    }
```

变更说明：
- 危机事件：仍使用 `images/crisis/{crisis_type}.png`（行为不变）
- 普通事件：使用 `event.image` 字段（来自 JSON）
- 无图事件：`imgSrc` 为 null，不插入图片
- 淡入动画：初始 `opacity: 0`，加载完成后过渡到 `1`
- 加载失败：静默移除图片元素

- [ ] **Step 2: 在浏览器中验证**

```bash
cd G:/TestGame
python -m http.server 8080
```

打开 `http://localhost:8080`，选择角色进入游戏：
- 遇到有 `image` 字段的事件（如 `youth_01` 虎牢关）时，应看到插画（需图片文件已存在）
- 遇到无 `image` 字段的事件时，应与之前一致（纯文字）
- 图片不存在时，应静默不显示（不出现破图标）

- [ ] **Step 3: 提交**

```bash
cd G:/TestGame
git add js/ui.js
git commit -m "feat: 支持事件插画显示（淡入动画+静默降级）"
```

---

## Task 4: 运行图片生成脚本

**Files:**
- 生成: `images/events/*.png`（25 张图片）

- [ ] **Step 1: 运行生成脚本**

```bash
cd G:/TestGame
python -X utf8 generate_images.py
```

脚本会自动跳过已存在的 34 张旧图，只生成 25 张新的事件插画。
预计耗时取决于 API 速度（每张约 10-30 秒，总计约 5-15 分钟）。

- [ ] **Step 2: 验证生成结果**

```bash
cd G:/TestGame
python -c "
import os
expected = [
    'youth_01','youth_04','youth_huangjin','youth_dongzhuo','youth_doctor','youth_sunjian',
    'rise_02','rise_04','rise_08','rise_guandu','rise_sangu','rise_sunce_jiangdong','rise_diaochan',
    'war_01','war_chibi','war_changbanpo','war_dingjunshan','war_hefei','war_guanyu_maicheng','war_baiyi',
    'final_01','final_02','final_wuzhangyuan','final_simayi','final_unification',
]
ok = 0
for name in expected:
    path = f'images/events/{name}.png'
    exists = os.path.exists(path)
    size = os.path.getsize(path) // 1024 if exists else 0
    print(f\"{'✅' if exists else '❌'} {name}.png ({size} KB)\")
    if exists: ok += 1
print(f'\n{ok}/{len(expected)} generated')
"
```

预期：25/25 generated

- [ ] **Step 3: 在浏览器中完整验证**

```bash
cd G:/TestGame
python -m http.server 8080
```

开始游戏，验证事件插画：
- 有图事件显示插画（淡入动画）
- 无图事件正常显示纯文字
- 图片尺寸适配页面宽度

---

## 自查：规格覆盖检查

| 规格要求 | 对应 Task | 状态 |
|---------|-----------|------|
| 25 个事件提示词追加到 PROMPTS | Task 1 Step 1 | ✅ |
| subdirs 追加 "events" | Task 1 Step 2 | ✅ |
| 尺寸 1920x1080 | Task 1 Step 1 (所有条目 size) | ✅ |
| 风格复用 STYLE 前缀 | Task 1 Step 1 (所有条目含 {STYLE}) | ✅ |
| 提示词结尾加"宽银幕电影画面" | Task 1 Step 1 | ✅ |
| 6 个少年期事件加 image 字段 | Task 2 Step 1 | ✅ |
| 7 个崛起期事件加 image 字段 | Task 2 Step 2 | ✅ |
| 7 个争霸期事件加 image 字段 | Task 2 Step 3 | ✅ |
| 5 个终局期事件加 image 字段 | Task 2 Step 4 | ✅ |
| image 字段放在 title 后 description 前 | Task 2 Steps 1-4 | ✅ |
| UI: 有图显示插画（width:100%, 圆角） | Task 3 Step 1 (复用 .event-illustration CSS) | ✅ |
| UI: 淡入动画 0→1, 0.5s | Task 3 Step 1 (opacity transition) | ✅ |
| UI: 加载失败静默隐藏 | Task 3 Step 1 (onerror → remove) | ✅ |
| UI: 无图保持纯文字 | Task 3 Step 1 (imgSrc null 时不插入) | ✅ |
| 危机插画行为不变 | Task 3 Step 1 (优先判断 crisis) | ✅ |
