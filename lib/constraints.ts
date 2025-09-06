import { Step, WorkflowConstraint, ConstraintMap, ExternalConditionsContext, ConstraintEvaluationResult, ConstraintConflict, ConstraintApplicationResult } from './types'
import { evaluateConditions, defaultExternalContext } from './condition-evaluator'

/**
 * Simplified constraint system without type dependencies
 * All constraints now work based on their properties rather than type
 */

/**
 * Calculate default priority based on constraint scope and action
 * Higher values = higher priority
 */
export function calculateDefaultPriority(constraint: Partial<WorkflowConstraint>): number {
  let basePriority = 0
  
  // Scope-based priority
  switch (constraint.scope) {
    case 'conditional-route':
      basePriority = 100
      break
    case 'route-based':
      basePriority = 50
      break
    case 'global':
    default:
      basePriority = 10
      break
  }
  
  // Action-based priority adjustment
  switch (constraint.action) {
    case 'enable':
      basePriority += 10
      break
    case 'require':
      basePriority += 5
      break
    case 'disable':
    default:
      basePriority += 0
      break
  }
  
  return basePriority
}

/**
 * Assign default priorities to constraints
 */
export function assignDefaultPriorities(constraint: Partial<WorkflowConstraint>): number {
  return constraint.priority || calculateDefaultPriority(constraint)
}

/**
 * Enhanced constraint application with proper priority logic and conflict detection
 */
