'use client';

import { useActionState } from 'react';
import { login } from './actions';

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(login, null);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="studentId" className="block text-sm font-medium text-[#5b5247] mb-1.5 font-serif">
          学号
        </label>
        <input
          type="text"
          id="studentId"
          name="studentId"
          placeholder="请输入 8 位学号，如 25110228"
          maxLength={8}
          required
          pattern="\d{8}"
          className="w-full px-4 py-3 bg-white border border-[#d8cdb6] rounded-xl text-[#211c16] placeholder:text-[#8c8170] focus:outline-none focus:border-[#a8272b] focus:ring-2 focus:ring-[#a8272b]/20 transition-colors"
        />
      </div>
      {state?.error && (
        <p className="text-sm text-[#a8272b] font-medium">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full py-3 px-4 bg-[#a8272b] hover:bg-[#7f1d20] disabled:opacity-50 text-white rounded-xl font-serif font-bold shadow-[0_5px_14px_-7px_#7f1d20] transition-colors"
      >
        {pending ? '登录中…' : '进入刷题台'}
      </button>
    </form>
  );
}
