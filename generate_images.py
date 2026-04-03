"""
三国武将录 - 插画批量生成脚本
使用火山方舟 Seedream 5.0 Lite 模型生成游戏插画

使用前准备：
1. pip install requests
2. 在火山方舟控制台"开通管理"中开通 Seedream 5.0 Lite 模型
3. 运行：python generate_images.py
"""

import requests
import base64
import os
import time
import json
import sys

# ============================================================
# 配置
# ============================================================
CONFIG = {
    "api_key": os.environ.get("ARK_API_KEY", "sk-OTykMGa9eVtXUQlHOa9PxZPHtDSFyXHgXe8DCc4bm4Z8hrWY"),
    "model": "gemini-3-pro-image-preview",
    "api_url": "https://ark.cn-beijing.volces.com/api/v3/images/generations",
    "output_dir": "images",
    "delay_seconds": 2,  # 请求间隔，避免触发限流
    "retry_times": 3,
}

# ============================================================
# 统一风格前缀
# ============================================================
STYLE = "中国水墨画风格，三国时代，半写实插画，以土色调为主搭配红色和金色点缀，电影感构图，精致的铠甲和汉服细节，氛围光影"

# ============================================================
# 所有提示词
# ============================================================
PROMPTS = {
    # ----------------------------------------------------------
    # 角色立绘 (3:4 竖版)
    # ----------------------------------------------------------
    "characters/farmer": {
        "prompt": f"三国时期农家少年半身像，面庞质朴刚毅，粗布麻衣，肩扛锄头，背景是战火远处的田野，充满不屈的眼神，{STYLE}，人物选择界面风格，干净背景",
        "size": "1920x2560",
    },
    "characters/scholar": {
        "prompt": f"三国时期寒门书生半身像，面容清瘦儒雅，身着素色长衫，手持竹简，背景是简陋书房中堆满书卷，目光坚定而深邃，{STYLE}，人物选择界面风格，干净背景",
        "size": "1920x2560",
    },
    "characters/soldier": {
        "prompt": f"三国时期底层士卒半身像，面有刀疤，身穿破旧铠甲，手握长矛，背景是军营帐篷，眼神中透着不甘与野心，{STYLE}，人物选择界面风格，干净背景",
        "size": "1920x2560",
    },
    "characters/wanderer": {
        "prompt": f"三国时期江湖游侠半身像，英俊潇洒，身着劲装佩剑，背景是江湖客栈，意气风发嫉恶如仇的气质，{STYLE}，人物选择界面风格，干净背景",
        "size": "1920x2560",
    },
    "characters/merchant": {
        "prompt": f"三国时期年轻商人半身像，衣着得体见过世面的气质，手持算盘或账册，背景是繁华市集，精明而不失正气，{STYLE}，人物选择界面风格，干净背景",
        "size": "1920x2560",
    },
    "characters/craftsman": {
        "prompt": f"三国时期匠人学徒半身像，面容朴实手有老茧，身着工装围裙，身边有铁锤和工具，背景是铁匠铺，踏实沉稳的气质，{STYLE}，人物选择界面风格，干净背景",
        "size": "1920x2560",
    },

    # ----------------------------------------------------------
    # 死亡结局 (16:9 宽幅)
    # ----------------------------------------------------------
    "endings/death_illness": {
        "prompt": f"三国时期将领病重卧床，军帐内烛光摇曳，军医在旁束手无策，部将跪在帐外垂泪，弥漫着苦涩的药气，悲凉的氛围，{STYLE}，宽银幕电影画面",
        "size": "2560x1440",
    },
    "endings/death_assassinated": {
        "prompt": f"三国时期月黑风高之夜，刺客的匕首在月光下闪着寒光，将领倒在血泊中，身边空无一人，寝室帷幕飘动，惊悚悲壮的氛围，{STYLE}，宽银幕电影画面",
        "size": "2560x1440",
    },
    "endings/death_battle": {
        "prompt": f"三国时期战场上，一名将领浑身浴血跪倒在尘土中，周围箭矢遍地尸横遍野，远处战马嘶鸣，天空白云与硝烟交织，悲壮英勇，{STYLE}，宽银幕电影画面",
        "size": "2560x1440",
    },
    "endings/death_executed": {
        "prompt": f"三国时期刑场，将领被五花大绑押上刑台，校场围满百姓，刽子手持大刀，暴风雨前的阴沉天空，悲怆肃杀的气氛，{STYLE}，宽银幕电影画面",
        "size": "2560x1440",
    },

    # ----------------------------------------------------------
    # 正常结局 (16:9 宽幅)
    # ----------------------------------------------------------
    "endings/unify": {
        "prompt": f"三国时期帝王登基大典，金色大殿中百官跪拜，龙椅上的帝王俯瞰天下，阳光从殿门射入，辉煌壮丽，天命所归的氛围，{STYLE}，宽银幕电影画面",
        "size": "2560x1440",
    },
    "endings/wei_minister": {
        "prompt": f"三国时期魏国朝堂，一位重臣立于朝堂之上运筹帷幄，身后是曹魏旗帜，周围群臣环绕，许昌宫殿宏伟庄严，权谋与威严，{STYLE}，宽银幕电影画面",
        "size": "2560x1440",
    },
    "endings/shu_guardian": {
        "prompt": f"三国时期蜀汉大营，一位忠臣手持令牌守卫蜀汉旗帜，背景是成都平原和远山，旗帜上书'汉'字，忠义坚定的氛围，暖色调，{STYLE}，宽银幕电影画面",
        "size": "2560x1440",
    },
    "endings/wu_admiral": {
        "prompt": f"三国时期东吴水师，大都督立于战船船头，长江波涛壮阔，身后战船连绵，吴国旗帜猎猎飘扬，江风吹动战袍，意气风发，{STYLE}，宽银幕电影画面",
        "size": "2560x1440",
    },
    "endings/benevolent": {
        "prompt": f"三国时期仁君治世，帝王微服走在繁华街市中，百姓安居乐业箪食壶浆相迎，街道两旁店铺林立，祥和太平的盛世景象，温暖明亮，{STYLE}，宽银幕电影画面",
        "size": "2560x1440",
    },
    "endings/strategist": {
        "prompt": f"三国时期隐世军师，夜晚帐中一盏油灯映照地图，羽扇纶巾的谋士独坐沉思，帐外星空璀璨，运筹帷幄决胜千里的智者气质，{STYLE}，宽银幕电影画面",
        "size": "2560x1440",
    },
    "endings/invincible": {
        "prompt": f"三国时期绝世猛将独立于尸山血海的战场之上，手持长兵器，浑身浴血，四面皆敌却无人敢近，孤傲悲壮，夕阳余晖，{STYLE}，宽银幕电影画面",
        "size": "2560x1440",
    },
    "endings/martyr": {
        "prompt": f"三国时期忠臣率数百残兵在关隘死守，旌旗残破箭矢如雨，将领手握兵器至死不退，身后是大军撤退的尘烟，以身殉道的壮烈，{STYLE}，宽银幕电影画面",
        "size": "2560x1440",
    },
    "endings/loyal": {
        "prompt": f"三国时期老将临终，战友守在床边，墙上挂着旧战甲和佩刀，窗外阳光洒入，面容平静安详，一生忠义无悔，温暖感人，{STYLE}，宽银幕电影画面",
        "size": "2560x1440",
    },
    "endings/chancellor": {
        "prompt": f"三国时期权臣独坐幽暗宫殿，帝王的龙椅在身后如同摆设，权臣手握玉玺面带深沉微笑，阴影笼罩半边脸庞，权谋与野心，{STYLE}，宽银幕电影画面",
        "size": "2560x1440",
    },
    "endings/warlord": {
        "prompt": f"三国时期枭雄月下独饮，身后是半壁江山的舆图，城楼之上俯瞰万家灯火，既霸气又苍凉，举杯吟诗的孤独王者，{STYLE}，宽银幕电影画面",
        "size": "2560x1440",
    },
    "endings/hermit": {
        "prompt": f"三国时期隐士在终南山下竹屋旁垂钓，溪水潺潺秋叶飘落，远山云雾缭绕，炊烟袅袅，宁静悠远与世无争的世外桃源，{STYLE}，宽银幕电影画面",
        "size": "2560x1440",
    },
    "endings/fallen": {
        "prompt": f"三国时期猛将在战场上力战群敌，身中数箭仍挥刀不止，手中兵器指向远方主公大营方向，夕阳如血壮志未酬，{STYLE}，宽银幕电影画面",
        "size": "2560x1440",
    },
    "endings/bandit": {
        "prompt": f"三国时期山寨聚义厅，一群草莽英雄围坐饮酒，山寨大旗在风中飘扬，远处山林茫茫，落魄但不失豪迈，{STYLE}，宽银幕电影画面",
        "size": "2560x1440",
    },
    "endings/betrayed": {
        "prompt": f"三国时期空荡荡的大殿中，一人跪倒在地四面楚歌，昔日盟友的背影渐行渐远，地上散落着撕碎的盟约，孤独绝望，冷色调，{STYLE}，宽银幕电影画面",
        "size": "2560x1440",
    },
    "endings/ordinary": {
        "prompt": f"三国时期乡村田园，老人坐在院中给孙儿讲故事，墙角放着生锈的旧剑，远处炊烟升起稻田金黄，平凡温馨圆满，暖色调，{STYLE}，宽银幕电影画面",
        "size": "2560x1440",
    },

    # ----------------------------------------------------------
    # 危机事件 (16:9 宽幅)
    # ----------------------------------------------------------
    "crisis/illness": {
        "prompt": f"三国时期将领病卧军帐高烧不退，额头覆布满头大汗，军医在旁煎药，烛光昏暗帐内压抑，生死悬于一线的紧张氛围，高对比度，{STYLE}",
        "size": "2560x1440",
    },
    "crisis/assassination": {
        "prompt": f"三国时期寝室月夜，数道黑影翻墙而入，匕首寒光闪烁，帷幕后刺客逼近床榻，月光从窗缝射入，千钧一发的致命危机，高对比度，{STYLE}",
        "size": "2560x1440",
    },
    "crisis/battle": {
        "prompt": f"三国时期山谷绝境，将领被重兵包围，箭雨如蝗战马倒毙，周围将士纷纷倒下，天地间充满杀气与绝望，最后的抉择，高对比度，{STYLE}",
        "size": "2560x1440",
    },
    "crisis/execution": {
        "prompt": f"三国时期阴暗牢狱，将领身戴铁链手脚被缚，牢房潮湿阴冷，铁栏外透入微弱光线，即将秋后问斩的绝望，冷色调，高对比度，{STYLE}",
        "size": "2560x1440",
    },

    # ----------------------------------------------------------
    # 阶段题图 (16:9 宽幅)
    # ----------------------------------------------------------
    "phases/youth": {
        "prompt": f"三国时期少年在乡村练武习文，清晨阳光下挥舞木剑，背景是宁静的村庄和远山，充满希望与朝气的少年时代，明亮温暖，{STYLE}",
        "size": "2560x1440",
    },
    "phases/rise": {
        "prompt": f"三国时期青年将领初建军帐，站在山丘上眺望远方城池，身后军旗初立将士集结，崛起之势蓄势待发，壮志凌云，{STYLE}",
        "size": "2560x1440",
    },
    "phases/war": {
        "prompt": f"三国时期大规模战争场面，两军对垒战旗遮天，烽烟四起战鼓雷鸣，铁骑冲锋万箭齐发，争霸天下的史诗对决，{STYLE}",
        "size": "2560x1440",
    },
    "phases/final": {
        "prompt": f"三国时期暮年将领独立城楼，夕阳余晖洒在苍老的面庞上，身后是走过的漫长征途，天下大势已定，回望一生的感慨与沉重，{STYLE}",
        "size": "2560x1440",
    },

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
}


