# Agent Instructions

## 项目概述
- 中国近现代史纲要在线刷题平台，Next.js 16 + React 19 + TypeScript 全栈应用。
- 数据库使用 SQLite（文件 `data/outline.db`），通过 Drizzle ORM 访问。
- 生产部署在 `outline.hub.tt2.li`，使用 systemd + Nginx。

## 开发约定
- 使用 App Router，Server Components 默认，需要交互的组件加 `'use client'`。
- 样式使用 Tailwind CSS v4（CSS-first 配置）。
- 数据库操作写在 `src/lib/data.ts`，新表结构写在 `src/db/schema.ts` 后用 `npx drizzle-kit generate && npx drizzle-kit migrate`。
- 环境变量写在 `.env.local`，敏感信息不得提交。
- 部署脚本：`scripts/deploy.sh`。

## 关键路径
- 登录页：`src/app/page.tsx`
- 刷题页：`src/app/quiz/page.tsx` + `QuizClient.tsx`
- 错题画像：`src/app/profile/page.tsx` + `ProfileClient.tsx`
- AI 解析：`src/app/api/ai/explain/route.ts`
- 题目数据：`src/data/questions.json`、`src/data/chapters.json`
