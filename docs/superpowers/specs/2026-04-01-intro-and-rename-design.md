# 重生之我在三国争霸 — 游戏改名 & 背景介绍页设计

## 概述

两项改动：
1. 游戏全面改名：「三国武将录」→「重生之我在三国争霸」
2. 在"开始征途"按钮与角色选择之间新增一个历史背景介绍页

## 1. 游戏改名

### 涉及位置

| 位置 | 原文 | 新文 |
|------|------|------|
| `index.html` `<title>` | 三国武将录 | 重生之我在三国争霸 |
| `index.html` `#screen-title .title-main` | 三国武将录 | 重生之我在三国争霸 |
| `index.html` `#screen-title .title-subtitle` | 乱世群雄 | 魂穿乱世 |
| `index.html` `#screen-title .title-tagline` | —— 你的选择，决定你的命运 —— | —— 重生三国，争霸天下 —— |
| `CLAUDE.md` 项目描述 | 三国武将录 | 重生之我在三国争霸 |

### localStorage 键名

保持 `sgwjl_save` 和 `sgwjl_endings` 不变，避免玩家丢失已有存档和解锁进度。

## 2. 背景介绍页（Intro Screen）

### 触发时机

```
标题页 → 点击"开始征途" → 【背景介绍页】 → 点击"开始你的三国人生" → 角色选择页
```

仅在新游戏时展示。若有存档自动恢复，不显示 intro。

### 文案内容（混合叙事）

分为 3 段，逐段淡入展示：

**第一段 — 穿越（第一人称）：**
> 一道刺目的白光闪过，意识仿佛被撕裂又重组。当我再次睁开双眼，眼前不再是熟悉的都市，而是一片烽烟弥漫的苍茫大地。

**第二段 — 三国背景：**
> 东汉末年，桓灵失德，宦官弄权，天下纷乱。黄巾揭竿而起，群雄逐鹿中原。曹操挟天子以令诸侯，刘备携仁义之名转战四方，孙氏据江东虎视天下——一个英雄辈出、也尸骨如山的时代。

**第三段 — 过渡引导：**
> 而你，一个来自千年之后的灵魂，将在这乱世中醒来，化身为一位武将。你的每一个选择，都将改写这段历史的走向。

底部按钮文字：**「开始你的三国人生」**

### 展示方式

- 单页滚动展示，居中排版
- 3 段文字依次淡入（每段间隔 0.8s，动画时长 1s）
- 按钮在最后一段淡入后出现
- 点击按钮跳转角色选择页
- 整体视觉风格与标题页一致（深色背景、金色/暖色文字）

### UI 样式

- 背景：与标题页相同的 `linear-gradient(180deg, var(--bg-deep), var(--bg-mid))`
- 文字颜色：`var(--text-secondary)` 正文，对话句用 `var(--gold)` 高亮
- 段间距：24px
- 字号：14px，行高 2.2
- 按钮样式：复用 `.btn-primary`

## 3. 技术实现

### 改动文件

| 文件 | 改动 |
|------|------|
| `index.html` | 改名 + 新增 `#screen-intro` div |
| `css/style.css` | 新增 `.intro-content` 等样式 + 逐段淡入动画 |
| `js/ui.js` | 新增 `renderIntro(callback)` 方法，注册到 `this.screens` |
| `js/main.js` | `onStart` 回调改为先调用 `ui.renderIntro()`，intro 结束后调用 `showCharacterSelect()` |

### 不改动

- `js/game.js` — 无游戏逻辑变化
- `js/data-loader.js` — 无数据变化
- `data/*.json` — 无数据变化
- localStorage 键名 — 保持不变

### HTML 结构

在 `#screen-title` 之后新增：

```html
<div id="screen-intro" class="screen">
  <div class="intro-content">
    <p class="intro-paragraph intro-p1">第一段文字...</p>
    <p class="intro-paragraph intro-p2">第二段文字...</p>
    <p class="intro-paragraph intro-p3">第三段文字...</p>
    <button id="btn-intro-continue" class="btn btn-primary">开始你的三国人生</button>
  </div>
</div>
```

### 淡入动画

```css
.intro-paragraph {
  opacity: 0;
  animation: fadeIn 1s ease-in forwards;
}
.intro-p1 { animation-delay: 0.3s; }
.intro-p2 { animation-delay: 1.1s; }
.intro-p3 { animation-delay: 1.9s; }
#btn-intro-continue {
  opacity: 0;
  animation: fadeIn 1s ease-in forwards;
  animation-delay: 2.7s;
}
```

### main.js 流程变更

```
// 原流程
onStart → showCharacterSelect()

// 新流程
onStart → ui.renderIntro() → 用户点击按钮 → showCharacterSelect()
```