export function applyConstraintsWithPriority(
  steps: Step[],
  constraints: ConstraintMap,
  selectedPath: { [stepIndex: number]: string },
  externalContext: ExternalConditionsContext = defaultExternalContext
): ConstraintApplicationResult {
  const disabledOptions: { [stepIndex: number]: Set<string> } = {}
  const enabledOptions: { [stepIndex: number]: Set<string> } = {}
  const requiredOptions: { [stepIndex: number]: Set<string> } = {}
  const conflicts: ConstraintConflict[] = []
  const appliedConstraints: ConstraintEvaluationResult[] = []

  // Initialize sets for each step
  steps.forEach((_, stepIndex) => {
    disabledOptions[stepIndex] = new Set()
    enabledOptions[stepIndex] = new Set()
    requiredOptions[stepIndex] = new Set()
  })

  // Get active constraints and separate by scope
  const activeConstraints = Object.values(constraints).filter(constraint => constraint.isActive)
  const globalConstraints = activeConstraints.filter(c => c.scope === 'global')
  const pathBasedConstraints = activeConstraints.filter(c => c.scope === 'route-based' || c.scope === 'conditional-route')

  // Sort by priority (LOWER numbers = higher priority, applied FIRST)
  const sortGlobalConstraints = globalConstraints.sort((a, b) => (a.priority || 999) - (b.priority || 999))
  const sortPathConstraints = pathBasedConstraints.sort((a, b) => (a.priority || 999) - (b.priority || 999))

  // Apply global constraints first, then path-based (which can override globals)
  const sortedConstraints = [...sortGlobalConstraints, ...sortPathConstraints]

  // Track applied actions per target to detect conflicts
  const appliedActions: { [stepIndex: number]: { [optionId: string]: Array<{
    constraint: WorkflowConstraint,
    action: string,
    priority: number,
    scope: string
  }> } } = {}

  // Initialize tracking structure
  steps.forEach((_, stepIndex) => {
    appliedActions[stepIndex] = {}
  })

  // Helper function to record action application
  const recordAction = (stepIndex: number, optionId: string, constraint: WorkflowConstraint, action: string) => {
    if (!appliedActions[stepIndex][optionId]) {
      appliedActions[stepIndex][optionId] = []
    }
    appliedActions[stepIndex][optionId].push({
      constraint,
      action,
      priority: constraint.priority || 999,
      scope: constraint.scope
    })
  }

  // Helper function to apply action with conflict detection
  const applyActionWithConflictDetection = (stepIndex: number, optionId: string, constraint: WorkflowConstraint, action: string) => {
    recordAction(stepIndex, optionId, constraint, action)
    
    // Check for conflicts with same priority level
    const actionsOnTarget = appliedActions[stepIndex][optionId] || []
    const samePriorityActions = actionsOnTarget.filter(a => a.priority === (constraint.priority || 999))
    
    if (samePriorityActions.length > 1) {
      const conflictingActions = samePriorityActions.filter(a => a.action !== action)
      if (conflictingActions.length > 0) {
        conflicts.push({
          conflictingConstraints: [constraint, ...conflictingActions.map(a => a.constraint)],
          targetStep: stepIndex,
          targetOption: optionId,
          reason: `Multiple actions on same target with same priority ${constraint.priority || 999}`,
          resolution: 'priority',
          conflictLevel: 'error'
        })
      }
    }

    // Path-based policies override global ones regardless of priority
    const globalActions = actionsOnTarget.filter(a => a.scope === 'global')
    const pathActions = actionsOnTarget.filter(a => a.scope !== 'global')
    
    if (pathActions.length > 0 && globalActions.length > 0) {
      // Path-based overrides global - this is expected behavior, not a conflict
      const finalAction = constraint.scope !== 'global' ? action : pathActions[pathActions.length - 1].action
      switch (finalAction) {
        case 'disable':
          disabledOptions[stepIndex].add(optionId)
          enabledOptions[stepIndex].delete(optionId)
          requiredOptions[stepIndex].delete(optionId)
          break
        case 'enable':
          enabledOptions[stepIndex].add(optionId)
          disabledOptions[stepIndex].delete(optionId)
          break
        case 'require':
          requiredOptions[stepIndex].add(optionId)
          disabledOptions[stepIndex].delete(optionId)
          break
      }
    } else {
      // Normal action application based on priority order
      switch (action) {
        case 'disable':
          disabledOptions[stepIndex].add(optionId)
          enabledOptions[stepIndex].delete(optionId)
          requiredOptions[stepIndex].delete(optionId)
          break
        case 'enable':
          enabledOptions[stepIndex].add(optionId)
          disabledOptions[stepIndex].delete(optionId)
          break
        case 'require':
          requiredOptions[stepIndex].add(optionId)
          disabledOptions[stepIndex].delete(optionId)
          break
      }
    }
  }

  // Apply each active constraint in priority order
  sortedConstraints.forEach(constraint => {
    // Skip constraints where source or target steps/options don't exist
    const sourceStep = steps[constraint.sourceStepIndex]
    const sourceOption = sourceStep?.options.find(opt => opt.id === constraint.sourceOptionId)
    
    if (!sourceStep || !sourceOption) {
      return // Skip if source step/option is missing
    }
    
    // Check target step/options exist for constraints that have targets
    if (constraint.targetStepIndex !== undefined) {
      const targetStep = steps[constraint.targetStepIndex]
      if (!targetStep) {
        return // Skip if target step is missing
      }
      
      if (constraint.targetOptionIds && constraint.targetOptionIds.length > 0) {
        const hasAllTargetOptions = constraint.targetOptionIds.every(optId => 
          targetStep.options.find(opt => opt.id === optId)
        )
        if (!hasAllTargetOptions) {
          return // Skip if any target option is missing
        }
      }
    }

    // Check if source option is selected (constraint is triggered)
    const sourceSelected = selectedPath[constraint.sourceStepIndex] === constraint.sourceOptionId
    if (!sourceSelected) return

    // Check route conditions if present
    if (constraint.routeConditions && constraint.routeConditions.length > 0) {
      const routeConditionsMet = constraint.routeConditions.every(condition =>
        selectedPath[condition.stepIndex] === condition.optionId
      )
      if (!routeConditionsMet) return
    }

    // Check external conditions if present
    if (constraint.externalConditions && constraint.externalConditions.length > 0) {
      const externalConditionsMet = evaluateConditions(constraint.externalConditions, externalContext)
      if (!externalConditionsMet) return
    }

    // Apply constraint to target step(s) and option(s)
    const action = constraint.action || 'disable'

    // Handle single target step
    if (constraint.targetStepIndex !== undefined) {
      const targetOptions = constraint.targetOptionIds || [constraint.targetOptionId].filter(Boolean) as string[]
      
      if (targetOptions.length > 0) {
        targetOptions.forEach(optionId => {
          applyActionWithConflictDetection(constraint.targetStepIndex!, optionId, constraint, action)
        })
      } else {
        // Apply to all options in the step
        steps[constraint.targetStepIndex].options.forEach(option => {
          applyActionWithConflictDetection(constraint.targetStepIndex!, option.id, constraint, action)
        })
      }
    }

    // Handle multiple target steps
    if (constraint.targetSteps && constraint.targetSteps.length > 0) {
      constraint.targetSteps.forEach(stepIndex => {
        if (stepIndex >= 0 && stepIndex < steps.length) {
          const targetOptions = constraint.targetOptionIds || []
          
          if (targetOptions.length > 0) {
            targetOptions.forEach(optionId => {
              applyActionWithConflictDetection(stepIndex, optionId, constraint, action)
            })
          } else {
            // Apply to all options in the step
            steps[stepIndex].options.forEach(option => {
              applyActionWithConflictDetection(stepIndex, option.id, constraint, action)
            })
          }
        }
      })
    }

    appliedConstraints.push({
      constraint,
      applies: true,
      reason: 'Source option selected and conditions met',
      priority: constraint.priority || 999,
      action
    })
  })

  // Detect circular references
  const circularConflicts = detectCircularReferences(activeConstraints)
  conflicts.push(...circularConflicts)

  return {
    disabledOptions,
    enabledOptions,
    requiredOptions,
    conflicts,
    appliedConstraints,
    exceptionsApplied: []
  }
}

