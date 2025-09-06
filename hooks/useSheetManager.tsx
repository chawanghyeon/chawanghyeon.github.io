import React, { useState, useCallback } from 'react'
import { WorkflowSheet, WorkflowData, Step, TabType, WorkflowConstraint } from '../lib/types'
import { 
  generatePathActivations, 
  cleanInvalidConstraints, 
  adjustConstraintIndicesForStepInsertion,
  adjustConstraintIndicesForStepDeletion
} from '../lib/constraints'

let idCounter = 0

function generateId(prefix: string) {
  return `${prefix}_${Date.now()}_${++idCounter}`
}

function createDefaultSheet(id: string, name: string): WorkflowSheet {
  const defaultSteps: Step[] = [
    {
      id: 'step_1',
      name: '1단계',
      displayName: '',
      options: [
        { id: 'option_1_1', name: '옵션1', displayName: '', isActive: true },
        { id: 'option_1_2', name: '옵션2', displayName: '', isActive: true }
      ],
      isActive: true
    }
  ]

  return {
    id,
    name,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    steps: defaultSteps,
    constraints: {},
  }
}

export const useSheetManager = () => {
  const STORAGE_KEY = "chawanghyeon_workflow_sheets_v2" // Bump version to avoid old data conflicts
  const saveTimer = React.useRef<number | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [constraintNotification, setConstraintNotification] = useState<string | null>(null)
  
  // Add a force update mechanism
  const [, forceUpdate] = useState({})
  const triggerUpdate = useCallback(() => {
    forceUpdate({})
  }, [])

  const [workflowData, setWorkflowData] = useState<WorkflowData>(() => ({
    sheets: [createDefaultSheet("sheet_1", "Sheet 1")],
    activeSheetId: "sheet_1",
    nextSheetId: 2,
    lastUpdated: Date.now()
  }))

  const [currentTab, setCurrentTab] = useState<TabType>('button')

  // Load data from localStorage on mount (client-side only)
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as WorkflowData
        
        // Ensure constraints exist for backward compatibility
        const updatedSheets = parsed.sheets.map(sheet => ({
          ...sheet,
          constraints: sheet.constraints || {}
        }))
        
        setWorkflowData({
          ...parsed,
          sheets: updatedSheets
        })
      }
    } catch (error) {
      console.warn('Failed to load workflow data from localStorage:', error)
      setSaveError('데이터 로드 실패')
    }
  }, [])

  // Auto-save with debouncing (localStorage only, no file system)
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    
    saveTimer.current = window.setTimeout(async () => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(workflowData))
        setSaveError(null)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown save error'
        setSaveError(errorMessage)
        console.warn('Failed to save workflow sheets:', err)
      }
    }, 1000)
    
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current)
    }
  }, [workflowData])

  // Generate pathActivations dynamically from current sheet's steps and constraints
  const generateCurrentPathActivations = useCallback(() => {
    const activeSheet = workflowData.sheets.find(sheet => sheet.id === workflowData.activeSheetId)
    if (!activeSheet) return {}
    
    return generatePathActivations(
      activeSheet.steps,
      activeSheet.constraints || {}
    )
  }, [workflowData])

  // Helper function to update current sheet
  const updateCurrentSheet = useCallback((updater: (sheet: WorkflowSheet) => WorkflowSheet, skipPathRecalc = false) => {
    setWorkflowData(prev => {
      const activeSheetIndex = prev.sheets.findIndex(sheet => sheet.id === prev.activeSheetId)
      if (activeSheetIndex === -1) return prev

      const updatedSheet = {
        ...updater(prev.sheets[activeSheetIndex]),
        updatedAt: Date.now()
      }

      // Clean invalid constraints when steps change
      if (!skipPathRecalc) {
        updatedSheet.constraints = cleanInvalidConstraints(
          updatedSheet.constraints || {},
          updatedSheet.steps
        )
      }

      const newSheets = [...prev.sheets]
      newSheets[activeSheetIndex] = updatedSheet

      return {
        ...prev,
        sheets: newSheets,
        lastUpdated: Date.now()
      }
    })
  }, [])

  // Get current sheet data
  const activeSheet = workflowData.sheets.find(sheet => sheet.id === workflowData.activeSheetId)
  const steps = React.useMemo(() => activeSheet?.steps || [], [activeSheet?.steps])
  const constraints = React.useMemo(() => activeSheet?.constraints || {}, [activeSheet?.constraints])
  const pathActivations = generateCurrentPathActivations()

  // Helper function to get constraint description
  const getConstraintDescription = useCallback((constraint: WorkflowConstraint): string => {
    const sourceStep = steps[constraint.sourceStepIndex]
    const sourceOption = sourceStep?.options.find(opt => opt.id === constraint.sourceOptionId)
    const stepName = sourceStep?.displayName || sourceStep?.name || `${constraint.sourceStepIndex + 1}단계`
    const optionName = sourceOption?.displayName || sourceOption?.name || '옵션'
    return `${stepName} - ${optionName}: 워크플로우 제약`
  }, [steps])

  // Helper function to find constraints that would be affected by step operations
  const findAffectedConstraints = useCallback((operation: 'addStep' | 'deleteStep' | 'addOption' | 'deleteOption', params: {
    insertIndex?: number
    stepIndex?: number
    optionId?: string
  }) => {
    const constraintArray = Object.values(constraints)
    if (constraintArray.length === 0) return []
    
    let affected: WorkflowConstraint[] = []
    
    switch (operation) {
      case 'addStep':
        const { insertIndex } = params
        if (insertIndex !== undefined) {
          // Find constraints that reference steps at or after the insertion point
          affected = constraintArray.filter(constraint => 
            constraint.sourceStepIndex >= insertIndex ||
            (constraint.targetStepIndex !== undefined && constraint.targetStepIndex >= insertIndex) ||
            (constraint.targetSteps && constraint.targetSteps.some(stepIdx => stepIdx >= insertIndex)) ||
            (constraint.routeConditions && constraint.routeConditions.some(condition => condition.stepIndex >= insertIndex))
          )
        }
        break
        
      case 'deleteStep':
        const { stepIndex } = params
        if (stepIndex !== undefined) {
          // Find constraints that reference the step being deleted
          affected = constraintArray.filter(constraint =>
            constraint.sourceStepIndex === stepIndex ||
            constraint.targetStepIndex === stepIndex ||
            (constraint.targetSteps && constraint.targetSteps.includes(stepIndex)) ||
            (constraint.routeConditions && constraint.routeConditions.some(condition => condition.stepIndex === stepIndex))
          )
        }
        break
        
      case 'addOption':
        // Adding options generally doesn't affect existing constraints
        affected = []
        break
        
      case 'deleteOption':
        const { stepIndex: optionStepIndex, optionId } = params
        if (optionStepIndex !== undefined && optionId) {
          // Find constraints that reference the option being deleted
          affected = constraintArray.filter(constraint =>
            (constraint.sourceStepIndex === optionStepIndex && constraint.sourceOptionId === optionId) ||
            (constraint.targetStepIndex === optionStepIndex && constraint.targetOptionId === optionId) ||
            (constraint.targetStepIndex === optionStepIndex && constraint.targetOptionIds?.includes(optionId)) ||
            (constraint.targetSteps?.includes(optionStepIndex) && constraint.targetOptionIds?.includes(optionId)) ||
            (constraint.routeConditions && constraint.routeConditions.some(condition => 
              condition.stepIndex === optionStepIndex && condition.optionId === optionId
            ))
          )
        }
        break
    }
    
    return affected
  }, [constraints])

  // Helper function to check affected constraints and show confirmation
  const checkAffectedConstraintsAndConfirm = useCallback((operation: 'addStep' | 'deleteStep' | 'addOption' | 'deleteOption', params: {
    insertIndex?: number
    stepIndex?: number
    optionId?: string
  }): boolean => {
    const affectedConstraints = findAffectedConstraints(operation, params)
    
    if (affectedConstraints.length === 0) {
      return true // No constraints affected, proceed
    }
    
    const operationText = {
      addStep: '단계를 추가',
      deleteStep: '단계를 삭제', 
      addOption: '옵션을 추가',
      deleteOption: '옵션을 삭제'
    }[operation]
    
    const message = `${operationText}하면 ${affectedConstraints.length}개의 제약 조건이 영향을 받아 사용 불가 상태가 됩니다:\n\n` +
      affectedConstraints.map(c => `• ${getConstraintDescription(c)}`).join('\n') +
      `\n\n계속하시겠습니까? (제약 조건은 삭제되지 않고 정책 관리자에서 '사용 안함' 상태로 표시됩니다)`
    
    return window.confirm(message)
  }, [findAffectedConstraints, getConstraintDescription])

  // Sheet management functions
  const createSheet = useCallback((name?: string) => {
    const newSheet = createDefaultSheet(
      `sheet_${workflowData.nextSheetId}`,
      name || `Sheet ${workflowData.nextSheetId}`
    )
    
    setWorkflowData(prev => ({
      ...prev,
      sheets: [...prev.sheets, newSheet],
      activeSheetId: newSheet.id,
      nextSheetId: prev.nextSheetId + 1,
      lastUpdated: Date.now()
    }))
    
    return newSheet.id
  }, [workflowData.nextSheetId])

  const renameSheet = useCallback((sheetId: string, newName: string) => {
    setWorkflowData(prev => ({
      ...prev,
      sheets: prev.sheets.map(sheet =>
        sheet.id === sheetId
          ? { ...sheet, name: newName, updatedAt: Date.now() }
          : sheet
      ),
      lastUpdated: Date.now()
    }))
  }, [])

  const copySheet = useCallback((sheetId: string, newName?: string) => {
    const sourceSheet = workflowData.sheets.find(sheet => sheet.id === sheetId)
    if (!sourceSheet) return
    
    const newSheet: WorkflowSheet = {
      ...sourceSheet,
      id: `sheet_${workflowData.nextSheetId}`,
      name: newName || `${sourceSheet.name} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    
    setWorkflowData(prev => ({
      ...prev,
      sheets: [...prev.sheets, newSheet],
      activeSheetId: newSheet.id,
      nextSheetId: prev.nextSheetId + 1,
      lastUpdated: Date.now()
    }))
    
    return newSheet.id
  }, [workflowData.sheets, workflowData.nextSheetId])

  const deleteSheet = useCallback((sheetId: string) => {
    if (workflowData.sheets.length <= 1) return // Keep at least one sheet
    
    setWorkflowData(prev => {
      const remainingSheets = prev.sheets.filter(sheet => sheet.id !== sheetId)
      const newActiveSheetId = prev.activeSheetId === sheetId 
        ? remainingSheets[0]?.id || prev.activeSheetId
        : prev.activeSheetId
      
      return {
        ...prev,
        sheets: remainingSheets,
        activeSheetId: newActiveSheetId,
        lastUpdated: Date.now()
      }
    })
  }, [workflowData.sheets.length])

  const switchToSheet = useCallback((sheetId: string) => {
    setWorkflowData(prev => ({
      ...prev,
      activeSheetId: sheetId,
    }))
  }, [])

  // Step management functions (operating on current sheet)
  const addRootStep = useCallback(() => {
    updateCurrentSheet(sheet => {
      const stepId = generateId("step")
      const newStep: Step = {
        id: stepId,
        name: `${sheet.steps.length + 1}단계`,
        displayName: "",
        options: [
          {
            id: generateId("option"),
            name: "옵션1",
            displayName: "",
            isActive: true,
          },
        ],
        isActive: true,
      }
      
      return {
        ...sheet,
        steps: [...sheet.steps, newStep],
      }
    })
  }, [updateCurrentSheet])

  const addStepAtIndex = useCallback((insertIdx: number) => {
    // Check for affected constraints first
    if (!checkAffectedConstraintsAndConfirm('addStep', { insertIndex: insertIdx })) {
      return // User cancelled
    }
    
    updateCurrentSheet(sheet => {
      // Find affected constraints
      const affectedConstraints = findAffectedConstraints('addStep', { insertIndex: insertIdx })
      const affectedConstraintIds = new Set(affectedConstraints.map(c => c.id))
      
      // Don't remove affected constraints - they will be marked as "unused" in the UI
      // const updatedConstraints = { ...sheet.constraints }
      // affectedConstraintIds.forEach(id => {
      //   delete updatedConstraints[id]
      // })
      
      const stepId = generateId("step")
      const newStep: Step = {
        id: stepId,
        name: `${insertIdx + 1}단계`,
        displayName: "",
        options: [
          {
            id: generateId("option"),
            name: "옵션1",
            displayName: "",
            isActive: true,
          },
        ],
        isActive: true,
      }
      
      const newSteps = [
        ...sheet.steps.slice(0, insertIdx),
        newStep,
        ...sheet.steps.slice(insertIdx),
      ].map((step, i) => ({ ...step, name: `${i + 1}단계` }))
      
      // Adjust remaining constraint indices
      const adjustedConstraints = adjustConstraintIndicesForStepInsertion(sheet.constraints || {}, insertIdx)
      
      // Show notification about affected constraints (but not deleted)
      if (affectedConstraintIds.size > 0) {
        setConstraintNotification(`단계 추가로 인해 ${affectedConstraintIds.size}개의 제약 조건이 사용 불가 상태가 되었습니다.`)
        setTimeout(() => setConstraintNotification(null), 5000)
      }
      
      return {
        ...sheet,
        steps: newSteps,
        constraints: adjustedConstraints,
      }
    })
  }, [updateCurrentSheet, checkAffectedConstraintsAndConfirm, findAffectedConstraints])

  const updateStepName = useCallback((stepId: string, name: string) => {
    updateCurrentSheet(sheet => ({
      ...sheet,
      steps: sheet.steps.map(step =>
        step.id === stepId ? { ...step, displayName: name } : step
      ),
    }))
  }, [updateCurrentSheet])

  const updateOptionName = useCallback((stepId: string, optionId: string, name: string) => {
    updateCurrentSheet(sheet => ({
      ...sheet,
      steps: sheet.steps.map(step =>
        step.id === stepId
          ? {
              ...step,
              options: step.options.map(opt =>
                opt.id === optionId ? { ...opt, displayName: name } : opt
              ),
            }
          : step
      ),
    }))
  }, [updateCurrentSheet])

  const deleteStep = useCallback((stepId: string) => {
    updateCurrentSheet(sheet => {
      const stepIndex = sheet.steps.findIndex(step => step.id === stepId)
      if (stepIndex === -1) return sheet
      
      // Check for affected constraints first
      if (!checkAffectedConstraintsAndConfirm('deleteStep', { stepIndex })) {
        return sheet // User cancelled
      }
      
      // Find affected constraints
      const affectedConstraints = findAffectedConstraints('deleteStep', { stepIndex })
      const affectedConstraintIds = new Set(affectedConstraints.map(c => c.id))
      
      // Don't remove affected constraints - they will be marked as "unused" in the UI
      // const updatedConstraints = { ...sheet.constraints }
      // affectedConstraintIds.forEach(id => {
      //   delete updatedConstraints[id]
      // })
      
      // Adjust indices for remaining constraints
      const adjustedConstraints = adjustConstraintIndicesForStepDeletion(sheet.constraints || {}, stepIndex)
      
      // Remove the step
      const updatedSteps = sheet.steps.filter(step => step.id !== stepId)
      
      // Show notification about affected constraints (but not deleted)
      if (affectedConstraintIds.size > 0) {
        setConstraintNotification(`단계 삭제로 인해 ${affectedConstraintIds.size}개의 제약 조건이 사용 불가 상태가 되었습니다.`)
        setTimeout(() => setConstraintNotification(null), 5000)
      }
      
      return {
        ...sheet,
        steps: updatedSteps,
        constraints: adjustedConstraints,
      }
    })
  }, [updateCurrentSheet, checkAffectedConstraintsAndConfirm, findAffectedConstraints])

  const addOption = useCallback((stepId: string) => {
    updateCurrentSheet(sheet => {
      const idx = sheet.steps.findIndex(s => s.id === stepId)
      if (idx === -1) return sheet
      
      const newOption = {
        id: generateId("option"),
        name: `옵션${sheet.steps[idx].options.length + 1}`,
        displayName: "",
        isActive: true,
      }
      
      return {
        ...sheet,
        steps: sheet.steps.map((step, i) =>
          i === idx ? { ...step, options: [...step.options, newOption] } : step
        ),
      }
    })
  }, [updateCurrentSheet])

  const deleteOption = useCallback((stepId: string, optionId: string) => {
    updateCurrentSheet(sheet => {
      const stepIndex = sheet.steps.findIndex(s => s.id === stepId)
      if (stepIndex === -1) return sheet
      if (sheet.steps[stepIndex].options.length <= 1) return sheet
      
      // Check for affected constraints first
      if (!checkAffectedConstraintsAndConfirm('deleteOption', { stepIndex, optionId })) {
        return sheet // User cancelled
      }
      
      // Find affected constraints
      const affectedConstraints = findAffectedConstraints('deleteOption', { stepIndex, optionId })
      const affectedConstraintIds = new Set(affectedConstraints.map(c => c.id))
      
      // Don't remove affected constraints - they will be marked as "unused" in the UI
      // const updatedConstraints = { ...sheet.constraints }
      // affectedConstraintIds.forEach(id => {
      //   delete updatedConstraints[id]
      // })
      
      // Show notification about affected constraints (but not deleted)
      if (affectedConstraintIds.size > 0) {
        setConstraintNotification(`옵션 삭제로 인해 ${affectedConstraintIds.size}개의 제약 조건이 사용 불가 상태가 되었습니다.`)
        setTimeout(() => setConstraintNotification(null), 5000)
      }
      
      return {
        ...sheet,
        steps: sheet.steps.map((step, i) =>
          i === stepIndex ? { ...step, options: step.options.filter(opt => opt.id !== optionId) } : step
        ),
        constraints: sheet.constraints, // Keep original constraints
      }
    })
  }, [updateCurrentSheet, checkAffectedConstraintsAndConfirm, findAffectedConstraints])

  const toggleStepActive = useCallback((stepId: string, isActive: boolean) => {
    updateCurrentSheet(sheet => ({
      ...sheet,
      steps: sheet.steps.map(step => step.id === stepId ? { ...step, isActive } : step),
    }))
  }, [updateCurrentSheet])

  // These functions no longer modify stored pathActivations since we generate them dynamically
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const toggleOptionActive = useCallback((_pathKey: string, _stepIdx: number, _isActive: boolean) => {
    // This function is called from the table UI but since we generate pathActivations dynamically,
    // we need to update the underlying step/option data instead
    console.warn('toggleOptionActive called but pathActivations are now generated dynamically')
  }, [])

  const toggleOptionByStepAndOption = useCallback((stepId: string, optionId: string, isActive: boolean) => {
    updateCurrentSheet(sheet => ({
      ...sheet,
      steps: sheet.steps.map(step =>
        step.id === stepId
          ? {
              ...step,
              options: step.options.map(opt =>
                opt.id === optionId ? { ...opt, isActive } : opt
              )
            }
          : step
      )
    }))
  }, [updateCurrentSheet])

  // Constraint management functions
  const addConstraint = useCallback((constraint: Omit<WorkflowConstraint, 'id' | 'createdAt'>) => {
    updateCurrentSheet(sheet => {
      const constraintId = generateId("constraint")
      const newConstraint: WorkflowConstraint = {
        ...constraint,
        id: constraintId,
        createdAt: Date.now(),
      }
      
      return {
        ...sheet,
        constraints: {
          ...sheet.constraints,
          [constraintId]: newConstraint,
        },
      }
    })
  }, [updateCurrentSheet])

  const updateConstraint = useCallback((constraintId: string, updates: Partial<WorkflowConstraint>) => {
    updateCurrentSheet(sheet => ({
      ...sheet,
      constraints: {
        ...sheet.constraints,
        [constraintId]: {
          ...sheet.constraints?.[constraintId],
          ...updates,
        } as WorkflowConstraint,
      },
    }))
  }, [updateCurrentSheet])

  const deleteConstraint = useCallback((constraintId: string) => {
    updateCurrentSheet(sheet => {
      const newConstraints = { ...sheet.constraints }
      delete newConstraints[constraintId]
      return {
        ...sheet,
        constraints: newConstraints,
      }
    })
  }, [updateCurrentSheet])

  // Force recalculation of path activations based on current constraints
  const syncConstraints = useCallback(() => {
    // Since pathActivations are now generated dynamically, this just triggers a re-render
    triggerUpdate()
  }, [triggerUpdate])

  // Adjust constraint indices when a step is inserted
  const adjustConstraintIndices = useCallback((insertIndex: number) => {
    updateCurrentSheet(sheet => {
      const adjustedConstraints = adjustConstraintIndicesForStepInsertion(sheet.constraints || {}, insertIndex)
      return {
        ...sheet,
        constraints: adjustedConstraints,
      }
    })
  }, [updateCurrentSheet])

  return {
    // Current sheet data
    steps,
    pathActivations,
    constraints,
    constraintNotification,
    currentTab,
    
    // Sheet management
    sheets: workflowData.sheets,
    activeSheetId: workflowData.activeSheetId,
    createSheet,
    renameSheet,
    copySheet,
    deleteSheet,
    switchToSheet,
    
    // Step management (for current sheet)
    addRootStep,
    updateStepName,
    updateOptionName,
    deleteStep,
    addOption,
    deleteOption,
    toggleStepActive,
    toggleOptionActive,
    toggleOptionByStepAndOption,
    setCurrentTab,
    addStepAtIndex,
    
    // Constraint management (for current sheet)
    addConstraint,
    updateConstraint,
    deleteConstraint,
    syncConstraints,
    adjustConstraintIndices,
    
    // Storage management
    saveError,
    clearSaveError: () => setSaveError(null),
    
    // Legacy functions
    toggleStepCollapse: () => {},
    toggleOptionCollapse: () => {},
  }
}
