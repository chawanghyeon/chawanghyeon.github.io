import React from 'react'
import confirmAndRun from '../utils/confirmAndRun'
import { WorkflowSheet } from '../lib/types'
import { StorageManager, StorageInfo } from '../lib/storage'

interface EnhancedDataTabProps {
  currentSheet: WorkflowSheet | undefined
  allSheets: WorkflowSheet[]
  saveError?: string | null
  onClearSaveError?: () => void
}

const EnhancedDataTab: React.FC<EnhancedDataTabProps> = ({ 
  currentSheet, 
  allSheets, 
  saveError, 
  onClearSaveError 
}) => {
  const STORAGE_KEY = "chawanghyeon_workflow_sheets_v1"
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)
  
  // Get storage information
  const [storageInfo, setStorageInfo] = React.useState<StorageInfo>(() => 
    StorageManager.getStorageInfo()
  )

  // Update storage info periodically
  React.useEffect(() => {
    const updateStorageInfo = () => {
      setStorageInfo(StorageManager.getStorageInfo())
    }
    
    // Update immediately and then every 5 seconds
    updateStorageInfo()
    const interval = setInterval(updateStorageInfo, 5000)
    
    return () => clearInterval(interval)
  }, [])

  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Calculate statistics for current sheet
  const currentSheetStats = React.useMemo(() => {
    if (!currentSheet) return { totalSteps: 0, activeSteps: 0, totalOptions: 0, activeOptions: 0 }
    
    const totalSteps = currentSheet.steps.length
    const activeSteps = currentSheet.steps.filter(step => step.isActive !== false).length
    
    let totalOptions = 0
    let activeOptions = 0
    
    currentSheet.steps.forEach(step => {
      totalOptions += step.options.length
      activeOptions += step.options.filter(option => option.isActive !== false).length
    })
    
    return { totalSteps, activeSteps, totalOptions, activeOptions }
  }, [currentSheet])

  // Calculate statistics for all sheets
  const allSheetsStats = React.useMemo(() => {
    const totalSheets = allSheets.length
    let totalSteps = 0
    let totalOptions = 0
    let totalCombinations = 0
    
    allSheets.forEach(sheet => {
      totalSteps += sheet.steps.length
      sheet.steps.forEach(step => {
        totalOptions += step.options.length
      })
      
      // Calculate combinations for this sheet
      const optionCounts = sheet.steps.map(step => Math.max(1, step.options.length))
      const combinations = optionCounts.reduce((acc, count) => acc * count, 1)
      totalCombinations += combinations
    })
    
    return { totalSheets, totalSteps, totalOptions, totalCombinations }
  }, [allSheets])

  const handleExport = async () => {
    try {
      const data = await StorageManager.getItem(STORAGE_KEY)
      if (!data) {
        alert("내보낼 데이터가 없습니다.")
        return
      }
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `workflow-sheets-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
      alert("내보내기 실패")
    }
  }

  const handleExportCurrentSheet = () => {
    if (!currentSheet) return
    
    try {
      const sheetData = {
        sheet: currentSheet,
        exportedAt: new Date().toISOString(),
        version: "1.0"
      }
      const blob = new Blob([JSON.stringify(sheetData, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${currentSheet.name}-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert("시트 내보내기 실패")
    }
  }

  const handleImportFile = (
    e: React.ChangeEvent<HTMLInputElement>,
    mode: "replace" | "append" | "append-to-current"
  ) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const text = String(reader.result || "")
        const parsed = JSON.parse(text)
        if (!parsed) throw new Error("Invalid JSON")
        
        if (mode === "replace") {
          const success = await StorageManager.setItem(STORAGE_KEY, parsed, {
            backup: true
          })
          
          if (success) {
            alert("데이터 교체 완료 — 페이지를 새로고침합니다")
            window.location.reload()
          } else {
            alert("데이터 저장 실패. 저장공간이 부족할 수 있습니다.")
          }
        } else if (mode === "append-to-current") {
          // Append data to current sheet
          if (!currentSheet) {
            alert("현재 활성화된 시트가 없습니다")
            return
          }
          
          const existingData = await StorageManager.getItem(STORAGE_KEY) as { sheets: WorkflowSheet[], activeSheetId: string, nextSheetId: number } | null
          const existing = existingData || { sheets: [], activeSheetId: "", nextSheetId: 1 }
          
          // Find imported data steps
          let importedSteps: unknown[] = []
          if (parsed.sheet && parsed.sheet.steps) {
            importedSteps = parsed.sheet.steps
          } else if (parsed.sheets && parsed.sheets.length > 0) {
            // Take steps from first sheet if multiple sheets
            importedSteps = parsed.sheets[0].steps || []
          } else if (parsed.steps) {
            // Legacy format
            importedSteps = parsed.steps
          }
          
          if (importedSteps.length === 0) {
            alert("가져올 단계 데이터가 없습니다")
            return
          }
          
          // Update the current sheet with appended steps
          const updatedSheets = existing.sheets.map((sheet: WorkflowSheet) => {
            if (sheet.id === currentSheet.id) {
              const existingSteps = sheet.steps || []
              const newSteps = [...existingSteps, ...importedSteps.map((step: unknown, index: number) => {
                const stepData = step as Record<string, unknown>
                return {
                  id: `imported_${Date.now()}_${index}`,
                  name: (stepData.name as string) || (stepData.displayName as string) || `가져온 단계 ${index + 1}`,
                  displayName: (stepData.displayName as string) || "",
                  isActive: (stepData.isActive as boolean) ?? true,
                  options: ((stepData.options as unknown[]) || []).map((opt: unknown, optIndex: number) => {
                    const optData = opt as Record<string, unknown>
                    return {
                      id: `imported_opt_${Date.now()}_${index}_${optIndex}`,
                      name: (optData.name as string) || `옵션${optIndex + 1}`,
                      displayName: (optData.displayName as string) || "",
                      isActive: (optData.isActive as boolean) ?? true
                    }
                  })
                }
              })]
              
              return {
                ...sheet,
                steps: newSteps,
                updatedAt: Date.now()
              }
            }
            return sheet
          })
          
          const updatedData = { ...existing, sheets: updatedSheets }
          const success = await StorageManager.setItem(STORAGE_KEY, updatedData, {
            backup: true
          })
          
          if (success) {
            alert(`현재 시트에 ${importedSteps.length}개 단계가 추가되었습니다 — 페이지를 새로고침합니다`)
            window.location.reload()
          } else {
            alert("데이터 저장 실패. 저장공간이 부족할 수 있습니다.")
          }
        } else {
          // Append mode - create new sheets
          const existingData = await StorageManager.getItem(STORAGE_KEY) as { sheets: WorkflowSheet[], activeSheetId: string, nextSheetId: number } | null
          const existing = existingData || { sheets: [], activeSheetId: "", nextSheetId: 1 }
          
          // Handle single sheet import
          if (parsed.sheet) {
            const newSheet = {
              ...parsed.sheet,
              id: `imported_${Date.now()}`,
              name: `${parsed.sheet.name} (가져옴)`,
              createdAt: Date.now(),
              updatedAt: Date.now()
            }
            existing.sheets.push(newSheet)
            existing.nextSheetId = Math.max(existing.nextSheetId, existing.sheets.length + 1)
          } 
          // Handle multi-sheet import
          else if (parsed.sheets) {
            parsed.sheets.forEach((sheet: WorkflowSheet, index: number) => {
              const newSheet = {
                ...sheet,
                id: `imported_${Date.now()}_${index}`,
                name: `${sheet.name} (가져옴)`,
                createdAt: Date.now(),
                updatedAt: Date.now()
              }
              existing.sheets.push(newSheet)
            })
            existing.nextSheetId = Math.max(existing.nextSheetId, existing.sheets.length + 1)
          }
          // Handle legacy format
          else if (parsed.steps) {
            const newSheet = {
              id: `imported_${Date.now()}`,
              name: `가져온 데이터 ${new Date().toLocaleDateString()}`,
              createdAt: Date.now(),
              updatedAt: Date.now(),
              steps: parsed.steps,
              optionActivations: parsed.optionActivations || {},
              pathActivations: parsed.pathActivations || {}
            }
            existing.sheets.push(newSheet)
            existing.nextSheetId = Math.max(existing.nextSheetId, existing.sheets.length + 1)
          }
          
          const success = await StorageManager.setItem(STORAGE_KEY, existing, {
            backup: true
          })
          
          if (success) {
            alert("새 시트로 데이터 추가 완료 — 페이지를 새로고침합니다")
            window.location.reload()
          } else {
            alert("데이터 저장 실패. 저장공간이 부족할 수 있습니다.")
          }
        }
      } catch (err) {
        console.error(err)
        alert("가져오기 실패: 올바른 JSON 파일인지 확인해주세요")
      }
    }
    reader.readAsText(file)
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleClearData = () => {
    confirmAndRun("모든 데이터를 삭제하시겠습니까?", () => {
      StorageManager.removeItem(STORAGE_KEY)
      alert("데이터 삭제 완료 — 페이지를 새로고침합니다")
      window.location.reload()
    })
  }

  const handleCleanupStorage = () => {
    confirmAndRun("오래된 백업 데이터를 정리하시겠습니까?", () => {
      const freedSpace = StorageManager.performCleanup(STORAGE_KEY)
      setStorageInfo(StorageManager.getStorageInfo())
      alert(`${formatFileSize(freedSpace)}의 공간이 확보되었습니다.`)
    })
  }

  const handleClearAllWorkflowData = () => {
    confirmAndRun("모든 워크플로우 데이터를 삭제하시겠습니까?", () => {
      StorageManager.clearWorkflowData()
      alert("모든 워크플로우 데이터 삭제 완료 — 페이지를 새로고침합니다")
      window.location.reload()
    })
  }

  const handleEnableFileSystem = async () => {
    const success = await StorageManager.enableFileSystemMode(`workflow-${Date.now()}.json`)
    if (success) {
      setStorageInfo(StorageManager.getStorageInfo())
      alert("파일시스템 모드가 활성화되었습니다. 이제 변경사항이 로컬 파일에 자동 저장됩니다.")
    } else {
      alert("파일시스템 모드 활성화에 실패했습니다.")
    }
  }

  const handleDisableFileSystem = () => {
    StorageManager.disableFileSystemMode()
    setStorageInfo(StorageManager.getStorageInfo())
    alert("파일시스템 모드가 비활성화되었습니다. 이제 브라우저 로컬스토리지를 사용합니다.")
  }

  const handleLoadFromFile = async () => {
    const success = await StorageManager.loadFromFileSystem()
    if (success) {
      setStorageInfo(StorageManager.getStorageInfo())
      alert("파일이 선택되었습니다. 페이지를 새로고침하여 데이터를 로드합니다.")
      window.location.reload()
    }
  }

  const handleExportToFile = async () => {
    try {
      const data = await StorageManager.getItem(STORAGE_KEY)
      if (!data) {
        alert("내보낼 데이터가 없습니다.")
        return
      }
      
      const success = await StorageManager.exportToFile(data, `workflow-export-${Date.now()}.json`)
      if (success) {
        alert("파일로 내보내기 완료!")
      } else {
        alert("파일 내보내기에 실패했습니다.")
      }
    } catch (error) {
      console.error('Export failed:', error)
      alert("내보내기 중 오류가 발생했습니다.")
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('ko-KR')
  }

  return (
    <section className="data-management-tab">
      <div className="container">
        <h2>📊 데이터 관리</h2>
        
        {/* Current Sheet Statistics */}
        {currentSheet && (
          <div className="stats-section">
            <h3>현재 시트: {currentSheet.name}</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-label">총 단계:</span>
                <span className="stat-value">{currentSheetStats.totalSteps}</span>
                <span className="stat-detail">(활성: {currentSheetStats.activeSteps})</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">총 선택지:</span>
                <span className="stat-value">{currentSheetStats.totalOptions}</span>
                <span className="stat-detail">(활성: {currentSheetStats.activeOptions})</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">생성일:</span>
                <span className="stat-value">{formatDate(currentSheet.createdAt)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">수정일:</span>
                <span className="stat-value">{formatDate(currentSheet.updatedAt)}</span>
              </div>
            </div>
          </div>
        )}

        {/* All Sheets Statistics */}
        <div className="stats-section">
          <h3>전체 통계</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">총 시트:</span>
              <span className="stat-value">{allSheetsStats.totalSheets}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">총 단계:</span>
              <span className="stat-value">{allSheetsStats.totalSteps}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">총 선택지:</span>
              <span className="stat-value">{allSheetsStats.totalOptions}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">총 조합:</span>
              <span className="stat-value">{allSheetsStats.totalCombinations.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Storage Information */}
        <div className="stats-section">
          <h3>저장소 상태</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">저장 모드:</span>
              <span className="stat-value">
                {storageInfo.mode === 'fileSystem' ? '🗂️ 파일시스템' : '🏠 로컬스토리지'}
              </span>
              {storageInfo.fileName && (
                <span className="stat-detail">({storageInfo.fileName})</span>
              )}
            </div>
            {storageInfo.mode === 'localStorage' && (
              <>
                <div className="stat-item">
                  <span className="stat-label">사용량:</span>
                  <span className="stat-value">{formatFileSize(storageInfo.used)}</span>
                  <span className="stat-detail">({storageInfo.usedPercentage.toFixed(1)}%)</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">사용 가능:</span>
                  <span className="stat-value">{formatFileSize(storageInfo.available)}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">전체 용량:</span>
                  <span className="stat-value">{formatFileSize(storageInfo.total)}</span>
                </div>
              </>
            )}
            {storageInfo.mode === 'localStorage' && storageInfo.usedPercentage > 80 && (
              <div className="stat-item warning">
                <span className="stat-label">⚠️ 경고:</span>
                <span className="stat-value">저장소 거의 가득참</span>
              </div>
            )}
          </div>
          
          {/* File System Controls */}
          {StorageManager.isFileSystemSupported() && (
            <div className="file-system-controls">
              <h4>파일시스템 모드</h4>
              <div className="button-group">
                {storageInfo.mode === 'localStorage' ? (
                  <>
                    <button onClick={handleEnableFileSystem} className="btn-primary">
                      📁 파일시스템 모드 활성화
                    </button>
                    <button onClick={handleLoadFromFile} className="btn-secondary">
                      📂 기존 파일 불러오기
                    </button>
                  </>
                ) : (
                  <button onClick={handleDisableFileSystem} className="btn-secondary">
                    🏠 로컬스토리지 모드로 전환
                  </button>
                )}
                <button onClick={handleExportToFile} className="btn-secondary">
                  💾 파일로 내보내기
                </button>
              </div>
              <p className="file-system-info">
                파일시스템 모드에서는 변경사항이 선택한 로컬 파일에 실시간으로 자동 저장됩니다.
                <br />
                Chrome 86+ 브라우저에서만 지원됩니다.
              </p>
            </div>
          )}
          
          {/* Storage bar visualization (localStorage only) */}
          {storageInfo.mode === 'localStorage' && (
            <div className="storage-bar-container">
              <div className="storage-bar">
                <div 
                  className={`storage-used ${storageInfo.usedPercentage > 90 ? 'critical' : storageInfo.usedPercentage > 80 ? 'warning' : ''}`}
                  style={{ width: `${Math.min(100, storageInfo.usedPercentage)}%` }}
                ></div>
              </div>
              <div className="storage-bar-label">
                {formatFileSize(storageInfo.used)} / {formatFileSize(storageInfo.total)}
              </div>
            </div>
          )}
        </div>

        {/* Save Error Alert */}
        {saveError && (
          <div className="save-error-alert">
            <div className="alert-content">
              <span className="alert-icon">⚠️</span>
              <span className="alert-message">{saveError}</span>
              <button className="alert-close" onClick={onClearSaveError}>×</button>
            </div>
          </div>
        )}

        {/* Sheet List */}
        <div className="sheets-section">
          <h3>시트 목록</h3>
          <div className="sheets-list">
            {allSheets.map((sheet) => (
              <div key={sheet.id} className={`sheet-item ${sheet.id === currentSheet?.id ? 'active' : ''}`}>
                <div className="sheet-info">
                  <div className="sheet-name">{sheet.name}</div>
                  <div className="sheet-meta">
                    {sheet.steps.length}개 단계 • 
                    {sheet.steps.reduce((sum, step) => sum + step.options.length, 0)}개 선택지 • 
                    수정: {formatDate(sheet.updatedAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Export/Import Controls */}
        <div className="actions-section">
          <h3>데이터 관리</h3>
          <p>데이터는 브라우저의 로컬 스토리지에 자동으로 저장됩니다.</p>
          
          <div className="action-group">
            <h4>내보내기</h4>
            <div className="button-group">
              <button className="btn-primary small" onClick={handleExportCurrentSheet}>
                현재 시트 내보내기
              </button>
              <button className="btn-primary small" onClick={handleExport}>
                모든 시트 내보내기
              </button>
            </div>
          </div>

          <div className="action-group">
            <h4>가져오기</h4>
            <div className="button-group">
              <button 
                className="btn-primary small" 
                onClick={() => {
                  const input = document.createElement('input')
                  input.type = 'file'
                  input.accept = 'application/json'
                  input.onchange = (e) => handleImportFile(e as unknown as React.ChangeEvent<HTMLInputElement>, 'append-to-current')
                  input.click()
                }}
              >
                현재 시트에 데이터 추가
              </button>
              <button 
                className="btn-muted small" 
                onClick={() => {
                  const input = document.createElement('input')
                  input.type = 'file'
                  input.accept = 'application/json'
                  input.onchange = (e) => handleImportFile(e as unknown as React.ChangeEvent<HTMLInputElement>, 'append')
                  input.click()
                }}
              >
                새 시트로 데이터 추가
              </button>
              <button 
                className="btn-danger small" 
                onClick={() => {
                  const input = document.createElement('input')
                  input.type = 'file'
                  input.accept = 'application/json'
                  input.onchange = (e) => handleImportFile(e as unknown as React.ChangeEvent<HTMLInputElement>, 'replace')
                  input.click()
                }}
              >
                모든 데이터 교체
              </button>
            </div>
            <div className="import-help">
              <small>
                • <strong>현재 시트에 추가:</strong> 선택한 파일의 단계들을 현재 활성 시트에 추가합니다<br/>
                • <strong>새 시트로 추가:</strong> 가져온 데이터로 새로운 시트를 생성합니다<br/>
                • <strong>모든 데이터 교체:</strong> 기존 모든 데이터를 삭제하고 가져온 데이터로 교체합니다
              </small>
            </div>
          </div>

          <div className="action-group">
            <h4>데이터 삭제</h4>
            <div className="button-group">
              <button className="btn-danger small" onClick={handleClearData}>
                현재 시트 데이터 삭제
              </button>
              <button className="btn-danger small" onClick={handleClearAllWorkflowData}>
                모든 워크플로우 데이터 삭제
              </button>
            </div>
          </div>

          <div className="action-group">
            <h4>저장소 관리</h4>
            <div className="button-group">
              <button className="btn-muted small" onClick={handleCleanupStorage}>
                오래된 백업 정리
              </button>
            </div>
            <div className="import-help">
              <small>
                저장소가 가득 찰 경우 오래된 백업 데이터를 정리하여 공간을 확보할 수 있습니다.
              </small>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default EnhancedDataTab