/**
 * Normalize priorities to ensure they are consecutive starting from 1
 */
export function normalizePriorities(constraints: ConstraintMap): { [constraintId: string]: number } {
  const constraintEntries = Object.entries(constraints)
  const sorted = constraintEntries
    .map(([id, constraint]) => ({ id, priority: constraint.priority || 999 }))
    .sort((a, b) => a.priority - b.priority)
  
  const normalizedPriorities: { [constraintId: string]: number } = {}
  sorted.forEach((item, index) => {
    normalizedPriorities[item.id] = index + 1
  })
  
  return normalizedPriorities
}

/**
 * Recalculate priorities after constraint deletion or changes
 */
export function recalculatePriorities(
  constraints: ConstraintMap, 
  deletedConstraintIds: string[] = []
): { [constraintId: string]: number } {
  // Filter out deleted constraints
  const remainingConstraints: ConstraintMap = {}
  Object.entries(constraints).forEach(([id, constraint]) => {
    if (!deletedConstraintIds.includes(id)) {
      remainingConstraints[id] = constraint
    }
  })
  
  return normalizePriorities(remainingConstraints)
}

/**
 * Check if there are conflicts between constraints with same priority
 */
export function detectSamePriorityConflicts(constraints: ConstraintMap): ConstraintConflict[] {
  const conflicts: ConstraintConflict[] = []
  const constraintsByPriority: { [priority: number]: WorkflowConstraint[] } = {}
  
  // Group constraints by priority
  Object.values(constraints).forEach(constraint => {
    if (!constraint.isActive) return
    
    const priority = constraint.priority || 999
    if (!constraintsByPriority[priority]) {
      constraintsByPriority[priority] = []
    }
    constraintsByPriority[priority].push(constraint)
  })
  
  // Check for conflicts within each priority group
  Object.entries(constraintsByPriority).forEach(([priority, constraintGroup]) => {
    if (constraintGroup.length <= 1) return
    
    // Track targets for each constraint in this priority group
    const targetMap: { [targetKey: string]: WorkflowConstraint[] } = {}
    
    constraintGroup.forEach(constraint => {
      // Single target
      if (constraint.targetStepIndex !== undefined) {
        const targetOptions = constraint.targetOptionIds || [constraint.targetOptionId].filter(Boolean)
        targetOptions.forEach(optionId => {
          const key = `${constraint.targetStepIndex}-${optionId}`
          if (!targetMap[key]) targetMap[key] = []
          targetMap[key].push(constraint)
        })
      }
      
      // Multiple targets
      if (constraint.targetSteps) {
        constraint.targetSteps.forEach(stepIndex => {
          const targetOptions = constraint.targetOptionIds || []
          if (targetOptions.length > 0) {
            targetOptions.forEach(optionId => {
              const key = `${stepIndex}-${optionId}`
              if (!targetMap[key]) targetMap[key] = []
              targetMap[key].push(constraint)
            })
          } else {
            // Apply to all options in step - this is a potential conflict point
            const key = `${stepIndex}-all`
            if (!targetMap[key]) targetMap[key] = []
            targetMap[key].push(constraint)
          }
        })
      }
    })
    
    // Find conflicts
    Object.entries(targetMap).forEach(([targetKey, affectingConstraints]) => {
      if (affectingConstraints.length > 1) {
        const [stepIndex, optionId] = targetKey.split('-')
        conflicts.push({
          conflictingConstraints: affectingConstraints,
          targetStep: parseInt(stepIndex),
          targetOption: optionId,
          reason: `Multiple constraints with same priority ${priority} targeting same option`,
          resolution: 'priority',
          conflictLevel: 'error'
        })
      }
    })
  })
  
  return conflicts
}

