# Agent Instructions

## 项目概述
- **名称**：近代史纲要 · AI 刷题台
- **定位**：中国近现代史纲要课程的在线刷题与 AI 复习平台
- **技术栈**：Next.js 16 + React 19 + TypeScript + Tailwind CSS v4 + SQLite + Drizzle ORM + iron-session
- **部署**：`outline.hub.tt2.li`，使用 systemd + Nginx，standalone 模式
- **数据库**：SQLite 文件 `data/outline.db`

## 当前已上线功能（截至 2026-06-28）
1. **学号登录**：输入 8 位学号，答题记录自动关联个人
2. **刷题模式**：单元测试（按章）、全书测试、错题本
3. **答题交互**：点击选项即自动提交并显示结果
4. **题量与乱序**：支持 10/20/50/全部题量，乱序开关，状态在错题画像返回后保持
5. **AI 解析**：每题支持 AI 提示 / AI 详细解析 / AI 错题复盘
   - 详细解析会逐项分析 A/B/C/D 四个选项的历史背景
   - 接入 TokenDance `mimo-v2.5-pro-ultraspeed`
   - AI 输出使用 Markdown 渲染
6. **AI 复习助手**：右侧抽屉，可结合当前章节/题目自由提问
7. **错题画像**：章节正确率柱状图、薄弱知识点 TOP、高频错题 TOP
8. **本章资料**：
   - 知识点卡片（摘要 + 详情）
   - 事件时间轴
   - Leaflet 地理地图（支持高德/CARTO 瓦片切换，默认高德）
   - 书后配套分析题（含答题框架、AI 解析、机构解析）
9. **全书总览**：跨章节知识点、总时间轴、总事件地图

## 关键文件路径
- 登录页：`src/app/page.tsx` + `LoginForm.tsx`
- 刷题页：`src/app/quiz/page.tsx` + `QuizClient.tsx`
- 错题画像：`src/app/profile/page.tsx` + `ProfileClient.tsx`
- AI 解析 API：`src/app/api/ai/explain/route.ts`
- AI 聊天 API：`src/app/api/ai/chat/route.ts`
- AI 解析组件：`src/app/quiz/AiExplain.tsx`
- AI 复习助手：`src/app/quiz/AiReview.tsx`
- 地图组件：`src/app/quiz/ChapterMap.tsx`
- 课后题组件：`src/app/quiz/ChapterEssays.tsx`
- 数据层：`src/lib/data.ts`
- 会话管理：`src/lib/session.ts`
- 数据库连接：`src/db/index.ts`
- 题目数据：`src/data/questions.json`
- 章节资料：`src/data/chapters.json`
- 全书总览：`src/data/overview.json`
- 地图地点：`src/data/places.json`
- 课后题解析：`src/data/essays.json`

## 开发约定
- App Router，Server Components 默认，交互组件加 `'use client'`
- 样式：Tailwind CSS v4（CSS-first），`@plugin "@tailwindcss/typography"` 已启用
- 数据库操作写在 `src/lib/data.ts`；新表结构写在 `src/db/schema.ts` 后执行 `npx drizzle-kit generate && npx drizzle-kit migrate`
- 环境变量写在 `.env.local`，敏感信息不得提交
- 部署脚本：`scripts/deploy.sh`

## 部署注意事项
- `output: 'standalone'` 模式下，每次 `npm run build` 后必须将 `.next/static` 复制到 `.next/standalone/.next/`
- `scripts/deploy.sh` 已包含此步骤；手动构建后若样式 404，需执行 `cp -r .next/static .next/standalone/.next/` 并重启服务

## AI 配置
- 模型：`mimo-v2.5-pro-ultraspeed`（TokenDance）
- API Base：`https://tokendance.space/gateway/v1`
- 已移除 `max_tokens` 限制，保留 30 秒 `timeout`
- 路由已用 Zod 校验输入

## 项目 Skills
- `.kimi/skills/humanize-zh/`：去除 AI 生成文本痕迹，用于润色用户-facing 文案、课程资料、AI 解析示例等。
  - 使用方式：参考 `SKILL.md` 中的 24 种 AI 写作模式与核心规则，对 AI 生成的中文内容进行去痕处理。
  - 注意：该 skill 不修改代码，仅作为文本审阅与润色参考。

## 最近重要变更
- 地图默认使用高德瓦片，CARTO 为备选；切换瓦片时不重建地图，避免标点消失
- 已集成书后配套分析题、AI 解析、机构解析
- 答题交互改为「点击选项即提交」
- AI 详细解析改为逐项分析 A/B/C/D 历史背景
- 错题画像返回刷题时保留题量、乱序设置并定位原题
