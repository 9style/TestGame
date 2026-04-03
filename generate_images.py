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
    "api_url": "https://ai.leihuo.netease.com/v1/chat/completions",
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

    # ----------------------------------------------------------
    # 新增通用事件插画 (16:9 宽幅 1920x1080)
    # ----------------------------------------------------------

    # 少年期 +5
    "events/youth_02": {
        "prompt": f"三国时期深山草庐前，一位隐士与一位侠客分立两侧向少年招手，少年面临抉择，山风吹动松林，{STYLE}，宽银幕电影画面",
        "size": "1920x1080",
    },
    "events/youth_03": {
        "prompt": f"三国时期繁忙市集上，恶霸推搡卖菜老者，蔬果散落一地，围观百姓敢怒不敢言，少年握拳犹豫是否出手，{STYLE}，宽银幕电影画面",
        "size": "1920x1080",
    },
    "events/youth_05": {
        "prompt": f"三国时期翠竹林中，几位文士席地而坐辩论天下大势，竹影婆娑光斑散落，少年在旁倾听沉思，清幽雅致，{STYLE}，宽银幕电影画面",
        "size": "1920x1080",
    },
    "events/youth_06": {
        "prompt": f"三国时期小镇街道上涌入大量衣衫褴褛的流民，老幼妇孺面容憔悴饥寒交迫，镇上百姓面露不忍，{STYLE}，宽银幕电影画面",
        "size": "1920x1080",
    },
    "events/youth_orphan": {
        "prompt": f"三国时期被战火焚毁的村庄废墟中，一个孤儿蜷缩在断壁残垣下哭泣，少年蹲下身伸出手，灰烬中的温情，{STYLE}，宽银幕电影画面",
        "size": "1920x1080",
    },

    # 崛起期 +5
    "events/rise_01": {
        "prompt": f"三国时期军帐中，使者带着重礼恭敬呈上书信，年轻将领端坐案前审阅邀约，帐外军旗飘扬，抉择的时刻，{STYLE}，宽银幕电影画面",
        "size": "1920x1080",
    },
    "events/rise_03": {
        "prompt": f"三国时期大胜后的战场上，数千俘虏跪成一片，将领站在高处面临处置俘虏的艰难抉择，部将争论不休，{STYLE}，宽银幕电影画面",
        "size": "1920x1080",
    },
    "events/rise_05": {
        "prompt": f"三国时期军营中粮仓空空如也，士兵面黄肌瘦士气低落，将领望着被切断的补给线地图紧锁眉头，{STYLE}，宽银幕电影画面",
        "size": "1920x1080",
    },
    "events/rise_06": {
        "prompt": f"三国时期帅帐中，一位才华横溢的文士昂首而立自荐为军师，将领打量着他，帐内烛光映照两人的眼神交锋，{STYLE}，宽银幕电影画面",
        "size": "1920x1080",
    },
    "events/rise_07": {
        "prompt": f"三国时期华丽宴席上，绝色美人翩翩起舞献艺，将领面带警觉端坐主位，暗处侍卫紧握刀柄，暗藏杀机，{STYLE}，宽银幕电影画面",
        "size": "1920x1080",
    },

    # 争霸期 +7
    "events/war_02": {
        "prompt": f"三国时期军帐中，心腹部将被铁链锁住跪在堂下，桌上摆着通敌证据，将领面色铁青陷入两难，{STYLE}，宽银幕电影画面",
        "size": "1920x1080",
    },
    "events/war_03": {
        "prompt": f"三国时期宏伟朝堂之上，权臣在主公耳旁进谗言，将领被召入宫独自面对群臣质疑，气氛紧张压抑，{STYLE}，宽银幕电影画面",
        "size": "1920x1080",
    },
    "events/war_04": {
        "prompt": f"三国时期城池中瘟疫蔓延，百姓躺在街头痛苦呻吟，将领率军医救治，烟雾弥漫中的人间疾苦，{STYLE}，宽银幕电影画面",
        "size": "1920x1080",
    },
    "events/war_05": {
        "prompt": f"三国时期夜色中大营火起，盟友的旗帜出现在偷袭的骑兵中，后方营帐燃烧浓烟滚滚，背叛的震惊与愤怒，{STYLE}，宽银幕电影画面",
        "size": "1920x1080",
    },
    "events/war_06": {
        "prompt": f"三国时期金碧辉煌的大殿中，文武百官跪请将领称王，王冠置于案上闪烁光芒，将领伫立犹豫，权力的诱惑，{STYLE}，宽银幕电影画面",
        "size": "1920x1080",
    },
    "events/war_09": {
        "prompt": f"三国时期攻克城池后满目疮痍，怒火中烧的士兵请求屠城，街上百姓跪地求饶，将领站在城头面临残酷抉择，{STYLE}，宽银幕电影画面",
        "size": "1920x1080",
    },
    "events/war_10": {
        "prompt": f"三国时期紧急军报传来，将领策马疾驰率精锐援军赶赴前线，尘土飞扬旌旗猎猎，拼死营救被围主公，{STYLE}，宽银幕电影画面",
        "size": "1920x1080",
    },

    # 终局期 +5
    "events/final_03": {
        "prompt": f"三国时期深夜书房，老臣独坐读着密报上的黑名单，烛光映照苍老面庞，窗外禁军的脚步声隐约可闻，功臣末路的凄凉，{STYLE}，宽银幕电影画面",
        "size": "1920x1080",
    },
    "events/final_05": {
        "prompt": f"三国时期月夜城楼上，两位白发老将相对而立，一人来自敌营冒死来访，举杯对月感慨万千，故人重逢的沧桑，{STYLE}，宽银幕电影画面",
        "size": "1920x1080",
    },
    "events/final_06": {
        "prompt": f"三国时期黄昏城楼上，老将独立眺望远方山河，夕阳洒在沧桑面庞，身后是走过的漫漫征途，最后的抉择，{STYLE}，宽银幕电影画面",
        "size": "1920x1080",
    },
    "events/final_07": {
        "prompt": f"三国时期山谷绝境中万余精兵被围困，谋士指着地图献策，将领面色凝重做最后的决断，兵临绝境的紧迫，{STYLE}，宽银幕电影画面",
        "size": "1920x1080",
    },
    "events/final_assassination": {
        "prompt": f"三国时期华丽宫殿宴席，帷幕后隐约可见暗伏的刀斧手，将领端着酒杯步入陷阱，鸿门宴的致命危机，{STYLE}，宽银幕电影画面",
        "size": "1920x1080",
    },

    # ----------------------------------------------------------
    # 角色专属事件插画 (16:9 宽幅 1920x1080)
    # ----------------------------------------------------------

    # 角色专属事件 - 农夫之子
    "events/char_farmer_youth": {
        "prompt": f"三国时期黄巾之乱中，茅屋燃烧良田焦土，少年跪在父亲身旁听遗言，身后村民哭声震天，离乡赴难的悲壮，{STYLE}，宽银幕电影画面",
        "size": "1920x1080",
    },
    "events/char_farmer_rise": {
        "prompt": f"三国时期旷野中，衣衫褴褛的数百流民聚拢在一面新立的义军旗帜下，农夫出身的将领站在土台上振臂号召，{STYLE}，宽银幕电影画面",
        "size": "1920x1080",
    },
    "events/char_farmer_war": {
        "prompt": f"三国时期山间粮道上，运粮车队在崎岖山路上缓行，远处敌军斥候隐约出没，护粮将领严阵以待，{STYLE}，宽银幕电影画面",
        "size": "1920x1080",
    },
    "events/char_farmer_final": {
        "prompt": f"三国时期天下初定，昔日农夫如今立于丰收的金色稻田旁，远处新建的村落炊烟袅袅，从战火到太平的感慨，{STYLE}，宽银幕电影画面",
        "size": "1920x1080",
    },

    # 角色专属事件 - 寒门书生
    "events/char_scholar_youth": {
        "prompt": f"三国时期深山草庐前，老学者水镜先生手持书信考验少年，周围藏书满架松风阵阵，求学问道的庄重，{STYLE}，宽银幕电影画面",
        "size": "1920x1080",
    },
    "events/char_scholar_rise": {
        "prompt": f"三国时期帅帐中，书生谋士向三方势力的使者呈上策论，烛光映照雄心壮志，择主而事的关键时刻，{STYLE}，宽银幕电影画面",
        "size": "1920x1080",
    },
    "events/char_scholar_war": {
        "prompt": f"三国时期议事大殿上，书生谋士舌战群儒唇枪舌剑，对面数十文臣面露惊色，以一敌百的智者气场，{STYLE}，宽银幕电影画面",
        "size": "1920x1080",
    },
    "events/char_scholar_final": {
        "prompt": f"三国时期书房中，老谋士伏案著书立说，案上堆满一生的谋略手稿，窗外天下太平百姓安乐，著书传世，{STYLE}，宽银幕电影画面",
        "size": "1920x1080",
    },

    # 角色专属事件 - 行伍士卒
    "events/char_soldier_youth": {
        "prompt": f"三国时期军营清晨，新兵排列操练场挥汗如雨，教官严厉督战，年轻士卒咬牙坚持眼神坚毅，军营历练，{STYLE}，宽银幕电影画面",
        "size": "1920x1080",
    },
    "events/char_soldier_rise": {
        "prompt": f"三国时期战场上，士卒身先士卒斩将夺旗，主公在阵后亲自为他披上战袍授予将印，三军欢呼封将的荣耀，{STYLE}，宽银幕电影画面",
        "size": "1920x1080",
    },
    "events/char_soldier_war": {
        "prompt": f"三国时期夜色中，将领率精锐骑兵孤军深入敌后，远处敌军粮仓火光隐现，千里奔袭的紧张刺激，{STYLE}，宽银幕电影画面",
        "size": "1920x1080",
    },
    "events/char_soldier_final": {
        "prompt": f"三国时期帅帐中，老将擦拭伴随多年的长枪，枪缨褪色枪身满是刀痕，帐外士兵解甲欢笑，解甲归田的平静，{STYLE}，宽银幕电影画面",
        "size": "1920x1080",
    },

    # 角色专属事件 - 江湖游侠
    "events/char_wanderer_youth": {
        "prompt": f"三国时期山间小路上，游侠少年拔剑与劫匪对峙救下被劫旅客，树影婆娑正义凛然，行侠仗义的英姿，{STYLE}，宽银幕电影画面",
        "size": "1920x1080",
    },
    "events/char_wanderer_rise": {
        "prompt": f"三国时期山寨聚义厅中，各路绿林好汉围坐举碗盟誓，游侠立于中央慷慨陈词，江湖聚义的豪迈，{STYLE}，宽银幕电影画面",
        "size": "1920x1080",
    },
    "events/char_wanderer_war": {
        "prompt": f"三国时期月夜屋顶上，游侠身着夜行衣手持利刃潜入敌营，远处敌帅大帐灯火通明，刺杀任务的紧张，{STYLE}，宽银幕电影画面",
        "size": "1920x1080",
    },
    "events/char_wanderer_final": {
        "prompt": f"三国时期平静小镇上，昔日游侠收起佩剑开了一间武馆，几个少年在院中练武，江湖远去的宁静淡然，{STYLE}，宽银幕电影画面",
        "size": "1920x1080",
    },

    # 角色专属事件 - 商贾之子
    "events/char_merchant_youth": {
        "prompt": f"三国时期山谷商路上，商队被山贼埋伏劫掠，货物散落一地，年轻商人在混乱中机智应对，紧张危急，{STYLE}，宽银幕电影画面",
        "size": "1920x1080",
    },
    "events/char_merchant_rise": {
        "prompt": f"三国时期战乱中的集市，商人在混乱中运送物资，身后是满载粮草的车队，乱世中的商业智慧与胆识，{STYLE}，宽银幕电影画面",
        "size": "1920x1080",
    },
    "events/char_merchant_war": {
        "prompt": f"三国时期豪华书房中，富商端坐案前被两方势力使者包围拉拢，桌上堆满金银和地图，富可敌国的权衡，{STYLE}，宽银幕电影画面",
        "size": "1920x1080",
    },
    "events/char_merchant_final": {
        "prompt": f"三国时期破败街道旁，商人打开库房将粮食和钱财分发给衣衫褴褛的百姓，散尽家财济世的决心，暖色调，{STYLE}，宽银幕电影画面",
        "size": "1920x1080",
    },

    # 角色专属事件 - 匠人学徒
    "events/char_craftsman_youth": {
        "prompt": f"三国时期铁匠铺中，少年学徒在炉火前锻打铁器，火花四溅师傅在旁指点，墙上挂满各式工具兵器，匠心传承，{STYLE}，宽银幕电影画面",
        "size": "1920x1080",
    },
    "events/char_craftsman_rise": {
        "prompt": f"三国时期大型兵器作坊中，匠人指挥工匠们批量锻造兵器甲胄，炉火通明铁锤声震天，军械供应的繁忙，{STYLE}，宽银幕电影画面",
        "size": "1920x1080",
    },
    "events/char_craftsman_war": {
        "prompt": f"三国时期作坊中，匠人对着战场地图研究设计攻城器械，桌上摆满精密图纸和模型零件，巧夺天工的智慧，{STYLE}，宽银幕电影画面",
        "size": "1920x1080",
    },
    "events/char_craftsman_final": {
        "prompt": f"三国时期太平年间的作坊，老匠人将锻造技艺传授给年轻学徒，从兵器到农具，匠心传承的温馨，暖色调，{STYLE}，宽银幕电影画面",
        "size": "1920x1080",
    },
}


