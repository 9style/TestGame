# 设计：玩家昵称系统 + 后端游戏统计

**日期**：2026-04-04
**状态**：已确认

## 背景

当前游戏无用户身份概念，图鉴记录存在单一 localStorage key 中，且无任何后端。需要：
1. 玩家开场输入昵称，按昵称隔离图鉴和存档
2. 后端收集游戏记录，后台界面展示统计数据

## 范围拆分

本需求拆为两个子项目，顺序实施：

| # | 子项目 | 范围 | 依赖 |
|---|--------|------|------|
| 1 | 昵称 + 图鉴隔离 | 纯前端改动 | 无 |
| 2 | 后端统计 + 后台界面 | 新建 Node.js 服务 + 前端上报 + admin 页面 | 子项目 1 |

---

## 子项目 1：昵称系统 + 按昵称隔离图鉴

### 1.1 昵称输入流程

在标题页新增昵称输入区域：
- 输入框 + 确认按钮，玩家填写昵称后才能点"开始征途"
- 昵称长度限制 1-8 个字符，不允许纯空白
- 确认后昵称存入 `localStorage['sgwjl_player']`
- 如果 localStorage 已有上次的昵称，自动填充输入框
- 标题页显示当前昵称（如"欢迎，张三"），可点击更换

### 1.2 图鉴按昵称隔离

当前图鉴用 `sgwjl_endings` 存所有已解锁结局 ID。改为按昵称分别存储：
- 新 key 格式：`sgwjl_endings_<昵称>`（如 `sgwjl_endings_张三`）
- 切换昵称时图鉴自动切换到对应记录
- **旧数据迁移**：首次使用昵称功能时，如果存在旧的 `sgwjl_endings`，自动迁移到当前昵称名下，迁移完成后删除旧 key

### 1.3 游戏存档绑定昵称

- 存档 key 改为 `sgwjl_save_<昵称>`
- `state` 对象新增 `playerName` 字段
- 不同昵称各自有独立存档，互不覆盖
- **旧数据迁移**：同图鉴，旧 `sgwjl_save` 自动迁移到当前昵称

### 1.4 涉及文件

| 文件 | 改动类型 |
|------|----------|
| `index.html` | 标题页新增昵称输入框、确认按钮、欢迎文字 |
| `css/style.css` | 昵称输入框和欢迎区域样式 |
| `js/ui.js` | `renderTitle()` 渲染昵称输入 UI；新增 `onSetName` 回调 |
| `js/game.js` | `SAVE_KEY`/`ENDINGS_KEY` 改为方法，动态拼接昵称；`state` 加 `playerName`；新增 `setPlayerName(name)` 方法和旧数据迁移逻辑 |
| `js/main.js` | 连接昵称设置流程；开始游戏前确保昵称已设置 |

---

## 子项目 2：后端统计 + 后台界面

### 2.1 后端服务（Node.js + Express + SQLite）

新建 `server/` 目录：

```
server/
├── index.js          # Express 服务入口（端口 3000）
├── db.js             # SQLite 初始化和查询方法
├── package.json      # 依赖：express, better-sqlite3
└── admin.html        # 后台统计页面
```

**静态文件托管**：Express 同时 serve 项目根目录的静态文件（`index.html`、`js/`、`css/`、`data/`、`images/`），替代 `python -m http.server`。

### 2.2 API 端点

| 方法 | 路径 | 用途 | 请求/响应 |
|------|------|------|-----------|
| POST | `/api/record` | 玩家完成一局后上报 | 请求：`{ playerName, characterId, endingId }` |
| GET | `/api/stats` | 后台获取统计数据（需密码） | 响应：`{ totalGames, endingCounts, characterCounts, recentRecords }` |

### 2.3 数据库

单表设计：

```sql
CREATE TABLE game_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_name TEXT NOT NULL,
  character_id TEXT NOT NULL,
  ending_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

数据库文件存为 `server/data.db`，加入 `.gitignore`。

### 2.4 前端上报

在 `js/game.js` 的 `checkEnding()` 中，确定结局后调用新方法 `_reportRecord(ending)`：
- 向 `/api/record` 发送 POST 请求
- 包含 `playerName`（来自 state）、`characterId`、`endingId`
- **上报失败静默忽略**（`catch` 空处理），不影响游戏体验
- 无网络环境下游戏正常运行，只是不上报

### 2.5 后台界面（`/admin`）

一个独立 HTML 页面，由 Express 在 `/admin` 路径提供：

- **密码保护**：访问时弹出密码输入框，密码配置在环境变量 `ADMIN_PASSWORD` 中（默认值 `admin123`）。通过 query parameter `?password=xxx` 或请求头验证。
- **展示内容**：
  - 总游戏次数
  - 各结局达成次数（表格，按次数降序）
  - 各角色选择次数（表格，按次数降序）
  - 最近 50 条游戏记录（昵称、角色、结局、时间）
- 纯 HTML + CSS 渲染，不引入前端框架

### 2.6 启动方式

```bash
cd server && npm install && node index.js
```

访问 `http://localhost:3000` 玩游戏，`http://localhost:3000/admin` 查看统计。

### 2.7 涉及文件

| 文件 | 改动类型 |
|------|----------|
| `server/index.js` | 新建 — Express 服务入口 |
| `server/db.js` | 新建 — SQLite 数据库操作 |
| `server/package.json` | 新建 — 项目依赖 |
| `server/admin.html` | 新建 — 后台统计页面 |
| `js/game.js` | 修改 — `checkEnding()` 中添加上报调用 |
| `.gitignore` | 修改 — 添加 `server/data.db` 和 `server/node_modules/` |

## 验证方式

### 子项目 1
1. 首次访问标题页，要求输入昵称
2. 输入昵称后开始游戏，完成一局，确认图鉴记录在该昵称下
3. 换一个昵称，确认图鉴为空（独立记录）
4. 切回原昵称，确认图鉴恢复
5. 清除 localStorage 中的旧 `sgwjl_endings` 和 `sgwjl_save`，确认迁移逻辑正确

### 子项目 2
1. 启动 Node.js 服务，通过 `http://localhost:3000` 玩游戏
2. 完成一局后，检查 `server/data.db` 中有记录
3. 访问 `/admin`，输入错误密码被拒绝
4. 输入正确密码，看到统计数据（总次数、结局分布、角色分布、最近记录）
5. 断网时游戏正常运行，上报静默失败