/**
 * Detect circular references between constraints
 */
export function detectCircularReferences(constraints: WorkflowConstraint[]): ConstraintConflict[] {
  const conflicts: ConstraintConflict[] = []
  // Build a graph of constraint dependencies
  const dependencyGraph: { [constraintId: string]: string[] } = {}
  const constraintMap: { [constraintId: string]: WorkflowConstraint } = {}

  // Index constraints
  constraints.forEach(constraint => {
    constraintMap[constraint.id] = constraint
    dependencyGraph[constraint.id] = []
  })

  // Build dependency edges
  constraints.forEach(constraint => {
    constraints.forEach(otherConstraint => {
      if (constraint.id === otherConstraint.id) return
      
      // Check if this constraint affects the source of another constraint
      const affectsOtherSource = (
        (otherConstraint.targetStepIndex === constraint.sourceStepIndex &&
         otherConstraint.targetOptionIds?.includes(constraint.sourceOptionId)) ||
        (otherConstraint.targetSteps?.includes(constraint.sourceStepIndex))
      )
      
      if (affectsOtherSource) {
        dependencyGraph[constraint.id].push(otherConstraint.id)
      }
    })
  })

  // Detect cycles using DFS
  const visited = new Set<string>()
  const recursionStack = new Set<string>()
  
  const hasCycle = (constraintId: string, path: string[]): string[] | null => {
    if (recursionStack.has(constraintId)) {
      // Found a cycle
      const cycleStart = path.indexOf(constraintId)
      return path.slice(cycleStart)
    }
    
    if (visited.has(constraintId)) {
      return null
    }
    
    visited.add(constraintId)
    recursionStack.add(constraintId)
    path.push(constraintId)
    
    for (const dependency of dependencyGraph[constraintId]) {
      const cycle = hasCycle(dependency, [...path])
      if (cycle) {
        return cycle
      }
    }
    
    recursionStack.delete(constraintId)
    return null
  }
  
  // Check for cycles starting from each constraint
  Object.keys(dependencyGraph).forEach(constraintId => {
    if (!visited.has(constraintId)) {
      const cycle = hasCycle(constraintId, [])
      if (cycle) {
        const cycleConstraints = cycle.map(id => constraintMap[id])
        conflicts.push({
          conflictingConstraints: cycleConstraints,
          targetStep: -1, // Indicates circular reference
          targetOption: '',
          reason: `Circular reference detected: ${cycle.join(' → ')} → ${cycle[0]}`,
          resolution: 'priority',
          conflictLevel: 'error'
        })
      }
    }
  })
  
  return conflicts
}

// Update constraint indices when steps are inserted
export const updateConstraintIndices = (constraints: ConstraintMap, insertIndex: number): ConstraintMap => {
  const updated: ConstraintMap = {}
  
  Object.entries(constraints).forEach(([id, constraint]) => {
    const updatedConstraint = { ...constraint }
    
    // Update source step index
    if (constraint.sourceStepIndex >= insertIndex) {
      updatedConstraint.sourceStepIndex = constraint.sourceStepIndex + 1
    }
    
    // Update target step index
    if (constraint.targetStepIndex !== undefined && constraint.targetStepIndex >= insertIndex) {
      updatedConstraint.targetStepIndex = constraint.targetStepIndex + 1
    }
    
    // Update target steps array
    if (constraint.targetSteps) {
      updatedConstraint.targetSteps = constraint.targetSteps.map(stepIndex =>
        stepIndex >= insertIndex ? stepIndex + 1 : stepIndex
      )
    }
    
    // Update route conditions
    if (constraint.routeConditions) {
      updatedConstraint.routeConditions = constraint.routeConditions.map(condition => ({
        ...condition,
        stepIndex: condition.stepIndex >= insertIndex ? condition.stepIndex + 1 : condition.stepIndex
      }))
    }
    
    updated[id] = updatedConstraint
  })
  
  return updated
}

// Placeholder functions for compatibility
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const generatePathActivations = (_steps: Step[], _constraints: ConstraintMap): Record<string, boolean[]> => {
  // Simple implementation - can be enhanced later if needed
  return {}
}

export const cleanInvalidConstraints = (constraints: ConstraintMap, steps: Step[]): ConstraintMap => {
  const cleaned: ConstraintMap = {}
  
  Object.entries(constraints).forEach(([id, constraint]) => {
    // Basic validation - check if referenced steps still exist
    let isValid = true
    
    if (constraint.sourceStepIndex >= steps.length) {
      isValid = false
    }
    
    if (constraint.targetStepIndex !== undefined && constraint.targetStepIndex >= steps.length) {
      isValid = false
    }
    
    if (constraint.targetSteps) {
      const invalidSteps = constraint.targetSteps.some(stepIndex => stepIndex >= steps.length)
      if (invalidSteps) {
        isValid = false
      }
    }
    
    if (isValid) {
      cleaned[id] = constraint
    }
  })
  
  return cleaned
}

export const adjustConstraintIndicesForStepInsertion = (constraints: ConstraintMap, insertIndex: number): ConstraintMap => {
  return updateConstraintIndices(constraints, insertIndex)
}

export const adjustConstraintIndicesForStepDeletion = (constraints: ConstraintMap, deletedIndex: number): ConstraintMap => {
  const updated: ConstraintMap = {}
  
  Object.entries(constraints).forEach(([id, constraint]) => {
    const updatedConstraint = { ...constraint }
    let shouldKeep = true
    
    // Skip constraints that reference the deleted step
    if (constraint.sourceStepIndex === deletedIndex) {
      shouldKeep = false
    }
    
    if (constraint.targetStepIndex === deletedIndex) {
      shouldKeep = false
    }
    
    if (constraint.targetSteps?.includes(deletedIndex)) {
      shouldKeep = false
    }
    
    if (shouldKeep) {
      // Adjust indices for steps after the deleted one
      if (constraint.sourceStepIndex > deletedIndex) {
        updatedConstraint.sourceStepIndex = constraint.sourceStepIndex - 1
      }
      
      if (constraint.targetStepIndex !== undefined && constraint.targetStepIndex > deletedIndex) {
        updatedConstraint.targetStepIndex = constraint.targetStepIndex - 1
      }
      
      if (constraint.targetSteps) {
        updatedConstraint.targetSteps = constraint.targetSteps
          .filter(stepIndex => stepIndex !== deletedIndex)
          .map(stepIndex => stepIndex > deletedIndex ? stepIndex - 1 : stepIndex)
      }
      
      if (constraint.routeConditions) {
        updatedConstraint.routeConditions = constraint.routeConditions
          .filter(condition => condition.stepIndex !== deletedIndex)
          .map(condition => ({
            ...condition,
            stepIndex: condition.stepIndex > deletedIndex ? condition.stepIndex - 1 : condition.stepIndex
          }))
      }
      
      updated[id] = updatedConstraint
    }
  })
  
  return updated
}
