import React from 'react'
import { Step } from '../hooks/useStepManager'

interface TableVisualizationTabProps {
  steps: Record<string, Step>
  rootSteps: string[]
}

interface WorkflowPath {
  [stepName: string]: string | null
}

const TableVisualizationTab: React.FC<TableVisualizationTabProps> = ({ steps, rootSteps }) => {
  const escapeHtml = (text: string): string => {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  // Generate all workflow paths
  const getAllWorkflowPaths = (): WorkflowPath[] => {
    const paths: WorkflowPath[] = []
    
    rootSteps.forEach(rootStepId => {
      const rootStep = steps[rootStepId]
      if (rootStep) {
        generateWorkflowPaths(rootStep, {}, paths)
      }
    })
    
    return paths
  }

  const generateWorkflowPaths = (step: Step, currentPath: WorkflowPath, paths: WorkflowPath[]) => {
    if (!step) return
    
    const newPath = { ...currentPath, [step.name]: null }
    
    // If step has no options, complete the path
    if (step.options.length === 0) {
      paths.push(newPath)
      return
    }
    
    // Generate paths for each option
    step.options.forEach(option => {
      const pathWithOption = { ...newPath, [step.name]: option.name }
      
      // If no next steps, complete the path
      if (option.nextSteps.length === 0) {
        paths.push(pathWithOption)
      } else {
        // Continue with next steps
        option.nextSteps.forEach(nextStepId => {
          const nextStep = steps[nextStepId]
          if (nextStep) {
            generateWorkflowPaths(nextStep, pathWithOption, paths)
          }
        })
      }
    })
  }

  // Get ordered step names
  const getOrderedStepNames = (): string[] => {
    const orderedNames: string[] = []
    const visited = new Set<string>()
    
    rootSteps.forEach(rootStepId => {
      collectStepNamesInOrder(rootStepId, orderedNames, visited)
    })
    
    return orderedNames
  }

  const collectStepNamesInOrder = (stepId: string, orderedNames: string[], visited: Set<string>) => {
    if (visited.has(stepId)) return
    
  const step = steps[stepId]
    if (!step) return
    
    visited.add(stepId)
    orderedNames.push(step.name)
    
    step.options.forEach(option => {
      option.nextSteps.forEach(nextStepId => {
        collectStepNamesInOrder(nextStepId, orderedNames, visited)
      })
    })
  }

  // Check if path is active
  const isPathActive = (path: WorkflowPath): boolean => {
    for (const [stepName, optionName] of Object.entries(path)) {
      if (optionName === null || optionName === '-') continue
      
      // Find the step
  const step = Object.values(steps).find(s => s.name === stepName)
      if (!step || !step.isActive) return false
      
      // Find the option
      const option = step.options.find(opt => opt.name === optionName)
      if (!option || !option.isActive) return false
    }
    return true
  }

  const allPaths = getAllWorkflowPaths()
  const orderedSteps = getOrderedStepNames()

  return (
    <div className="table-container">
      <h2>📊 표 시각화</h2>
      <div id="tableVisualization">
        {rootSteps.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <h3>표 시각화</h3>
            <p>단계를 추가하면 모든 경로가 표로 표시됩니다.</p>
          </div>
        ) : allPaths.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h3>경로 없음</h3>
            <p>완성된 경로가 없습니다. 단계를 연결해보세요.</p>
          </div>
        ) : (
          <div className="excel-table-container">
            <table className="excel-table">
              <thead>
                <tr>
                  <th className="row-number-header">#</th>
                  {orderedSteps.map(stepName => (
                    <th key={stepName}>{stepName}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allPaths.map((path, index) => {
                  const isActive = isPathActive(path)
                  return (
                    <tr key={index} className={isActive ? '' : 'inactive-row'}>
                      <td className="row-number">{index + 1}</td>
                      {orderedSteps.map(stepName => {
                        const option = path[stepName] || '-'
                        const isInactive = !isActive && option !== '-'
                        return (
                          <td key={stepName} className={isInactive ? 'inactive-cell' : ''}>
                            {option}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default TableVisualizationTab
