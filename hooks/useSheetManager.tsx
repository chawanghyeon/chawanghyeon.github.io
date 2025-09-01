import React, { useState, useCallback } from 'react'
import { WorkflowSheet, WorkflowData, Step, PathActivationMap, TabType } from '../lib/types'
import { StorageManager } from '../lib/storage'

let idCounter = 0

function generateId(prefix: string) {
  return `${prefix}_${Date.now()}_${++idCounter}`
}

const createDefaultSheet = (id: string, name: string): WorkflowSheet => ({
  id,
  name,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  steps: [
    {
      id: "step_1",
      name: "1단계",
      displayName: "",
      options: [
        {
          id: "option_1",
          name: "옵션1",
          displayName: "",
          isActive: true,
        },
      ],
      isActive: true,
    },
  ],
  optionActivations: {
    0: { 0: [true] },
  },
  pathActivations: {},
})

export const useSheetManager = () => {
  const STORAGE_KEY = "chawanghyeon_workflow_sheets_v1"
  const saveTimer = React.useRef<number | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [workflowData, setWorkflowData] = useState<WorkflowData>(() => ({
    sheets: [createDefaultSheet("sheet_1", "Sheet 1")],
    activeSheetId: "sheet_1",
    nextSheetId: 2,
  }))

  const [currentTab, setCurrentTab] = useState<TabType>("design")

  const activeSheet = workflowData.sheets.find(sheet => sheet.id === workflowData.activeSheetId)

  // Normalize steps from any data format for backwards compatibility
  function normalizeSteps(rawSteps: unknown[]): Step[] {
    if (!Array.isArray(rawSteps)) return []
    return rawSteps.map((s: unknown, stepIndex) => {
      const step = s as Record<string, unknown>
      return {
        id: (step.id as string) ?? `step_${stepIndex + 1}`,
        name: (step.name as string) ?? "",
        displayName: (step.displayName as string) ?? "",
        isActive: (step.isActive as boolean) ?? true,
        options: ((step.options as unknown[]) || []).map((o: unknown, optionIndex: number) => {
          const option = o as Record<string, unknown>
          return {
            id: (option.id as string) ?? `option_${stepIndex}_${optionIndex}`,
            name: (option.name as string) ?? `옵션${optionIndex + 1}`,
            displayName: (option.displayName as string) ?? "",
            isActive: (option.isActive as boolean) ?? true,
          }
        }),
      }
    })
  }

  // Load data from localStorage on mount
  React.useEffect(() => {
    if (typeof window === "undefined") return
    
    const loadData = async () => {
      try {
        const parsed = await StorageManager.getItem(STORAGE_KEY) as Record<string, unknown> | null
        if (!parsed) return
        
        // Handle legacy single-sheet data migration
        if (parsed.steps && !parsed.sheets) {
          const legacySheet = createDefaultSheet("sheet_1", "Sheet 1")
          legacySheet.steps = normalizeSteps(parsed.steps as unknown[])
          legacySheet.optionActivations = (parsed.optionActivations as WorkflowSheet['optionActivations']) || { 0: { 0: [true] } }
          legacySheet.pathActivations = (parsed.pathActivations as PathActivationMap) || {}
          
          setWorkflowData({
            sheets: [legacySheet],
            activeSheetId: "sheet_1",
            nextSheetId: 2,
          })
        } else if (parsed.sheets) {
          // Handle multi-sheet data
          const sheets = parsed.sheets as unknown[]
          setWorkflowData({
            sheets: sheets.map((sheet: unknown) => {
              const s = sheet as WorkflowSheet
              return {
                ...s,
                steps: normalizeSteps(s.steps),
              }
            }),
            activeSheetId: (parsed.activeSheetId as string) || (sheets[0] as WorkflowSheet)?.id || "sheet_1",
            nextSheetId: (parsed.nextSheetId as number) || sheets.length + 1,
          })
        }
      } catch (err) {
        console.warn('Failed to load saved workflow sheets', err)
      }
    }
    
    loadData()
  }, [])

  // Auto-save with debouncing and error handling
  React.useEffect(() => {
    if (typeof window === "undefined") return
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    
    saveTimer.current = window.setTimeout(async () => {
      try {
        // Clear any previous save errors
        setSaveError(null)
        
        // Check if data can fit before saving
        if (!StorageManager.canFitData(workflowData)) {
          const storageInfo = StorageManager.getStorageInfo()
          setSaveError(`Storage almost full (${storageInfo.usedPercentage.toFixed(1)}%). Consider exporting and clearing old data.`)
          
          // Try to save anyway with cleanup
          const success = await StorageManager.setItem(STORAGE_KEY, workflowData, {
            backup: true,
            maxRetries: 3
          })
          
          if (!success) {
            setSaveError('Failed to save workflow data. Storage quota exceeded.')
          }
        } else {
          // Normal save
          const success = await StorageManager.setItem(STORAGE_KEY, workflowData, {
            backup: true
          })
          
          if (!success) {
            setSaveError('Failed to save workflow data.')
          }
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown save error'
        setSaveError(errorMessage)
        console.warn('Failed to save workflow sheets:', err)
        
        // Show user notification about the error
        if (typeof window !== 'undefined' && err instanceof Error && err.message.includes('quota')) {
          // Don't show alert immediately as it might be annoying, just log
          console.error('Storage quota exceeded. Consider exporting data and clearing old sheets.')
        }
      }
    }, 1000) // 400ms -> 1000ms로 증가 (더 긴 디바운싱)
    
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current)
    }
  }, [workflowData])

  // Helper function to calculate pathActivations
  const calculatePathActivations = React.useCallback((steps: Step[], existingActivations: PathActivationMap): PathActivationMap => {
    function getAllCombinations<T>(arrays: T[][]): T[][] {
      if (arrays.length === 0) return [[]]
      const [first, ...rest] = arrays
      const restCombinations = getAllCombinations(rest)
      return first.flatMap((item) =>
        restCombinations.map((comb) => [item, ...comb])
      )
    }

    const optionArrays = steps.map((step) => step.options)
    const allCombinations = getAllCombinations(optionArrays)
    
    const newMap: PathActivationMap = {}
    allCombinations.forEach((row, idx) => {
      const key = String(idx)
      newMap[key] = 
        existingActivations[key] && existingActivations[key].length === row.length
          ? existingActivations[key]
          : Array(row.length).fill(true)
    })
    return newMap
  }, [])

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
      }
    })
  }, [workflowData.sheets.length])

  const switchToSheet = useCallback((sheetId: string) => {
    setWorkflowData(prev => ({
      ...prev,
      activeSheetId: sheetId,
    }))
  }, [])

  // Current sheet data accessors
  const steps = activeSheet?.steps || []
  const optionActivations = activeSheet?.optionActivations || {}
  const pathActivations = activeSheet?.pathActivations || {}

  // Update functions for current sheet
  const updateCurrentSheet = useCallback((updater: (sheet: WorkflowSheet) => WorkflowSheet) => {
    setWorkflowData(prev => ({
      ...prev,
      sheets: prev.sheets.map(sheet => {
        if (sheet.id === prev.activeSheetId) {
          const updatedSheet = { ...updater(sheet), updatedAt: Date.now() }
          // Recalculate pathActivations if steps changed
          const newPathActivations = calculatePathActivations(updatedSheet.steps, updatedSheet.pathActivations)
          return { ...updatedSheet, pathActivations: newPathActivations }
        }
        return sheet
      }),
    }))
  }, [calculatePathActivations])

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
      
      const newSteps = [...sheet.steps, newStep]
      const newIdx = sheet.steps.length
      const parentOptions = sheet.steps[newIdx - 1]?.options.length || 1
      
      const newOptionActivations = { ...sheet.optionActivations }
      newOptionActivations[newIdx] = {}
      for (let i = 0; i < parentOptions; i++) {
        newOptionActivations[newIdx][i] = [true]
      }
      
      return {
        ...sheet,
        steps: newSteps,
        optionActivations: newOptionActivations,
      }
    })
  }, [updateCurrentSheet])

  const addStepAtIndex = useCallback((insertIdx: number) => {
    updateCurrentSheet(sheet => {
      const stepId = generateId("step")
      const newStep: Step = {
        id: stepId,
        name: `${insertIdx + 2}단계`,
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
        ...sheet.steps.slice(0, insertIdx + 1),
        newStep,
        ...sheet.steps.slice(insertIdx + 1),
      ].map((step, i) => ({ ...step, name: `${i + 1}단계` }))
      
      return {
        ...sheet,
        steps: newSteps,
      }
    })
  }, [updateCurrentSheet])

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
    updateCurrentSheet(sheet => ({
      ...sheet,
      steps: sheet.steps.filter(step => step.id !== stepId),
    }))
  }, [updateCurrentSheet])

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
      
      const newSteps = sheet.steps.map((step, i) =>
        i === idx ? { ...step, options: [...step.options, newOption] } : step
      )
      
      const newOptionActivations = { ...sheet.optionActivations }
      Object.keys(newOptionActivations[idx] || {}).forEach((parentIdxStr) => {
        const parentIdx = Number(parentIdxStr)
        newOptionActivations[idx][parentIdx] = [...(newOptionActivations[idx][parentIdx] || []), true]
      })
      
      if (newOptionActivations[idx + 1]) {
        newOptionActivations[idx + 1][Object.keys(newOptionActivations[idx + 1]).length] = Array(
          newSteps[idx + 1].options.length
        ).fill(true)
      }
      
      return {
        ...sheet,
        steps: newSteps,
        optionActivations: newOptionActivations,
      }
    })
  }, [updateCurrentSheet])

  const deleteOption = useCallback((stepId: string, optionId: string) => {
    updateCurrentSheet(sheet => {
      const idx = sheet.steps.findIndex(s => s.id === stepId)
      if (idx === -1) return sheet
      if (sheet.steps[idx].options.length <= 1) return sheet
      
      const delIdx = sheet.steps[idx].options.findIndex(opt => opt.id === optionId)
      if (delIdx === -1) return sheet
      
      const newSteps = sheet.steps.map((step, i) =>
        i === idx ? { ...step, options: step.options.filter((_, j) => j !== delIdx) } : step
      )
      
      const newOptionActivations = { ...sheet.optionActivations }
      Object.keys(newOptionActivations[idx] || {}).forEach((parentIdxStr) => {
        const parentIdx = Number(parentIdxStr)
        newOptionActivations[idx][parentIdx] = (newOptionActivations[idx][parentIdx] || []).filter((_: unknown, j: number) => j !== delIdx)
      })
      
      return {
        ...sheet,
        steps: newSteps,
        optionActivations: newOptionActivations,
      }
    })
  }, [updateCurrentSheet])

  const toggleStepActive = useCallback((stepId: string, isActive: boolean) => {
    updateCurrentSheet(sheet => ({
      ...sheet,
      steps: sheet.steps.map(step => step.id === stepId ? { ...step, isActive } : step),
    }))
  }, [updateCurrentSheet])

  const toggleOptionActive = useCallback((pathKey: string, stepIdx: number, isActive: boolean) => {
    updateCurrentSheet(sheet => {
      const newPathActivations = { ...sheet.pathActivations }
      if (!newPathActivations[pathKey]) return sheet
      newPathActivations[pathKey][stepIdx] = isActive
      return {
        ...sheet,
        pathActivations: newPathActivations,
      }
    })
  }, [updateCurrentSheet])

  const toggleOptionNextStepActive = useCallback((stepId: string, optionId: string, isActive: boolean, parentOptionIdx: number) => {
    updateCurrentSheet(sheet => {
      const idx = sheet.steps.findIndex(s => s.id === stepId)
      if (idx === -1) return sheet
      
      const optIdx = sheet.steps[idx].options.findIndex(opt => opt.id === optionId)
      if (optIdx === -1) return sheet
      
      const newOptionActivations = { ...sheet.optionActivations }
      if (!newOptionActivations[idx]) newOptionActivations[idx] = {}
      if (!newOptionActivations[idx][parentOptionIdx]) {
        newOptionActivations[idx][parentOptionIdx] = Array(sheet.steps[idx].options.length).fill(true)
      }
      newOptionActivations[idx][parentOptionIdx][optIdx] = isActive
      
      return {
        ...sheet,
        optionActivations: newOptionActivations,
      }
    })
  }, [updateCurrentSheet])

  return {
    // Current sheet data
    steps,
    optionActivations,
    pathActivations,
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
    toggleOptionNextStepActive,
    setCurrentTab,
    addStepAtIndex,
    
    // Storage management
    saveError,
    clearSaveError: () => setSaveError(null),
    
    // Legacy functions
    toggleStepCollapse: () => {},
    toggleOptionCollapse: () => {},
  }
}
