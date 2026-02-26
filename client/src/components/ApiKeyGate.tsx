import { useState } from 'react';

const STORAGE_KEY = 'openai_api_key';

export function getStoredOpenaiApiKey(): string {
  if (typeof localStorage === 'undefined') return '';
  return localStorage.getItem(STORAGE_KEY) || '';
}

export function setStoredOpenaiApiKey(key: string): void {
  if (typeof localStorage === 'undefined') return;
  if (key.trim()) localStorage.setItem(STORAGE_KEY, key.trim());
  else localStorage.removeItem(STORAGE_KEY);
}

interface ApiKeyGateProps {
  onSuccess: (key: string) => void;
  onSkip?: () => void;
}

/** 使用多智能体报告前需输入 OpenAI API Key；Key 仅存于当前浏览器，仅用于向本网站发起报告请求 */
export default function ApiKeyGate({ onSuccess, onSkip }: ApiKeyGateProps) {
  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const key = value.trim();
    if (!key) return;
    setSubmitting(true);
    setStoredOpenaiApiKey(key);
    onSuccess(key);
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-gray-800 mb-1">使用多智能体报告</h1>
        <p className="text-sm text-gray-500 mb-4">
          请输入您的 OpenAI API Key。Key 仅保存在您当前浏览器本地，仅用于向本网站发起报告请求，不会另作存储或上传到其他服务。
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            autoComplete="off"
            placeholder="sk-..."
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!value.trim() || submitting}
              className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none"
            >
              保存并进入
            </button>
            {onSkip && (
              <button
                type="button"
                onClick={onSkip}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                仅浏览
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
