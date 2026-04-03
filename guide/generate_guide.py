#!/usr/bin/env python3
# generate_guide.py — 读取游戏JSON数据，生成攻略 Markdown 文件
# 运行方式：在项目根目录执行 python guide/generate_guide.py

import json
from pathlib import Path
import sys

# 把 guide/ 加入路径，使 templates 包可导入
sys.path.insert(0, str(Path(__file__).parent))
from templates.manual_content import (
    COVER, CHAPTER_1,
    CHARACTER_TIPS, CRISIS_TIPS, ENDING_ROUTES,
)

ROOT = Path(__file__).parent.parent          # G:/TestGame/
DATA = ROOT / "data"
OUTPUT = Path(__file__).parent / "guide.md"


def load_json(filename):
    path = DATA / filename
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"❌ 错误：找不到数据文件 {path}", file=sys.stderr)
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"❌ 错误：{filename} JSON 格式错误（第 {e.lineno} 行）：{e.msg}", file=sys.stderr)
        sys.exit(1)


# ── 辅助：将 conditions 字典转为可读字符串 ─────────────────────────────────────

def conditions_to_str(conditions: dict) -> str:
    """把 endings.json 中的 conditions 转成人类可读的条件字符串。"""
    if not conditions:
        return "无（兜底结局）"
    parts = []
    for key, val in conditions.items():
        if key == "no_extreme":
            parts.append("任意可见属性 30≤x≤85")
        elif isinstance(val, dict):
            if "min" in val and "max" in val:
                parts.append(f"{key}≥{val['min']} 且 {key}≤{val['max']}")
            elif "min" in val:
                parts.append(f"{key}≥{val['min']}")
            elif "max" in val:
                parts.append(f"{key}≤{val['max']}")
    return "，".join(parts) if parts else "无"


# ── 辅助：根据结局id给出难度星级 ──────────────────────────────────────────────

def ending_difficulty(ending: dict) -> str:
    difficulty_map = {
        "unify":        "★★★★★",
        "strategist":   "★★★★★",
        "invincible":   "★★★★",
        "wei_minister": "★★★★",
        "shu_guardian": "★★★",
        "wu_admiral":   "★★★★",
        "benevolent":   "★★★★★",
        "martyr":       "★★★★",
        "loyal":        "★★★",
        "chancellor":   "★★★★",
        "warlord":      "★★★",
        "hermit":       "★★★",
        "fallen":       "★★★",
        "bandit":       "★★",
        "betrayed":     "★★",
        "ordinary":     "★",
    }
    eid = ending["id"]
    if eid not in difficulty_map:
        print(f"⚠️  警告：结局 '{eid}' 未配置难度星级，使用默认值 ★★★", file=sys.stderr)
    return difficulty_map.get(eid, "★★★")


# ── 第二章：武将详解 ──────────────────────────────────────────────────────────

def attr_level(val: int) -> str:
    if val >= 35:
        return "高"
    if val >= 20:
        return "中"
    return "低"


def gen_chapter2(characters: list) -> str:
    lines = ["# 第二章：六位武将详解\n"]
    lines.append(
        "> 每局游戏只能选择一位武将。武将的初始属性决定了起点，"
        "但通过合理选择，任何武将都能达成大多数结局。\n"
    )
    for char in characters:
        icon = char.get("icon", "")
        name = char["name"]
        title = char["title"]
        attrs = char["attrs"]
        hidden = char["hidden"]
        cid = char["id"]
        tips = CHARACTER_TIPS.get(cid, {})

        lines.append(f"## {icon} {name}「{title}」\n")
        lines.append("| 属性 | 初始值 | 特点 |")
        lines.append("|------|--------|------|")
        for attr in ["武", "智", "德", "魅"]:
            v = attrs.get(attr, 0)
            lines.append(f"| {attr} | **{v}** | {attr_level(v)} |")
        lines.append("")
        fate = hidden.get("命运", "?")
        loyalty = hidden.get("忠义", "?")
        wei = hidden.get("魏", "?")
        shu = hidden.get("蜀", "?")
        wu = hidden.get("吴", "?")
        lines.append(
            f"**隐藏属性：** 命运 {fate} · 忠义 {loyalty} · "
            f"魏 {wei} · 蜀 {shu} · 吴 {wu}\n"
        )
        lines.append(f"**新手推荐指数：** {tips.get('stars', '⭐⭐⭐')}\n")
        lines.append(f"**推荐结局：** {tips.get('recommended_endings', '—')}\n")
        lines.append(f"**路线提示：** {tips.get('tip', '—')}\n")
        lines.append("---\n")
    return "\n".join(lines)


