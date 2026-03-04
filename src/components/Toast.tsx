import { useState, useEffect, useCallback } from 'react'
import type { Toast as ToastType } from '../types'

const TOAST_DURATION = 5000

const typeStyles: Record<ToastType['type'], string> = {
  error: 'bg-red-900/90 border-red-700 text-red-100',
  warning: 'bg-amber-900/90 border-amber-700 text-amber-100',
  info: 'bg-blue-900/90 border-blue-700 text-blue-100'
}

const typeIcons: Record<ToastType['type'], string> = {
  error: '!',
  warning: '!',
  info: 'i'
}

function ToastItem({ toast, onDismiss }: { toast: ToastType; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), TOAST_DURATION)
    return () => clearTimeout(timer)
  }, [toast.id, onDismiss])

  return (
    <div
      className={`flex items-start gap-2 px-3 py-2 rounded border text-xs shadow-lg animate-[slideIn_0.2s_ease-out] ${typeStyles[toast.type]}`}
    >
      <span className="shrink-0 w-4 h-4 rounded-full bg-current/20 flex items-center justify-center text-[10px] font-bold mt-0.5">
        {typeIcons[toast.type]}
      </span>
      <span className="flex-1">{toast.message}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 opacity-60 hover:opacity-100 text-sm leading-none"
      >
        x
      </button>
    </div>
  )
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastType[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  useEffect(() => {
    const unsubscribe = window.persona.toast.onShow((toast) => {
      setToasts((prev) => [...prev, toast])
    })
    return unsubscribe
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-3 right-3 z-50 flex flex-col gap-2 max-w-xs">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
      ))}
    </div>
  )
}
