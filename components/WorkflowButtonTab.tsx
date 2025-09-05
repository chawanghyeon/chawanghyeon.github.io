import React, { useState } from 'react'
import { Step, ConstraintMap, WorkflowConstraint, RouteCondition, ExternalCondition, ConstraintActionType } from '../lib/types'
import { applyConstraintsWithPriority, assignDefaultPriorities } from '../lib/constraints'
import { getAvailableConditionFields, getAvailableOperators, getConditionDescription, defaultExternalContext } from '../lib/condition-evaluator'

interface WorkflowButtonTabProps {
  steps: Step[]
  constraints: ConstraintMap
  onAddConstraint: (constraint: Omit<WorkflowConstraint, 'id' | 'createdAt'>) => void
  onUpdateConstraint: (constraintId: string, updates: Partial<WorkflowConstraint>) => void
  onDeleteConstraint: (constraintId: string) => void
  onAddStepAtIndex: (insertIdx: number) => void
  onUpdateStepName: (stepId: string, name: string) => void
  onDeleteStep: (stepId: string) => void
  onAddOption: (stepId: string) => void
  onUpdateOptionName: (stepId: string, optionId: string, name: string) => void
  onDeleteOption: (stepId: string, optionId: string) => void
  onAdjustConstraintIndices?: (insertIndex: number) => void
}