def generate_image(prompt: str, size: str = "2560x1440") -> bytes | None:
    """调用火山方舟 Seedream API 生成图片，返回图片字节数据"""
    headers = {
        "Authorization": f"Bearer {CONFIG['api_key']}",
        "Content-Type": "application/json",
    }

    # 尺寸转换为宽高
    w, h = size.split("x")

    payload = {
        "model": CONFIG["model"],
        "prompt": prompt,
        "size": size,
        "response_format": "b64_json",
        "n": 1,
    }

    for attempt in range(CONFIG["retry_times"]):
        try:
            resp = requests.post(
                CONFIG["api_url"],
                headers=headers,
                json=payload,
                timeout=120,
            )

            if resp.status_code == 200:
                data = resp.json()
                b64 = data["data"][0]["b64_json"]
                return base64.b64decode(b64)
            elif resp.status_code == 429:
                wait = (attempt + 1) * 5
                print(f"  [限流] 等待 {wait} 秒后重试...")
                time.sleep(wait)
            else:
                print(f"  [错误] HTTP {resp.status_code}: {resp.text[:200]}")
                if attempt < CONFIG["retry_times"] - 1:
                    time.sleep(3)
        except requests.exceptions.Timeout:
            print(f"  [超时] 第 {attempt + 1} 次请求超时，重试中...")
        except Exception as e:
            print(f"  [异常] {e}")
            if attempt < CONFIG["retry_times"] - 1:
                time.sleep(3)

    return None


