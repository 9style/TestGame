# 叙事硬锁定机制设计

**日期:** 2026-04-10
**状态:** 待实施

## 问题

当前半锁定机制（亲和值<40）实际上从未触发，导致严重的叙事逻辑冲突：

1. **桃园结义后投靠曹操** — 你和关羽"誓同生死"，然后可以加入曹操
2. **协助曹操刺董后投靠刘备** — 你冒死救曹操，然后可以加入他的死敌
3. **加入孙坚军后投靠曹操** — 孙坚邀请你"日后有难可来江东"，然后你可以无视

## 方案概述

用**叙事flag硬锁定**替代亲和值软锁定。当玩家做出具有强烈叙事绑定的选择时，直接锁定对立阵营。

## 一、锁定规则

### 触发锁定的核心flag

| Flag | 来源事件 | 锁定阵营 | 锁定原因 |
|------|----------|----------|----------|
| `befriend_guanyu` | rise_04 桃园结义 | 魏、吴 | "你已与我结为兄弟，岂能背弃桃园之誓，投效曹贼/孙氏？" |
| `assisted_caocao_assassination` | youth_caocao_young 协助刺董 | 蜀 | "你曾助曹操刺董，与曹家有生死之恩，刘备乃汉室宗亲，岂能容你？" |
| `served_sunjian` | youth_sunjian 加入孙坚军 | 魏 | "孙坚待你不薄，且曾邀你共图大业，此时投奔曹操，岂非背信弃义？" |

### 不触发锁定的普通flag

以下flag只增加亲和值，不触发硬锁定：
- `helped_huatuo` — 帮助华佗（救治任何一方伤兵）
- `orphan_rescued` — 救助孤儿（送往任何一方）
- `joined_coalition` — 加入反董联盟
- `witnessed_lianbuan` — 目睹连环计
- 其他所有只加+2/+3亲和的事件flag

## 二、代码变更

### data/event-crossroads.json

修改每个choice的lock逻辑，从纯亲和值判断改为flag+亲和值双重判断：

```json
{
  "faction": "wei",
  "text": "投奔曹操东归——唯有铁腕方能平乱",
  "result": "...",
  "lock_flags": ["befriend_guanyu", "served_sunjian"],
  "lock_reason_befriend_guanyu": "你已与关羽结为兄弟，誓同生死，岂能背弃桃园之誓，投效曹贼？",
  "lock_reason_served_sunjian": "孙坚待你不薄，且曾邀你共图大业，此时投奔曹操，岂非背信弃义？",
  "lock_threshold": 40
}
```

### js/game.js

修改 `getCrossroadsEvent()` 中的锁定判断逻辑：

```javascript
// 旧逻辑：只看亲和值
const locked = affinityValue < (c.lock_threshold || 0);

// 新逻辑：flag硬锁定优先，其次看亲和值
let locked = false;
let lockReason = null;

// 检查flag硬锁定
if (c.lock_flags) {
  for (const flag of c.lock_flags) {
    if (this.state.flags.includes(flag)) {
      locked = true;
      lockReason = c[`lock_reason_${flag}`];
      break;
    }
  }
}

// 如果没有flag锁定，再看亲和值软锁定
if (!locked && affinityValue < (c.lock_threshold || 0)) {
  locked = true;
  lockReason = c.lock_reason;
}
```

### data/events-youth.json

添加缺失的flag：

1. `youth_caocao_young` — "协助曹操刺杀董卓" choice 添加 `set_flags: ["assisted_caocao_assassination"]`
2. `youth_sunjian` — "请求加入孙坚的军队" choice 添加 `set_flags: ["served_sunjian"]`

## 三、锁定后的表现

被flag锁定的选项：
- 灰显，不可点击
- 显示🔒图标
- 显示具体的锁定原因（根据触发锁定的flag）

示例：
```
[🔒 锁定] 投奔曹操东归
  "你已与关羽结为兄弟，誓同生死，岂能背弃桃园之誓，投效曹贼？"
```

## 四、边界情况处理

### 多个flag同时存在

如果玩家同时有 `befriend_guanyu` 和 `assisted_caocao_assassination`（理论上不可能，因为前者锁定魏，后者锁定蜀），优先显示先获得的flag的锁定原因。

### 安全阀仍然有效

如果玩家的选择导致所有3个阵营都被锁定（理论上不可能，因为flag是互斥的），安全阀会强制解锁亲和值最高的那个。

## 五、实施顺序

1. 修改 `data/events-youth.json` — 添加缺失的flag
2. 修改 `data/event-crossroads.json` — 添加lock_flags和lock_reason_XXX字段
3. 修改 `js/game.js` — 更新getCrossroadsEvent()锁定逻辑
4. 测试验证
