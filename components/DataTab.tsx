import React, { useRef } from 'react'
import { Step } from '../hooks/useStepManager'

interface DataManagementTabProps {
  steps: Record<string, Step>
  rootSteps: string[]
  onExportToJSON: () => void
  onImportFromJSON: (file: File) => void
  onClearAllData: () => void
}

const DataManagementTab: React.FC<DataManagementTabProps> = ({
  steps,
  rootSteps,
  onExportToJSON,
  onImportFromJSON,
  onClearAllData
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onImportFromJSON(file)
      // Reset the input so the same file can be selected again
      e.target.value = ''
    }
  }

  // Calculate statistics
  const getAllWorkflowPaths = () => {
    const paths: Array<{[stepName: string]: string | null}> = []
    
    rootSteps.forEach(rootStepId => {
      const rootStep = steps[rootStepId]
      if (rootStep) {
        generateWorkflowPaths(rootStep, {}, paths)
      }
    })
    
    return paths
  }

  const generateWorkflowPaths = (step: Step, currentPath: {[stepName: string]: string | null}, paths: Array<{[stepName: string]: string | null}>) => {
    if (!step) return
    
    const newPath = { ...currentPath, [step.name]: null }
    
    if (step.options.length === 0) {
      paths.push(newPath)
      return
    }
    
    step.options.forEach(option => {
      const pathWithOption = { ...newPath, [step.name]: option.name }
      
      if (option.nextSteps.length === 0) {
        paths.push(pathWithOption)
      } else {
        option.nextSteps.forEach(nextStepId => {
          const nextStep = steps[nextStepId]
          if (nextStep) {
            generateWorkflowPaths(nextStep, pathWithOption, paths)
          }
        })
      }
    })
  }

  const isPathActive = (path: {[stepName: string]: string | null}): boolean => {
    for (const [stepName, optionName] of Object.entries(path)) {
      if (optionName === null || optionName === '-') continue
      
  const step = Object.values(steps).find(s => s.name === stepName)
      if (!step || !step.isActive) return false
      
      const option = step.options.find(opt => opt.name === optionName)
      if (!option || !option.isActive) return false
    }
    return true
  }

  const totalSteps = Object.keys(steps).length
  const activeSteps = Object.values(steps).filter(step => step.isActive).length
  const totalOptions = Object.values(steps).reduce((sum, step) => sum + step.options.length, 0)
  const activeOptions = Object.values(steps).reduce((sum, step) => 
    sum + step.options.filter(option => option.isActive).length, 0)
  const allPaths = getAllWorkflowPaths()
  const totalPaths = allPaths.length
  const activePaths = allPaths.filter(path => isPathActive(path)).length

  return (
    <div className="data-container">
      <h2>💾 데이터 관리</h2>
      <div className="data-controls">
        <button type="button" className="export-btn" onClick={onExportToJSON}>
          📥 JSON으로 내보내기
        </button>
        <button type="button" className="import-btn" onClick={handleImportClick}>
          📤 JSON 가져오기
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <button type="button" className="clear-btn" onClick={onClearAllData}>
          🗑️ 모든 데이터 삭제
        </button>
      </div>
      <div className="data-info">
        <h3>저장된 데이터 정보</h3>
        <div className="data-stats">
          <div className="stat-item">
            <span className="stat-label">총 단계:</span>
            <span className="stat-value">{totalSteps}</span>
            <span className="stat-detail">(활성: {activeSteps})</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">총 선택지:</span>
            <span className="stat-value">{totalOptions}</span>
            <span className="stat-detail">(활성: {activeOptions})</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">가능한 경로:</span>
            <span className="stat-value">{totalPaths}</span>
            <span className="stat-detail">(활성: {activePaths})</span>
          </div>
          <p>데이터는 브라우저의 로컬 스토리지에 자동으로 저장됩니다.</p>
        </div>
      </div>
    </div>
  )
}

export default DataManagementTab
