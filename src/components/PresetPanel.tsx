import { useState, useRef } from 'react'
import type { Preset, PresetGroup } from '../types'

interface PresetPanelProps {
  presets: Preset[]
  groups: PresetGroup[]
  activePresetId: string | null
  selectedGroupId: string | null
  onSelectGroup: (groupId: string | null) => void
  onActivate: (id: string) => void
  onEdit: (preset: Preset) => void
  onNew: () => void
  onRefresh: () => void
}

interface ContextMenu {
  x: number
  y: number
  preset: Preset
}

interface GroupContextMenu {
  x: number
  y: number
  group: PresetGroup
}

export function PresetPanel({
  presets, groups, activePresetId, selectedGroupId,
  onSelectGroup, onActivate, onEdit, onNew, onRefresh
}: PresetPanelProps) {
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null)
  const [groupContextMenu, setGroupContextMenu] = useState<GroupContextMenu | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [newGroupName, setNewGroupName] = useState<string | null>(null)
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [editingGroupName, setEditingGroupName] = useState('')
  const dragIndex = useRef<number | null>(null)
  const dragOverIndex = useRef<number | null>(null)

  // Filter presets by selected group
  const filteredPresets = selectedGroupId === null
    ? presets
    : selectedGroupId === '__ungrouped'
      ? presets.filter(p => !p.groupId)
      : presets.filter(p => p.groupId === selectedGroupId)

  const sortedGroups = [...groups].sort((a, b) => a.order - b.order)

  const handleContextMenu = (e: React.MouseEvent, preset: Preset) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, preset })
    setGroupContextMenu(null)
  }

  const closeContextMenu = () => {
    setContextMenu(null)
    setGroupContextMenu(null)
  }

  const handleDuplicate = async (id: string) => {
    closeContextMenu()
    await window.persona.presets.duplicate(id)
    onRefresh()
  }

  const handleDelete = async (id: string) => {
    closeContextMenu()
    setConfirmDelete(id)
  }

  const confirmDeletePreset = async () => {
    if (!confirmDelete) return
    await window.persona.presets.delete(confirmDelete)
    setConfirmDelete(null)
    onRefresh()
  }

  const handlePinToHotbar = async (preset: Preset) => {
    closeContextMenu()
    // Find next free slot (1-7)
    const usedSlots = new Set(presets.filter(p => p.hotbarSlot).map(p => p.hotbarSlot))
    let slot: number | undefined
    for (let i = 1; i <= 7; i++) {
      if (!usedSlots.has(i)) { slot = i; break }
    }
    if (slot === undefined) return // All slots full
    await window.persona.presets.update(preset.id, { hotbarSlot: slot })
    onRefresh()
  }

  const handleUnpinFromHotbar = async (preset: Preset) => {
    closeContextMenu()
    await window.persona.presets.update(preset.id, { hotbarSlot: undefined })
    onRefresh()
  }

  const handleMoveToGroup = async (presetId: string, groupId: string | undefined) => {
    closeContextMenu()
    await window.persona.presets.update(presetId, { groupId })
    onRefresh()
  }

  const handleDragStart = (index: number) => {
    dragIndex.current = index
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    dragOverIndex.current = index
  }

  const handleDrop = async () => {
    if (dragIndex.current === null || dragOverIndex.current === null) return
    if (dragIndex.current === dragOverIndex.current) return

    const reordered = [...filteredPresets]
    const [moved] = reordered.splice(dragIndex.current, 1)
    reordered.splice(dragOverIndex.current, 0, moved)

    // Rebuild full preset order: keep non-filtered presets in place, update filtered ones
    const filteredIds = new Set(filteredPresets.map(p => p.id))
    const nonFiltered = presets.filter(p => !filteredIds.has(p.id))
    const fullOrder = [...nonFiltered, ...reordered].map(p => p.id)

    await window.persona.presets.reorder(fullOrder)
    onRefresh()

    dragIndex.current = null
    dragOverIndex.current = null
  }

  // --- Group management ---

  const handleCreateGroup = async () => {
    if (newGroupName === null) {
      setNewGroupName('')
      return
    }
    if (newGroupName.trim()) {
      await window.persona.groups.create(newGroupName.trim())
      onRefresh()
    }
    setNewGroupName(null)
  }

  const handleGroupContextMenu = (e: React.MouseEvent, group: PresetGroup) => {
    e.preventDefault()
    setGroupContextMenu({ x: e.clientX, y: e.clientY, group })
    setContextMenu(null)
  }

  const handleDeleteGroup = async (id: string) => {
    setGroupContextMenu(null)
    await window.persona.groups.delete(id)
    if (selectedGroupId === id) onSelectGroup(null)
    onRefresh()
  }

  const handleStartRenameGroup = (group: PresetGroup) => {
    setGroupContextMenu(null)
    setEditingGroupId(group.id)
    setEditingGroupName(group.name)
  }

  const handleFinishRenameGroup = async () => {
    if (editingGroupId && editingGroupName.trim()) {
      await window.persona.groups.update(editingGroupId, editingGroupName.trim())
      onRefresh()
    }
    setEditingGroupId(null)
    setEditingGroupName('')
  }

  const ungroupedCount = presets.filter(p => !p.groupId).length

  return (
    <>
      {/* Group tabs */}
      <div className="flex items-center gap-1 mb-3 overflow-x-auto pb-1">
        <button
          onClick={() => onSelectGroup(null)}
          className={`shrink-0 px-3 py-1 rounded text-xs font-medium transition-colors ${
            selectedGroupId === null
              ? 'bg-zinc-700 text-white'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
        >
          All
        </button>

        {sortedGroups.map(group => (
          <button
            key={group.id}
            onClick={() => onSelectGroup(group.id)}
            onContextMenu={(e) => handleGroupContextMenu(e, group)}
            className={`shrink-0 px-3 py-1 rounded text-xs font-medium transition-colors ${
              selectedGroupId === group.id
                ? 'bg-zinc-700 text-white'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            {editingGroupId === group.id ? (
              <input
                autoFocus
                value={editingGroupName}
                onChange={(e) => setEditingGroupName(e.target.value)}
                onBlur={handleFinishRenameGroup}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleFinishRenameGroup()
                  if (e.key === 'Escape') { setEditingGroupId(null); setEditingGroupName('') }
                }}
                className="bg-transparent border-b border-zinc-500 text-xs text-white outline-none w-16"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              group.name
            )}
          </button>
        ))}

        {ungroupedCount > 0 && groups.length > 0 && (
          <button
            onClick={() => onSelectGroup('__ungrouped')}
            className={`shrink-0 px-3 py-1 rounded text-xs font-medium transition-colors ${
              selectedGroupId === '__ungrouped'
                ? 'bg-zinc-700 text-white'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            Ungrouped
          </button>
        )}

        {/* New group input or button */}
        {newGroupName !== null ? (
          <input
            autoFocus
            placeholder="Group name"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            onBlur={handleCreateGroup}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateGroup()
              if (e.key === 'Escape') setNewGroupName(null)
            }}
            className="shrink-0 bg-zinc-800 border border-zinc-600 rounded px-2 py-0.5 text-xs text-white outline-none w-20"
          />
        ) : (
          <button
            onClick={() => setNewGroupName('')}
            className="shrink-0 px-2 py-1 rounded text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
            title="New group"
          >
            +
          </button>
        )}
      </div>

      {/* Preset grid */}
      <div className="grid grid-cols-2 gap-3" onClick={closeContextMenu}>
        {filteredPresets.map((preset, index) => {
          const isActive = preset.id === activePresetId

          return (
            <button
              key={preset.id}
              onClick={() => onActivate(preset.id)}
              onContextMenu={(e) => handleContextMenu(e, preset)}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={handleDrop}
              className={`
                relative rounded-lg px-4 py-6 text-center font-bold text-sm
                transition-all duration-150 cursor-pointer select-none
                border-2
                ${isActive
                  ? 'text-white shadow-lg scale-[1.02]'
                  : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:border-zinc-500'
                }
              `}
              style={isActive ? {
                backgroundColor: preset.color,
                borderColor: preset.color,
                boxShadow: `0 0 20px ${preset.color}40`
              } : undefined}
            >
              {preset.name}
              {preset.plugins.length > 0 && (
                <span className="block text-xs font-normal mt-1 opacity-60">
                  {preset.plugins.length} plugin{preset.plugins.length !== 1 ? 's' : ''}
                </span>
              )}
              {preset.hotbarSlot && (
                <span className="absolute top-1 right-2 text-[10px] opacity-40">
                  {preset.hotbarSlot}
                </span>
              )}
            </button>
          )
        })}

        {/* New preset button */}
        <button
          onClick={onNew}
          className="rounded-lg px-4 py-6 text-center text-sm border-2 border-dashed border-zinc-700 text-zinc-600 hover:border-zinc-500 hover:text-zinc-400 transition-colors"
        >
          + New Preset
        </button>
      </div>

      {/* Preset context menu */}
      {contextMenu && (
        <div
          className="fixed z-50"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl py-1 min-w-[160px] text-xs">
            <button
              onClick={() => { closeContextMenu(); onEdit(contextMenu.preset) }}
              className="w-full text-left px-3 py-1.5 text-zinc-300 hover:bg-zinc-700"
            >
              Edit
            </button>
            <button
              onClick={() => handleDuplicate(contextMenu.preset.id)}
              className="w-full text-left px-3 py-1.5 text-zinc-300 hover:bg-zinc-700"
            >
              Duplicate
            </button>

            {/* Hotbar pin/unpin */}
            {contextMenu.preset.hotbarSlot ? (
              <button
                onClick={() => handleUnpinFromHotbar(contextMenu.preset)}
                className="w-full text-left px-3 py-1.5 text-zinc-300 hover:bg-zinc-700"
              >
                Unpin from Hotbar
              </button>
            ) : (
              <button
                onClick={() => handlePinToHotbar(contextMenu.preset)}
                className="w-full text-left px-3 py-1.5 text-zinc-300 hover:bg-zinc-700"
              >
                Pin to Hotbar
              </button>
            )}

            {/* Move to group submenu */}
            {groups.length > 0 && (
              <>
                <div className="border-t border-zinc-700 my-1" />
                <div className="px-3 py-1 text-zinc-500 text-[10px] uppercase tracking-wider">Move to</div>
                {sortedGroups.map(g => (
                  <button
                    key={g.id}
                    onClick={() => handleMoveToGroup(contextMenu.preset.id, g.id)}
                    className={`w-full text-left px-3 py-1.5 hover:bg-zinc-700 ${
                      contextMenu.preset.groupId === g.id ? 'text-blue-400' : 'text-zinc-300'
                    }`}
                  >
                    {g.name}
                  </button>
                ))}
                <button
                  onClick={() => handleMoveToGroup(contextMenu.preset.id, undefined)}
                  className={`w-full text-left px-3 py-1.5 hover:bg-zinc-700 ${
                    !contextMenu.preset.groupId ? 'text-blue-400' : 'text-zinc-300'
                  }`}
                >
                  Ungrouped
                </button>
              </>
            )}

            {!contextMenu.preset.isFactory && (
              <>
                <div className="border-t border-zinc-700 my-1" />
                <button
                  onClick={() => handleDelete(contextMenu.preset.id)}
                  className="w-full text-left px-3 py-1.5 text-red-400 hover:bg-zinc-700"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Group context menu */}
      {groupContextMenu && (
        <div
          className="fixed z-50"
          style={{ left: groupContextMenu.x, top: groupContextMenu.y }}
        >
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl py-1 min-w-[120px] text-xs">
            <button
              onClick={() => handleStartRenameGroup(groupContextMenu.group)}
              className="w-full text-left px-3 py-1.5 text-zinc-300 hover:bg-zinc-700"
            >
              Rename
            </button>
            <button
              onClick={() => handleDeleteGroup(groupContextMenu.group.id)}
              className="w-full text-left px-3 py-1.5 text-red-400 hover:bg-zinc-700"
            >
              Delete Group
            </button>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl p-4 max-w-xs mx-4">
            <p className="text-sm text-zinc-200 mb-3">Delete this preset?</p>
            <p className="text-xs text-zinc-500 mb-4">This action cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-3 py-1.5 rounded text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeletePreset}
                className="px-3 py-1.5 rounded text-xs font-medium bg-red-600 text-white hover:bg-red-500"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
