'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Question, ChapterMeta, OVERVIEW, CN_NUMBERS } from '@/lib/questions';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  loading?: boolean;
}

interface AiReviewProps {
  open: boolean;
  onClose: () => void;
  question?: Question | null;
  chapterKey?: string;
  chapter?: ChapterMeta | null;
}

function buildContext(question: Question | null | undefined, chapterKey: string | undefined, chapter: ChapterMeta | null | undefined) {
  const parts: string[] = [];
  parts.push(`资料范围：${chapter ? `第${chapterKey ? CN_NUMBERS[Number(chapterKey)] : ''}章 ${chapter.title}` : '全书总览'}`);
  if (chapter) {
    const knowledge = chapter.knowledge.map((k) => `- ${k.title}：${k.summary} ${k.detail}`).join('\n');
    const timeline = chapter.timeline.map((e) => `${e.date} ${e.title}：${e.summary}`).join('\n');
    parts.push(`知识库：\n${knowledge}`);
    parts.push(`时间轴：\n${timeline}`);
  } else {
    const knowledge = OVERVIEW.knowledge.map((k) => `- ${k.h}：${k.p.join('；')}`).join('\n');
    const timeline = OVERVIEW.timeline.map((e) => `${e.d} ${e.t}：${e.x}`).join('\n');
    parts.push(`知识库：\n${knowledge}`);
    parts.push(`时间轴：\n${timeline}`);
  }
  if (question) {
    parts.push(
      `当前题目：${question.q}\n选项：\n${question.o
        .map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`)
        .join('\n')}\n正确答案：${question.a}`
    );
  }
  return parts.join('\n\n');
}

async function streamChat(
  messages: { role: 'user' | 'assistant'; content: string }[],
  context: string,
  signal: AbortSignal,
  onChunk: (chunk: string) => void,
  onError: (message: string) => void
) {
  let response: Response;
  try {
    response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, context }),
      signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return;
    onError(error instanceof Error ? error.message : '网络请求失败');
    return;
  }

  if (!response.ok) {
    let message = `请求失败 (${response.status})`;
    try {
      const err = await response.json();
      if (err.error) message = err.error;
    } catch {}
    onError(message);
    return;
  }

  if (!response.body) {
    onError('未收到 AI 响应流');
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';
      for (const block of lines) {
        const eventMatch = block.match(/^event: (\w+)/m);
        const dataMatch = block.match(/^data: (.+)/m);
        if (!dataMatch) continue;
        const event = eventMatch?.[1] || 'message';
        const data = dataMatch[1];
        if (event === 'error') {
          try {
            const parsed = JSON.parse(data);
            onError(parsed.error || 'AI 流式输出出错');
          } catch {
            onError(data);
          }
          return;
        }
        try {
          const parsed = JSON.parse(data);
          if (parsed.done) return;
          if (parsed.content) onChunk(parsed.content);
        } catch {
          if (data === '[DONE]') return;
          onChunk(data);
        }
      }
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return;
    onError(error instanceof Error ? error.message : 'AI 流式输出中断');
  } finally {
    reader.releaseLock();
  }
}

export default function AiReview({ open, onClose, question, chapterKey, chapter }: AiReviewProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '你好！我是你的近代史复习助手。可以问我关于当前题目或章节的问题。',
    },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const messageIdRef = useRef(0);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput('');

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const userMsg: Message = { id: `u-${++messageIdRef.current}`, role: 'user', content: text };
    const assistantMsg: Message = {
      id: `a-${++messageIdRef.current}`,
      role: 'assistant',
      content: '',
      loading: true,
    };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setBusy(true);

    const context = buildContext(question, chapterKey, chapter);
    const history = [...messages.filter((m) => !m.loading && m.content && m.id !== 'welcome'), userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    })) as { role: 'user' | 'assistant'; content: string }[];

    let received = false;
    await streamChat(
      history,
      context,
      controller.signal,
      (chunk) => {
        received = true;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role !== 'assistant') return prev;
          return [...prev.slice(0, -1), { ...last, content: last.content + chunk, loading: false }];
        });
      },
      (error) => {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role !== 'assistant') return prev;
          return [...prev.slice(0, -1), { ...last, content: error, loading: false }];
        });
      }
    );

    if (!received) {
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role !== 'assistant') return prev;
        return [...prev.slice(0, -1), { ...last, content: 'AI 没有返回内容。', loading: false }];
      });
    }
    setBusy(false);
  }, [input, busy, messages, question, chapterKey, chapter]);

  return (
    <>
      {open && <div className="fixed inset-0 bg-[#2118] z-40" onClick={onClose} />}
      <aside
        className={cn(
          'fixed top-0 right-0 h-full w-full sm:w-[420px] bg-[#faf6ec] border-l border-[#d8cdb6] shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : 'translate-x-full pointer-events-none'
        )}
      >
        <div className="p-4 border-b border-[#d8cdb6] flex items-center justify-between">
          <div>
            <h3 className="font-serif-sc font-bold text-[#211c16]">AI 复习助手</h3>
            <p className="text-[11px] text-[#8c8170]">
              {chapter ? `第${chapterKey ? CN_NUMBERS[Number(chapterKey)] : ''}章 · ${chapter.title}` : '全书总览'}
            </p>
          </div>
          <button onClick={onClose} className="text-[#5b5247] hover:text-[#a8272b] text-xl leading-none">
            ✕
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-auto p-4 space-y-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                'max-w-[85%] rounded-xl p-3 text-sm leading-relaxed whitespace-pre-wrap',
                m.role === 'user'
                  ? 'ml-auto bg-[#a8272b] text-white rounded-br-none'
                  : 'bg-white border border-[#d8cdb6] text-[#211c16] rounded-bl-none'
              )}
            >
              <div className="prose prose-sm max-w-none">
                <Markdown remarkPlugins={[remarkGfm]}>{m.content}</Markdown>
              </div>
              {m.loading && (
                <span className="inline-block w-4 h-4 ml-2 border-2 border-[#d8cdb6] border-t-[#a8272b] rounded-full animate-spin align-middle" />
              )}
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-[#d8cdb6] bg-[#f4eedf]">
          <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
            {['帮我梳理本章考点', '这道题的易混点是什么？', '给几个记忆口诀'].map((q) => (
              <button
                key={q}
                onClick={() => setInput(q)}
                className="shrink-0 px-2 py-1 text-[11px] bg-white border border-[#d8cdb6] rounded-full text-[#5b5247] hover:border-[#a8272b] hover:text-[#a8272b]"
              >
                {q}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="输入问题…"
              className="flex-1 px-3 py-2 bg-white border border-[#d8cdb6] rounded-lg text-sm focus:outline-none focus:border-[#a8272b]"
            />
            <button
              onClick={send}
              disabled={busy || !input.trim()}
              className="px-4 py-2 bg-[#a8272b] text-white rounded-lg text-sm hover:bg-[#7f1d20] disabled:opacity-50"
            >
              发送
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
