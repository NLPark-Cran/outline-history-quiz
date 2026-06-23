'use client';

import { useState, useMemo, useCallback, useTransition } from 'react';
import { submitAnswer } from './actions';
import { Question, ChapterMeta, QUESTIONS, TOTAL_QUESTIONS } from '@/lib/questions';
import AiExplain from './AiExplain';
import { cn } from '@/lib/utils';

interface User {
  id: number;
  studentId: string;
}

interface QuizClientProps {
  user: User;
  initialAnswers: Record<string, { selected: string; isCorrect: boolean }>;
  chapters: Record<string, ChapterMeta>;
  chapterKeys: string[];
  chapterNames: Record<string, string>;
  initialMode?: Mode;
}

type Mode = 'unit' | 'full' | 'wrong';

interface ListItem {
  chapter: string;
  index: number;
  question: Question;
}

const CN = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
const LETTERS = ['A', 'B', 'C', 'D'] as const;

function buildBaseList(mode: Mode, chapter: string, chapterKeys: string[], answers: Record<string, { isCorrect: boolean }>): ListItem[] {
  if (mode === 'wrong') {
    const items: ListItem[] = [];
    chapterKeys.forEach((ch) => {
      QUESTIONS[ch].forEach((q, idx) => {
        const key = `${ch}-${idx}`;
        if (answers[key] && !answers[key].isCorrect) {
          items.push({ chapter: ch, index: idx, question: q });
        }
      });
    });
    return items;
  }
  if (mode === 'unit') {
    return QUESTIONS[chapter].map((q, idx) => ({ chapter, index: idx, question: q }));
  }
  const items: ListItem[] = [];
  chapterKeys.forEach((ch) => {
    QUESTIONS[ch].forEach((q, idx) => items.push({ chapter: ch, index: idx, question: q }));
  });
  return items;
}

