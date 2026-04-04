# 设计：隐藏选项属性效果 + 结果揭示动画

**日期**：2026-04-04
**状态**：已确认

## 背景

当前游戏中，玩家在选择选项时可以直接看到属性变化值（如 `武+5 · 德-2`），这降低了决策的紧张感和未知性。需要改为：选择前隐藏效果，选择后再揭示属性变化。

## 设计方案

### 1. 选项按钮改造（`ui.js` renderEvent）

**当前行为**：每个选项按钮包含两行 — 选项文字 + 属性效果文本（如 `武+5 · 德-2`）。

**改为**：
- **普通选项**：只显示选项文字，完全移除 `choice-effects` 区域
- **危险选项**（带 `crisis_trigger` 或 `crisis_check`）：显示选项文字 + `⚠️ 危险` 标记，不显示具体判定数值（如 `武≥50`）
- 按钮的 `choice-danger` 红色样式保留不变

**具体改动**：`renderEvent()` 中构建按钮 HTML 时，移除 `effectsText` 的计算和 `choice-effects` div。危险选项只在文字区域追加 `⚠️ 危险` 标记。

### 2. 结果页揭示动画（`ui.js` renderResult + `css/style.css`）

**当前行为**：所有 `effect-badge` 徽章同时出现。

**改为**：
- 属性变化徽章使用 CSS `@keyframes` 动画，从 `opacity: 0; transform: translateY(8px)` 渐变到正常位置
- 每个徽章通过 `animation-delay` 依次出现，间隔 200ms
- 第一个徽章延迟 300ms，让玩家先读完结果叙述文本
- 死亡徽章（`💀 命陨`）和危机化解徽章（`✅ 危机化解`）参与同样的动画序列
- 通过内联 `style` 设置 `animation-delay`（因为数量不固定）

**CSS 动画定义**：
```css
@keyframes badge-reveal {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

.effect-badge {
  opacity: 0;
  animation: badge-reveal 0.4s ease forwards;
}
```

**JS 中设置延迟**：
```javascript
badge.style.animationDelay = `${300 + index * 200}ms`;
```

### 3. 不改动的部分

| 文件/模块 | 说明 |
|-----------|------|
| `js/game.js` | 零改动，数据源和逻辑完全不变 |
| `js/main.js` | 零改动，回调连接不变 |
| `data/*.json` | 零改动 |
| `renderResult()` 的调用接口 | 参数和调用方式不变，仅内部渲染加动画 |

## 涉及文件

| 文件 | 改动类型 |
|------|----------|
| `js/ui.js` | 修改 `renderEvent()`：移除效果文本；修改 `renderResult()`：添加动画延迟 |
| `css/style.css` | 新增 `badge-reveal` 动画关键帧；修改 `.effect-badge` 样式 |

## 验证方式

1. 启动本地服务器，进入游戏
2. 选择角色后进入事件，确认选项按钮不显示属性效果值
3. 确认危险选项只显示 `⚠️ 危险` 标记，不显示判定数值
4. 选择后进入结果页，确认属性变化徽章逐个弹出，有延迟动画效果
5. 触发死亡/危机场景，确认特殊徽章也有同样动画
