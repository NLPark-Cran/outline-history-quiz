'use client';

import { useState, useEffect, useRef } from 'react';
import { Question, ChapterMeta, CN_NUMBERS } from '@/lib/questions';

interface AiExplainProps {
  question: Question;
  chapterKey: string;
  chapter: ChapterMeta;
}

export default function AiExplain({ question, chapterKey, chapter }: AiExplainProps) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const aborted = useRef(false);

  useEffect(() => {
    aborted.current = false;
    setLoading(true);
    setContent('');
    setError('');

    const payload = {
      chapterKey,
      chapterTitle: chapter.title,
      knowledge: chapter.knowledge,
      timeline: chapter.timeline,
      question: question.q,
      options: question.o,
      answer: question.a,
    };

    const source = new EventSource('/api/ai/explain?payload=' + encodeURIComponent(JSON.stringify(payload)));

    source.onmessage = (e) => {
      if (aborted.current) return;
      const data = e.data;
      if (data === '[DONE]') {
        source.close();
        setLoading(false);
        return;
      }
      setContent((prev) => prev + data);
    };

    source.onerror = (e) => {
      if (aborted.current) return;
      source.close();
      setLoading(false);
      setError('AI 解析请求失败，请稍后重试');
    };

    return () => {
      aborted.current = true;
      source.close();
    };
  }, [question, chapterKey, chapter]);

  return (
    <div className="mt-4 bg-white border border-[#d8cdb6] rounded-xl p-4 text-sm leading-relaxed whitespace-pre-wrap">
      {loading && content === '' && <p className="text-[#8c8170] italic">AI 正在生成解析…</p>}
      {content && <div className="text-[#211c16]">{content}</div>}
      {error && <p className="text-[#a8272b]">{error}</p>}
    </div>
  );
}
