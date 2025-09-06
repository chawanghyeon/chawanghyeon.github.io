import React, { useState } from 'react'
import { Step, ConstraintMap, WorkflowConstraint } from '../lib/types'
import { applyConstraintsWithPriority } from '../lib/constraints'
import { defaultExternalContext } from '../lib/condition-evaluator'
import PolicyManager from './PolicyManager'
import ConstraintModal from './ConstraintModal'
import styles from './WorkflowButtonTab.module.css'

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
  const [showPolicyManager, setShowPolicyManager] = useState(false)
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
        tooltip: '제약 조건 충돌 감지됨 - 충돌 패널을 확인하세요',
        status: 'conflict'
      }
    }
    
    if (isRequired) {
      return {
        icon: '✅',
        color: '#4caf50',
        tooltip: '활성 제약 조건에 의해 필수 선택',
        status: 'required'
      }
    }
    
    if (isEnabled) {
      return {
        icon: '🟢',
        color: '#8bc34a',
        tooltip: '제약 조건에 의해 명시적으로 활성화됨',
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
      tooltip: '이 옵션에 영향을 주는 제약 조건 없음',
      status: 'neutral'
    }
  }

  // Get reason why an option is disabled
  const getDisabledReason = (stepIndex: number, optionId: string): string => {
    const applicableConstraints = Object.values(constraints).filter(constraint => {
      if (!constraint.isActive) return false
      
      // Check if this constraint would disable this specific option
      if (constraint.targetStepIndex === stepIndex && 
          (constraint.targetOptionId === optionId || 
           constraint.targetOptionIds?.includes(optionId))) {
        // Check if source option is selected
        return selectedPath[constraint.sourceStepIndex] === constraint.sourceOptionId
      }
      
      if (constraint.targetSteps?.includes(stepIndex)) {
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
    <section className={styles.workflowButtonTab}>
      {/* Policy Manager Header */}
      <div className={styles.policyManagerHeaderSection}>
        <div className={styles.sectionTitle}>
          <h3>워크플로우 정책 관리</h3>
          <p>스마트한 정책 엔진으로 복잡한 비즈니스 규칙을 쉽게 관리하세요</p>
        </div>
        <button 
          className={styles.openPolicyManagerBtn}
          onClick={() => setShowPolicyManager(true)}
          title="정책 관리 센터 열기"
        >
          ⚙️ 정책 관리 센터
        </button>
      </div>

      {/* Add Step at Beginning Button */}
      {steps.length > 0 && (
        <div className={styles.addStepAtBeginning}>
          <button
            className={styles.addStepAtBeginningBtn}
            onClick={() => handleAddStepAtIndex(0)}
            title="워크플로우 시작에 새 단계 추가"
          >
            + 처음에 단계 추가
          </button>
        </div>
      )}

      {/* Sequential Dropdown Buttons */}
      <div className={styles.buttonSequenceContainer}>
        {steps.map((step, stepIndex) => (
          <div key={step.id} className={styles.stepDropdownContainer}>
            <div className={styles.stepHeader}>
              <div className={styles.stepTitleSection}>
                {editingStep === step.id ? (
                  <div className={styles.stepEditForm}>
                    <input
                      type="text"
                      value={tempStepName}
                      onChange={(e) => setTempStepName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveStepName()
                        if (e.key === 'Escape') cancelStepEdit()
                      }}
                      className={styles.stepNameInput}
                      autoFocus
                    />
                    <div className={styles.editActions}>
                      <button onClick={saveStepName} className={styles.saveBtn} title="저장">✓</button>
                      <button onClick={cancelStepEdit} className={styles.cancelBtn} title="취소">✕</button>
                    </div>
                  </div>
                ) : (
                  <div className={styles.stepTitleDisplay}>
                    <h4 onClick={() => startEditingStep(step.id, step.displayName || step.name)}>
                      {step.displayName || step.name}
                    </h4>
                    <button 
                      className={styles.editStepBtn}
                      onClick={() => startEditingStep(step.id, step.displayName || step.name)}
                      title="단계 이름 수정"
                    >
                      ✏️
                    </button>
                    <button 
                      className={styles.deleteStepBtn}
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
                      className={styles.addStepBetweenBtn}
                      onClick={() => handleAddStepAtIndex(stepIndex + 1)}
                      title="이 단계 뒤에 새 단계 추가"
                    >
                      +
                    </button>
                    <span className={styles.stepNumber}>단계 {stepIndex + 1}</span>
                  </div>
                )}
              </div>
              
            </div>
            
            <div className={styles.dropdownWithConstraints}>
              <select
                className={styles.stepDropdown}
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
              <div className={styles.optionConstraints}>
                {step.options.map((option) => {
                  const statusInfo = getConstraintStatusInfo(stepIndex, option.id)
                  const isSelected = selectedPath[stepIndex] === option.id
                  const isEditing = editingOption?.stepId === step.id && editingOption?.optionId === option.id
                  
                  return (
                    <div
                      key={option.id}
                      className={`${styles.constraintIndicator} ${isSelected ? styles.selected : ''} ${styles[statusInfo.status]}`}
                      style={{ borderLeftColor: statusInfo.color }}
                    >
                      {isEditing ? (
                        <div className={styles.optionEditForm}>
                          <input
                            type="text"
                            value={tempOptionName}
                            onChange={(e) => setTempOptionName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveOptionName()
                              if (e.key === 'Escape') cancelOptionEdit()
                            }}
                            className={styles.optionNameInput}
                            autoFocus
                          />
                          <div className={styles.editActions}>
                            <button onClick={saveOptionName} className={styles.saveBtn} title="저장">✓</button>
                            <button onClick={cancelOptionEdit} className={styles.cancelBtn} title="취소">✕</button>
                          </div>
                        </div>
                      ) : (
                        <div className={styles.optionDisplay}>
                          <span 
                            className={styles.optionName}
                            onClick={() => openConstraintModal(stepIndex, option.id)}
                            title={statusInfo.tooltip}
                            style={{ color: statusInfo.color }}
                          >
                            {statusInfo.icon} {option.displayName || option.name}
                          </span>
                          <div className={styles.optionActions}>
                            <button
                              className={styles.editOptionBtn}
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
                                className={styles.deleteOptionBtn}
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
                              <span className={styles.constraintIcon} title={`제약 조건 적용: ${getDisabledReason(stepIndex, option.id)}`}>🚫</span>
                            )}
                            {statusInfo.status !== 'neutral' && statusInfo.status !== 'disabled' && statusInfo.icon && (
                              <span className={styles.constraintIcon} title={statusInfo.tooltip}>{statusInfo.icon}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
                
                {/* Add Option Button */}
                <div className={styles.addOptionContainer}>
                  <button
                    className={styles.addOptionBtn}
                    onClick={() => onAddOption(step.id)}
                    title="이 단계에 새 옵션 추가"
                  >
                    + 옵션 추가
                  </button>
                </div>
              </div>
            </div>

            {stepIndex < steps.length - 1 && (
              <div className={styles.stepArrow}>→</div>
            )}
          </div>
        ))}
      </div>

      {/* Current Path Summary */}
      {Object.keys(selectedPath).length > 0 && (
        <div className={styles.pathSummary}>
          <h4>선택된 경로:</h4>
          <div className={styles.pathDisplay}>
            {steps.map((step, stepIndex) => {
              const selectedOptionId = selectedPath[stepIndex]
              const selectedOption = step.options.find(opt => opt.id === selectedOptionId)
              
              return (
                <span key={step.id} className={styles.pathStep}>
                  {selectedOption ? (
                    <>
                      <strong>{step.displayName || step.name}:</strong>{' '}
                      {selectedOption.displayName || selectedOption.name}
                    </>
                  ) : (
                    <span className={styles.unselected}>
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

      {/* Policy Manager Modal */}
      {showPolicyManager && (
        <PolicyManager 
          steps={steps}
          constraints={constraints}
          onAddConstraint={onAddConstraint}
          onUpdateConstraint={onUpdateConstraint}
          onDeleteConstraint={onDeleteConstraint}
          isOpen={showPolicyManager}
          onClose={() => setShowPolicyManager(false)} 
        />
      )}
    </section>
  )
}

export default WorkflowButtonTab
