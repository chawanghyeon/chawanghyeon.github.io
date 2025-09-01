import { Step } from '../lib/types'
import { STORAGE_KEY, ID_PREFIXES } from '../lib/constants'

// ID generation utility
export function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
}

// Data validation and normalization
export function normalizeSteps(rawSteps: unknown[]): Step[] {
  if (!Array.isArray(rawSteps)) return []
  
  return rawSteps.map((s: unknown) => {
    const step = s as Record<string, unknown>
    return {
      id: (step.id as string) ?? generateId(ID_PREFIXES.STEP),
      name: (step.name as string) ?? "",
      displayName: (step.displayName as string) ?? "",
      isActive: (step.isActive as boolean) ?? true,
      options: ((step.options as unknown[]) || []).map((o: unknown, i: number) => {
        const option = o as Record<string, unknown>
        return {
          id: (option.id as string) ?? generateId(ID_PREFIXES.OPTION),
          name: (option.name as string) ?? `옵션${i + 1}`,
          displayName: (option.displayName as string) ?? "",
          isActive: (option.isActive as boolean) ?? true,
        }
      }),
    }
  })
}

// LocalStorage operations
export class WorkflowStorage {
  static get(key: string = STORAGE_KEY) {
    if (typeof window === 'undefined') return null
    
    try {
      const data = window.localStorage.getItem(key)
      return data ? JSON.parse(data) : null
    } catch (err) {
      console.warn('Failed to parse stored data:', err)
      return null
    }
  }

  static set(data: Record<string, unknown>, key: string = STORAGE_KEY) {
    if (typeof window === 'undefined') return false
    
    try {
      window.localStorage.setItem(key, JSON.stringify(data))
      return true
    } catch (err) {
      console.warn('Failed to store data:', err)
      return false
    }
  }

  static remove(key: string = STORAGE_KEY) {
    if (typeof window === 'undefined') return
    
    try {
      window.localStorage.removeItem(key)
    } catch (err) {
      console.warn('Failed to remove stored data:', err)
    }
  }

  static exportData(key: string = STORAGE_KEY, filename: string = 'workflow-data.json') {
    const data = this.get(key)
    if (!data) {
      throw new Error('No data to export')
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  static async importData(
    file: File, 
    mode: 'replace' | 'append' = 'replace', 
    key: string = STORAGE_KEY
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = () => {
        try {
          const text = String(reader.result || "")
          const parsed = JSON.parse(text)
          
          if (!parsed) {
            throw new Error("Invalid JSON")
          }

          if (mode === 'replace') {
            this.set(parsed, key)
          } else {
            // append: merge top-level keys
            const existing = this.get(key) || {}
            const merged = { ...existing, ...parsed }
            
            // For steps, append with potential new IDs when conflicts occur
            if (Array.isArray(existing.steps) && Array.isArray(parsed.steps)) {
              merged.steps = [...existing.steps, ...parsed.steps]
            }
            
            this.set(merged, key)
          }
          
          resolve()
        } catch {
          reject(new Error("Invalid JSON file"))
        }
      }
      
      reader.onerror = () => reject(new Error("Failed to read file"))
      reader.readAsText(file)
    })
  }
}

// Math utilities for combinations
export function getAllCombinations<T>(arrays: T[][]): T[][] {
  if (arrays.length === 0) return [[]]
  const [first, ...rest] = arrays
  const restCombinations = getAllCombinations(rest)
  return first.flatMap((item) =>
    restCombinations.map((comb) => [item, ...comb])
  )
}

// Per-step combination statistics
export interface StepCombinationStats {
  total: number
  enabled: number
  disabled: number
  enabledPercentage: number
}

export interface StepOptionStats {
  total: number
  enabled: number
  disabled: number
  enabledPercentage: number
}

// Calculate statistics for each step combination
export function calculateStepCombinationStats(
  steps: Step[],
  pathActivations: Record<string, boolean[]>
): StepCombinationStats[] {
  if (steps.length === 0) return []

  // Generate all combinations
  const optionArrays = steps.map((step) => step.options.length > 0 ? step.options : [
    { id: '', name: '-', displayName: '-', isActive: true }
  ])
  const allCombinations = getAllCombinations(optionArrays)

  // Calculate statistics for each step
  return steps.map((_, stepIdx) => {
    let totalForStep = 0
    let enabledForStep = 0

    allCombinations.forEach((_, combIdx) => {
      const pathKey = String(combIdx)
      const pathActivation = pathActivations[pathKey]
      
      if (pathActivation && stepIdx < pathActivation.length) {
        totalForStep++
        if (pathActivation[stepIdx]) {
          enabledForStep++
        }
      }
    })

    const disabledForStep = totalForStep - enabledForStep
    const enabledPercentage = totalForStep > 0 ? Math.round((enabledForStep / totalForStep) * 100) : 0

    return {
      total: totalForStep,
      enabled: enabledForStep,
      disabled: disabledForStep,
      enabledPercentage
    }
  })
}

// Calculate statistics for each option within each step
export function calculateStepOptionStats(
  steps: Step[],
  pathActivations: Record<string, boolean[]>
): StepOptionStats[][] {
  if (steps.length === 0) return []

  // Generate all combinations
  const optionArrays = steps.map((step) => step.options.length > 0 ? step.options : [
    { id: '', name: '-', displayName: '-', isActive: true }
  ])
  const allCombinations = getAllCombinations(optionArrays)

  // Calculate statistics for each step and option
  return steps.map((step, stepIdx) => {
    const stepOptions = step.options.length > 0 ? step.options : [
      { id: '', name: '-', displayName: '-', isActive: true }
    ]

    return stepOptions.map((option) => {
      let totalForOption = 0
      let enabledForOption = 0

      allCombinations.forEach((combination, combIdx) => {
        // Check if this combination includes the current option at this step
        if (combination[stepIdx].id === option.id) {
          const pathKey = String(combIdx)
          const pathActivation = pathActivations[pathKey]
          
          if (pathActivation && stepIdx < pathActivation.length) {
            totalForOption++
            if (pathActivation[stepIdx]) {
              enabledForOption++
            }
          }
        }
      })

      const disabledForOption = totalForOption - enabledForOption
      const enabledPercentage = totalForOption > 0 ? Math.round((enabledForOption / totalForOption) * 100) : 0

      return {
        total: totalForOption,
        enabled: enabledForOption,
        disabled: disabledForOption,
        enabledPercentage
      }
    })
  })
}
