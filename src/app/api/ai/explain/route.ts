import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { requireAuth } from '@/lib/session';

const client = new OpenAI({
  apiKey: process.env.TOKENDANCE_API_KEY!,
  baseURL: 'https://tokendance.space/gateway/v1',
});

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
  } catch {
    return new Response('Unauthorized', { status: 401 });
  }

  const payloadParam = request.nextUrl.searchParams.get('payload');
  if (!payloadParam) {
    return new Response('Missing payload', { status: 400 });
  }

  let payload;
  try {
    payload = JSON.parse(payloadParam);
  } catch {
    return new Response('Invalid payload', { status: 400 });
  }

  const { chapterTitle, knowledge, timeline, question, options, answer } = payload;

  const systemPrompt = `你是一位中国近现代史纲要的考试辅导老师。回答准确、简洁、紧扣考点，使用中文，可分点。不要编造史实。
当前章节：${chapterTitle}
知识点：
${knowledge.map((k: { h: string; p: string[] }) => `${k.h}：${k.p.join('')}`).join('\n')}
时间线：${timeline.map((e: { d: string; t: string }) => `${e.d} ${e.t}`).join('；')}
`;

  const userPrompt = `请解析这道单选题（已知正确答案是 ${answer}）：
题目：${question}
A. ${options[0]}
B. ${options[1]}
C. ${options[2]}
D. ${options[3]}

要求：1) 一句话点明为什么选 ${answer}；2) 简述相关史实背景；3) 指出其他选项为何不对（如有迷惑性）。控制在 180 字内。`;

  const stream = await client.chat.completions.create({
    model: 'qwen3.7-max',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    stream: true,
    max_tokens: 400,
    temperature: 0.4,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          controller.enqueue(encoder.encode(`data: ${content}\n\n`));
        }
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
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
