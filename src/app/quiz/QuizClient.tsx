'use client';

import { useState, useMemo, useCallback, useTransition, useEffect, memo, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { submitAnswer, toggleMistake } from './actions';
import { Question, ChapterMeta, QUESTIONS, TOTAL_QUESTIONS, CN_NUMBERS, OVERVIEW, ESSAYS } from '@/lib/questions';
import AiExplain from './AiExplain';
import AiReview from './AiReview';
import ChapterMap from './ChapterMap';
import ChapterEssays from './ChapterEssays';
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
  initialMode?: 'unit' | 'full' | 'wrong';
  initialChapter?: string;
  initialPosition?: number;
  initialQuestionChapter?: string;
  initialQuestionIndex?: number;
  initialCount?: string;
  initialShuffle?: boolean;
}

type Mode = 'unit' | 'full' | 'wrong';
type SideTab = 'k' | 't' | 'm' | 'e' | 'o';

interface ListItem {
  chapter: string;
  index: number;
  question: Question;
}

const LETTERS = ['A', 'B', 'C', 'D'] as const;
const COUNT_OPTIONS = [
  { value: '10', label: '10 题' },
  { value: '20', label: '20 题' },
  { value: '50', label: '50 题' },
  { value: 'all', label: '全部' },
] as const;

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildBaseList(
  mode: Mode,
  chapter: string,
  chapterKeys: string[],
  answers: Record<string, { isCorrect: boolean }>,
  count: string,
  shuffleEnabled: boolean
): ListItem[] {
  let base: ListItem[] = [];

  if (mode === 'wrong') {
    chapterKeys.forEach((ch) => {
      QUESTIONS[ch].forEach((q, idx) => {
        const key = `${ch}-${idx}`;
        if (answers[key] && !answers[key].isCorrect) {
          base.push({ chapter: ch, index: idx, question: q });
        }
      });
    });
    return base;
  }

  if (mode === 'unit') {
    base = QUESTIONS[chapter].map((q, idx) => ({ chapter, index: idx, question: q }));
  } else {
    chapterKeys.forEach((ch) => {
      QUESTIONS[ch].forEach((q, idx) => base.push({ chapter: ch, index: idx, question: q }));
    });
  }

  if (shuffleEnabled) {
    base = shuffleArray(base);
  }

  if (count !== 'all') {
    const n = parseInt(count, 10);
    if (base.length > n) base = base.slice(0, n);
  }

  return base;
}

const OptionButton = memo(function OptionButton({
  letter,
  text,
  selected,
  correct,
  showResult,
  disabled,
  onClick,
  appearDelay,
}: {
  letter: string;
  text: string;
  selected: boolean;
  correct: boolean;
  showResult: boolean;
  disabled: boolean;
  onClick: () => void;
  appearDelay?: number;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ animationDelay: appearDelay ? `${appearDelay}ms` : undefined }}
      className={cn(
        'group flex items-start gap-3 p-3.5 border rounded-xl bg-[#f4eedf] text-left w-full will-change-transform animate-option-in',
        'transition-all duration-150 ease-out',
        'hover:-translate-y-0.5 active:scale-[0.98] active:duration-75',
        showResult
          ? correct
            ? 'border-[#2f6b4f] bg-[#dbe9e0]'
            : selected
            ? 'border-[#a8272b] bg-[#f1d9d6]'
            : 'border-[#d8cdb6] opacity-55'
          : selected
          ? 'border-[#a8272b] bg-white shadow-[0_4px_12px_-6px_#a8272b33] -translate-y-0.5'
          : 'border-[#d8cdb6] hover:border-[#a8272b] hover:bg-white hover:shadow-[0_2px_8px_-4px_#5b524733]'
      )}
    >
      <span
        className={cn(
          'w-7 h-7 flex-none rounded-md bg-white border border-[#d8cdb6] grid place-items-center font-serif-sc text-sm font-bold transition-all duration-150',
          showResult && correct && 'bg-[#2f6b4f] text-white border-[#2f6b4f]',
          showResult && selected && !correct && 'bg-[#a8272b] text-white border-[#a8272b]',
          !showResult && selected && 'border-[#a8272b] text-[#a8272b]'
        )}
      >
        {letter}
      </span>
      <span className="pt-0.5 text-[#211c16]">{text}</span>
    </button>
  );
});

