# 近代史纲要 · AI 刷题台

中国近现代史纲要课程的多人在线刷题与 AI 复习平台。输入 8 位学号即可登录，答题记录自动保存并关联到个人。

线上地址：https://outline.hub.tt2.li

## 功能

- 🔐 **学号登录**：输入 8 位学号即可使用，答题记录自动关联到个人。
- 📚 **多种练习模式**：单元测试（按章）、全书测试、错题本。
- 🔢 **题量选择**：单元/全书测试支持 10 / 20 / 50 / 全部题量，支持乱序开关。
- ⚡ **点击即答**：选择选项后自动提交并显示结果，无需额外点击"提交答案"。
- 🤖 **AI 解析**：
  - 每题支持 AI 提示 / AI 详细解析 / AI 错题复盘三种 prompt。
  - AI 详细解析会逐项分析 A/B/C/D 四个选项的历史背景。
  - 解析内容支持 Markdown 渲染。
  - 接入 TokenDance `mimo-v2.5-pro-ultraspeed` 流式返回。
- 💬 **AI 复习助手**：右侧抽屉，可结合当前章节/题目自由提问。
- 📊 **错题画像分析**：章节正确率、薄弱知识点 TOP、高频错题统计；返回刷题时自动回到原题。
- 📖 **本章资料**：
  - 知识点卡片（摘要 + 详情）
  - 事件时间轴
  - Leaflet 地理地图（默认高德瓦片，可切换 CARTO）
  - 书后配套分析题（含答题框架、AI 解析与机构解析）
- 🗺️ **全书总览**：跨章节知识点、总时间轴、总事件地图。
- 📝 **内置解析**：每道题均带答案来源与知识点解析。

## 技术栈

- Next.js 16 + React 19 + TypeScript
- Tailwind CSS v4 + @tailwindcss/typography
- SQLite + better-sqlite3 + Drizzle ORM
- iron-session（签名 Cookie）
- recharts（数据可视化）
- Leaflet（地理地图）
- react-markdown + remark-gfm（AI 输出渲染）

## 本地开发

```bash
npm install
npx drizzle-kit migrate          # 初始化数据库
npx tsx scripts/seed-tags.ts     # 生成薄弱知识点标签
npm run dev                      # 启动开发服务器
```

## 部署

```bash
sudo bash scripts/deploy.sh
```

生产环境使用 systemd 常驻服务 + Nginx 反向代理。`deploy.sh` 会在构建后将 `.next/static` 复制到 `.next/standalone/.next/`，这是 standalone 模式正确加载静态资源的必要步骤。

## 数据

题目、章节资料、全书总览、地图地点与课后题解析来自同学整理的单文件 HTML，已抽取为 `src/data/*.json`：

- `src/data/questions.json`：题目（题干、选项、答案、解析）
- `src/data/chapters.json`：各章知识点、时间轴、地点
- `src/data/overview.json`：全书总览知识点与时间轴
- `src/data/places.json`：地点名称与 WGS-84 经纬度
- `src/data/essays.json`：书后配套分析题、答题框架、AI 解析与机构解析

## 环境变量

```bash
DATABASE_URL=file:./data/outline.db
SESSION_PASSWORD=<至少 32 位的随机字符串>
TOKENDANCE_API_KEY=<TokenDance API Key>
MINIMAX_API_KEY=<MiniMax API Key>
NEXT_PUBLIC_APP_URL=https://outline.hub.tt2.li
```

> 敏感信息写入 `.env.local`，切勿提交到仓库。
