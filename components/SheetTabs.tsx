import React, { useState, useRef } from 'react'
import { WorkflowSheet } from '../lib/types'
import styles from './SheetTabs.module.css'

interface SheetTabsProps {
  sheets: WorkflowSheet[]
  activeSheetId: string
  onCreateSheet: (name?: string) => void
  onRenameSheet: (sheetId: string, name: string) => void
  onCopySheet: (sheetId: string, name?: string) => void
  onDeleteSheet: (sheetId: string) => void
  onSwitchSheet: (sheetId: string) => void
}

const SheetTabs: React.FC<SheetTabsProps> = ({
  sheets,
  activeSheetId,
  onCreateSheet,
  onRenameSheet,
  onCopySheet,
  onDeleteSheet,
  onSwitchSheet,
}) => {
  const [editingSheetId, setEditingSheetId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")
  const [contextMenu, setContextMenu] = useState<{
    sheetId: string
    x: number
    y: number
  } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleTabClick = (sheetId: string) => {
    if (editingSheetId === sheetId) return
    onSwitchSheet(sheetId)
  }

  const handleTabDoubleClick = (sheetId: string, currentName: string) => {
    setEditingSheetId(sheetId)
    setEditingName(currentName)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const handleRenameSubmit = () => {
    if (editingSheetId && editingName.trim()) {
      onRenameSheet(editingSheetId, editingName.trim())
    }
    setEditingSheetId(null)
    setEditingName("")
  }

  const handleRenameCancel = () => {
    setEditingSheetId(null)
    setEditingName("")
  }

  const handleContextMenu = (e: React.MouseEvent, sheetId: string) => {
    e.preventDefault()
    setContextMenu({
      sheetId,
      x: e.clientX,
      y: e.clientY,
    })
  }

  const handleContextMenuAction = (action: string) => {
    if (!contextMenu) return
    
    switch (action) {
      case 'rename':
        const sheet = sheets.find(s => s.id === contextMenu.sheetId)
        if (sheet) {
          handleTabDoubleClick(contextMenu.sheetId, sheet.name)
        }
        break
      case 'copy':
        onCopySheet(contextMenu.sheetId)
        break
      case 'delete':
        if (sheets.length > 1) {
          const sheet = sheets.find(s => s.id === contextMenu.sheetId)
          if (sheet) {
            if (window.confirm(`"${sheet.name}" 시트를 정말 삭제하시겠습니까?`)) {
              onDeleteSheet(contextMenu.sheetId)
            }
          }
        }
        break
    }
    
    setContextMenu(null)
  }

  React.useEffect(() => {
    const handleClick = () => setContextMenu(null)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleRenameCancel()
        setContextMenu(null)
      }
    }
    
    document.addEventListener('click', handleClick)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('click', handleClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  return (
    <div className={styles.sheetTabsContainer}>
      <div className={styles.sheetTabs}>
        {sheets.map((sheet) => (
          <div
            key={sheet.id}
            className={`sheet-tab ${activeSheetId === sheet.id ? 'active' : ''}`}
            onClick={() => handleTabClick(sheet.id)}
            onDoubleClick={() => handleTabDoubleClick(sheet.id, sheet.name)}
            onContextMenu={(e) => handleContextMenu(e, sheet.id)}
          >
            {editingSheetId === sheet.id ? (
              <input
                ref={inputRef}
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={handleRenameSubmit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleRenameSubmit()
                  } else if (e.key === 'Escape') {
                    handleRenameCancel()
                  }
                }}
                className={styles.sheetTabInput}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className={styles.sheetTabName}>{sheet.name}</span>
            )}
          </div>
        ))}
        
        <button
          className={styles.sheetTabAdd}
          onClick={() => onCreateSheet()}
          title="새 시트 추가"
        >
          +
        </button>
      </div>

      {contextMenu && (
        <div
          className={styles.contextMenu}
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            zIndex: 1000,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.contextMenuItem} onClick={() => handleContextMenuAction('rename')}>
            이름 바꾸기
          </div>
          <div className={styles.contextMenuItem} onClick={() => handleContextMenuAction('copy')}>
            시트 복사
          </div>
          {sheets.length > 1 && (
            <div className="context-menu-item danger" onClick={() => handleContextMenuAction('delete')}>
              시트 삭제
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default SheetTabs
