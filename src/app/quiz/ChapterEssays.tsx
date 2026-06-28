'use client';

import { useState } from 'react';
import { Essay } from '@/lib/questions';
import { cn } from '@/lib/utils';

interface ChapterEssaysProps {
  essays: Essay[];
}

function EssayCard({ essay, index }: { essay: Essay; index: number }) {
  const [open, setOpen] = useState(false);
  const [showAi, setShowAi] = useState(false);
  const [showOrg, setShowOrg] = useState(false);

  return (
    <div className="bg-white border border-[#d8cdb6] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 text-left flex items-start gap-3 hover:bg-[#f4eedf] transition-colors"
      >
        <span className="flex-none w-6 h-6 rounded-full bg-[#f1d9d6] text-[#a8272b] grid place-items-center text-xs font-bold font-serif-sc">
          {index + 1}
        </span>
        <span className="font-serif-sc font-medium text-[#211c16]">{essay.q}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 animate-[fade_.2s_ease-out]">
          {essay.frame && (
            <div className="bg-[#f4eedf] border border-[#d8cdb6] border-l-[3px] border-l-[#8a6d3b] rounded-lg p-3">
              <span className="text-[11px] text-[#8a6d3b] font-serif-sc font-bold">答题框架</span>
              <p className="text-sm text-[#5b5247] mt-1 font-serif-sc">{essay.frame}</p>
            </div>
          )}

          <div className="space-y-2">
            {essay.pts.map((pt, i) => (
              <div key={i} className="text-sm">
                <div className="flex items-baseline gap-2">
                  <span className="font-serif-sc font-bold text-[#a8272b]">{pt.title}</span>
                  {pt.pages && <span className="text-[11px] text-[#8c8170]">教材 p{pt.pages}</span>}
                </div>
                <p className="text-[#5b5247] leading-relaxed mt-0.5">{pt.content}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {essay.ai && essay.ai.length > 0 && (
              <button
                onClick={() => setShowAi(!showAi)}
                className={cn(
                  'px-3 py-1.5 text-xs rounded-lg border transition-colors font-serif-sc',
                  showAi
                    ? 'bg-[#a8272b] text-white border-[#a8272b]'
                    : 'bg-white text-[#5b5247] border-[#d8cdb6] hover:border-[#a8272b] hover:text-[#a8272b]'
                )}
              >
                {showAi ? '收起 AI 解析' : '查看 AI 解析'}
              </button>
            )}
            {essay.org && essay.org.length > 0 && (
              <button
                onClick={() => setShowOrg(!showOrg)}
                className={cn(
                  'px-3 py-1.5 text-xs rounded-lg border transition-colors font-serif-sc',
                  showOrg
                    ? 'bg-[#2f6b4f] text-white border-[#2f6b4f]'
                    : 'bg-white text-[#5b5247] border-[#d8cdb6] hover:border-[#2f6b4f] hover:text-[#2f6b4f]'
                )}
              >
                {showOrg ? '收起机构解析' : '查看机构解析'}
              </button>
            )}
          </div>

          {showAi && essay.ai && (
            <div className="bg-[#faf6ec] border border-[#d8cdb6] rounded-lg p-3 space-y-2 animate-[fade_.2s_ease-out]">
              <span className="text-[11px] text-[#a8272b] font-serif-sc font-bold">AI 解析</span>
              {essay.ai.map((text, i) => (
                <p key={i} className="text-[13px] text-[#5b5247] leading-relaxed">
                  {text}
                </p>
              ))}
            </div>
          )}

          {showOrg && essay.org && (
            <div className="bg-[#faf6ec] border border-[#d8cdb6] rounded-lg p-3 space-y-2 animate-[fade_.2s_ease-out]">
              <span className="text-[11px] text-[#2f6b4f] font-serif-sc font-bold">机构解析</span>
              {essay.org.map((text, i) => (
                <p key={i} className="text-[13px] text-[#5b5247] leading-relaxed">
                  {text}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ChapterEssays({ essays }: ChapterEssaysProps) {
  if (!essays || essays.length === 0) {
    return (
      <div className="bg-white border border-[#d8cdb6] rounded-xl p-4 text-sm text-[#5b5247]">
        本章暂无书后配套分析题。
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-xs text-[#8c8170] font-serif-sc">
        共 {essays.length} 道书后配套分析题，含答题框架、AI 解析与机构解析。
      </div>
      {essays.map((essay, i) => (
        <EssayCard key={i} essay={essay} index={i} />
      ))}
    </div>
  );
}
