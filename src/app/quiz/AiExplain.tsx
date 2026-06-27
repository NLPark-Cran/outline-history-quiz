'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Question, ChapterMeta } from '@/lib/questions';

interface AiExplainProps {
  question: Question;
  chapterKey: string;
  chapter: ChapterMeta;
  selected?: string;
}

type Mode = 'hint' | 'explain' | 'review';

const MODE_LABELS: Record<Mode, string> = {
  hint: 'AI 提示',
  explain: 'AI 详细解析',
  review: 'AI 错题复盘',
};

async function streamExplain(
  payload: object,
  signal: AbortSignal,
  onChunk: (chunk: string) => void,
  onError: (message: string) => void
) {
  let response: Response;
  try {
    response = await fetch('/api/ai/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
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

export default function AiExplain({ question, chapterKey, chapter, selected }: AiExplainProps) {
  const [mode, setMode] = useState<Mode>('explain');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(
    async (nextMode: Mode) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setContent('');
      setError('');

      const payload = {
        mode: nextMode,
        chapterKey,
        chapterTitle: chapter.title,
        knowledge: chapter.knowledge,
        timeline: chapter.timeline,
        question: question.q,
        options: question.o,
        answer: question.a,
        explanation: question.explanation,
        selected,
      };

      await streamExplain(
        payload,
        controller.signal,
        (chunk) => setContent((prev) => prev + chunk),
        (message) => setError(message)
      );

      setLoading(false);
    },
    [chapter, chapterKey, question, selected]
  );

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    run('explain');
    return () => {
      abortRef.current?.abort();
    };
  }, [run]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <div className="mt-4 bg-white border border-[#d8cdb6] rounded-xl p-4 text-sm leading-relaxed">
      <div className="flex flex-wrap gap-2 mb-3">
        {(Object.keys(MODE_LABELS) as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => {
              setMode(m);
              run(m);
            }}
            disabled={loading}
            className={`px-3 py-1.5 text-xs rounded-lg border transition-colors font-serif-sc ${
              mode === m
                ? 'bg-[#a8272b] text-white border-[#a8272b]'
                : 'bg-white text-[#5b5247] border-[#d8cdb6] hover:border-[#a8272b] hover:text-[#a8272b]'
            }`}
          >
            {MODE_LABELS[m]}
          </button>
        ))}
      </div>
      {loading && content === '' && <p className="text-[#8c8170] italic">AI 正在生成解析…</p>}
      {content && (
        <div className="prose prose-sm max-w-none text-[#211c16]">
          <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
        </div>
      )}
      {error && <p className="text-[#a8272b] mt-2">{error}</p>}
    </div>
  );
}
