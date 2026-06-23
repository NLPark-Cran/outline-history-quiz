import LoginForm from './LoginForm';

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-[radial-gradient(1200px_600px_at_110%_-10%,_#f7f1e4,_transparent_60%),radial-gradient(900px_500px_at_-10%_120%,_#ece3d0,_transparent_55%),_#efe8d9]">
      <div className="w-full max-w-md bg-[#faf6ec] border border-[#d8cdb6] rounded-2xl shadow-[0_1px_0_#fff8_inset,0_8px_24px_-14px_#5b524733] p-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-lg bg-[#a8272b] text-white grid place-items-center font-serif text-2xl font-bold border border-[#7f1d20] shadow-[0_6px_16px_-8px_#7f1d20] -rotate-2">
            史
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold text-[#211c16]">近代史纲要 · 刷题台</h1>
            <p className="text-sm text-[#5b5247]">中国近现代史纲要 · 单元测试与全书测试</p>
          </div>
        </div>

        <LoginForm />

        <p className="mt-6 text-xs text-center text-[#8c8170]">
          输入 8 位学号即可登录，答题记录会自动保存。
        </p>
      </div>
    </main>
  );
}