def generate_image(prompt: str, size: str = "2560x1440") -> bytes | None:
    """调用 OpenAI 兼容的 chat completions API 生成图片，返回图片字节数据"""
    headers = {
        "Authorization": f"Bearer {CONFIG['api_key']}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": CONFIG["model"],
        "messages": [
            {
                "role": "user",
                "content": f"Generate an image: {prompt}. Aspect ratio: {size.replace('x', ':')}."
            }
        ],
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
                # 从 chat completions 响应中提取 base64 图片
                content = data["choices"][0]["message"]["content"]
                # 内容可能是纯文本+图片混合，提取图片部分
                if isinstance(content, list):
                    # multimodal 响应格式：[{type: "image_url", image_url: {url: "data:..."}}]
                    for part in content:
                        if isinstance(part, dict):
                            if part.get("type") == "image_url":
                                url = part["image_url"]["url"]
                                if url.startswith("data:"):
                                    b64 = url.split(",", 1)[1]
                                    return base64.b64decode(b64)
                            elif "image" in part:
                                # 备用格式
                                img_data = part["image"]
                                if isinstance(img_data, dict) and "url" in img_data:
                                    url = img_data["url"]
                                    if url.startswith("data:"):
                                        b64 = url.split(",", 1)[1]
                                        return base64.b64decode(b64)
                elif isinstance(content, str):
                    # 可能是 inline_data 格式或纯 base64
                    import re
                    # 尝试从 markdown 图片语法中提取 base64
                    match = re.search(r'data:image/[^;]+;base64,([A-Za-z0-9+/=\s]+)', content)
                    if match:
                        b64 = match.group(1).replace('\n', '').replace(' ', '')
                        return base64.b64decode(b64)

                # 如果上面都没匹配到，打印响应结构供调试
                print(f"  [调试] 无法从响应中提取图片，响应结构：{json.dumps(data, ensure_ascii=False)[:300]}")
                return None

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
