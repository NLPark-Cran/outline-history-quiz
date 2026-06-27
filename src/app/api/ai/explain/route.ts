import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';
import { requireAuth } from '@/lib/session';

const apiKey = process.env.TOKENDANCE_API_KEY;
if (!apiKey) {
  throw new Error('TOKENDANCE_API_KEY environment variable is missing');
}

const client = new OpenAI({
  apiKey,
  baseURL: 'https://tokendance.space/gateway/v1',
  timeout: 30_000,
});

const MODEL = 'mimo-v2.5-pro-ultraspeed';

const knowledgeSchema = z.object({
  title: z.string().optional(),
  summary: z.string().optional(),
  detail: z.string().optional(),
});

const timelineSchema = z.object({
  date: z.string().optional(),
  title: z.string().optional(),
});

const requestSchema = z.object({
  mode: z.enum(['hint', 'explain', 'review']).default('explain'),
  chapterTitle: z.string().max(200).optional(),
  knowledge: z.array(knowledgeSchema).max(30).optional(),
  timeline: z.array(timelineSchema).max(50).optional(),
  question: z.string().min(1).max(1000),
  options: z.array(z.string().min(1).max(500)).length(4),
  answer: z.string().min(1).max(10),
  explanation: z.string().max(2000).optional(),
  selected: z.string().max(10).optional(),
});

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
  } catch {
    return new Response('Unauthorized', { status: 401 });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(payload || {});
  if (!parsed.success) {
    return Response.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 });
  }

  const { mode, chapterTitle, knowledge, timeline, question, options, answer, explanation, selected } = parsed.data;

  const knowledgeText = (knowledge || [])
    .map((k) => `${k.title || ''}：${k.summary || ''} ${k.detail || ''}`)
    .join('\n')
    .slice(0, 3000);
  const timelineText = (timeline || [])
    .map((e) => `${e.date || ''} ${e.title || ''}`)
    .join('；')
    .slice(0, 2000);

  const systemPrompt = `你是一位中国近现代史纲要的考试辅导老师。回答准确、简洁、紧扣考点，使用中文，可分点。不要编造史实。
当前章节：${chapterTitle || '全书'}
知识点：
${knowledgeText}
时间线：${timelineText}
`;

  let userPrompt = '';
  if (mode === 'hint') {
    userPrompt = `请为这道单选题给出不直接泄露答案的提示/解题思路：
题目：${question}
A. ${options[0]}
B. ${options[1]}
C. ${options[2]}
D. ${options[3]}
${selected ? `学生目前选择了 ${selected}。` : ''}
控制在 120 字内。`;
  } else if (mode === 'review') {
    userPrompt = `请把这道单选题做成错题复盘，给出记忆钩子、易混点和下次判断步骤：
题目：${question}
A. ${options[0]}
B. ${options[1]}
C. ${options[2]}
D. ${options[3]}
正确答案：${answer}
${explanation ? `内置解析：${explanation}` : ''}
控制在 200 字内。`;
  } else {
    userPrompt = `请解析这道单选题，逐项分析每个选项的历史背景：
题目：${question}
A. ${options[0]}
B. ${options[1]}
C. ${options[2]}
D. ${options[3]}
正确答案：${answer}
${explanation ? `内置解析：${explanation}` : ''}

要求：
1. 先一句话点明为什么正确选项是 ${answer}；
2. 然后对 A、B、C、D 四个选项逐个进行简要分析：说明该选项对应什么史实/概念，以及它为什么正确或为什么不正确；
3. 每个选项控制在 60 字左右，保持简洁、紧扣考点。`;
  }

  let stream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>;
  try {
    stream = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      stream: true,
      temperature: 0.4,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI 服务请求失败';
    return Response.json({ error: message }, { status: 502 });
  }

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}
\n`));
          }
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}
\n`));
        controller.close();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'AI 流式输出中断';
        controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ error: message })}
\n`));
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