# ── 第三章：危机事件必读 ──────────────────────────────────────────────────────

CRISIS_EMOJI = {
    "crisis_illness":       "🤒",
    "crisis_assassination": "🗡️",
    "crisis_battle":        "⚔️",
    "crisis_execution":     "⛓️",
}

CRISIS_NAMES = {
    "crisis_illness":       "病入膏肓",
    "crisis_assassination": "月黑杀机",
    "crisis_battle":        "兵临绝境",
    "crisis_execution":     "秋后问斩",
}


def gen_chapter3(crisis_events: list) -> str:
    lines = ["# 第三章：危机事件必读\n"]
    lines.append(
        "> ⚠️ **危机事件**在每个阶段结束时可能触发（少年期免疫）。"
        "每种危机都有一个**安全出口**选项，代价较大但保证存活；"
        "其他选项需要属性判定，失败直接死亡。\n"
    )
    for crisis in crisis_events:
        cid = crisis["id"]
        emoji = CRISIS_EMOJI.get(cid, "⚠️")
        cname = CRISIS_NAMES.get(cid, crisis.get("title", cid))
        lines.append(f"## {emoji} {cname}\n")
        lines.append(f"**事件描述：** {crisis['description'][:80]}……\n")

        safe_choices = []
        check_choices = []
        for c in crisis["choices"]:
            if "crisis_check" in c:
                check_choices.append(c)
            else:
                safe_choices.append(c)

        if safe_choices:
            sc = safe_choices[0]
            effects = sc.get("effects", {})
            eff_str = "，".join(
                f"{k}{'+' if v > 0 else ''}{v}" for k, v in effects.items()
            )
            lines.append(f"**✅ 安全出口：**「{sc['text']}」")
            lines.append(f"  → 代价：{eff_str if eff_str else '无'}\n")

        if check_choices:
            lines.append("**🎲 判定选项：**")
            for cc in check_choices:
                check = cc.get("crisis_check", {})
                check_str = conditions_to_str(check)
                death = cc.get("death_ending", "死亡")
                lines.append(f"  - 「{cc['text']}」（需 {check_str}）")
                lines.append(f"    失败结果：触发「{death}」死亡结局")

        tip_data = CRISIS_TIPS.get(cid, {})
        if tip_data.get("tip"):
            lines.append(f"\n**💡 攻略建议：** {tip_data['tip']}\n")

        lines.append("---\n")
    return "\n".join(lines)


# ── 第四章：结局图鉴 ──────────────────────────────────────────────────────────

def gen_chapter4(endings_data: dict) -> str:
    endings = endings_data["endings"]
    lines = ["# 第四章：结局图鉴\n"]
    lines.append(
        "> 共 **20 种结局**（4 种死亡 + 16 种正常）。"
        "正常结局按顺序匹配，满足条件的第一个生效。\n"
    )

    lines.append("## 正常结局（16种）\n")
    lines.append("| 结局 | 图标 | 关键解锁条件 | 难度 |")
    lines.append("|------|------|------------|------|")
    normal_count = 0
    for e in endings:
        if e.get("isDeath"):
            continue
        icon = e.get("icon", "📜")
        cond = conditions_to_str(e.get("conditions", {}))
        diff = ending_difficulty(e)
        lines.append(f"| {e['name']} | {icon} | {cond} | {diff} |")
        normal_count += 1

    lines.append("")
    lines.append("## 死亡结局（4种）\n")
    lines.append("| 结局 | 图标 | 触发方式 |")
    lines.append("|------|------|---------|")
    death_triggers = {
        "death_illness":      "触发「病入膏肓」危机且判定失败",
        "death_assassinated": "触发「月黑杀机」危机且判定失败",
        "death_battle":       "触发「兵临绝境」危机且判定失败，或选择即死选项",
        "death_executed":     "触发「秋后问斩」危机且判定失败",
    }
    death_count = 0
    for e in endings:
        if not e.get("isDeath"):
            continue
        icon = e.get("icon", "💀")
        trigger = death_triggers.get(e["id"], "危机判定失败")
        lines.append(f"| {e['name']} | {icon} | {trigger} |")
        death_count += 1

    lines.append("")
    return "\n".join(lines)


