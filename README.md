# 近代史纲要 · 刷题台

中国近现代史纲要课程的多人在线刷题与复习平台。

## 功能

- 🔐 **学号登录**：输入 8 位学号即可使用，答题记录自动关联到个人。
- 📚 **多种练习模式**：单元测试（按章）、全书测试、错题重做、乱序刷题。
- 📊 **错题画像分析**：章节正确率、薄弱知识点 TOP、高频错题统计。
- 🤖 **AI 详细解析**：接入 TokenDance `qwen3.7-max`，结合本章知识点逐题讲解。
- 📖 **本章资料**：知识点卡片 + 事件时间轴（已修复第三章时间轴显示不全问题）。

## 技术栈

- Next.js 16 + React 19 + TypeScript
- Tailwind CSS v4
- SQLite + better-sqlite3 + Drizzle ORM
- iron-session（签名 Cookie）
- recharts（数据可视化）

## 本地开发

```bash
npm install
npx drizzle-kit migrate   # 初始化数据库
npm run dev               # 启动开发服务器
```

## 部署

```bash
sudo bash scripts/deploy.sh
```

生产环境使用 systemd 常驻服务 + Nginx 反向代理，访问：

**https://outline.hub.tt2.li**

## 数据

题目与章节资料来自同学整理的单文件 HTML，已抽取为 `src/data/questions.json` 与 `src/data/chapters.json`。

## 环境变量

```bash
DATABASE_URL=file:./data/outline.db
SESSION_PASSWORD=<至少 32 位的随机字符串>
TOKENDANCE_API_KEY=<TokenDance API Key>
MINIMAX_API_KEY=<MiniMax API Key>
NEXT_PUBLIC_APP_URL=https://outline.hub.tt2.li
```
