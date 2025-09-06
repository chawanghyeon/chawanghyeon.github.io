import React, { useState } from 'react'
import { Step, WorkflowConstraint, RouteCondition, ConstraintActionType } from '../lib/types'
import { assignDefaultPriorities } from '../lib/constraints'
import styles from './ConstraintModal.module.css'

interface ConstraintModalProps {
  stepIndex: number
  optionId: string
  steps: Step[]
  constraints: WorkflowConstraint[]
  selectedPath: { [stepIndex: number]: string }
  constraintId?: string // For editing existing constraint
  isAddingNew?: boolean // For adding new constraint from policy manager
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
  constraintId,
  isAddingNew = false,
  onClose,
  onAddConstraint,
  onUpdateConstraint,
  onDeleteConstraint,
}) => {
  // Check if we're editing an existing constraint
  const existingConstraint = constraintId ? constraints.find(c => c.id === constraintId) : null
  const isEditing = !!existingConstraint

  // For new policy creation from policy manager, allow source selection
  const [selectedSourceStepIndex, setSelectedSourceStepIndex] = useState<number>(
    existingConstraint?.sourceStepIndex ?? stepIndex
  )
  const [selectedSourceOptionId, setSelectedSourceOptionId] = useState<string>(
    existingConstraint?.sourceOptionId ?? optionId
  )

  // Update current step and option based on source selection
  const currentStepIndex = isAddingNew ? selectedSourceStepIndex : (isEditing ? selectedSourceStepIndex : stepIndex)
  const currentOptionId = isAddingNew ? selectedSourceOptionId : (isEditing ? selectedSourceOptionId : optionId)
  const currentStep = steps[currentStepIndex]
  const currentOption = currentStep?.options.find(opt => opt.id === currentOptionId)

  // Auto-populate route conditions from current selected path (including steps up to and including current step)
  const hasSelectedUpToCurrentStep = Object.keys(selectedPath).some(key => parseInt(key) <= currentStepIndex && selectedPath[parseInt(key)])
  const autoRouteConditions: RouteCondition[] = hasSelectedUpToCurrentStep 
    ? Object.entries(selectedPath)
        .filter(([key, value]) => parseInt(key) <= stepIndex && value) // Include steps up to and including current step
        .map(([key, value]) => ({ stepIndex: parseInt(key), optionId: value }))
    : []
  
  const [routeConditions, setRouteConditions] = useState<RouteCondition[]>(
    existingConstraint?.routeConditions || autoRouteConditions
  )
  
  // New unified state for target step and option selection
  const [selectedTargetSteps, setSelectedTargetSteps] = useState<number[]>(
    existingConstraint ? (existingConstraint.targetSteps || [existingConstraint.targetStepIndex!]) : []
  )
  const [selectedTargetOptions, setSelectedTargetOptions] = useState<{ [stepIndex: number]: string[] }>(() => {
    if (existingConstraint) {
      const targetStepIndex = existingConstraint.targetStepIndex!
      return {
        [targetStepIndex]: existingConstraint.targetOptionIds || [existingConstraint.targetOptionId!]
      }
    }
    return {}
  })
  const [description, setDescription] = useState<string>(existingConstraint?.description || '')
  
  const [constraintAction, setConstraintAction] = useState<ConstraintActionType>(
    existingConstraint?.action || 'disable'
  )

  // Calculate constraint scope dynamically based on conditions
  const getConstraintScope = (): 'global' | 'route-based' => {
    if (routeConditions.length > 0) {
      return 'route-based'
    }
    return 'global'
  }

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

  // 중복 정책 검사 함수
  const isDuplicateConstraint = (newConstraint: Omit<WorkflowConstraint, 'id' | 'createdAt'>) => {
    return constraints.some(existing => {
      // 기본 조건 비교
      const basicMatch = 
        existing.sourceStepIndex === newConstraint.sourceStepIndex &&
        existing.sourceOptionId === newConstraint.sourceOptionId &&
        existing.targetStepIndex === newConstraint.targetStepIndex &&
        existing.action === newConstraint.action

      if (!basicMatch) return false

      // 대상 옵션 비교
      const existingTargetOptions = existing.targetOptionIds || [existing.targetOptionId!]
      const newTargetOptions = newConstraint.targetOptionIds || []
      
      const targetOptionsMatch = 
        existingTargetOptions.length === newTargetOptions.length &&
        existingTargetOptions.every(optId => newTargetOptions.includes(optId))

      if (!targetOptionsMatch) return false

      // 경로 조건 비교
      const existingRouteConditions = existing.routeConditions || []
      const newRouteConditions = newConstraint.routeConditions || []
      
      const routeConditionsMatch = 
        existingRouteConditions.length === newRouteConditions.length &&
        existingRouteConditions.every(existingCondition => 
          newRouteConditions.some(newCondition => 
            existingCondition.stepIndex === newCondition.stepIndex &&
            existingCondition.optionId === newCondition.optionId
          )
        )

      return routeConditionsMatch
    })
  }

  const handleAddConstraint = () => {
    // Validate that at least one step and option is selected
    if (selectedTargetSteps.length === 0) {
      alert('적어도 하나의 대상 단계를 선택해야 합니다.')
      return
    }

    const hasSelectedOptions = selectedTargetSteps.some(stepIdx => 
      selectedTargetOptions[stepIdx] && selectedTargetOptions[stepIdx].length > 0
    )

    if (!hasSelectedOptions) {
      alert('선택된 단계에서 적어도 하나의 옵션을 선택해야 합니다.')
      return
    }

    if (isEditing && constraintId) {
      // Update existing constraint
      const targetStepIdx = selectedTargetSteps[0]
      const targetOptions = selectedTargetOptions[targetStepIdx] || []
      
      const updates: Partial<WorkflowConstraint> = {
        scope: getConstraintScope(),
        sourceStepIndex: currentStepIndex,
        sourceOptionId: currentOptionId,
        targetStepIndex: targetStepIdx,
        targetOptionIds: [...targetOptions],
        description,
        action: constraintAction,
      }

      // Add route conditions for route-based constraints
      if (getConstraintScope() === 'route-based' && routeConditions.length > 0) {
        updates.routeConditions = [...routeConditions]
      }

      onUpdateConstraint(constraintId, updates)
    } else {
      // Create constraints for each selected step-option combination
      let addedCount = 0
      let duplicateCount = 0
      
      selectedTargetSteps.forEach(targetStepIdx => {
        const targetOptions = selectedTargetOptions[targetStepIdx] || []
        
        if (targetOptions.length > 0) {
          const constraint: Omit<WorkflowConstraint, 'id' | 'createdAt'> = {
            scope: getConstraintScope(),
            sourceStepIndex: currentStepIndex,
            sourceOptionId: currentOptionId,
            targetStepIndex: targetStepIdx,
            targetOptionIds: [...targetOptions],
            description,
            isActive: true,
            action: constraintAction,
            priority: assignDefaultPriorities({
              scope: getConstraintScope(),
              sourceStepIndex: currentStepIndex,
              sourceOptionId: currentOptionId,
              description,
              isActive: true,
              action: constraintAction
            })
          }

          // Add route conditions for route-based constraints
          if (getConstraintScope() === 'route-based' && routeConditions.length > 0) {
            constraint.routeConditions = [...routeConditions]
          }

          // 중복 검사 - 중복이 아닌 경우에만 추가
          if (!isDuplicateConstraint(constraint)) {
            onAddConstraint(constraint)
            addedCount++
          } else {
            duplicateCount++
            console.log('중복된 정책이므로 건너뜀:', constraint)
          }
        }
      })
      
      // 디버그 정보 출력
      if (duplicateCount > 0) {
        console.log(`${duplicateCount}개의 중복 정책을 건너뛰고, ${addedCount}개의 새 정책을 추가했습니다.`)
      }
    }
    
    // Close modal
    onClose()
  }

  const getDefaultConstraintDescription = (constraint: WorkflowConstraint): string => {
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

    if (constraint.targetSteps && constraint.targetSteps.length > 0) {
      const stepNames = constraint.targetSteps.map(idx => {
        const step = steps[idx]
        return step ? (step.displayName || step.name) : `단계 ${idx + 1}`
      }).join(', ')
      routeInfo += ` (대상 단계: ${stepNames})`
    }

    // Generate description based on constraint properties
    const actionText = constraint.action === 'enable' ? '활성화' : constraint.action === 'require' ? '필수화' : '비활성화'
    const targetStepName = steps[constraint.targetStepIndex || 0]?.displayName || steps[constraint.targetStepIndex || 0]?.name || '알 수 없는 단계'
    const targetOptionsText = constraint.targetOptionIds?.map(optId => {
      const step = steps[constraint.targetStepIndex || 0]
      const option = step?.options.find(opt => opt.id === optId)
      return option?.displayName || option?.name || optId
    }).join(', ') || '모든 옵션'
    
    return `${scopePrefix}${targetStepName}의 [${targetOptionsText}] ${actionText}${routeInfo}`
  }

  return (
    <div className={styles.constraintModalOverlay} onClick={onClose}>
      <div className={styles.constraintModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>
            <h3>{isEditing ? '정책 수정' : '정책 관리'}</h3>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.modalContent}>
          {/* Source Selection for New Policy or Editing Existing Policy */}
          {(isAddingNew || isEditing) && (
            <div className={styles.sourceSelection}>
              <h5>소스 단계 및 옵션 선택</h5>
              <div className={styles.sourceSelectionGrid}>
                <div className={styles.formGroup}>
                  <label>소스 단계:</label>
                  <select
                    value={selectedSourceStepIndex}
                    onChange={(e) => {
                      const newStepIndex = Number(e.target.value)
                      setSelectedSourceStepIndex(newStepIndex)
                      // Reset option selection when step changes
                      const newStep = steps[newStepIndex]
                      if (newStep && newStep.options.length > 0) {
                        setSelectedSourceOptionId(newStep.options[0].id)
                      }
                    }}
                    className={styles.selectInput}
                  >
                    {steps.map((step, index) => (
                      <option key={step.id} value={index}>
                        {step.displayName || step.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className={styles.formGroup}>
                  <label>소스 옵션:</label>
                  <select
                    value={selectedSourceOptionId}
                    onChange={(e) => setSelectedSourceOptionId(e.target.value)}
                    className={styles.selectInput}
                  >
                    {currentStep?.options.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.displayName || option.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Current Option Info for existing workflow (read-only) */}
          {!isAddingNew && !isEditing && (
            <div className={styles.currentOptionInfo}>
              <h4>
                {currentStep?.displayName || currentStep?.name} - {currentOption?.displayName || currentOption?.name}
              </h4>
            </div>
          )}

          {/* Existing Constraints */}
          {!isEditing && constraints.length > 0 && (
            <div className={styles.existingConstraints}>
              <h5>기존 정책들</h5>
              <div className={styles.constraintsList}>
                {constraints.map((constraint) => (
                  <div key={constraint.id} className={styles.constraintCard}>
                    <div className={styles.constraintInfo}>
                      <div className={styles.constraintHeader}>
                        <span className={`${styles.constraintBadge} ${styles[constraint.action || 'disable']}`}>
                          {constraint.action === 'enable' ? '활성화' : constraint.action === 'require' ? '필수' : '비활성화'}
                        </span>
                        <span className={`${styles.statusBadge} ${constraint.isActive ? styles.active : styles.inactive}`}>
                          {constraint.isActive ? '정책 활성화' : '정책 비활성화'}
                        </span>
                      </div>
                      <p className={styles.constraintDescription}>
                        {constraint.description || getDefaultConstraintDescription(constraint)}
                      </p>
                      <div className={styles.constraintMeta}>
                        <span>우선순위: {constraint.priority}</span>
                        <span>범위: {
                          constraint.scope === 'global' ? '전역' :
                          constraint.scope === 'route-based' ? '경로 기반' :
                          constraint.scope === 'conditional-route' ? '조건부' : '전역'
                        }</span>
                      </div>
                    </div>
                    <div className={styles.constraintActions}>
                      <label className={styles.toggleSwitch}>
                        <input
                          type="checkbox"
                          checked={constraint.isActive}
                          onChange={(e) => onUpdateConstraint(constraint.id, { isActive: e.target.checked })}
                        />
                        <span className={styles.slider}></span>
                      </label>
                      <button
                        className={styles.editConstraintBtn}
                        onClick={() => {
                          // Set editing mode with this constraint's data
                          setRouteConditions(constraint.routeConditions || [])
                          setSelectedTargetSteps(constraint.targetSteps || [constraint.targetStepIndex!])
                          setSelectedTargetOptions({
                            [constraint.targetStepIndex!]: constraint.targetOptionIds || [constraint.targetOptionId!]
                          })
                          setDescription(constraint.description || '')
                          setConstraintAction(constraint.action || 'disable')
                        }}
                      >
                        수정
                      </button>
                      <button
                        className={styles.deleteConstraintBtn}
                        onClick={() => { 
                          if (confirm('이 제약 조건을 삭제하시겠습니까?')) {
                            onDeleteConstraint(constraint.id)
                          }
                        }}
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add/Edit Constraint Form */}
          <div className={styles.constraintForm}>
            <h5>{isEditing ? '정책 수정' : '새 정책 추가'}</h5>
            
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>동작 유형</label>
                <select
                  className={styles.formSelect}
                  value={constraintAction}
                  onChange={(e) => setConstraintAction(e.target.value as ConstraintActionType)}
                >
                  <option value="disable">비활성화</option>
                  <option value="enable">활성화</option>
                  <option value="require">필수 선택</option>
                </select>
                <small className={styles.formHint}>
                  비활성화: 옵션을 선택할 수 없게 함, 활성화: 다른 제약에 의해 비활성화된 옵션을 다시 활성화
                </small>
              </div>
            </div>

            {/* 현재 적용 범위 표시 */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>현재 적용 범위</label>
              <div className={styles.scopeInfo}>
                {getConstraintScope() === 'global' && (
                  <span className={styles.scopeBadge}>🌐 모든 경로에 적용</span>
                )}
                {getConstraintScope() === 'route-based' && (
                  <span className={styles.scopeBadge}>🎯 특정 경로 조건에만 적용</span>
                )}
              </div>
              <small className={styles.formHint}>
                경로 조건을 추가하면 자동으로 적용 범위가 조정됩니다.
              </small>
            </div>

            {/* 경로 조건 섹션 - 항상 표시 */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>경로 조건 (선택사항)</label>
              {hasSelectedUpToCurrentStep && autoRouteConditions.length > 0 && (
                <div className={styles.autoHint}>
                  💡 현재 선택된 경로가 자동으로 조건에 추가되었습니다.
                </div>
              )}
              <div className={styles.conditionsList}>
                  {routeConditions.map((condition, index) => {
                    const isAutoPopulated = index < autoRouteConditions.length
                    return (
                      <div key={index} className={`${styles.conditionItem} ${isAutoPopulated ? styles.autoPopulated : ''}`}>
                        <select
                          className={styles.conditionSelect}
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
                            className={styles.conditionSelect}
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
                          className={styles.removeBtn}
                        >
                          ✕
                        </button>
                      </div>
                    )
                  })}
                  
                  <button 
                    type="button" 
                    onClick={addRouteCondition}
                    className={styles.addConditionBtn}
                  >
                    + 조건 추가
                  </button>
                </div>
              </div>
            
            {/* Target Step Selection */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>대상 단계 선택</label>
              <div className={styles.stepSelection}>
                <div className={styles.selectAllRow}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={selectedTargetSteps.length === steps.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTargetSteps(steps.map((_, idx) => idx))
                        } else {
                          setSelectedTargetSteps([])
                          setSelectedTargetOptions({})
                        }
                      }}
                    />
                    <span className={styles.checkmark}></span>
                    모든 단계 선택
                  </label>
                </div>
                
                <div className={styles.stepsList}>
                  {steps.map((step, stepIdx) => (
                    <div key={step.id} className={styles.stepItem}>
                      <div className={styles.stepCheckbox}>
                        <label className={styles.checkboxLabel}>
                          <input
                            type="checkbox"
                            checked={selectedTargetSteps.includes(stepIdx)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedTargetSteps(prev => [...prev, stepIdx])
                              } else {
                                setSelectedTargetSteps(prev => prev.filter(idx => idx !== stepIdx))
                                setSelectedTargetOptions(prev => {
                                  const updated = { ...prev }
                                  delete updated[stepIdx]
                                  return updated
                                })
                              }
                            }}
                          />
                          <span className={styles.checkmark}></span>
                          {step.displayName || step.name}
                        </label>
                      </div>
                      
                      {selectedTargetSteps.includes(stepIdx) && (
                        <div className={styles.optionsSelection}>
                          <div className={styles.selectAllRow}>
                            <label className={styles.checkboxLabel}>
                              <input
                                type="checkbox"
                                checked={selectedTargetOptions[stepIdx]?.length === step.options.length}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedTargetOptions(prev => ({
                                      ...prev,
                                      [stepIdx]: step.options.map(opt => opt.id)
                                    }))
                                  } else {
                                    setSelectedTargetOptions(prev => ({
                                      ...prev,
                                      [stepIdx]: []
                                    }))
                                  }
                                }}
                              />
                              <span className={styles.checkmark}></span>
                              모든 옵션 선택
                            </label>
                          </div>
                          
                          <div className={styles.optionsList}>
                            {step.options.map((option) => (
                              <label key={option.id} className={styles.checkboxLabel}>
                                <input
                                  type="checkbox"
                                  checked={selectedTargetOptions[stepIdx]?.includes(option.id) || false}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedTargetOptions(prev => ({
                                        ...prev,
                                        [stepIdx]: [...(prev[stepIdx] || []), option.id]
                                      }))
                                    } else {
                                      setSelectedTargetOptions(prev => ({
                                        ...prev,
                                        [stepIdx]: (prev[stepIdx] || []).filter(id => id !== option.id)
                                      }))
                                    }
                                  }}
                                />
                                <span className={styles.checkmark}></span>
                                {option.displayName || option.name}
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>설명 (선택사항)</label>
              <textarea
                className={styles.formTextarea}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="이 제약 조건에 대한 설명을 입력하세요..."
                rows={3}
              />
            </div>

            <div className={styles.formActions}>
              <button className={styles.cancelBtn} onClick={onClose}>
                취소
              </button>
              <button className={styles.submitBtn} onClick={handleAddConstraint}>
                {isEditing ? '정책 수정' : '정책 추가'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConstraintModal
