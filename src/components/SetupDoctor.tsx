import { useState, useEffect, useCallback } from 'react'
import type { SetupCheck, SetupReport } from '../types'

interface SetupDoctorProps {
  firstRun: boolean
  onClose: () => void
}

const STATUS_STYLES: Record<SetupCheck['status'], { dot: string; label: string }> = {
  ok: { dot: 'bg-green-500', label: 'OK' },
  warning: { dot: 'bg-amber-400', label: 'Needs attention' },
  error: { dot: 'bg-red-500', label: 'Problem' }
}

export function SetupDoctor({ firstRun, onClose }: SetupDoctorProps) {
  const [report, setReport] = useState<SetupReport | null>(null)
  const [checking, setChecking] = useState(false)
  const [fixing, setFixing] = useState<string | null>(null)

  const runChecks = useCallback(async () => {
    setChecking(true)
    try {
      setReport(await window.persona.setup.runChecks())
    } finally {
      setChecking(false)
    }
  }, [])

  useEffect(() => {
    runChecks()
  }, [runChecks])

  const handleFix = async (check: SetupCheck) => {
    setFixing(check.id)
    try {
      await window.persona.setup.applyFix(check.id)
      await runChecks()
    } finally {
      setFixing(null)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-40" onClick={onClose}>
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-zinc-800">
          <h2 className="text-sm font-bold text-zinc-200">
            {firstRun ? 'Welcome to Persona — One-Time Setup' : 'Setup Doctor'}
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            {firstRun
              ? 'Persona routes your mic through Carla-hosted effects. This checks and installs everything needed — once. No terminal, no passwords.'
              : 'Checks the audio stack Persona depends on and repairs anything broken.'}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {report === null && (
            <div className="text-xs text-zinc-500 py-8 text-center">Checking your system...</div>
          )}
          {report?.checks.map(check => {
            const style = STATUS_STYLES[check.status]
            const isFixing = fixing === check.id
            return (
              <div
                key={check.id}
                className="flex items-start gap-3 bg-zinc-800/60 border border-zinc-800 rounded-lg px-3 py-2.5"
              >
                <span
                  role="status"
                  aria-label={`${check.label}: ${style.label}`}
                  className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${style.dot}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-zinc-200">{check.label}</div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">{check.detail}</div>
                </div>
                {check.fixable && check.status !== 'ok' && (
                  <button
                    onClick={() => handleFix(check)}
                    disabled={fixing !== null || checking}
                    className="shrink-0 px-2.5 py-1 rounded text-[11px] bg-zinc-700 border border-zinc-600 text-zinc-200 hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-wait"
                  >
                    {isFixing ? 'Working...' : check.fixLabel ?? 'Fix'}
                  </button>
                )}
              </div>
            )
          })}
          {report?.allOk && (
            <div className="bg-green-900/30 border border-green-800 rounded-lg px-3 py-2.5 text-xs text-green-300">
              Everything is ready. Create a voice with “New Voice” and start talking.
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-zinc-800 flex items-center justify-between">
          <button
            onClick={runChecks}
            disabled={checking || fixing !== null}
            className="px-3 py-1.5 rounded text-xs bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200 disabled:opacity-50"
          >
            {checking ? 'Checking...' : 'Re-check'}
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded text-xs bg-zinc-700 border border-zinc-600 text-zinc-200 hover:bg-zinc-600"
          >
            {report?.allOk ? 'Done' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  )
}
