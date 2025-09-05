import React from 'react'
import { WorkflowSheet } from '../lib/types'

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
  const STORAGE_KEY = "chawanghyeon_workflow_sheets_v2"
  
  // Calculate statistics for current sheet
  const currentSheetStats = React.useMemo(() => {
    if (!currentSheet) return null
    
    const stepCount = currentSheet.steps.length
    const optionCount = currentSheet.steps.reduce((sum, step) => sum + step.options.length, 0)
    const constraintCount = Object.keys(currentSheet.constraints || {}).length
    
    return {
      stepCount,
      optionCount,
      constraintCount,
      totalCombinations: currentSheet.steps.reduce((product, step) => product * Math.max(1, step.options.length), 1)
    }
  }, [currentSheet])

  // Calculate overall statistics
  const overallStats = React.useMemo(() => {
    const totalSheets = allSheets.length
    const totalSteps = allSheets.reduce((sum, sheet) => sum + sheet.steps.length, 0)
    const totalOptions = allSheets.reduce((sum, sheet) => 
      sum + sheet.steps.reduce((stepSum, step) => stepSum + step.options.length, 0), 0)
    const totalConstraints = allSheets.reduce((sum, sheet) => 
      sum + Object.keys(sheet.constraints || {}).length, 0)
    
    return {
      totalSheets,
      totalSteps,
      totalOptions,
      totalConstraints
    }
  }, [allSheets])

  // Handle JSON export
  const handleExport = async () => {
    try {
      const dataToExport = {
        sheets: allSheets,
        exportedAt: new Date().toISOString(),
        version: "2.0"
      }
      
      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
        type: 'application/json'
      })
      
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `workflow-export-${Date.now()}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
      alert('Export failed')
    }
  }

  // Handle JSON import
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      
      if (parsed.sheets && Array.isArray(parsed.sheets)) {
        // Store in localStorage for the app to pick up
        const importData = {
          sheets: parsed.sheets,
          activeSheetId: parsed.sheets[0]?.id || "sheet_1",
          nextSheetId: parsed.sheets.length + 1,
          lastUpdated: Date.now()
        }
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(importData))
        
        // Reload the page to pick up the new data
        window.location.reload()
      } else {
        alert('Invalid workflow file format')
      }
    } catch (error) {
      console.error('Import failed:', error)
      alert('Import failed: Invalid JSON file')
    }
    
    // Reset file input
    event.target.value = ''
  }

  // Clear all data
  const handleClearData = () => {
    if (confirm('정말로 모든 워크플로우 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      localStorage.removeItem(STORAGE_KEY)
      window.location.reload()
    }
  }

  return (
    <div className="enhanced-data-tab">
      <div className="data-header">
        <h3>워크플로우 데이터 관리</h3>
        <p>현재 워크플로우의 데이터를 확인하고 관리할 수 있습니다.</p>
      </div>

      {/* Save Error Display */}
      {saveError && (
        <div className="save-error-banner">
          <div className="save-error-content">
            <span className="error-icon">⚠️</span>
            <span className="error-message">{saveError}</span>
            {onClearSaveError && (
              <button 
                className="error-dismiss-btn"
                onClick={onClearSaveError}
                aria-label="오류 메시지 닫기"
              >
                ×
              </button>
            )}
          </div>
        </div>
      )}

      {/* Current Sheet Statistics */}
      <div className="stats-section">
        <h4>현재 시트 통계</h4>
        {currentSheet && currentSheetStats ? (
          <div className="current-sheet-stats">
            <div className="stat-grid">
              <div className="stat-item">
                <span className="stat-label">시트 이름:</span>
                <span className="stat-value">{currentSheet.name}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">단계 수:</span>
                <span className="stat-value">{currentSheetStats.stepCount}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">옵션 수:</span>
                <span className="stat-value">{currentSheetStats.optionCount}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">제약조건 수:</span>
                <span className="stat-value">{currentSheetStats.constraintCount}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">전체 조합 수:</span>
                <span className="stat-value">{currentSheetStats.totalCombinations.toLocaleString()}</span>
              </div>
            </div>
          </div>
        ) : (
          <p>시트를 선택해주세요.</p>
        )}
      </div>

      {/* Overall Statistics */}
      <div className="stats-section">
        <h4>전체 통계</h4>
        <div className="overall-stats">
          <div className="stat-grid">
            <div className="stat-item">
              <span className="stat-label">총 시트 수:</span>
              <span className="stat-value">{overallStats.totalSheets}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">총 단계 수:</span>
              <span className="stat-value">{overallStats.totalSteps}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">총 옵션 수:</span>
              <span className="stat-value">{overallStats.totalOptions}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">총 제약조건 수:</span>
              <span className="stat-value">{overallStats.totalConstraints}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Data Management Actions */}
      <div className="data-management-section">
        <h4>데이터 관리</h4>
        <div className="management-actions">
          <div className="action-group">
            <h5>데이터 내보내기/가져오기</h5>
            <div className="action-buttons">
              <button 
                className="export-btn"
                onClick={handleExport}
              >
                📁 JSON으로 내보내기
              </button>
              
              <div className="import-section">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  style={{ display: 'none' }}
                  id="file-import"
                />
                <label htmlFor="file-import" className="import-btn">
                  📂 JSON 파일 가져오기
                </label>
              </div>
            </div>
          </div>

          <div className="action-group danger-zone">
            <h5>위험 구역</h5>
            <button 
              className="clear-data-btn danger"
              onClick={handleClearData}
            >
              🗑️ 모든 데이터 삭제
            </button>
          </div>
        </div>
      </div>

      {/* Storage Information */}
      <div className="storage-info-section">
        <h4>저장소 정보</h4>
        <div className="storage-details">
          <div className="storage-item">
            <span className="storage-label">저장 방식:</span>
            <span className="storage-value">로컬 스토리지 (브라우저 내장)</span>
          </div>
          <div className="storage-item">
            <span className="storage-label">자동 저장:</span>
            <span className="storage-value">활성화됨 (1초 지연)</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EnhancedDataTab
