import { useState, useEffect, useCallback, useRef } from 'react'
import type { Preset, PresetGroup, AppStatus, SessionProfile } from './types'
import { PresetPanel } from './components/PresetPanel'
import { PresetEditor } from './components/PresetEditor'
import { Hotbar } from './components/Hotbar'
import { DeviceSelector } from './components/DeviceSelector'
import { StatusBar } from './components/StatusBar'
import { CarlaControls } from './components/CarlaControls'
import { ToastContainer } from './components/Toast'
import { MiniPanel } from './components/MiniPanel'
import { SetupDoctor } from './components/SetupDoctor'
import { NewVoiceWizard } from './components/NewVoiceWizard'

const isMini = new URLSearchParams(window.location.search).has('mini')

export default function App() {
  if (isMini) return <MiniPanel />

  return <MainApp />
}

function MainApp() {
  const [presets, setPresets] = useState<Preset[]>([])
  const [groups, setGroups] = useState<PresetGroup[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [status, setStatus] = useState<AppStatus>({
    activePresetId: null,
    carlaRunning: false,
    carlaPlugins: [],
    linksActive: 0,
    micMonitoring: false,
    oscConnected: false
  })
  const [sessions, setSessions] = useState<SessionProfile[]>([])
  const [sessionMenuOpen, setSessionMenuOpen] = useState(false)
  const [savingSessionName, setSavingSessionName] = useState<string | null>(null)
  const sessionMenuRef = useRef<HTMLDivElement>(null)
  const [editingPreset, setEditingPreset] = useState<Preset | null | undefined>(undefined)
  const [doctorOpen, setDoctorOpen] = useState(false)
  const [doctorFirstRun, setDoctorFirstRun] = useState(false)
  const [voiceWizardOpen, setVoiceWizardOpen] = useState(false)

  const refreshPresets = useCallback(() => {
    window.persona.presets.getAll().then(setPresets)
    window.persona.groups.getAll().then(setGroups)
    window.persona.sessions.getAll().then(setSessions)
  }, [])

  useEffect(() => {
    refreshPresets()
    window.persona.status.get().then(setStatus)
    const unsubscribe = window.persona.status.onChange(setStatus)
    return unsubscribe
  }, [refreshPresets])

  // First run: open the setup doctor automatically
  useEffect(() => {
    window.persona.onboarding.isComplete().then(complete => {
      if (!complete) {
        setDoctorFirstRun(true)
        setDoctorOpen(true)
      }
    })
  }, [])

  const handleDoctorClose = () => {
    setDoctorOpen(false)
    if (doctorFirstRun) {
      window.persona.onboarding.setComplete(true)
      setDoctorFirstRun(false)
    }
  }

  const handleVoiceCreated = () => {
    setVoiceWizardOpen(false)
    refreshPresets()
  }

  // Close session menu on click outside
  useEffect(() => {
    if (!sessionMenuOpen) return
    const handleClick = (e: MouseEvent) => {
      if (sessionMenuRef.current && !sessionMenuRef.current.contains(e.target as Node)) {
        setSessionMenuOpen(false)
        setSavingSessionName(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [sessionMenuOpen])

  const handleActivate = async (id: string) => {
    await window.persona.presets.activate(id)
  }

  const handleNewPreset = () => setEditingPreset(null)
  const handleEditPreset = (preset: Preset) => setEditingPreset(preset)
  const handleCancelEdit = () => setEditingPreset(undefined)

  const handleSavePreset = async (data: {
    name: string; color: string;
    carxpPath?: string; groupId?: string; volume?: number; hotbarSlot?: number
  }) => {
    if (editingPreset === null) {
      const created = await window.persona.presets.create(data.name, data.color, data.carxpPath)
      if (data.groupId || data.volume !== undefined || data.hotbarSlot !== undefined) {
        await window.persona.presets.update(created.id, {
          groupId: data.groupId,
          volume: data.volume,
          hotbarSlot: data.hotbarSlot
        })
      }
    } else if (editingPreset) {
      await window.persona.presets.update(editingPreset.id, data)
    }
    setEditingPreset(undefined)
    refreshPresets()
  }

  const handleSaveSession = async () => {
    if (!savingSessionName?.trim()) {
      setSavingSessionName(null)
      return
    }
    await window.persona.sessions.save(savingSessionName.trim(), status.activePresetId, selectedGroupId)
    setSavingSessionName(null)
    setSessionMenuOpen(false)
    refreshPresets()
  }

  const handleLoadSession = async (id: string) => {
    const session = await window.persona.sessions.load(id)
    if (session?.selectedGroupId !== undefined) {
      setSelectedGroupId(session.selectedGroupId)
    }
    setSessionMenuOpen(false)
    refreshPresets()
  }

  const handleDeleteSession = async (id: string) => {
    await window.persona.sessions.delete(id)
    refreshPresets()
  }

  const handleToggleMini = () => {
    window.persona.miniPanel.toggle()
  }

  return (
    <div className="flex flex-col h-screen bg-zinc-900 text-white">
      <header className="px-4 py-3 border-b border-zinc-800 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-sm font-bold tracking-widest text-zinc-400 uppercase">
            Persona
          </h1>
          <div className="flex items-center gap-3">
            <CarlaControls status={status} />
            <button
              onClick={() => setVoiceWizardOpen(true)}
              title="Create a voice from an archetype"
              className="px-2 py-0.5 rounded text-[10px] bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600"
            >
              New Voice
            </button>
            <button
              onClick={() => setDoctorOpen(true)}
              title="Check and repair the audio setup"
              className="px-2 py-0.5 rounded text-[10px] bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600"
            >
              Setup
            </button>
            <div className="relative" ref={sessionMenuRef}>
              <button
                onClick={() => setSessionMenuOpen(!sessionMenuOpen)}
                title="Session profiles"
                className="px-2 py-0.5 rounded text-[10px] bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600"
              >
                Sessions
              </button>
              {sessionMenuOpen && (
                <div className="absolute right-0 top-full mt-1 z-50 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl py-1 min-w-[180px] text-xs">
                  {sessions.map(s => (
                    <div key={s.id} className="flex items-center group">
                      <button
                        onClick={() => handleLoadSession(s.id)}
                        className="flex-1 text-left px-3 py-1.5 text-zinc-300 hover:bg-zinc-700 truncate"
                      >
                        {s.name}
                      </button>
                      <button
                        onClick={() => handleDeleteSession(s.id)}
                        className="px-2 py-1.5 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100"
                        title="Delete session"
                      >
                        x
                      </button>
                    </div>
                  ))}
                  {sessions.length > 0 && <div className="border-t border-zinc-700 my-1" />}
                  {savingSessionName !== null ? (
                    <div className="px-2 py-1">
                      <input
                        autoFocus
                        placeholder="Session name..."
                        value={savingSessionName}
                        onChange={(e) => setSavingSessionName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveSession()
                          if (e.key === 'Escape') setSavingSessionName(null)
                        }}
                        onBlur={handleSaveSession}
                        className="w-full bg-zinc-900 border border-zinc-600 rounded px-2 py-1 text-xs text-white outline-none"
                      />
                    </div>
                  ) : (
                    <button
                      onClick={() => setSavingSessionName('')}
                      className="w-full text-left px-3 py-1.5 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
                    >
                      Save Current...
                    </button>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={handleToggleMini}
              title="Toggle mini panel"
              className="px-2 py-0.5 rounded text-[10px] bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600"
            >
              Mini
            </button>
          </div>
        </div>
        <DeviceSelector />
      </header>

      <main className="flex-1 overflow-y-auto p-4">
        <Hotbar
          presets={presets}
          activePresetId={status.activePresetId}
          onActivate={handleActivate}
          onRefresh={refreshPresets}
        />
        <PresetPanel
          presets={presets}
          groups={groups}
          activePresetId={status.activePresetId}
          selectedGroupId={selectedGroupId}
          onSelectGroup={setSelectedGroupId}
          onActivate={handleActivate}
          onEdit={handleEditPreset}
          onNew={handleNewPreset}
          onRefresh={refreshPresets}
        />
      </main>

      <StatusBar status={status} presets={presets} />
      <ToastContainer />

      {editingPreset !== undefined && (
        <PresetEditor
          preset={editingPreset}
          groups={groups}
          onSave={handleSavePreset}
          onCancel={handleCancelEdit}
        />
      )}

      {doctorOpen && (
        <SetupDoctor firstRun={doctorFirstRun} onClose={handleDoctorClose} />
      )}

      {voiceWizardOpen && (
        <NewVoiceWizard onCreated={handleVoiceCreated} onCancel={() => setVoiceWizardOpen(false)} />
      )}
    </div>
  )
}