# ── 第五章：全结局路线指南 ────────────────────────────────────────────────────

def gen_chapter5(endings_data: dict) -> str:
    endings = endings_data["endings"]
    lines = ["# 第五章：全结局路线指南\n"]
    lines.append(
        "> 本章为高玩提供 16 种正常结局的详细路线建议。"
        "死亡结局通过危机判定失败触发，不单独列出路线。\n"
    )
    for e in endings:
        if e.get("isDeath"):
            continue
        eid = e["id"]
        icon = e.get("icon", "📜")
        route_data = ENDING_ROUTES.get(eid, {})
        if not route_data:
            print(f"⚠️  警告：结局 '{eid}' 缺少路线数据，请在 ENDING_ROUTES 中补充。", file=sys.stderr)
        cond = conditions_to_str(e.get("conditions", {}))

        lines.append(f"## {icon} {e['name']}\n")
        lines.append(f"**墓志铭：** *{e.get('epitaph', '')}*\n")
        lines.append(f"**解锁条件：** {cond}\n")
        lines.append(f"**推荐武将：** {route_data.get('recommended_char', '—')}\n")
        lines.append(f"**路线建议：** {route_data.get('route', '—')}\n")
        lines.append("---\n")
    return "\n".join(lines)


# ── 附录：标记系统 ────────────────────────────────────────────────────────────

def gen_appendix() -> str:
    known_flags = {
        "farmer_led_villagers": {
            "trigger": "农夫之子·少年期·选「召集村民带大家撤离」",
            "effect": "崛起期解锁「率领旧日村民组建义军核心」（魅+10）",
        },
        "joined_coalition": {
            "trigger": "少年期·虎牢关事件·选「冷静观察战局，分析各路诸侯」",
            "effect": "后续联盟相关事件解锁",
        },
        "saved_doctor": {
            "trigger": "特定事件中救治神医（需留意事件描述）",
            "effect": "病殁危机新增高成功率选项",
        },
    }

    lines = ["# 附录：标记系统说明\n"]
    lines.append(
        "> **标记（Flag）** 是游戏中的隐藏状态，由特定选择触发，"
        "解锁后续的隐藏选项。以下是已知的关键标记。\n"
    )
    lines.append("| 标记名 | 触发条件 | 解锁效果 |")
    lines.append("|--------|---------|---------|")
    for flag, info in known_flags.items():
        lines.append(f"| `{flag}` | {info['trigger']} | {info['effect']} |")

    lines.append("")
    lines.append(
        "> **提示：** 游戏中还存在其他标记，部分仅影响事件描述文本。"
        "建议多次游玩，探索不同选择带来的变化。\n"
    )
    return "\n".join(lines)


# ── 主函数 ────────────────────────────────────────────────────────────────────

def main():
    print("📖 正在读取游戏数据...")
    characters = load_json("characters.json")
    endings_data = load_json("endings.json")
    crisis_events = load_json("events-crisis.json")

    print("✍️  正在生成攻略内容...")
    sections = [
        COVER,
        CHAPTER_1,
        gen_chapter2(characters),
        gen_chapter3(crisis_events),
        gen_chapter4(endings_data),
        gen_chapter5(endings_data),
        gen_appendix(),
    ]

    output = "\n\n".join(sections)
    OUTPUT.write_text(output, encoding="utf-8")
    print(f"✅ 攻略已生成：{OUTPUT}")
    print()
    print("📄 转换为PDF（需安装Pandoc + XeLaTeX）：")
    print(
        f"pandoc {OUTPUT} -o guide/guide.pdf "
        "--pdf-engine=xelatex "
        '-V mainfont="SimSun" '
        "-V CJKmainfont=\"SimSun\" "
        "-V geometry:margin=2cm "
        "--toc --toc-depth=2"
    )


if __name__ == "__main__":
    main()
