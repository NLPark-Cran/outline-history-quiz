'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { StatsResult, WrongTopicStat } from '@/lib/data';
import { ChapterMeta, Question } from '@/lib/questions';
import { cn } from '@/lib/utils';

interface ProfileClientProps {
  user: { id: number; studentId: string };
  stats: StatsResult;
  weakTopics: WrongTopicStat[];
  mostWrong: {
    chapter: string;
    questionIndex: number;
    wrongCount: number;
    question?: Question;
  }[];
  chapters: Record<string, ChapterMeta>;
  chapterKeys: string[];
  chapterNames: Record<string, string>;
  wrongKeys: string[];
}

const CN = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

export default function ProfileClient({
  user,
  stats,
  weakTopics,
  mostWrong,
  chapters,
  chapterKeys,
  chapterNames,
  wrongKeys,
}: ProfileClientProps) {
  const chapterData = useMemo(
    () =>
      chapterKeys.map((k) => ({
        name: `第${CN[Number(k)]}章`,
        key: k,
        accuracy: stats.chapterStats[k]?.accuracy || 0,
        total: stats.chapterStats[k]?.total || 0,
      })),
    [chapterKeys, stats.chapterStats]
  );

  return (
    <div className="min-h-screen pb-12">
      <header className="max-w-[1240px] mx-auto px-4 sm:px-6 pt-4 pb-4 border-b-2 border-[#211c16]">
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-11 h-11 rounded-lg bg-[#a8272b] text-white grid place-items-center font-serif-sc text-xl font-bold border border-[#7f1d20] shadow-[0_6px_16px_-8px_#7f1d20] -rotate-2">
            史
          </div>
          <div>
            <h1 className="font-serif-sc text-2xl font-bold text-[#211c16]">错题画像 · 学习分析</h1>
            <p className="text-xs text-[#5b5247]">学号 {user.studentId}</p>
          </div>
          <div className="flex-1" />
          <a href="/quiz" className="px-4 py-2 text-sm bg-[#a8272b] text-white rounded-lg hover:bg-[#7f1d20] transition-colors shadow-[0_5px_14px_-7px_#7f1d20] font-serif-sc">
            返回刷题
          </a>
        </div>
      </header>

      <main className="max-w-[1240px] mx-auto px-4 sm:px-6 mt-5 space-y-5">
        {/* Overview cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <OverviewCard label="答题总数" value={stats.totalAnswered} />
          <OverviewCard label="正确率" value={`${stats.accuracy}%`} highlight />
          <OverviewCard label="答对题数" value={stats.totalCorrect} />
          <OverviewCard label="答错题数" value={stats.totalWrong} danger />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Chapter accuracy chart */}
          <div className="bg-[#faf6ec] border border-[#d8cdb6] rounded-xl shadow-[var(--shadow)] p-5">
            <h3 className="font-serif-sc text-base font-bold text-[#211c16] mb-4">章节正确率</h3>
            {stats.totalAnswered === 0 ? (
              <p className="text-sm text-[#8c8170]">还没有答题记录，去刷题吧～</p>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chapterData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#5b5247' }} axisLine={{ stroke: '#d8cdb6' }} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#5b5247' }} axisLine={{ stroke: '#d8cdb6' }} tickLine={false} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{ background: '#faf6ec', border: '1px solid #d8cdb6', borderRadius: '8px' }}
                      itemStyle={{ color: '#211c16' }}
                    />
                    <Bar dataKey="accuracy" radius={[4, 4, 0, 0]} name="正确率 %">
                      {chapterData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.accuracy >= 80 ? '#2f6b4f' : entry.accuracy >= 60 ? '#8a6d3b' : '#a8272b'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Weak topics */}
          <div className="bg-[#faf6ec] border border-[#d8cdb6] rounded-xl shadow-[var(--shadow)] p-5">
            <h3 className="font-serif-sc text-base font-bold text-[#211c16] mb-4">薄弱知识点 TOP</h3>
            {weakTopics.length === 0 ? (
              <p className="text-sm text-[#8c8170]">暂无足够数据，继续答题后会生成分析。</p>
            ) : (
              <div className="space-y-3">
                {weakTopics.slice(0, 8).map((t) => (
                  <div key={t.tag}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-[#211c16] font-medium">{t.tag}</span>
                      <span className={cn('font-bold', t.accuracy < 60 ? 'text-[#a8272b]' : 'text-[#2f6b4f]')}>
                        {t.accuracy}% 正确
                      </span>
                    </div>
                    <div className="h-2 bg-[#e6ddc9] rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full', t.accuracy < 60 ? 'bg-[#a8272b]' : 'bg-[#2f6b4f]')}
                        style={{ width: `${t.accuracy}%` }}
                      />
                    </div>
                    <div className="text-[11px] text-[#8c8170] mt-0.5">
                      共 {t.totalCount} 题，错 {t.wrongCount} 题
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Most wrong questions */}
        <div className="bg-[#faf6ec] border border-[#d8cdb6] rounded-xl shadow-[var(--shadow)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif-sc text-base font-bold text-[#211c16]">高频错题 TOP</h3>
            {wrongKeys.length > 0 && (
              <a
                href={`/quiz?mode=wrong`}
                className="px-3 py-1.5 text-sm bg-[#a8272b] text-white rounded-lg hover:bg-[#7f1d20] transition-colors font-serif-sc"
              >
                重做错题
              </a>
            )}
          </div>
          {mostWrong.length === 0 ? (
            <p className="text-sm text-[#8c8170]">还没有错题，继续保持！</p>
          ) : (
            <div className="divide-y divide-[#e6ddc9]">
              {mostWrong.map((item, idx) => (
                <div key={`${item.chapter}-${item.questionIndex}`} className="py-4 first:pt-0">
                  <div className="flex items-start gap-3">
                    <span className="flex-none w-6 h-6 rounded-full bg-[#f1d9d6] text-[#a8272b] grid place-items-center text-xs font-bold font-serif-sc">
                      {idx + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm text-[#8c8170] mb-1">{chapterNames[item.chapter]} · 错 {item.wrongCount} 次</p>
                      <p className="text-[#211c16] font-serif-sc leading-relaxed">{item.question?.q}</p>
                      {item.question && (
                        <p className="text-sm text-[#2f6b4f] mt-1 font-medium">
                          正确答案：{item.question.a}. {item.question.o[['A', 'B', 'C', 'D'].indexOf(item.question.a)]}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function OverviewCard({ label, value, highlight, danger }: { label: string; value: string | number; highlight?: boolean; danger?: boolean }) {
  return (
    <div className="bg-[#faf6ec] border border-[#d8cdb6] rounded-xl shadow-[var(--shadow)] p-4 text-center">
      <div
        className={cn(
          'text-2xl font-bold font-serif-sc',
          highlight ? 'text-[#2f6b4f]' : danger ? 'text-[#a8272b]' : 'text-[#211c16]'
        )}
      >
        {value}
      </div>
      <div className="text-xs text-[#8c8170] mt-1">{label}</div>
    </div>
  );
}