const AnswerSheetItem = memo(function AnswerSheetItem({
  idx,
  item,
  position,
  answers,
  onClick,
}: {
  idx: number;
  item: ListItem;
  position: number;
  answers: Record<string, { isCorrect: boolean }>;
  onClick: () => void;
}) {
  const key = `${item.chapter}-${item.index}`;
  const ans = answers[key];
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-8 h-8 rounded-lg border text-xs font-serif-sc transition-transform active:scale-95',
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
});

export default function QuizClient({
  initialAnswers,
  chapters,
  chapterKeys,
  chapterNames,
  initialMode = 'unit',
  initialChapter = chapterKeys[0],
  initialPosition = 0,
  initialQuestionChapter,
  initialQuestionIndex,
  initialCount = 'all',
  initialShuffle = false,
}: QuizClientProps) {
  const searchParams = useSearchParams();
  const hasUrlState = searchParams.has('mode') || searchParams.has('chapter') || searchParams.has('position');

  const [mode, setMode] = useState<Mode>(initialMode);
  const [chapter, setChapter] = useState<string>(initialChapter);
  const [answers, setAnswers] = useState(initialAnswers);
  const [count, setCount] = useState<string>(initialCount);
  const [shuffleEnabled, setShuffleEnabled] = useState(initialShuffle);
  const [selectedDraft, setSelectedDraft] = useState<string | null>(null);
  const [sideTab, setSideTab] = useState<SideTab>('k');
  const [mobileSideOpen, setMobileSideOpen] = useState(false);
  const [showAiFor, setShowAiFor] = useState<string | null>(null);
  const [aiReviewOpen, setAiReviewOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [list, setList] = useState<ListItem[]>(() =>
    buildBaseList(initialMode, initialChapter, chapterKeys, initialAnswers, initialCount, initialShuffle)
  );
  const [position, setPosition] = useState(() => {
    if (initialQuestionChapter && typeof initialQuestionIndex === 'number') {
      const idx = buildBaseList(initialMode, initialChapter, chapterKeys, initialAnswers, initialCount, initialShuffle).findIndex(
        (item) => item.chapter === initialQuestionChapter && item.index === initialQuestionIndex
      );
      return idx >= 0 ? idx : initialPosition;
    }
    return initialPosition;
  });
  const didRestoreRef = useRef(false);
  const initialListBuiltRef = useRef(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  // Restore from sessionStorage only when URL has no explicit state
  useEffect(() => {
    if (didRestoreRef.current) return;
    didRestoreRef.current = true;
    if (hasUrlState) return;
    try {
      const saved = sessionStorage.getItem('quiz-state');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.mode && (parsed.mode === 'unit' || parsed.mode === 'full' || parsed.mode === 'wrong')) {
          setMode(parsed.mode);
        }
        if (parsed.chapter && chapterKeys.includes(parsed.chapter)) {
          setChapter(parsed.chapter);
        }
        if (typeof parsed.position === 'number') {
          setPosition(Math.max(0, parsed.position));
        }
        if (parsed.count && COUNT_OPTIONS.some((c) => c.value === parsed.count)) {
          setCount(parsed.count);
        }
        if (typeof parsed.shuffleEnabled === 'boolean') {
          setShuffleEnabled(parsed.shuffleEnabled);
        }
      }
    } catch {
      // ignore
    }
  }, [hasUrlState, chapterKeys]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Persist state
  useEffect(() => {
    try {
      sessionStorage.setItem(
        'quiz-state',
        JSON.stringify({ mode, chapter, position, count, shuffleEnabled })
      );
    } catch {
      // ignore
    }
  }, [mode, chapter, position, count, shuffleEnabled]);

  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  // Rebuild list when dependencies change
  useEffect(() => {
    const next = buildBaseList(mode, chapter, chapterKeys, answers, count, shuffleEnabled);
    setList(next);
    // Preserve the URL-specified or sessionStorage-restored position on initial mount
    if (!initialListBuiltRef.current) {
      initialListBuiltRef.current = true;
      if (hasUrlState && initialQuestionChapter && typeof initialQuestionIndex === 'number') {
        const idx = next.findIndex((item) => item.chapter === initialQuestionChapter && item.index === initialQuestionIndex);
        setPosition(idx >= 0 ? idx : Math.min(initialPosition, next.length - 1));
      }
      // If there is no URL state, do NOT overwrite position here so that the sessionStorage restore effect can set it.
    } else {
      setPosition(0);
    }
    setSelectedDraft(null);
    setShowAiFor(null);
  }, [mode, chapter, count, shuffleEnabled, chapterKeys, hasUrlState, initialQuestionChapter, initialQuestionIndex, initialPosition]);

  // In wrong mode, keep the list in sync with answers
  useEffect(() => {
    if (mode !== 'wrong') return;
    const next = buildBaseList('wrong', chapter, chapterKeys, answers, count, shuffleEnabled);
    setList((prev) => {
      if (next.length !== prev.length) {
        setPosition((p) => (p >= next.length ? Math.max(0, next.length - 1) : p));
      }
      return next;
    });
  }, [answers, mode, chapter, chapterKeys, count, shuffleEnabled]);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  const changeMode = useCallback((newMode: Mode) => {
    setMode(newMode);
    setSelectedDraft(null);
    setShowAiFor(null);
  }, []);

  const changeChapter = useCallback(
    (newChapter: string) => {
      setChapter(newChapter);
      setSelectedDraft(null);
      setShowAiFor(null);
    },
    []
  );

  const regenerateList = useCallback(() => {
    // The list rebuild effect will recompute based on count/shuffleEnabled changes.
    setSelectedDraft(null);
    setShowAiFor(null);
  }, []);

  const current = list[position];
  const currentKey = current ? `${current.chapter}-${current.index}` : '';
  const currentAnswer = current ? answers[currentKey] : undefined;

  const handleSelect = useCallback(
    (letter: (typeof LETTERS)[number]) => {
      if (!current || currentAnswer || isPending) return;
      setSelectedDraft(letter);

      const formData = new FormData();
      formData.append('chapter', current.chapter);
      formData.append('questionIndex', String(current.index));
      formData.append('selected', letter);

      startTransition(async () => {
        const result = await submitAnswer(formData);
        if (result.success) {
          setAnswers((prev) => ({
            ...prev,
            [currentKey]: { selected: letter, isCorrect: result.isCorrect },
          }));
          setSelectedDraft(null);
        }
      });
    },
    [current, currentAnswer, isPending, currentKey]
  );

  const handleToggleMistake = useCallback(
    (markAsWrong: boolean) => {
      if (!current) return;
      const formData = new FormData();
      formData.append('chapter', current.chapter);
      formData.append('questionIndex', String(current.index));
      formData.append('markAsWrong', String(markAsWrong));

      startTransition(async () => {
        const result = await toggleMistake(formData);
        if (result.success) {
          setAnswers((prev) => {
            const next = { ...prev };
            if (result.markAsWrong) {
              next[currentKey] = { selected: '—', isCorrect: false };
            } else {
              delete next[currentKey];
            }
            return next;
          });
        }
      });
    },
    [current, currentKey]
  );

  const navigate = useCallback(
    (delta: number) => {
      if (isPending) return;
      const next = position + delta;
      if (next >= 0 && next < list.length) {
        setPosition(next);
        setSelectedDraft(null);
        setShowAiFor(null);
      }
    },
    [position, list.length, isPending]
  );

  const goTo = useCallback(
    (idx: number) => {
      if (isPending) return;
      setPosition(idx);
      setSelectedDraft(null);
      setShowAiFor(null);
    },
    [isPending]
  );

  const stats = useMemo(() => {
    const total = Object.keys(answers).length;
    const correct = Object.values(answers).filter((a) => a.isCorrect).length;
    return { total, correct, wrong: total - correct };
  }, [answers]);

  const currentItem = list[position];
  const profileHref = useMemo(
    () =>
      `/profile?returnMode=${encodeURIComponent(mode)}&returnChapter=${encodeURIComponent(
        chapter
      )}&returnPosition=${encodeURIComponent(position)}&returnCount=${encodeURIComponent(
        count
      )}&returnShuffle=${encodeURIComponent(shuffleEnabled)}${
        currentItem
          ? `&returnQuestionChapter=${encodeURIComponent(currentItem.chapter)}&returnQuestionIndex=${encodeURIComponent(
              currentItem.index
            )}`
          : ''
      }`,
    [mode, chapter, position, count, shuffleEnabled, currentItem]
  );

  if (!current) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-[#faf6ec] border border-[#d8cdb6] rounded-2xl p-8 text-center max-w-md">
          <p className="text-[#5b5247] font-serif-sc text-lg">
            {mode === 'wrong' ? '错题本是空的' : '暂无题目'}
          </p>
          <p className="text-sm text-[#8c8170] mt-2 mb-4">
            {mode === 'wrong' ? '先去做题，答错的题目会自动收录到这里。' : '请调整章节或题量设置。'}
          </p>
          <button
            onClick={() => changeMode('unit')}
            className="px-5 py-2 bg-[#a8272b] text-white rounded-lg hover:bg-[#7f1d20] transition-colors font-serif-sc"
          >
            返回单元测试
          </button>
        </div>
      </div>
    );
  }

  const meta = chapters[current.chapter];
  const correctIndex = LETTERS.indexOf(current.question.a as (typeof LETTERS)[number]);
  const showResult = !!currentAnswer;
  const isWrong = currentAnswer && !currentAnswer.isCorrect;
  const isManualWrong = currentAnswer?.selected === '—';

  return (
    <div className="min-h-screen pb-24">
      <header className="max-w-[1240px] mx-auto px-4 sm:px-6 pt-4 pb-4 border-b-2 border-[#211c16]">
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-11 h-11 rounded-lg bg-[#a8272b] text-white grid place-items-center font-serif-sc text-xl font-bold border border-[#7f1d20] shadow-[0_6px_16px_-8px_#7f1d20] -rotate-2">
            史
          </div>
          <div>
            <h1 className="font-serif-sc text-2xl font-bold text-[#211c16]">近代史纲要 · 刷题台</h1>
            <p className="text-xs text-[#5b5247]">
              单元测试 / 全书测试 / 错题复盘 · 知识库 / 时间轴 / 地理地图 / AI 复习
            </p>
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
                <ModeButton active={mode === 'unit'} onClick={() => changeMode('unit')}>
                  单元测试
                </ModeButton>
                <ModeButton active={mode === 'full'} onClick={() => changeMode('full')}>
                  全书测试
                </ModeButton>
                <ModeButton active={mode === 'wrong'} onClick={() => changeMode('wrong')}>
                  错题本
                </ModeButton>
              </div>

              {mode === 'unit' && (
                <select
                  value={chapter}
                  onChange={(e) => changeChapter(e.target.value)}
                  className="px-3 py-2 bg-[#f4eedf] border border-[#d8cdb6] rounded-lg text-sm text-[#211c16] focus:outline-none focus:border-[#a8272b]"
                >
                  {chapterKeys.map((k) => (
                    <option key={k} value={k}>
                      {chapterNames[k]}
                    </option>
                  ))}
                </select>
              )}

              {mode !== 'wrong' && (
                <>
                  <select
                    value={count}
                    onChange={(e) => {
                      setCount(e.target.value);
                      regenerateList();
                    }}
                    className="px-3 py-2 bg-[#f4eedf] border border-[#d8cdb6] rounded-lg text-sm text-[#211c16] focus:outline-none focus:border-[#a8272b]"
                  >
                    {COUNT_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>

                  <label className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#f4eedf] border border-[#d8cdb6] rounded-lg text-sm text-[#5b5247] cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={shuffleEnabled}
                      onChange={(e) => {
                        setShuffleEnabled(e.target.checked);
                        regenerateList();
                      }}
                      className="accent-[#a8272b]"
                    />
                    乱序
                  </label>
                </>
              )}

              <div className="flex-1" />

              <button
                onClick={() => setAiReviewOpen(true)}
                className="px-3 py-2 text-sm border border-[#d8cdb6] bg-[#f4eedf] rounded-lg text-[#5b5247] hover:border-[#a8272b] hover:text-[#a8272b] transition-colors font-serif-sc"
              >
                🤖 AI 复习
              </button>
              <Link
                href={profileHref}
                className="px-3 py-2 text-sm border border-[#d8cdb6] bg-[#f4eedf] rounded-lg text-[#5b5247] hover:border-[#a8272b] hover:text-[#a8272b] transition-colors font-serif-sc"
              >
                📊 错题画像
              </Link>
              <button
                onClick={() => setMobileSideOpen(true)}
                className="lg:hidden px-3 py-2 text-sm border border-[#d8cdb6] bg-[#f4eedf] rounded-lg text-[#5b5247]"
              >
                📖 本章资料
              </button>
              <form action="/api/logout" method="post" className="contents">
                <button
                  type="submit"
                  className="px-3 py-2 text-sm border border-[#d8cdb6] bg-[#f4eedf] rounded-lg text-[#5b5247] hover:border-[#a8272b] hover:text-[#a8272b] transition-colors"
                >
                  退出
                </button>
              </form>
            </div>

            {/* Question card */}
            <div className="bg-[#faf6ec] border border-[#d8cdb6] rounded-xl shadow-[var(--shadow)] p-5 sm:p-6 contain-layout-paint">
              <div className="flex items-center gap-2 text-xs text-[#8c8170] font-serif-sc tracking-widest mb-3">
                <span className="px-2 py-0.5 bg-white border border-[#f1d9d6] rounded-full text-[#a8272b]">
                  第{CN_NUMBERS[Number(current.chapter)]}章
                </span>
                <span className="px-2 py-0.5 bg-[#f4eedf] border border-[#d8cdb6] rounded-full text-[#5b5247]">
                  单选题
                </span>
                <span>本章第 {current.index + 1} 题</span>
              </div>

              <h2 className="font-serif-sc text-lg sm:text-xl leading-relaxed font-medium text-[#211c16] mb-5">
                <span className="text-[#a8272b] font-bold mr-2">{position + 1}.</span>
                {current.question.q}
              </h2>

              <div className="flex flex-col gap-2.5">
                {LETTERS.map((letter, idx) => (
                  <OptionButton
                    key={letter}
                    letter={letter}
                    text={current.question.o[idx]}
                    selected={selectedDraft === letter || currentAnswer?.selected === letter}
                    correct={current.question.a === letter}
                    showResult={showResult}
                    disabled={showResult || isPending}
                    onClick={() => handleSelect(letter)}
                    appearDelay={idx * 40}
                  />
                ))}
              </div>

              <div className="mt-5 pt-4 border-t border-[#e6ddc9] flex flex-wrap items-center gap-3">
                <button
                  onClick={() => navigate(-1)}
                  disabled={position === 0}
                  className="px-4 py-2 text-sm border border-[#d8cdb6] bg-[#f4eedf] rounded-lg text-[#5b5247] hover:border-[#a8272b] hover:text-[#a8272b] disabled:opacity-45 transition-colors font-serif-sc"
                >
                  ← 上一题
                </button>

                {!showResult ? (
                  isPending ? (
                    <span className="px-4 py-2 text-sm text-[#a8272b] font-serif-sc flex items-center gap-2">
                      <span className="inline-block w-4 h-4 border-2 border-[#d8cdb6] border-t-[#a8272b] rounded-full animate-spin" />
                      提交中…
                    </span>
                  ) : (
                    <span className="px-4 py-2 text-sm text-[#8c8170] font-serif-sc">点击选项即可作答</span>
                  )
                ) : (
                  <button
                    onClick={() => navigate(1)}
                    disabled={position === list.length - 1}
                    className="px-4 py-2 text-sm bg-[#a8272b] text-white rounded-lg hover:bg-[#7f1d20] disabled:opacity-45 transition-colors shadow-[0_5px_14px_-7px_#7f1d20] font-serif-sc"
                  >
                    下一题 →
                  </button>
                )}

                <div className="flex-1" />
                <span className="text-sm text-[#8c8170] font-serif-sc">
                  {position + 1} / {list.length}
                </span>
              </div>

              {showResult && (
                <div className="mt-5 pt-4 border-t border-dashed border-[#d8cdb6] animate-[fade_.25s_ease-out]">
                  <p className="font-serif-sc text-[15px] mb-2">
                    {currentAnswer?.isCorrect ? (
                      <span className="text-[#2f6b4f] font-bold">✓ 回答正确</span>
                    ) : isManualWrong ? (
                      <span className="text-[#a8272b] font-bold">✕ 已手动标记为错题，正确答案 {current.question.a}</span>
                    ) : (
                      <span className="text-[#a8272b] font-bold">
                        ✕ 回答错误　你选了 {currentAnswer?.selected}，正确答案是 {current.question.a}
                      </span>
                    )}
                  </p>
                  <div className="bg-[#f4eedf] border border-[#d8cdb6] border-l-[3px] border-l-[#8a6d3b] rounded-lg p-3 text-sm text-[#5b5247]">
                    <span className="font-serif-sc font-bold text-[#8a6d3b]">
                      正确答案 {current.question.a}：
                    </span>
                    {current.question.o[correctIndex]}
                    {current.question.answerSource && (
                      <span className="block mt-1 text-[11px] text-[#8c8170]">
                        答案来源：{current.question.answerSource === 'excel' ? '题库原表' : '内置补充答案'}
                      </span>
                    )}
                  </div>
                  {current.question.explanation && (
                    <div className="mt-3 text-sm text-[#5b5247] leading-relaxed bg-white border border-[#d8cdb6] rounded-lg p-3">
                      <span className="font-serif-sc font-bold text-[#211c16]">解析：</span>
                      {current.question.explanation}
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => setShowAiFor(currentKey)}
                      className="px-4 py-2 text-sm border border-[#a8272b] text-[#a8272b] bg-white rounded-lg hover:bg-[#a8272b] hover:text-white transition-colors font-serif-sc"
                    >
                      ✦ AI 详细解析
                    </button>
                    <button
                      onClick={() => handleToggleMistake(!isWrong)}
                      className={cn(
                        'px-4 py-2 text-sm border rounded-lg transition-colors font-serif-sc',
                        isWrong
                          ? 'border-[#2f6b4f] text-[#2f6b4f] bg-white hover:bg-[#2f6b4f] hover:text-white'
                          : 'border-[#a8272b] text-[#a8272b] bg-white hover:bg-[#a8272b] hover:text-white'
                      )}
                    >
                      {isWrong ? '移出错题本' : '加入错题本'}
                    </button>
                    <Link
                      href={profileHref}
                      className="px-4 py-2 text-sm border border-[#d8cdb6] bg-[#f4eedf] text-[#5b5247] rounded-lg hover:border-[#a8272b] hover:text-[#a8272b] transition-colors font-serif-sc"
                    >
                      📊 查看错题画像
                    </Link>
                  </div>
                  {showAiFor === currentKey && (
                    <AiExplain
                      question={current.question}
                      chapterKey={current.chapter}
                      chapter={meta}
                      selected={currentAnswer?.selected}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Answer sheet */}
            <div className="bg-[#faf6ec] border border-[#d8cdb6] rounded-xl shadow-[var(--shadow)] p-4">
              <h3 className="font-serif-sc text-sm text-[#5b5247] mb-3 flex items-center justify-between">
                答题卡
                <span className="text-[11px] text-[#8c8170] font-sans flex gap-3">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#2f6b4f]" />对
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#a8272b]" />错
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#d8cdb6]" />未答
                  </span>
                </span>
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {list.map((item, idx) => (
                  <AnswerSheetItem
                    key={`${item.chapter}-${item.index}`}
                    idx={idx}
                    item={item}
                    position={position}
                    answers={answers}
                    onClick={() => goTo(idx)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Side panel */}
          <aside
            className={cn(
              'lg:sticky lg:top-5 bg-[#faf6ec] border border-[#d8cdb6] rounded-xl shadow-[var(--shadow)] overflow-hidden contain-layout-paint',
              'fixed inset-0 z-50 lg:inset-auto lg:z-auto lg:block',
              mobileSideOpen ? 'block' : 'hidden lg:block'
            )}
          >
            <div className="p-4 border-b border-[#d8cdb6] flex items-center justify-between lg:hidden">
              <b className="font-serif-sc">本章资料</b>
              <button onClick={() => setMobileSideOpen(false)} className="text-sm text-[#a8272b] font-serif-sc">
                关闭 ✕
              </button>
            </div>
            <div className="p-4 pb-2">
              <h2 className="font-serif-sc text-lg font-bold text-[#211c16]">
                第{CN_NUMBERS[Number(current.chapter)]}章 · {meta.title}
              </h2>
              <p className="text-xs text-[#8a6d3b] mt-1 tracking-wide">{meta.subtitle}</p>
            </div>
            <div className="flex gap-1 px-4 pt-2">
              <SideTab active={sideTab === 'k'} onClick={() => setSideTab('k')}>
                知识点
              </SideTab>
              <SideTab active={sideTab === 't'} onClick={() => setSideTab('t')}>
                时间轴
              </SideTab>
              <SideTab active={sideTab === 'm'} onClick={() => setSideTab('m')}>
                地图
              </SideTab>
              <SideTab active={sideTab === 'e'} onClick={() => setSideTab('e')}>
                课后题
              </SideTab>
              <SideTab active={sideTab === 'o'} onClick={() => setSideTab('o')}>
                全书总览
              </SideTab>
            </div>
            <div className="p-4 max-h-[70vh] overflow-auto">
              {sideTab === 'k' ? (
                <div className="space-y-4">
                  {meta.knowledge.map((k, i) => (
                    <KnowledgeItem key={i} item={k} />
                  ))}
                </div>
              ) : sideTab === 't' ? (
                <div className="relative pl-1">
                  <div className="absolute left-[21px] top-1.5 bottom-1.5 w-0.5 bg-gradient-to-b from-[#d8cdb6] via-[#f1d9d6] to-[#d8cdb6]" />
                  <div className="space-y-3">
                    {meta.timeline.map((e, i) => (
                      <TimelineItem key={i} event={e} />
                    ))}
                  </div>
                </div>
              ) : sideTab === 'm' ? (
                <ChapterMap title={`第${CN_NUMBERS[Number(current.chapter)]}章事件地图`} timeline={meta.timeline} />
              ) : sideTab === 'e' ? (
                <ChapterEssays essays={ESSAYS[current.chapter] || []} />
              ) : (
                <OverviewPanel />
              )}
            </div>
          </aside>
        </div>
      </main>

      {mobileSideOpen && (
        <div className="fixed inset-0 bg-[#2118] z-40 lg:hidden" onClick={() => setMobileSideOpen(false)} />
      )}

      <AiReview
        open={aiReviewOpen}
        onClose={() => setAiReviewOpen(false)}
        question={current.question}
        chapterKey={current.chapter}
        chapter={meta}
      />
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

function KnowledgeItem({ item }: { item: { title: string; summary: string; detail: string } }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <h4 className="font-serif-sc text-sm font-bold text-[#a8272b] flex items-center gap-2 mb-1.5">
        <span className="w-2 h-2 bg-[#a8272b] rotate-45" />
        {item.title}
      </h4>
      <p className="text-[13px] text-[#5b5247] leading-relaxed">{item.summary}</p>
      <button
        onClick={() => setOpen(!open)}
        className="text-[11px] text-[#8a6d3b] mt-1 hover:underline"
      >
        {open ? '收起详情' : '查看详情'}
      </button>
      {open && (
        <p className="mt-2 text-[12px] text-[#5b5247] leading-relaxed bg-white border border-[#d8cdb6] rounded-lg p-2 animate-[fade_.2s_ease-out]">
          {item.detail}
        </p>
      )}
    </div>
  );
}

function OverviewPanel() {
  const knowledge = OVERVIEW.knowledge;
  const timeline = OVERVIEW.timeline.map((e) => ({
    date: e.d,
    title: e.t,
    summary: e.x,
    detail: e.x,
    place: e.place,
  }));

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-serif-sc font-bold text-[#211c16] mb-3">{OVERVIEW.title}</h3>
        <p className="text-xs text-[#8a6d3b] mb-3">{OVERVIEW.subtitle}</p>
        <div className="space-y-3">
          {knowledge.map((k, i) => (
            <div key={i} className="bg-white border border-[#d8cdb6] rounded-lg p-3">
              <h4 className="font-serif-sc text-sm font-bold text-[#a8272b] mb-1.5">{k.h}</h4>
              <ul className="list-disc list-inside text-[13px] text-[#5b5247] leading-relaxed space-y-0.5">
                {k.p.map((text, j) => (
                  <li key={j}>{text}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-serif-sc font-bold text-[#211c16] mb-3">全书时间轴</h3>
        <div className="relative pl-1">
          <div className="absolute left-[21px] top-1.5 bottom-1.5 w-0.5 bg-gradient-to-b from-[#d8cdb6] via-[#f1d9d6] to-[#d8cdb6]" />
          <div className="space-y-3">
            {timeline.map((e, i) => (
              <TimelineItem key={i} event={e} />
            ))}
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-serif-sc font-bold text-[#211c16] mb-3">全书事件地图</h3>
        <ChapterMap title="中国近现代史重要事件地点" timeline={timeline} />
      </div>
    </div>
  );
}

function TimelineItem({ event }: { event: { date: string; title: string; summary: string; detail: string; place?: string } }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative pl-14">
      <button
        onClick={() => setOpen(!open)}
        className="absolute left-0 top-0 min-w-[44px] px-1.5 h-11 rounded-full bg-white border-2 border-[#a8272b] text-[#a8272b] grid place-items-center font-serif text-[11px] font-bold leading-tight text-center shadow-[0_4px_10px_-6px_#7f1d20] hover:bg-[#a8272b] hover:text-white transition-colors z-10"
      >
        {event.date}
      </button>
      <button onClick={() => setOpen(!open)} className="text-left w-full py-2">
        <div className="font-serif-sc font-semibold text-[#211c16]">{event.title}</div>
        <div className="text-[11px] text-[#8c8170]">{open ? '点击收起' : '点击查看简介'}</div>
      </button>
      {open && (
        <div className="bg-[#f4eedf] border border-[#d8cdb6] border-l-[3px] border-l-[#a8272b] rounded-lg p-3 text-[13px] text-[#5b5247] leading-relaxed mb-2 animate-[fade_.2s_ease-out]">
          {event.detail || event.summary}
        </div>
      )}
    </div>
  );
}