export default function QuizClient({
  user,
  initialAnswers,
  chapters,
  chapterKeys,
  chapterNames,
  initialMode = 'unit',
}: QuizClientProps) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [chapter, setChapter] = useState<string>(chapterKeys[0]);
  const [answers, setAnswers] = useState(initialAnswers);
  const [list, setList] = useState<ListItem[]>(() => buildBaseList(initialMode, chapterKeys[0], chapterKeys, initialAnswers));
  const [position, setPosition] = useState(0);
  const [sideTab, setSideTab] = useState<'k' | 't'>('k');
  const [mobileSideOpen, setMobileSideOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [showAiFor, setShowAiFor] = useState<string | null>(null);

  const changeMode = useCallback((newMode: Mode) => {
    setMode(newMode);
    const base = buildBaseList(newMode, chapter, chapterKeys, answers);
    setList(base);
    setPosition(0);
  }, [chapter, chapterKeys, answers]);

  const changeChapter = useCallback((newChapter: string) => {
    setChapter(newChapter);
    if (mode === 'unit') {
      const base = buildBaseList('unit', newChapter, chapterKeys, answers);
      setList(base);
      setPosition(0);
    }
  }, [mode, chapterKeys, answers]);

  const shuffle = useCallback(() => {
    const shuffled = [...list];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setList(shuffled);
    setPosition(0);
  }, [list]);

  const current = list[position];
  const currentKey = current ? `${current.chapter}-${current.index}` : '';
  const currentAnswer = answers[currentKey];

  const handleSelect = useCallback(
    (selected: (typeof LETTERS)[number]) => {
      if (!current || currentAnswer || isPending) return;
      const formData = new FormData();
      formData.append('chapter', current.chapter);
      formData.append('questionIndex', String(current.index));
      formData.append('selected', selected);

      startTransition(async () => {
        const result = await submitAnswer(formData);
        if (result.success) {
          setAnswers((prev) => ({
            ...prev,
            [currentKey]: { selected, isCorrect: result.isCorrect! },
          }));
        }
      });
    },
    [current, currentAnswer, currentKey, isPending]
  );

  const navigate = useCallback(
    (delta: number) => {
      const next = position + delta;
      if (next >= 0 && next < list.length) {
        setPosition(next);
      }
    },
    [position, list.length]
  );

  const goTo = useCallback((idx: number) => {
    setPosition(idx);
  }, []);

  const stats = useMemo(() => {
    const total = Object.keys(answers).length;
    const correct = Object.values(answers).filter((a) => a.isCorrect).length;
    return { total, correct, wrong: total - correct };
  }, [answers]);

  if (!current) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-[#faf6ec] border border-[#d8cdb6] rounded-2xl p-8 text-center">
          <p className="text-[#5b5247] font-serif-sc text-lg">暂无题目</p>
          {mode === 'wrong' && (
            <p className="text-sm text-[#8c8170] mt-2">错题本是空的，先去做题吧</p>
          )}
        </div>
      </div>
    );
  }

  const meta = chapters[current.chapter];
  const correctIndex = LETTERS.indexOf(current.question.a as (typeof LETTERS)[number]);

  return (
    <div className="min-h-screen pb-24">
      <header className="max-w-[1240px] mx-auto px-4 sm:px-6 pt-4 pb-4 border-b-2 border-[#211c16]">
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-11 h-11 rounded-lg bg-[#a8272b] text-white grid place-items-center font-serif-sc text-xl font-bold border border-[#7f1d20] shadow-[0_6px_16px_-8px_#7f1d20] -rotate-2">
            史
          </div>
          <div>
            <h1 className="font-serif-sc text-2xl font-bold text-[#211c16]">近代史纲要 · 刷题台</h1>
            <p className="text-xs text-[#5b5247]">中国近现代史纲要 · 单元测试与全书测试 · 配套知识点 / 时间轴 / AI 复习</p>
          </div>
          <div className="flex-1" />
          <div className="flex gap-6 text-right">
            <Stat value={stats.correct} label="已答对" />
            <Stat value={stats.total} label={`已作答 / ${TOTAL_QUESTIONS}`} />
            <Stat value={stats.wrong} label="错题本" />
          </div>
        </div>
      </header>

      <main className="max-w-[1240px] mx-auto px-4 sm:px-6 mt-5">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_372px] gap-5 items-start">
          <div className="space-y-4">
            {/* Controls */}
            <div className="bg-[#faf6ec] border border-[#d8cdb6] rounded-xl shadow-[var(--shadow)] p-3 flex flex-wrap gap-3 items-center">
              <div className="inline-flex bg-[#f4eedf] border border-[#d8cdb6] rounded-lg p-1">
                <ModeButton active={mode === 'unit'} onClick={() => changeMode('unit')}>单元测试</ModeButton>
                <ModeButton active={mode === 'full'} onClick={() => changeMode('full')}>全书测试</ModeButton>
                <ModeButton active={mode === 'wrong'} onClick={() => changeMode('wrong')}>错题重做</ModeButton>
              </div>
              {mode === 'unit' && (
                <select
                  value={chapter}
                  onChange={(e) => changeChapter(e.target.value)}
                  className="px-3 py-2 bg-[#f4eedf] border border-[#d8cdb6] rounded-lg text-sm text-[#211c16] focus:outline-none focus:border-[#a8272b]"
                >
                  {chapterKeys.map((k) => (
                    <option key={k} value={k}>{chapterNames[k]}</option>
                  ))}
                </select>
              )}
              <button onClick={shuffle} className="px-3 py-2 text-sm border border-[#d8cdb6] bg-[#f4eedf] rounded-lg text-[#5b5247] hover:border-[#a8272b] hover:text-[#a8272b] transition-colors">
                🔀 乱序
              </button>
              <div className="flex-1" />
              <a href="/profile" className="px-3 py-2 text-sm border border-[#d8cdb6] bg-[#f4eedf] rounded-lg text-[#5b5247] hover:border-[#a8272b] hover:text-[#a8272b] transition-colors">
                📊 错题画像
              </a>
              <button onClick={() => setMobileSideOpen(true)} className="lg:hidden px-3 py-2 text-sm border border-[#d8cdb6] bg-[#f4eedf] rounded-lg text-[#5b5247]">
                📖 本章资料
              </button>
              <form action="/api/logout" method="post" className="contents">
                <button type="submit" className="px-3 py-2 text-sm border border-[#d8cdb6] bg-[#f4eedf] rounded-lg text-[#5b5247] hover:border-[#a8272b] hover:text-[#a8272b] transition-colors">
                  退出
                </button>
              </form>
            </div>

            {/* Question card */}
            <div className="bg-[#faf6ec] border border-[#d8cdb6] rounded-xl shadow-[var(--shadow)] p-5 sm:p-6">
              <div className="flex items-center gap-2 text-xs text-[#8c8170] font-serif-sc tracking-widest mb-3">
                <span className="px-2 py-0.5 bg-white border border-[#f1d9d6] rounded-full text-[#a8272b]">第{CN[Number(current.chapter)]}章</span>
                <span className="px-2 py-0.5 bg-[#f4eedf] border border-[#d8cdb6] rounded-full text-[#5b5247]">单选题</span>
                <span>本章第 {current.index + 1} 题</span>
              </div>

              <h2 className="font-serif-sc text-lg sm:text-xl leading-relaxed font-medium text-[#211c16] mb-5">
                <span className="text-[#a8272b] font-bold mr-2">{position + 1}.</span>
                {current.question.q}
              </h2>

              <div className="flex flex-col gap-2.5">
                {LETTERS.map((letter, idx) => {
                  const selected = currentAnswer?.selected === letter;
                  const isCorrect = current.question.a === letter;
                  const showResult = !!currentAnswer;
                  const stateClass = showResult
                    ? isCorrect
                      ? 'border-[#2f6b4f] bg-[#dbe9e0]'
                      : selected
                      ? 'border-[#a8272b] bg-[#f1d9d6]'
                      : 'opacity-55'
                    : 'hover:border-[#a8272b] hover:bg-white';
                  return (
                    <button
                      key={letter}
                      disabled={showResult || isPending}
                      onClick={() => handleSelect(letter)}
                      className={cn(
                        'flex items-start gap-3 p-3.5 border border-[#d8cdb6] rounded-xl bg-[#f4eedf] text-left transition-colors w-full disabled:cursor-default',
                        stateClass
                      )}
                    >
                      <span
                        className={cn(
                          'w-7 h-7 flex-none rounded-md bg-white border border-[#d8cdb6] grid place-items-center font-serif-sc text-sm font-bold',
                          showResult && isCorrect && 'bg-[#2f6b4f] text-white border-[#2f6b4f]',
                          showResult && selected && !isCorrect && 'bg-[#a8272b] text-white border-[#a8272b]'
                        )}
                      >
                        {letter}
                      </span>
                      <span className="pt-0.5 text-[#211c16]">{current.question.o[idx]}</span>
                    </button>
                  );
                })}
              </div>

              {currentAnswer && (
                <div className="mt-5 pt-4 border-t border-dashed border-[#d8cdb6] animate-[fade_.25s_ease-out]">
                  <p className="font-serif-sc text-[15px] mb-2">
                    {currentAnswer.isCorrect ? (
                      <span className="text-[#2f6b4f] font-bold">✓ 回答正确</span>
                    ) : (
                      <span className="text-[#a8272b] font-bold">✕ 回答错误　你选了 {currentAnswer.selected}，正确答案是 {current.question.a}</span>
                    )}
                  </p>
                  <div className="bg-[#f4eedf] border border-[#d8cdb6] border-l-[3px] border-l-[#8a6d3b] rounded-lg p-3 text-sm text-[#5b5247]">
                    <span className="font-serif-sc font-bold text-[#8a6d3b]">正确答案 {current.question.a}：</span>
                    {current.question.o[correctIndex]}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => setShowAiFor(currentKey)}
                      className="px-4 py-2 text-sm border border-[#a8272b] text-[#a8272b] bg-white rounded-lg hover:bg-[#a8272b] hover:text-white transition-colors font-serif-sc"
                    >
                      ✦ AI 详细解析
                    </button>
                    <a
                      href="/profile"
                      className="px-4 py-2 text-sm border border-[#d8cdb6] bg-[#f4eedf] text-[#5b5247] rounded-lg hover:border-[#a8272b] hover:text-[#a8272b] transition-colors font-serif-sc"
                    >
                      📊 查看错题画像
                    </a>
                  </div>
                  {showAiFor === currentKey && (
                    <AiExplain question={current.question} chapterKey={current.chapter} chapter={meta} />
                  )}
                </div>
              )}

              <div className="mt-5 pt-4 border-t border-[#e6ddc9] flex flex-wrap items-center gap-3">
                <button
                  onClick={() => navigate(-1)}
                  disabled={position === 0}
                  className="px-4 py-2 text-sm border border-[#d8cdb6] bg-[#f4eedf] rounded-lg text-[#5b5247] hover:border-[#a8272b] hover:text-[#a8272b] disabled:opacity-45 transition-colors font-serif-sc"
                >
                  ← 上一题
                </button>
                <button
                  onClick={() => navigate(1)}
                  disabled={position === list.length - 1}
                  className="px-4 py-2 text-sm bg-[#a8272b] text-white rounded-lg hover:bg-[#7f1d20] disabled:opacity-45 transition-colors shadow-[0_5px_14px_-7px_#7f1d20] font-serif-sc"
                >
                  下一题 →
                </button>
                <div className="flex-1" />
                <span className="text-sm text-[#8c8170] font-serif-sc">{position + 1} / {list.length}</span>
              </div>
            </div>

            {/* Answer sheet */}
            <div className="bg-[#faf6ec] border border-[#d8cdb6] rounded-xl shadow-[var(--shadow)] p-4">
              <h3 className="font-serif-sc text-sm text-[#5b5247] mb-3 flex items-center justify-between">
                答题卡
                <span className="text-[11px] text-[#8c8170] font-sans flex gap-3">
                  <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#2f6b4f]" />对</span>
                  <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#a8272b]" />错</span>
                  <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#d8cdb6]" />未答</span>
                </span>
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {list.map((item, idx) => {
                  const key = `${item.chapter}-${item.index}`;
                  const ans = answers[key];
                  return (
                    <button
                      key={key}
                      onClick={() => goTo(idx)}
                      className={cn(
                        'w-8 h-8 rounded-lg border text-xs font-serif-sc transition-colors',
                        idx === position && 'outline-2 outline-[#211c16] outline-offset-1',
                        ans
                          ? ans.isCorrect
                            ? 'bg-[#dbe9e0] border-[#2f6b4f] text-[#2f6b4f]'
                            : 'bg-[#f1d9d6] border-[#a8272b] text-[#a8272b]'
                          : 'bg-[#f4eedf] border-[#d8cdb6] text-[#5b5247] hover:border-[#a8272b]'
                      )}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Side panel */}
          <aside
            className={cn(
              'lg:sticky lg:top-5 bg-[#faf6ec] border border-[#d8cdb6] rounded-xl shadow-[var(--shadow)] overflow-hidden',
              'fixed inset-0 z-50 lg:inset-auto lg:z-auto lg:block',
              mobileSideOpen ? 'block' : 'hidden lg:block'
            )}
          >
            <div className="p-4 border-b border-[#d8cdb6] flex items-center justify-between lg:hidden">
              <b className="font-serif-sc">本章资料</b>
              <button onClick={() => setMobileSideOpen(false)} className="text-sm text-[#a8272b] font-serif-sc">关闭 ✕</button>
            </div>
            <div className="p-4 pb-2">
              <h2 className="font-serif-sc text-lg font-bold text-[#211c16]">第{CN[Number(current.chapter)]}章 · {meta.title}</h2>
              <p className="text-xs text-[#8a6d3b] mt-1 tracking-wide">{meta.subtitle}</p>
            </div>
            <div className="flex gap-1 px-4 pt-2">
              <SideTab active={sideTab === 'k'} onClick={() => setSideTab('k')}>知识点</SideTab>
              <SideTab active={sideTab === 't'} onClick={() => setSideTab('t')}>事件时间轴</SideTab>
            </div>
            <div className="p-4 max-h-[70vh] overflow-auto">
              {sideTab === 'k' ? (
                <div className="space-y-4">
                  {meta.knowledge.map((k) => (
                    <div key={k.h}>
                      <h4 className="font-serif-sc text-sm font-bold text-[#a8272b] flex items-center gap-2 mb-1.5">
                        <span className="w-2 h-2 bg-[#a8272b] rotate-45" />
                        {k.h}
                      </h4>
                      <ul className="space-y-1">
                        {k.p.map((p, i) => (
                          <li key={i} className="relative pl-4 text-[13px] text-[#5b5247] leading-relaxed before:content-[''] before:absolute before:left-0.5 before:top-2.5 before:w-1 before:h-1 before:rounded-full before:bg-[#8a6d3b]">
                            {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="relative pl-1">
                  <div className="absolute left-[21px] top-1.5 bottom-1.5 w-0.5 bg-gradient-to-b from-[#d8cdb6] via-[#f1d9d6] to-[#d8cdb6]" />
                  <div className="space-y-3">
                    {meta.timeline.map((e) => (
                      <TimelineItem key={e.d + e.t} event={e} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>

      {mobileSideOpen && (
        <div
          className="fixed inset-0 bg-[#2118] z-40 lg:hidden"
          onClick={() => setMobileSideOpen(false)}
        />
      )}
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-right leading-tight min-w-[60px]">
      <div className="text-xl font-bold text-[#a8272b] font-serif-sc">{value}</div>
      <div className="text-[10px] text-[#8c8170] tracking-widest uppercase">{label}</div>
    </div>
  );
}

function ModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-4 py-1.5 rounded-md text-sm font-serif-sc transition-colors',
        active ? 'bg-[#a8272b] text-white shadow-[0_4px_12px_-6px_#7f1d20]' : 'text-[#5b5247] hover:text-[#211c16]'
      )}
    >
      {children}
    </button>
  );
}

function SideTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-1 py-2 text-sm rounded-t-lg border border-transparent border-b-0 font-serif-sc transition-colors',
        active ? 'bg-[#f4eedf] border-[#d8cdb6] text-[#a8272b]' : 'text-[#5b5247]'
      )}
    >
      {children}
    </button>
  );
}

function TimelineItem({ event }: { event: { d: string; t: string; x: string } }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative pl-14">
      <button
        onClick={() => setOpen(!open)}
        className="absolute left-0 top-0 min-w-[44px] px-1.5 h-11 rounded-full bg-white border-2 border-[#a8272b] text-[#a8272b] grid place-items-center font-serif text-[11px] font-bold leading-tight text-center shadow-[0_4px_10px_-6px_#7f1d20] hover:bg-[#a8272b] hover:text-white transition-colors z-10"
      >
        {event.d}
      </button>
      <button onClick={() => setOpen(!open)} className="text-left w-full py-2">
        <div className="font-serif-sc font-semibold text-[#211c16]">{event.t}</div>
        <div className="text-[11px] text-[#8c8170]">{open ? '点击收起' : '点击查看简介'}</div>
      </button>
      {open && (
        <div className="bg-[#f4eedf] border border-[#d8cdb6] border-l-[3px] border-l-[#a8272b] rounded-lg p-3 text-[13px] text-[#5b5247] leading-relaxed mb-2 animate-[fade_.2s_ease-out]">
          {event.x}
        </div>
      )}
    </div>
  );
}
