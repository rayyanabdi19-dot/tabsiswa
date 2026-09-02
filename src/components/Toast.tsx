import { useState, useEffect } from 'react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
}

let toastListener: ((toast: ToastMessage) => void) | null = null;

export function showToast(title: string, message?: string, type: 'success' | 'error' | 'info' = 'success') {
  if (toastListener) {
    toastListener({
      id: Math.random().toString(36).substring(2, 9),
      type,
      title,
      message,
    });
  }
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    toastListener = (toast) => {
      setToasts((prev) => [...prev, toast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, 4000);
    };

    return () => {
      toastListener = null;
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-lg border transition-all duration-300 transform translate-y-0 ${
            toast.type === 'success'
              ? 'bg-[#ffffff] border-[#becabd] text-[#1a1c1c] border-l-4 border-l-[#006130]'
              : toast.type === 'error'
              ? 'bg-[#ffffff] border-[#ffdad6] text-[#1a1c1c] border-l-4 border-l-[#ba1a1a]'
              : 'bg-[#ffffff] border-[#d6e3ff] text-[#1a1c1c] border-l-4 border-l-[#005db5]'
          }`}
        >
          <span
            className={`material-symbols-outlined text-xl mt-0.5 ${
              toast.type === 'success'
                ? 'text-[#006130]'
                : toast.type === 'error'
                ? 'text-[#ba1a1a]'
                : 'text-[#005db5]'
            }`}
          >
            {toast.type === 'success' ? 'check_circle' : toast.type === 'error' ? 'error' : 'info'}
          </span>
          <div className="flex-1">
            <h4 className="font-semibold text-sm leading-tight text-[#1a1c1c]">{toast.title}</h4>
            {toast.message && (
              <p className="text-xs text-[#3f4940] mt-1 leading-relaxed">{toast.message}</p>
            )}
          </div>
          <button
            onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
            className="text-[#6f7a6f] hover:text-[#1a1c1c] p-0.5 rounded transition-colors"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      ))}
    </div>
  );
}
