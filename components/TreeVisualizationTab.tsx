import React from 'react'
import { Step, StepOption } from '../hooks/useStepManager'

interface TreeVisualizationTabProps {
  steps: Record<string, Step>
  rootSteps: string[]
}

const TreeVisualizationTab: React.FC<TreeVisualizationTabProps> = ({ steps, rootSteps }) => {
  const escapeHtml = (text: string): string => {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  const createVisualizationTreeNode = (stepId: string, path: string[] = [], isRoot: boolean = false): React.ReactNode => {
  const step = steps[stepId]
    if (!step) return null

    return (
      <div key={stepId} className="visualization-tree-row">
        <div className={`tree-node ${isRoot ? 'root' : 'child'} ${step.isActive ? '' : 'inactive'}`}>
          <div className="node-label">
            {step.name}
            {!step.isActive && <span className="inactive-label">(비활성화)</span>}
          </div>
        </div>

        {step.options.length > 0 && (
          <div className="visualization-options-container">
            {step.options.map((option, index) => (
              <div key={option.id} className={`visualization-option-branch ${option.isActive ? '' : 'inactive'}`}>
                <div className="visualization-connector">
                  <div className="connector-line"></div>
                  <div className="option-label">
                    {option.name}
                    {!option.isActive && <span className="inactive-label">(비활성화)</span>}
                  </div>
                </div>

                {option.nextSteps.length > 0 ? (
                  <div className={`visualization-children ${!option.isActive ? 'parent-inactive' : ''}`}>
                    {option.nextSteps.map(nextStepId => 
                      createVisualizationTreeNode(nextStepId, [...path, step.id], false)
                    )}
                  </div>
                ) : (
                  <div className="tree-endpoint">완료</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="visualization-container">
      <h2>🎯 트리 시각화</h2>
      <div id="treeVisualization">
        {rootSteps.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🌳</div>
            <h3>트리 시각화</h3>
            <p>단계를 추가하면 트리 구조로 표시됩니다.</p>
          </div>
        ) : (
          rootSteps.map(stepId => createVisualizationTreeNode(stepId, [], true))
        )}
      </div>
    </div>
  )
}

export default TreeVisualizationTab