def main():
    # 检查 API Key
    if not CONFIG["api_key"]:
        print("错误：未设置 API Key")
        print("请设置环境变量: set ARK_API_KEY=你的APIKey")
        sys.exit(1)

    # 创建输出目录
    subdirs = ["characters", "endings", "crisis", "phases", "events"]
    for d in subdirs:
        os.makedirs(os.path.join(CONFIG["output_dir"], d), exist_ok=True)

    # 统计
    total = len(PROMPTS)
    success = 0
    failed = []

    print(f"三国武将录 - 插画生成")
    print(f"共 {total} 张图片待生成")
    print(f"输出目录: {CONFIG['output_dir']}/")
    print("=" * 60)

    for i, (name, info) in enumerate(PROMPTS.items(), 1):
        output_path = os.path.join(CONFIG["output_dir"], f"{name}.png")

        # 跳过已存在的图片
        if os.path.exists(output_path):
            print(f"[{i}/{total}] 跳过（已存在）: {name}.png")
            success += 1
            continue

        print(f"[{i}/{total}] 生成中: {name}.png ...")

        img_data = generate_image(info["prompt"], info.get("size", "1024x576"))

        if img_data:
            with open(output_path, "wb") as f:
                f.write(img_data)
            size_kb = len(img_data) / 1024
            print(f"  -> 完成 ({size_kb:.0f} KB)")
            success += 1
        else:
            print(f"  -> 失败!")
            failed.append(name)

        # 请求间隔
        if i < total:
            time.sleep(CONFIG["delay_seconds"])

    # 结果汇总
    print()
    print("=" * 60)
    print(f"生成完成: {success}/{total} 成功")
    if failed:
        print(f"失败 ({len(failed)} 张):")
        for name in failed:
            print(f"  - {name}")
        print()
        print("重新运行脚本即可自动跳过已生成的图片，只重试失败项")
    print("=" * 60)


if __name__ == "__main__":
    main()
