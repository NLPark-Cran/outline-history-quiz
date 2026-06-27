# Agent Instructions

## 项目概述
- 中国近现代史纲要在线刷题平台，Next.js 16 + React 19 + TypeScript 全栈应用。
- 数据库使用 SQLite（文件 `data/outline.db`），通过 Drizzle ORM 访问。
- 生产部署在 `outline.hub.tt2.li`，使用 systemd + Nginx。
- AI 功能接入 TokenDance `mimo-v2.5-pro-ultraspeed`。

## 开发约定
- 使用 App Router，Server Components 默认，需要交互的组件加 `'use client'`。
- 样式使用 Tailwind CSS v4（CSS-first 配置）。
- 数据库操作写在 `src/lib/data.ts`，新表结构写在 `src/db/schema.ts` 后用 `npx drizzle-kit generate && npx drizzle-kit migrate`。
- 环境变量写在 `.env.local`，敏感信息不得提交。
- 部署脚本：`scripts/deploy.sh`。
- 修改 `README.md` 或 `AGENTS.md` 中描述的功能/路径后，需同步更新本文档。

## 关键路径
- 登录页：`src/app/page.tsx` + `LoginForm.tsx`
- 刷题页：`src/app/quiz/page.tsx` + `QuizClient.tsx`
- 错题画像：`src/app/profile/page.tsx` + `ProfileClient.tsx`
- AI 解析：`src/app/api/ai/explain/route.ts` + `src/app/quiz/AiExplain.tsx`
- AI 复习抽屉：`src/app/api/ai/chat/route.ts` + `src/app/quiz/AiReview.tsx`
- 地图组件：`src/app/quiz/ChapterMap.tsx`
- 题目数据：`src/data/questions.json`
- 章节资料：`src/data/chapters.json`
- 全书总览：`src/data/overview.json`
- 地图地点：`src/data/places.json`
- 数据库初始化：`src/db/index.ts`
- 业务数据层：`src/lib/data.ts`
- 会话管理：`src/lib/session.ts`

## 注意事项
- `output: 'standalone'` 模式下，每次 `npm run build` 后必须将 `.next/static` 复制到 `.next/standalone/.next/`，`scripts/deploy.sh` 已包含此步骤。
- AI 路由已移除 `max_tokens` 限制，但保留了 30 秒 `timeout`；输入已用 Zod 校验。
- 地图组件默认使用 CARTO 瓦片（WGS-84），可切换至高德瓦片（自动 GCJ-02 坐标转换）。