const WorkflowButtonTab: React.FC<WorkflowButtonTabProps> = ({
  steps,
  constraints,
  onAddConstraint,
  onUpdateConstraint,
  onDeleteConstraint,
  onAddStepAtIndex,
  onUpdateStepName,
  onDeleteStep,
  onAddOption,
  onUpdateOptionName,
  onDeleteOption,
  onAdjustConstraintIndices,
}) => {
  const [selectedPath, setSelectedPath] = useState<{ [stepIndex: number]: string }>({})
  const [showConstraintModal, setShowConstraintModal] = useState<{
    stepIndex: number
    optionId: string
  } | null>(null)
  const [editingStep, setEditingStep] = useState<string | null>(null)
  const [editingOption, setEditingOption] = useState<{ stepId: string; optionId: string } | null>(null)
  const [tempStepName, setTempStepName] = useState('')
  const [tempOptionName, setTempOptionName] = useState('')

  // Get constraints for a specific option
  const getOptionConstraints = (stepIndex: number, optionId: string): WorkflowConstraint[] => {
    return Object.values(constraints).filter(
      constraint => constraint.sourceStepIndex === stepIndex && constraint.sourceOptionId === optionId
    )
  }

  const constraintApplicationResult = applyConstraintsWithPriority(steps, constraints, selectedPath, defaultExternalContext)
  const disabledOptionsMap = constraintApplicationResult.disabledOptions
  const enabledOptionsMap = constraintApplicationResult.enabledOptions
  const requiredOptionsMap = constraintApplicationResult.requiredOptions

  // Detect constraint conflicts
  const conflicts = constraintApplicationResult.conflicts

  // Check if an option has any constraints
  // const hasConstraints = (stepIndex: number, optionId: string): boolean => {
  //   return getOptionConstraints(stepIndex, optionId).length > 0
  // }

  // Handle option selection in dropdown
  const handleOptionSelect = (stepIndex: number, optionId: string) => {
    setSelectedPath(prev => ({
      ...prev,
      [stepIndex]: optionId
    }))
  }

  // Get constraint status icon and color
  const getConstraintStatusInfo = (stepIndex: number, optionId: string): {
    icon: string
    color: string
    tooltip: string
    status: 'disabled' | 'enabled' | 'required' | 'neutral' | 'conflict'
  } => {
    const isDisabled = disabledOptionsMap[stepIndex]?.has(optionId)
    const isEnabled = enabledOptionsMap[stepIndex]?.has(optionId)
    const isRequired = requiredOptionsMap[stepIndex]?.has(optionId)
    
    // Check if there are conflicts affecting this option
    const hasConflict = conflicts.some(conflict => 
      conflict.targetStep === stepIndex && conflict.targetOption === optionId
    )
    
    if (hasConflict) {
      return {
        icon: '⚠️',
        color: '#ff9800',
        tooltip: 'Constraint conflict detected - check conflicts panel',
        status: 'conflict'
      }
    }
    
    if (isRequired) {
      return {
        icon: '✅',
        color: '#4caf50',
        tooltip: 'Required by active constraints',
        status: 'required'
      }
    }
    
    if (isEnabled) {
      return {
        icon: '🟢',
        color: '#8bc34a',
        tooltip: 'Explicitly enabled by constraints',
        status: 'enabled'
      }
    }
    
    if (isDisabled) {
      return {
        icon: '🚫',
        color: '#f44336',
        tooltip: getDisabledReason(stepIndex, optionId),
        status: 'disabled'
      }
    }
    
    return {
      icon: '',
      color: '#666',
      tooltip: 'No constraints affecting this option',
      status: 'neutral'
    }
  }

  // Get reason why an option is disabled
  const getDisabledReason = (stepIndex: number, optionId: string): string => {
    const applicableConstraints = Object.values(constraints).filter(constraint => {
      if (!constraint.isActive) return false
      
      // Check if this constraint would disable this specific option
      if (constraint.type === 'next-step' || constraint.type === 'conditional') {
        if (constraint.targetStepIndex === stepIndex && 
            (constraint.targetOptionId === optionId || 
             constraint.targetOptionIds?.includes(optionId))) {
          // Check if source option is selected
          return selectedPath[constraint.sourceStepIndex] === constraint.sourceOptionId
        }
      }
      
      if (constraint.type === 'range-skip' && constraint.targetSteps?.includes(stepIndex)) {
        if (!constraint.targetOptionIds || constraint.targetOptionIds.includes(optionId)) {
          return selectedPath[constraint.sourceStepIndex] === constraint.sourceOptionId
        }
      }
      
      return false
    })

    if (applicableConstraints.length === 0) return '알 수 없는 이유로 비활성화됨'
    
    return applicableConstraints.map(constraint => {
      const sourceStep = steps[constraint.sourceStepIndex]
      const sourceOption = sourceStep?.options.find(opt => opt.id === constraint.sourceOptionId)
      return `${sourceStep?.displayName || sourceStep?.name}: ${sourceOption?.displayName || sourceOption?.name} 선택으로 인해 비활성화`
    }).join('; ')
  }

  // Open constraint management modal
  const openConstraintModal = (stepIndex: number, optionId: string) => {
    setShowConstraintModal({ stepIndex, optionId })
  }

  // Step editing functions
  const startEditingStep = (stepId: string, currentName: string) => {
    setEditingStep(stepId)
    setTempStepName(currentName)
  }

  const saveStepName = () => {
    if (editingStep && tempStepName.trim()) {
      onUpdateStepName(editingStep, tempStepName.trim())
      setEditingStep(null)
      setTempStepName('')
    }
  }

  const cancelStepEdit = () => {
    setEditingStep(null)
    setTempStepName('')
  }

  // Option editing functions
  const startEditingOption = (stepId: string, optionId: string, currentName: string) => {
    setEditingOption({ stepId, optionId })
    setTempOptionName(currentName)
  }

  const saveOptionName = () => {
    if (editingOption && tempOptionName.trim()) {
      onUpdateOptionName(editingOption.stepId, editingOption.optionId, tempOptionName.trim())
      setEditingOption(null)
      setTempOptionName('')
    }
  }

  const cancelOptionEdit = () => {
    setEditingOption(null)
    setTempOptionName('')
  }

  // Handle step insertion with constraint adjustment
  const handleAddStepAtIndex = (insertIdx: number) => {
    // First adjust constraints before adding step
    if (onAdjustConstraintIndices) {
      onAdjustConstraintIndices(insertIdx)
    }
    // Then add the step
    onAddStepAtIndex(insertIdx)
  }

  return (
    <section className="workflow-button-tab">
      {/* Add Step at Beginning Button */}
      {steps.length > 0 && (
        <div className="add-step-at-beginning">
          <button 
            className="add-step-at-beginning-btn"
            onClick={() => handleAddStepAtIndex(0)}
            title="워크플로우 시작에 새 단계 추가"
          >
            + 처음에 단계 추가
          </button>
        </div>
      )}

      {/* Sequential Dropdown Buttons */}
      <div className="button-sequence-container">
        {steps.map((step, stepIndex) => (
          <div key={step.id} className="step-dropdown-container">
            <div className="step-header">
              <div className="step-title-section">
                {editingStep === step.id ? (
                  <div className="step-edit-form">
                    <input
                      type="text"
                      value={tempStepName}
                      onChange={(e) => setTempStepName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveStepName()
                        if (e.key === 'Escape') cancelStepEdit()
                      }}
                      className="step-name-input"
                      autoFocus
                    />
                    <div className="edit-actions">
                      <button onClick={saveStepName} className="save-btn" title="저장">✓</button>
                      <button onClick={cancelStepEdit} className="cancel-btn" title="취소">✕</button>
                    </div>
                  </div>
                ) : (
                  <div className="step-title-display">
                    <h4 onClick={() => startEditingStep(step.id, step.displayName || step.name)}>
                      {step.displayName || step.name}
                    </h4>
                    <button 
                      className="edit-step-btn"
                      onClick={() => startEditingStep(step.id, step.displayName || step.name)}
                      title="단계 이름 수정"
                    >
                      ✏️
                    </button>
                    <button 
                      className="delete-step-btn"
                      onClick={() => {
                        if (confirm(`"${step.displayName || step.name}" 단계를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
                          onDeleteStep(step.id)
                        }
                      }}
                      title="단계 삭제"
                    >
                      🗑️
                    </button>
                    <button 
                      className="add-step-between-btn"
                      onClick={() => handleAddStepAtIndex(stepIndex + 1)}
                      title="이 단계 뒤에 새 단계 추가"
                    >
                      +
                    </button>
                    <span className="step-number">단계 {stepIndex + 1}</span>
                  </div>
                )}
              </div>
              
            </div>
            
            <div className="dropdown-with-constraints">
              <select
                className="step-dropdown"
                value={selectedPath[stepIndex] || ''}
                onChange={(e) => handleOptionSelect(stepIndex, e.target.value)}
              >
                <option value="">선택하세요...</option>
                {step.options.map((option) => {
                  // hide disabled options
                  const isDisabled = disabledOptionsMap[stepIndex] && disabledOptionsMap[stepIndex].has(option.id)
                  if (isDisabled) return null
                  return (
                    <option key={option.id} value={option.id}>
                      {option.displayName || option.name}
                    </option>
                  )
                })}
              </select>

              {/* Option Constraint Indicators */}
              <div className="option-constraints">
                {step.options.map((option) => {
                  const statusInfo = getConstraintStatusInfo(stepIndex, option.id)
                  const isSelected = selectedPath[stepIndex] === option.id
                  const isEditing = editingOption?.stepId === step.id && editingOption?.optionId === option.id
                  
                  return (
                    <div
                      key={option.id}
                      className={`constraint-indicator ${isSelected ? 'selected' : ''} ${statusInfo.status}`}
                      style={{ borderLeftColor: statusInfo.color }}
                    >
                      {isEditing ? (
                        <div className="option-edit-form">
                          <input
                            type="text"
                            value={tempOptionName}
                            onChange={(e) => setTempOptionName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveOptionName()
                              if (e.key === 'Escape') cancelOptionEdit()
                            }}
                            className="option-name-input"
                            autoFocus
                          />
                          <div className="edit-actions">
                            <button onClick={saveOptionName} className="save-btn" title="저장">✓</button>
                            <button onClick={cancelOptionEdit} className="cancel-btn" title="취소">✕</button>
                          </div>
                        </div>
                      ) : (
                        <div className="option-display">
                          <span 
                            className="option-name"
                            onClick={() => openConstraintModal(stepIndex, option.id)}
                            title={statusInfo.tooltip}
                            style={{ color: statusInfo.color }}
                          >
                            {statusInfo.icon} {option.displayName || option.name}
                          </span>
                          <div className="option-actions">
                            <button
                              className="edit-option-btn"
                              onClick={(e) => {
                                e.stopPropagation()
                                startEditingOption(step.id, option.id, option.displayName || option.name)
                              }}
                              title="옵션 이름 수정"
                            >
                              ✏️
                            </button>
                            {step.options.length > 1 && (
                              <button
                                className="delete-option-btn"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (confirm(`"${option.displayName || option.name}" 옵션을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
                                    onDeleteOption(step.id, option.id)
                                  }
                                }}
                                title="옵션 삭제"
                              >
                                🗑️
                              </button>
                            )}
                            {statusInfo.status === 'disabled' && (
                              <span className="constraint-icon" title={`제약 조건 적용: ${getDisabledReason(stepIndex, option.id)}`}>🚫</span>
                            )}
                            {statusInfo.status !== 'neutral' && statusInfo.status !== 'disabled' && statusInfo.icon && (
                              <span className="constraint-icon" title={statusInfo.tooltip}>{statusInfo.icon}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
                
                {/* Add Option Button */}
                <div className="add-option-container">
                  <button
                    className="add-option-btn"
                    onClick={() => onAddOption(step.id)}
                    title="이 단계에 새 옵션 추가"
                  >
                    + 옵션 추가
                  </button>
                </div>
              </div>
            </div>

            {stepIndex < steps.length - 1 && (
              <div className="step-arrow">→</div>
            )}
          </div>
        ))}
      </div>

      {/* Current Path Summary */}
      {Object.keys(selectedPath).length > 0 && (
        <div className="path-summary">
          <h4>선택된 경로:</h4>
          <div className="path-display">
            {steps.map((step, stepIndex) => {
              const selectedOptionId = selectedPath[stepIndex]
              const selectedOption = step.options.find(opt => opt.id === selectedOptionId)
              
              return (
                <span key={step.id} className="path-step">
                  {selectedOption ? (
                    <>
                      <strong>{step.displayName || step.name}:</strong>{' '}
                      {selectedOption.displayName || selectedOption.name}
                    </>
                  ) : (
                    <span className="unselected">
                      {step.displayName || step.name}: 미선택
                    </span>
                  )}
                  {stepIndex < steps.length - 1 && ' → '}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* Constraint Management Modal */}
      {showConstraintModal && (
        <ConstraintModal
          stepIndex={showConstraintModal.stepIndex}
          optionId={showConstraintModal.optionId}
          steps={steps}
          constraints={getOptionConstraints(showConstraintModal.stepIndex, showConstraintModal.optionId)}
          selectedPath={selectedPath}
          onClose={() => setShowConstraintModal(null)}
          onAddConstraint={onAddConstraint}
          onUpdateConstraint={onUpdateConstraint}
          onDeleteConstraint={onDeleteConstraint}
        />
      )}
    </section>
  )
}

// Constraint Management Modal Component
interface ConstraintModalProps {
  stepIndex: number
  optionId: string
  steps: Step[]
  constraints: WorkflowConstraint[]
  selectedPath: { [stepIndex: number]: string }
  onClose: () => void
  onAddConstraint: (constraint: Omit<WorkflowConstraint, 'id' | 'createdAt'>) => void
  onUpdateConstraint: (constraintId: string, updates: Partial<WorkflowConstraint>) => void
  onDeleteConstraint: (constraintId: string) => void
}

const ConstraintModal: React.FC<ConstraintModalProps> = ({
  stepIndex,
  optionId,
  steps,
  constraints,
  selectedPath,
  onClose,
  onAddConstraint,
  onUpdateConstraint,
  onDeleteConstraint,
}) => {
  const [newConstraintType, setNewConstraintType] = useState<'previous-step' | 'next-step' | 'range-skip' | 'conditional'>('next-step')
  
  // Auto-determine constraint scope and route conditions based on selected path
  const hasSelectedUpToCurrentStep = Object.keys(selectedPath).some(key => parseInt(key) <= stepIndex && selectedPath[parseInt(key)])
  const defaultScope: 'global' | 'route-based' | 'conditional-route' = 
    newConstraintType === 'conditional' ? 'conditional-route' :
    hasSelectedUpToCurrentStep ? 'route-based' : 'global'
  
  const [newConstraintScope, setNewConstraintScope] = useState<'global' | 'route-based' | 'conditional-route'>(defaultScope)
  
  // Auto-populate route conditions from current selected path (including steps up to and including current step)
  const autoRouteConditions: RouteCondition[] = hasSelectedUpToCurrentStep 
    ? Object.entries(selectedPath)
        .filter(([key, value]) => parseInt(key) <= stepIndex && value) // Include steps up to and including current step
        .map(([key, value]) => ({ stepIndex: parseInt(key), optionId: value }))
    : []
  
  const [routeConditions, setRouteConditions] = useState<RouteCondition[]>(autoRouteConditions)
  const [targetStepIndex, setTargetStepIndex] = useState<number | ''>('')
  const [targetOptionIds, setTargetOptionIds] = useState<string[]>([]) // Multiple options for previous-step
  const [nextTargetStepIndex, setNextTargetStepIndex] = useState<number | ''>('')
  const [nextTargetOptionIds, setNextTargetOptionIds] = useState<string[]>([])
  const [targetStepsInput, setTargetStepsInput] = useState<string>('') // comma-separated 1-based step numbers
  const [description, setDescription] = useState<string>('')
  
  // New state for external conditions
  const [externalConditions, setExternalConditions] = useState<ExternalCondition[]>([])
  const [constraintAction, setConstraintAction] = useState<ConstraintActionType>('disable')

  const currentStep = steps[stepIndex]
  const currentOption = currentStep?.options.find(opt => opt.id === optionId)

  // Helper functions for route conditions
  const addRouteCondition = () => {
    setRouteConditions(prev => [...prev, { stepIndex: 0, optionId: '' }])
  }

  const updateRouteCondition = (index: number, field: keyof RouteCondition, value: string | number) => {
    setRouteConditions(prev => prev.map((condition, i) => 
      i === index ? { ...condition, [field]: value } : condition
    ))
  }

  const removeRouteCondition = (index: number) => {
    setRouteConditions(prev => prev.filter((_, i) => i !== index))
  }

  // Helper functions for external conditions
  const addExternalCondition = () => {
    setExternalConditions(prev => [...prev, { field: 'inventory', operator: '>=', value: 0 }])
  }

  const updateExternalCondition = (index: number, field: keyof ExternalCondition, value: string | number) => {
    setExternalConditions(prev => prev.map((condition, i) => 
      i === index ? { ...condition, [field]: value } : condition
    ))
  }

  const removeExternalCondition = (index: number) => {
    setExternalConditions(prev => prev.filter((_, i) => i !== index))
  }

  const handleAddConstraint = () => {
    const constraint: Omit<WorkflowConstraint, 'id' | 'createdAt'> = {
      type: newConstraintType,
      scope: newConstraintScope,
      sourceStepIndex: stepIndex,
      sourceOptionId: optionId,
      description,
      isActive: true,
      action: constraintAction,
      priority: assignDefaultPriorities({
        type: newConstraintType,
        scope: newConstraintScope,
        sourceStepIndex: stepIndex,
        sourceOptionId: optionId,
        description,
        isActive: true,
        action: constraintAction
      })
    }

    // Add route conditions for route-based constraints
    if (newConstraintScope === 'route-based' && routeConditions.length > 0) {
      constraint.routeConditions = [...routeConditions]
    }

    // Add external conditions for conditional constraints
    if ((newConstraintScope === 'conditional-route' || newConstraintType === 'conditional') && externalConditions.length > 0) {
      constraint.externalConditions = [...externalConditions]
    }

    if (newConstraintType === 'previous-step') {
      if (targetStepIndex !== '' && targetOptionIds.length > 0) {
        constraint.targetStepIndex = Number(targetStepIndex)
        constraint.targetOptionIds = [...targetOptionIds] // Support multiple options
      } else {
        alert('이전 단계 제약조건에는 대상 단계와 옵션을 선택해야 합니다.')
        return
      }
    } else if (newConstraintType === 'next-step') {
      if (nextTargetStepIndex !== '' && nextTargetOptionIds.length > 0) {
        constraint.targetStepIndex = Number(nextTargetStepIndex)
        constraint.targetOptionIds = [...nextTargetOptionIds] // Support multiple options
      } else {
        alert('다음 단계 제약조건에는 대상 단계와 옵션을 선택해야 합니다.')
        return
      }
    }

    // If range-skip and user provided explicit targetSteps, parse them (allow comma-separated 1-based numbers)
    if (newConstraintType === 'range-skip') {
      if (targetStepsInput.trim() !== '') {
        const parts = targetStepsInput.split(',').map(p => p.trim()).filter(Boolean)
        const parsed: number[] = []
        parts.forEach(p => {
          const n = Number(p)
          if (!Number.isNaN(n) && n >= 1) {
            // convert to zero-based index
            parsed.push(n - 1)
          }
        })
        if (parsed.length > 0) {
          constraint.targetSteps = parsed
        } else {
          alert('범위 건너뛰기 제약조건에는 유효한 단계 번호를 입력해야 합니다. (예: 2,4)')
          return
        }
      } else {
        alert('범위 건너뛰기 제약조건에는 대상 단계를 입력해야 합니다. (예: 2,4)')
        return
      }
    } else if (newConstraintType === 'conditional') {
      // Conditional constraints need target step and options, plus external conditions
      if (nextTargetStepIndex !== '' && nextTargetOptionIds.length > 0 && externalConditions.length > 0) {
        constraint.targetStepIndex = Number(nextTargetStepIndex)
        constraint.targetOptionIds = [...nextTargetOptionIds]
      } else {
        alert('조건부 제약조건에는 대상 단계, 옵션, 그리고 외부 조건을 모두 설정해야 합니다.')
        return
      }
    }

    onAddConstraint(constraint)
    
    // Reset form to auto-determined values
    setNewConstraintType('next-step')
    setNewConstraintScope(defaultScope)
    setRouteConditions(autoRouteConditions)
    setTargetStepIndex('')
    setTargetOptionIds([])
    setNextTargetStepIndex('')
    setNextTargetOptionIds([])
    setDescription('')
  }

  return (
    <div className="constraint-modal-overlay" onClick={onClose}>
      <div className="constraint-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>제약 조건 관리</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-content">
          <div className="current-option-info">
            <h4>
              {currentStep?.displayName || currentStep?.name} - {currentOption?.displayName || currentOption?.name}
            </h4>
          </div>

          {/* Existing Constraints */}
          {constraints.length > 0 && (
            <div className="existing-constraints">
              <h5>기존 제약 조건</h5>
              {constraints.map((constraint) => (
                <div key={constraint.id} className="constraint-item">
                  <div className="constraint-info">
                    <strong>{getConstraintTypeLabel(constraint.type)}</strong>
                    <p>{constraint.description || getDefaultConstraintDescription(constraint, steps)}</p>
                    <div className="constraint-controls">
                      <label>
                        <input
                          type="checkbox"
                          checked={constraint.isActive}
                          onChange={(e) => onUpdateConstraint(constraint.id, { isActive: e.target.checked })}
                        />
                        활성화
                      </label>
                      <button
                        className="delete-constraint-btn"
                        onClick={() => { if (confirm('이 제약 조건을 삭제하시겠습니까?')) onDeleteConstraint(constraint.id) }}
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add New Constraint */}
          <div className="add-constraint-section">
            <h5>새 제약 조건 추가</h5>
            
            <div className="form-group">
              <label>제약 조건 범위:</label>
              <select
                value={newConstraintScope}
                onChange={(e) => setNewConstraintScope(e.target.value as 'global' | 'route-based' | 'conditional-route')}
              >
                <option value="global">전역 (모든 경로에 적용)</option>
                <option value="route-based">경로 기반 (특정 조건에서만 적용)</option>
                <option value="conditional-route">조건부 경로 (경로 + 외부 조건)</option>
              </select>
            </div>

            {newConstraintScope === 'route-based' && (
              <div className="form-group">
                {hasSelectedUpToCurrentStep && autoRouteConditions.length > 0 && (
                  <small className="auto-constraint-hint">
                    현재 선택된 경로가 자동으로 조건에 추가되었습니다.
                  </small>
                )}
                <div className="route-conditions">
                  {routeConditions.map((condition, index) => {
                    const isAutoPoplulated = index < autoRouteConditions.length
                    return (
                      <div key={index} className={`route-condition-item ${isAutoPoplulated ? 'auto-populated' : ''}`}>
                        <select
                          value={condition.stepIndex}
                          onChange={(e) => updateRouteCondition(index, 'stepIndex', Number(e.target.value))}
                        >
                          <option value="">단계 선택...</option>
                          {steps.map((step, idx) => (
                            <option key={step.id} value={idx}>
                              {step.displayName || step.name}
                            </option>
                          ))}
                        </select>
                      
                      {condition.stepIndex >= 0 && (
                        <select
                          value={condition.optionId}
                          onChange={(e) => updateRouteCondition(index, 'optionId', e.target.value)}
                        >
                          <option value="">옵션 선택...</option>
                          {steps[condition.stepIndex]?.options.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.displayName || option.name}
                            </option>
                          ))}
                        </select>
                      )}
                      
                      <button 
                        type="button" 
                        onClick={() => removeRouteCondition(index)}
                        className="remove-condition-btn"
                      >
                        ✕
                      </button>
                    </div>
                    )
                  })}
                  
                  <button 
                    type="button" 
                    onClick={addRouteCondition}
                    className="add-condition-btn"
                  >
                    + 조건 추가
                  </button>
                </div>
              </div>
            )}

            {/* External Conditions Section */}
            {(newConstraintScope === 'conditional-route' || newConstraintType === 'conditional') && (
              <div className="form-group">
                <label>외부 조건 (External Conditions):</label>
                <div className="conditions-list">
                  {externalConditions.map((condition, index) => (
                    <div key={index} className="external-condition-item">
                      <select
                        value={condition.field}
                        onChange={(e) => updateExternalCondition(index, 'field', e.target.value)}
                      >
                        {getAvailableConditionFields().map(field => (
                          <option key={field.value} value={field.value}>
                            {field.label}
                          </option>
                        ))}
                      </select>
                      
                      <select
                        value={condition.operator}
                        onChange={(e) => updateExternalCondition(index, 'operator', e.target.value)}
                      >
                        {getAvailableOperators(condition.field).map(op => (
                          <option key={op.value} value={op.value}>
                            {op.label}
                          </option>
                        ))}
                      </select>
                      
                      <input
                        type={condition.field === 'inventory' || condition.field === 'userLevel' ? 'number' : 'text'}
                        value={condition.value}
                        onChange={(e) => updateExternalCondition(index, 'value', 
                          condition.field === 'inventory' || condition.field === 'userLevel' 
                            ? Number(e.target.value) 
                            : e.target.value
                        )}
                        placeholder="값"
                      />
                      
                      <button 
                        type="button" 
                        onClick={() => removeExternalCondition(index)}
                        className="remove-condition-btn"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  
                  <button 
                    type="button" 
                    onClick={addExternalCondition}
                    className="add-condition-btn"
                  >
                    + 외부 조건 추가
                  </button>
                </div>
                <small>현재 설정: 재고={defaultExternalContext.inventory}, 사용자레벨={defaultExternalContext.userLevel}, 날짜={defaultExternalContext.date}</small>
              </div>
            )}

            {/* Action Type Selection */}
            <div className="form-group">
              <label>제약 조건 액션:</label>
              <select
                value={constraintAction}
                onChange={(e) => setConstraintAction(e.target.value as ConstraintActionType)}
              >
                <option value="disable">비활성화 (Disable)</option>
                <option value="enable">활성화 (Enable)</option>
                <option value="require">필수 선택 (Require)</option>
              </select>
              <small>비활성화: 옵션을 선택할 수 없게 함, 활성화: 다른 제약에 의해 비활성화된 옵션을 다시 활성화</small>
            </div>
            
            <div className="form-group">
              <label>제약 조건 유형:</label>
              <select
                value={newConstraintType}
                onChange={(e) => setNewConstraintType(e.target.value as 'previous-step' | 'next-step' | 'range-skip' | 'conditional')}
              >
                <option value="next-step">다음 단계 조건부 제약</option>
                <option value="range-skip">범위 건너뛰기 제약</option>
                <option value="previous-step">이전 단계 조건부 제약</option>
                <option value="conditional">외부 조건부 제약</option>
              </select>
            </div>

            {newConstraintType === 'previous-step' && (
              <>
                <div className="form-group">
                  <label>대상 단계:</label>
                  <select
                    value={targetStepIndex}
                    onChange={(e) => setTargetStepIndex(e.target.value ? Number(e.target.value) : '')}
                  >
                    <option value="">선택하세요...</option>
                    {steps.slice(0, stepIndex).map((step, idx) => (
                      <option key={step.id} value={idx}>
                        {step.displayName || step.name}
                      </option>
                    ))}
                  </select>
                </div>

                {targetStepIndex !== '' && (
                  <div className="form-group">
                    <label>대상 옵션 (체크박스로 선택):</label>
                    <div className="checkbox-list">
                      {steps[Number(targetStepIndex)]?.options.map((option) => (
                        <label key={option.id} style={{ display: 'block', marginBottom: '8px' }}>
                          <input
                            type="checkbox"
                            checked={targetOptionIds.includes(option.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setTargetOptionIds(prev => [...prev, option.id])
                              } else {
                                setTargetOptionIds(prev => prev.filter(id => id !== option.id))
                              }
                            }}
                            style={{ marginRight: '8px' }}
                          />
                          {option.displayName || option.name}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {(newConstraintType === 'next-step' || newConstraintType === 'conditional') && (
              <>
                <div className="form-group">
                  <label>대상 단계:</label>
                  <select
                    value={nextTargetStepIndex}
                    onChange={(e) => setNextTargetStepIndex(e.target.value ? Number(e.target.value) : '')}
                  >
                    <option value="">선택하세요...</option>
                    {steps.slice(stepIndex + 1).map((s, idx) => (
                      <option key={s.id} value={stepIndex + 1 + idx}>
                        {s.displayName || s.name}
                      </option>
                    ))}
                  </select>
                </div>

                {nextTargetStepIndex !== '' && (
                  <div className="form-group">
                    <label>대상 옵션 (체크박스로 선택):</label>
                    <div className="checkbox-list">
                      {steps[Number(nextTargetStepIndex)]?.options.map((option) => (
                        <label key={option.id} style={{ display: 'block', marginBottom: '8px' }}>
                          <input
                            type="checkbox"
                            checked={nextTargetOptionIds.includes(option.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNextTargetOptionIds(prev => [...prev, option.id])
                              } else {
                                setNextTargetOptionIds(prev => prev.filter(id => id !== option.id))
                              }
                            }}
                            style={{ marginRight: '8px' }}
                          />
                          {option.displayName || option.name}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {newConstraintType === 'range-skip' && (
              <div className="form-group">
                <label>대상 단계 목록 (선택사항, 쉼표로 구분, 1부터 시작):</label>
                <input
                  type="text"
                  value={targetStepsInput}
                  onChange={(e) => setTargetStepsInput(e.target.value)}
                  placeholder="예: 3,4 또는 2,5"
                />
                <small>여기를 채우면 건너뛸 단계 범위 대신 지정된 단계가 비활성화됩니다.</small>
              </div>
            )}

            <div className="form-group">
              <label>설명 (선택사항):</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="이 제약 조건에 대한 설명을 입력하세요..."
                rows={3}
              />
            </div>

            <button className="add-constraint-btn" onClick={handleAddConstraint}>
              제약 조건 추가
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper functions
function getConstraintTypeLabel(type: string): string {
  switch (type) {
    case 'previous-step': return '이전 단계 제약'
    case 'next-step': return '다음 단계 비활성화'
    case 'range-skip': return '범위 건너뛰기'
    case 'conditional': return '외부 조건부 제약'
    default: return type
  }
}

function getDefaultConstraintDescription(constraint: WorkflowConstraint, steps: Step[]): string {
  const scopePrefix = (() => {
    switch (constraint.scope || 'global') {
      case 'conditional-route': return '[조건부 경로] '
      case 'route-based': return '[경로 기반] '
      default: return '[전역] '
    }
  })()
  
  // Add route conditions info if present
  let routeInfo = ''
  if ((constraint.scope === 'route-based' || constraint.scope === 'conditional-route') && constraint.routeConditions && constraint.routeConditions.length > 0) {
    const conditionsText = constraint.routeConditions.map(condition => {
      const conditionStep = steps[condition.stepIndex]
      const conditionOption = conditionStep?.options.find(opt => opt.id === condition.optionId)
      return `${conditionStep?.displayName || conditionStep?.name}: ${conditionOption?.displayName || conditionOption?.name}`
    }).join(' AND ')
    routeInfo = ` (조건: ${conditionsText})`
  }

  if (constraint.type === 'range-skip' && constraint.targetSteps && constraint.targetSteps.length > 0) {
    const stepNames = constraint.targetSteps.map(idx => {
      const step = steps[idx]
      return step ? (step.displayName || step.name) : `단계 ${idx + 1}`
    }).join(', ')
    routeInfo += ` (대상 단계: ${stepNames})`
  }

  // Add external conditions info
  let externalInfo = ''
  if (constraint.externalConditions && constraint.externalConditions.length > 0) {
    const conditionsText = constraint.externalConditions.map(condition => 
      getConditionDescription(condition)
    ).join(' AND ')
    externalInfo = ` (외부 조건: ${conditionsText})`
  }

  switch (constraint.type) {
    case 'previous-step':
      const targetStep = steps[constraint.targetStepIndex || 0]
      const targetOption = targetStep?.options.find(opt => opt.id === constraint.targetOptionId)
      return `${scopePrefix}${targetStep?.displayName || targetStep?.name}의 "${targetOption?.displayName || targetOption?.name}" 다음에 사용할 수 없음${routeInfo}${externalInfo}`
    
    case 'next-step':
    case 'conditional':
      const actionText = constraint.action === 'enable' ? '활성화' : '비활성화'
      return `${scopePrefix}다음 단계 ${actionText}${routeInfo}${externalInfo}`
    
    case 'range-skip':
      return `${scopePrefix}범위 건너뛰기${routeInfo}${externalInfo}`
    
    default:
      return `${scopePrefix}사용자 정의 제약 조건${routeInfo}${externalInfo}`
  }
}

export default WorkflowButtonTab
