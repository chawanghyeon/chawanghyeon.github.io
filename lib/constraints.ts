import { Step, WorkflowConstraint, ConstraintMap, PathActivationMap, ExternalConditionsContext, ConstraintEvaluationResult, ConstraintConflict, ConstraintApplicationResult, ConstraintException } from './types'
import { getAllCombinations } from './utils'
import { evaluateConditions, defaultExternalContext } from './condition-evaluator'

/**
 * Enhanced constraint system with priority-based conflict resolution
 * Priority order: Route-based + Conditional > Range-based > Global
 * Action precedence: Enable > Require > Disable
 */

/**
 * Calculate default priority based on constraint type and scope
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
  
  // Type-based priority adjustment
  switch (constraint.type) {
    case 'conditional':
      basePriority += 25
      break
    case 'range-skip':
      basePriority += 15
      break
    case 'next-step':
    case 'previous-step':
      basePriority += 5
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
 * Evaluate if a constraint's exceptions apply to the current path
 */
function evaluateConstraintExceptions(
  constraint: WorkflowConstraint,
  currentPath: { [stepIndex: number]: string },
  externalContext: ExternalConditionsContext
): ConstraintException | null {
  if (!constraint.exceptions || constraint.exceptions.length === 0) {
    return null
  }
  
  // Sort exceptions by priority (highest first)
  const sortedExceptions = [...constraint.exceptions].sort((a, b) => (b.priority || 0) - (a.priority || 0))
  
  for (const exception of sortedExceptions) {
    // Check if exception path conditions are met
    const pathConditionsMet = exception.path.every(condition => 
      currentPath[condition.stepIndex] === condition.optionId
    )
    
    if (!pathConditionsMet) continue
    
    // Check external conditions if present
    if (exception.conditions && exception.conditions.length > 0) {
      const externalConditionsMet = evaluateConditions(exception.conditions, externalContext)
      if (!externalConditionsMet) continue
    }
    
    return exception // First matching exception is applied
  }
  
  return null
}

/**
 * Generate PathActivationMap dynamically from steps and constraints
 * This replaces the stored pathActivations with computed values
 */
export function generatePathActivations(
  steps: Step[],
  constraints: ConstraintMap = {},
  externalContext: ExternalConditionsContext = defaultExternalContext
): PathActivationMap {
  if (steps.length === 0) return {}
  
  // Generate all possible combinations
  const optionArrays = steps.map((step) => step.options)
  const allCombinations = getAllCombinations(optionArrays)
  
  // Start with all paths enabled
  const baseline: PathActivationMap = {}
  allCombinations.forEach((combination, combIdx) => {
    const pathKey = String(combIdx)
    baseline[pathKey] = Array(combination.length).fill(true)
  })
  
  // Apply constraints to determine disabled paths
  return applyConstraintsToPathActivations(steps, constraints, baseline, externalContext)
}

/**
 * Create a clean baseline with all paths enabled
 */
function createCleanBaseline(steps: Step[]): PathActivationMap {
  if (steps.length === 0) return {}
  
  const optionArrays = steps.map((step) => step.options)
  const allCombinations = getAllCombinations(optionArrays)
  
  const baseline: PathActivationMap = {}
  allCombinations.forEach((combination, combIdx) => {
    const pathKey = String(combIdx)
    baseline[pathKey] = Array(combination.length).fill(true)
  })
  
  return baseline
}
export function applyConstraintsWithPriority(
  steps: Step[],
  constraints: ConstraintMap,
  selectedPath: { [stepIndex: number]: string },
  externalContext: ExternalConditionsContext = defaultExternalContext
): ConstraintApplicationResult {
  const result: ConstraintApplicationResult = {
    disabledOptions: {},
    enabledOptions: {},
    requiredOptions: {},
    conflicts: [],
    appliedConstraints: [],
    exceptionsApplied: []
  }

  // Initialize option sets for each step
  steps.forEach((_, idx) => {
    result.disabledOptions[idx] = new Set<string>()
    result.enabledOptions[idx] = new Set<string>()
    result.requiredOptions[idx] = new Set<string>()
  })

  // Evaluate all applicable constraints
  const constraintEvaluations = evaluateAllConstraints(steps, constraints, selectedPath, externalContext)
  
  // Group constraints by target (step + option)
  const constraintsByTarget = new Map<string, ConstraintEvaluationResult[]>()
  
  constraintEvaluations.forEach(evaluation => {
    if (!evaluation.applies) return
    
    const constraint = evaluation.constraint
    
    // Determine target options for this constraint
    const targets: Array<{step: number, option: string}> = []
    
    if (constraint.type === 'next-step' && constraint.targetStepIndex !== undefined) {
      if (constraint.targetOptionId) {
        targets.push({ step: constraint.targetStepIndex, option: constraint.targetOptionId })
      }
      if (constraint.targetOptionIds) {
        constraint.targetOptionIds.forEach(optionId => {
          targets.push({ step: constraint.targetStepIndex!, option: optionId })
        })
      }
    } else if (constraint.type === 'previous-step' && constraint.targetStepIndex !== undefined) {
      if (constraint.targetOptionId) {
        targets.push({ step: constraint.targetStepIndex, option: constraint.targetOptionId })
      }
      if (constraint.targetOptionIds) {
        constraint.targetOptionIds.forEach(optionId => {
          targets.push({ step: constraint.targetStepIndex!, option: optionId })
        })
      }
    } else if (constraint.type === 'range-skip' && constraint.targetSteps) {
      constraint.targetSteps.forEach(stepIndex => {
        if (stepIndex >= 0 && stepIndex < steps.length) {
          if (constraint.targetOptionIds) {
            constraint.targetOptionIds.forEach(optionId => {
              targets.push({ step: stepIndex, option: optionId })
            })
          } else {
            // If no specific options specified, target all options in the step
            steps[stepIndex].options.forEach(option => {
              targets.push({ step: stepIndex, option: option.id })
            })
          }
        }
      })
    } else if (constraint.type === 'conditional' && constraint.targetStepIndex !== undefined) {
      if (constraint.targetOptionIds) {
        constraint.targetOptionIds.forEach(optionId => {
          targets.push({ step: constraint.targetStepIndex!, option: optionId })
        })
      }
    }
    
    // Add to constraints by target
    targets.forEach(target => {
      const targetKey = `${target.step}:${target.option}`
      if (!constraintsByTarget.has(targetKey)) {
        constraintsByTarget.set(targetKey, [])
      }
      constraintsByTarget.get(targetKey)!.push(evaluation)
    })
  })
  
  // Resolve conflicts and apply constraints
  constraintsByTarget.forEach((evaluations, targetKey) => {
    const [stepStr, optionId] = targetKey.split(':')
    const stepIndex = parseInt(stepStr)
    
    if (evaluations.length === 1) {
      // No conflict, apply the single constraint
      const evaluation = evaluations[0]
      applyConstraintAction(result, stepIndex, optionId, evaluation.effectiveAction || evaluation.action)
      result.appliedConstraints.push(evaluation)
    } else {
      // Multiple constraints affecting the same target - resolve conflict
      const resolution = resolveConstraintConflict(evaluations, stepIndex, optionId)
      result.conflicts.push(resolution)
      
      if (resolution.appliedConstraint) {
        const appliedEvaluation = evaluations.find(e => e.constraint.id === resolution.appliedConstraint!.id)
        if (appliedEvaluation) {
          applyConstraintAction(result, stepIndex, optionId, appliedEvaluation.effectiveAction || appliedEvaluation.action)
          result.appliedConstraints.push(appliedEvaluation)
        }
      }
    }
  })
  
  return result
}

/**
 * Apply a constraint action to the result
 */
function applyConstraintAction(
  result: ConstraintApplicationResult,
  stepIndex: number,
  optionId: string,
  action: 'disable' | 'enable' | 'require'
) {
  switch (action) {
    case 'disable':
      result.disabledOptions[stepIndex].add(optionId)
      result.enabledOptions[stepIndex].delete(optionId)
      result.requiredOptions[stepIndex].delete(optionId)
      break
    case 'enable':
      result.enabledOptions[stepIndex].add(optionId)
      result.disabledOptions[stepIndex].delete(optionId)
      break
    case 'require':
      result.requiredOptions[stepIndex].add(optionId)
      result.disabledOptions[stepIndex].delete(optionId)
      break
  }
}

/**
 * Resolve conflicts between multiple constraints affecting the same target
 */
function resolveConstraintConflict(
  evaluations: ConstraintEvaluationResult[],
  stepIndex: number,
  optionId: string
): ConstraintConflict {
  // Sort by priority (highest first)
  const sortedEvaluations = [...evaluations].sort((a, b) => b.priority - a.priority)
  
  const highestPriority = sortedEvaluations[0].priority
  const highestPriorityEvaluations = sortedEvaluations.filter(e => e.priority === highestPriority)
  
  if (highestPriorityEvaluations.length === 1) {
    // Clear winner by priority
    return {
      conflictingConstraints: evaluations.map(e => e.constraint),
      targetStep: stepIndex,
      targetOption: optionId,
      reason: `Priority resolution: Constraint ${highestPriorityEvaluations[0].constraint.id} has highest priority (${highestPriority})`,
      resolution: 'priority',
      appliedConstraint: highestPriorityEvaluations[0].constraint,
      conflictLevel: 'warning'
    }
  }
  
  // Same priority - use action precedence: enable > require > disable
  const actionPrecedence = { enable: 3, require: 2, disable: 1 }
  const bestAction = highestPriorityEvaluations.reduce((best, current) => {
    const currentAction = current.effectiveAction || current.action
    const bestAction = best.effectiveAction || best.action
    return actionPrecedence[currentAction] > actionPrecedence[bestAction] ? current : best
  })
  
  return {
    conflictingConstraints: evaluations.map(e => e.constraint),
    targetStep: stepIndex,
    targetOption: optionId,
    reason: `Action precedence resolution: "${bestAction.effectiveAction || bestAction.action}" takes precedence over other actions`,
    resolution: 'action-precedence',
    appliedConstraint: bestAction.constraint,
    conflictLevel: 'warning'
  }
}

/**
 * Evaluate all constraints for the current path and external context
 */
function evaluateAllConstraints(
  steps: Step[],
  constraints: ConstraintMap,
  selectedPath: { [stepIndex: number]: string },
  externalContext: ExternalConditionsContext
): ConstraintEvaluationResult[] {
  const results: ConstraintEvaluationResult[] = []
  
  Object.values(constraints).forEach(constraint => {
    if (!constraint.isActive) {
      results.push({
        constraint,
        applies: false,
        reason: 'Constraint is inactive',
        priority: constraint.priority || 0,
        action: constraint.action || 'disable'
      })
      return
    }
    
    // Check if source option is selected
    if (selectedPath[constraint.sourceStepIndex] !== constraint.sourceOptionId) {
      results.push({
        constraint,
        applies: false,
        reason: 'Source option not selected',
        priority: constraint.priority || 0,
        action: constraint.action || 'disable'
      })
      return
    }
    
    // Check scope-specific conditions
    const scopeResult = evaluateConstraintScope(constraint, selectedPath, externalContext)
    if (!scopeResult.applies) {
      results.push({
        constraint,
        applies: false,
        reason: scopeResult.reason,
        priority: constraint.priority || 0,
        action: constraint.action || 'disable'
      })
      return
    }
    
    // Check for applicable exceptions
    const applicableException = evaluateConstraintExceptions(constraint, selectedPath, externalContext)
    
    const evaluation: ConstraintEvaluationResult = {
      constraint,
      applies: true,
      reason: scopeResult.reason,
      priority: constraint.priority || calculateDefaultPriority(constraint),
      action: constraint.action || 'disable',
      effectiveAction: applicableException ? applicableException.action : (constraint.action || 'disable'),
      exceptionApplied: applicableException || undefined
    }
    
    results.push(evaluation)
  })
  
  return results
}

/**
 * Evaluate constraint scope conditions
 */
function evaluateConstraintScope(
  constraint: WorkflowConstraint,
  selectedPath: { [stepIndex: number]: string },
  externalContext: ExternalConditionsContext
): { applies: boolean; reason: string } {
  const scope = constraint.scope || 'global'
  
  switch (scope) {
    case 'global':
      return { applies: true, reason: 'Global constraint applies to all paths' }
      
    case 'route-based':
      if (!constraint.routeConditions || constraint.routeConditions.length === 0) {
        return { applies: true, reason: 'Route-based constraint with no route conditions' }
      }
      
      const routeConditionsMet = constraint.routeConditions.every(condition => 
        selectedPath[condition.stepIndex] === condition.optionId
      )
      
      return {
        applies: routeConditionsMet,
        reason: routeConditionsMet 
          ? 'Route conditions satisfied'
          : 'Route conditions not met'
      }
      
    case 'conditional-route':
      // Check route conditions
      if (constraint.routeConditions && constraint.routeConditions.length > 0) {
        const routeConditionsMet = constraint.routeConditions.every(condition => 
          selectedPath[condition.stepIndex] === condition.optionId
        )
        if (!routeConditionsMet) {
          return { applies: false, reason: 'Route conditions not met' }
        }
      }
      
      // Check external conditions
      if (constraint.externalConditions && constraint.externalConditions.length > 0) {
        const externalConditionsMet = evaluateConditions(constraint.externalConditions, externalContext)
        if (!externalConditionsMet) {
          return { applies: false, reason: 'External conditions not met' }
        }
      }
      
      return { applies: true, reason: 'Route and external conditions satisfied' }
      
    default:
      return { applies: false, reason: `Unknown constraint scope: ${scope}` }
  }
}

/**
 * Apply constraints to pathActivations based on defined constraint rules
 */
export function applyConstraintsToPathActivations(
  steps: Step[],
  constraints: ConstraintMap,
  currentPathActivations: PathActivationMap,
  externalContext: ExternalConditionsContext = defaultExternalContext
): PathActivationMap {
  if (steps.length === 0) return currentPathActivations

  // Generate all possible combinations
  const optionArrays = steps.map((step) => step.options)
  const allCombinations = getAllCombinations(optionArrays)
  
  // Create baseline from current activations
  const baselineActivations: PathActivationMap = {}
  allCombinations.forEach((combination, combIdx) => {
    const pathKey = String(combIdx)
    baselineActivations[pathKey] = currentPathActivations[pathKey] 
      ? [...currentPathActivations[pathKey]] 
      : Array(combination.length).fill(true)
  })

  // Apply constraints to determine what should be disabled
  const constraintDisabledPaths = createCleanBaseline(steps)

  // Apply each active constraint to the clean baseline
  Object.values(constraints).forEach(constraint => {
    if (!constraint.isActive) return

    allCombinations.forEach((combination, combIdx) => {
      const pathKey = String(combIdx)
      
      if (shouldDisablePath(combination, constraint, externalContext)) {
        if (constraint.type === 'range-skip') {
          const pathArray = constraintDisabledPaths[pathKey]
          if (Array.isArray(constraint.targetSteps) && constraint.targetSteps.length > 0) {
            constraint.targetSteps.forEach(ts => {
              if (ts >= 0 && ts < combination.length) {
                pathArray[ts] = false
              }
            })
          }
        } else {
          const pathArray = constraintDisabledPaths[pathKey]
          
          if (constraint.type === 'next-step') {
            if (constraint.targetStepIndex !== undefined) {
              pathArray[constraint.targetStepIndex] = false
            }
          } else if (constraint.type === 'previous-step') {
            pathArray[constraint.sourceStepIndex] = false
          }
        }
      }
    })
  })

  // Now merge: if a constraint requires disabling, disable it regardless of baseline
  // If no constraint requires disabling, keep the baseline state (which preserves user toggles)
  const finalPathActivations: PathActivationMap = {}
  allCombinations.forEach((combination, combIdx) => {
    const pathKey = String(combIdx)
    const constraintActivations = constraintDisabledPaths[pathKey] || Array(combination.length).fill(true)
    const baselineState = baselineActivations[pathKey] || Array(combination.length).fill(true)
    
    // If constraint says disable, then disable. If constraint allows, use baseline state.
    finalPathActivations[pathKey] = constraintActivations.map((constraintEnabled, idx) => 
      constraintEnabled ? baselineState[idx] : false
    )
  })

  return finalPathActivations
}

/**
 * Check if a specific path should be disabled based on a constraint
 */
function shouldDisablePath(
  combination: Array<{ id: string; name?: string; displayName?: string }>,
  constraint: WorkflowConstraint,
  externalContext: ExternalConditionsContext = defaultExternalContext
): boolean {
  const sourceStepIndex = constraint.sourceStepIndex
  const sourceOptionId = constraint.sourceOptionId

  // Check if the combination includes the source option at the source step
  if (combination[sourceStepIndex]?.id !== sourceOptionId) {
    return false // This constraint doesn't apply to this combination
  }

  // For route-based constraints, check if route conditions are met
  if (constraint.scope === 'route-based' && constraint.routeConditions) {
    const routeConditionsMet = constraint.routeConditions.every(condition => 
      combination[condition.stepIndex]?.id === condition.optionId
    )
    if (!routeConditionsMet) {
      return false // Route conditions not met, constraint doesn't apply
    }
  }

  // For conditional-route constraints, check both route and external conditions
  if (constraint.scope === 'conditional-route') {
    // Check route conditions if present
    if (constraint.routeConditions) {
      const routeConditionsMet = constraint.routeConditions.every(condition => 
        combination[condition.stepIndex]?.id === condition.optionId
      )
      if (!routeConditionsMet) {
        return false
      }
    }

    // Check external conditions
    if (constraint.externalConditions) {
      const externalConditionsMet = evaluateConditions(constraint.externalConditions, externalContext)
      if (!externalConditionsMet) {
        return false
      }
    }
  }

  // For backward compatibility, treat constraints without scope as global
  // (removed unused variable)

  switch (constraint.type) {
    case 'previous-step':
      // Check if the target step has the target option
      if (constraint.targetStepIndex !== undefined && constraint.targetOptionId) {
        return combination[constraint.targetStepIndex]?.id === constraint.targetOptionId
      }
      // Support multi-targets via targetOptionIds: if target step has any of the target options, consider constraint active
      if (constraint.targetStepIndex !== undefined && constraint.targetOptionIds && constraint.targetOptionIds.length > 0) {
        return constraint.targetOptionIds.some(optionId => combination[constraint.targetStepIndex!]?.id === optionId)
      }
      // Also support legacy/multi-targets via targetSteps: if any target step in targetSteps matches the option, consider disabled
      if (Array.isArray(constraint.targetSteps) && constraint.targetSteps.length > 0 && constraint.targetOptionId) {
        return constraint.targetSteps.some(ts => combination[ts]?.id === constraint.targetOptionId)
      }
      return false

    case 'next-step':
      // Check if the target step has the target option
      if (constraint.targetStepIndex !== undefined && constraint.targetOptionId) {
        return combination[constraint.targetStepIndex]?.id === constraint.targetOptionId
      }
      // Also support multi-targets via targetOptionIds: if target step has any of the target options, consider constraint active
      if (constraint.targetStepIndex !== undefined && constraint.targetOptionIds && constraint.targetOptionIds.length > 0) {
        return constraint.targetOptionIds.some(optionId => combination[constraint.targetStepIndex!]?.id === optionId)
      }
      return false

    case 'range-skip':
      // These constraints apply whenever the source option is selected
      return true

    case 'conditional':
      // Conditional constraints apply based on external conditions only
      return true

    default:
      return false
  }
}

/**
 * Validate constraints against the current step structure
 */
export function validateConstraints(
  constraints: ConstraintMap,
  steps: Step[]
): { valid: WorkflowConstraint[], invalid: WorkflowConstraint[] } {
  const valid: WorkflowConstraint[] = []
  const invalid: WorkflowConstraint[] = []

  Object.values(constraints).forEach(constraint => {
    let isValid = true

    // Check if source step and option exist
    const sourceStep = steps[constraint.sourceStepIndex]
    if (!sourceStep) {
      isValid = false
    } else {
      const sourceOption = sourceStep.options.find(opt => opt.id === constraint.sourceOptionId)
      if (!sourceOption) {
        isValid = false
      }
    }

    // Check type-specific validation
    if (isValid && constraint.type === 'previous-step') {
        if (constraint.targetStepIndex !== undefined) {
          const targetStep = steps[constraint.targetStepIndex]
          if (!targetStep) {
            isValid = false
          } else if (constraint.targetOptionId) {
            const targetOption = targetStep.options.find(opt => opt.id === constraint.targetOptionId)
            if (!targetOption) {
              isValid = false
            }
          } else if (constraint.targetOptionIds && constraint.targetOptionIds.length > 0) {
            // Validate all targetOptionIds exist in the target step
            const validOptions = constraint.targetOptionIds.every(optionId => 
              targetStep.options.some(opt => opt.id === optionId)
            )
            if (!validOptions) {
              isValid = false
            }
          }
        }

        // Validate targetSteps array if present
        if (isValid && Array.isArray(constraint.targetSteps)) {
          for (const ts of constraint.targetSteps) {
            if (ts < 0 || ts >= steps.length) {
              // allow out-of-range but still valid (will be capped later), so don't mark invalid
              continue
            }
          }
        }
    }

    if (isValid && constraint.type === 'next-step') {
      // Validate next-step constraints (similar to previous-step)
      if (constraint.targetStepIndex !== undefined) {
        const targetStep = steps[constraint.targetStepIndex]
        if (!targetStep) {
          isValid = false
        } else if (constraint.targetOptionId) {
          const targetOption = targetStep.options.find(opt => opt.id === constraint.targetOptionId)
          if (!targetOption) {
            isValid = false
          }
        } else if (constraint.targetOptionIds && constraint.targetOptionIds.length > 0) {
          // Validate all targetOptionIds exist in the target step
          const validOptions = constraint.targetOptionIds.every(optionId => 
            targetStep.options.some(opt => opt.id === optionId)
          )
          if (!validOptions) {
            isValid = false
          }
        }
      }
    }

    if (isValid && constraint.type === 'range-skip') {
      // Validation for range-skip constraints - require explicit targetSteps
      if (!Array.isArray(constraint.targetSteps) || constraint.targetSteps.length === 0) {
        isValid = false // range-skip must have explicit target steps
      } else {
        // Validate that all targetSteps are within valid range
        const invalidSteps = constraint.targetSteps.filter(ts => ts < 0 || ts >= steps.length)
        if (invalidSteps.length > 0) {
          isValid = false
        }
      }
    }

    if (isValid && constraint.type === 'conditional') {
      // Validation for conditional constraints - require external conditions
      if (!constraint.externalConditions || constraint.externalConditions.length === 0) {
        isValid = false // conditional constraints must have external conditions
      }
      // Also need target specification
      if (constraint.targetStepIndex === undefined || (!constraint.targetOptionIds && !constraint.targetOptionId)) {
        isValid = false
      }
    }

    // Validate conditional-route scope requirements
    if (isValid && constraint.scope === 'conditional-route') {
      if (!constraint.externalConditions || constraint.externalConditions.length === 0) {
        isValid = false // conditional-route must have external conditions
      }
    }

    if (isValid) {
      valid.push(constraint)
    } else {
      invalid.push(constraint)
    }
  })

  return { valid, invalid }
}

/**
 * Get constraint summary for display purposes
 */
export function getConstraintSummary(
  constraint: WorkflowConstraint,
  steps: Step[]
): string {
  const sourceStep = steps[constraint.sourceStepIndex]
  const sourceOption = sourceStep?.options.find(opt => opt.id === constraint.sourceOptionId)
  
  if (!sourceStep || !sourceOption) {
    return 'Invalid constraint (source not found)'
  }

  const sourceText = `${sourceStep.displayName || sourceStep.name}: ${sourceOption.displayName || sourceOption.name}`
  
  // Add scope prefix
  const scopePrefix = (() => {
    switch (constraint.scope || 'global') {
      case 'conditional-route': return '[Conditional Route] '
      case 'route-based': return '[Route-based] '
      default: return '[Global] '
    }
  })()
  
  // Add route conditions if present
  let routeConditionsText = ''
  if ((constraint.scope === 'route-based' || constraint.scope === 'conditional-route') && constraint.routeConditions && constraint.routeConditions.length > 0) {
    const conditionsText = constraint.routeConditions.map(condition => {
      const conditionStep = steps[condition.stepIndex]
      const conditionOption = conditionStep?.options.find(opt => opt.id === condition.optionId)
      return `${conditionStep?.displayName || conditionStep?.name}: ${conditionOption?.displayName || conditionOption?.name}`
    }).join(' AND ')
    routeConditionsText = ` (when ${conditionsText})`
  }

  // Add external conditions if present
  let externalConditionsText = ''
  if (constraint.externalConditions && constraint.externalConditions.length > 0) {
    const conditionsText = constraint.externalConditions.map(condition => {
      return `${condition.field} ${condition.operator} ${condition.value}`
    }).join(' AND ')
    externalConditionsText = ` (if ${conditionsText})`
  }

  switch (constraint.type) {
    case 'previous-step':
      if (constraint.targetStepIndex !== undefined && constraint.targetOptionId) {
        const targetStep = steps[constraint.targetStepIndex]
        const targetOption = targetStep?.options.find(opt => opt.id === constraint.targetOptionId)
        if (targetStep && targetOption) {
          const targetText = `${targetStep.displayName || targetStep.name}: ${targetOption.displayName || targetOption.name}`
          return `${scopePrefix}${sourceText} cannot follow ${targetText}${routeConditionsText}${externalConditionsText}`
        }
      }
      if (constraint.targetStepIndex !== undefined && constraint.targetOptionIds && constraint.targetOptionIds.length > 0) {
        const targetStep = steps[constraint.targetStepIndex]
        if (targetStep) {
          const targetOptions = constraint.targetOptionIds.map(optionId => {
            const option = targetStep.options.find(opt => opt.id === optionId)
            return option?.displayName || option?.name || optionId
          }).join(', ')
          return `${scopePrefix}${sourceText} cannot follow ${targetStep.displayName || targetStep.name}: ${targetOptions}${routeConditionsText}${externalConditionsText}`
        }
      }
      return `${scopePrefix}${sourceText} has previous step constraint${routeConditionsText}${externalConditionsText}`

    case 'next-step':
      if (constraint.targetStepIndex !== undefined && constraint.targetOptionId) {
        const targetStep = steps[constraint.targetStepIndex]
        const targetOption = targetStep?.options.find(opt => opt.id === constraint.targetOptionId)
        if (targetStep && targetOption) {
          const targetText = `${targetStep.displayName || targetStep.name}: ${targetOption.displayName || targetOption.name}`
          const actionText = constraint.action === 'enable' ? 'enables' : 'disables'
          return `${scopePrefix}${sourceText} ${actionText} ${targetText}${routeConditionsText}${externalConditionsText}`
        }
      }
      if (constraint.targetStepIndex !== undefined && constraint.targetOptionIds && constraint.targetOptionIds.length > 0) {
        const targetStep = steps[constraint.targetStepIndex]
        if (targetStep) {
          const targetOptions = constraint.targetOptionIds.map(optionId => {
            const option = targetStep.options.find(opt => opt.id === optionId)
            return option?.displayName || option?.name || optionId
          }).join(', ')
          const actionText = constraint.action === 'enable' ? 'enables' : 'disables'
          return `${scopePrefix}${sourceText} ${actionText} ${targetStep.displayName || targetStep.name}: ${targetOptions}${routeConditionsText}${externalConditionsText}`
        }
      }
      return `${scopePrefix}${sourceText} has next step constraint${routeConditionsText}${externalConditionsText}`

    case 'range-skip':
      // Only show description if specific targetSteps are provided
      if (Array.isArray(constraint.targetSteps) && constraint.targetSteps.length > 0) {
        const humanSteps = constraint.targetSteps.map(ts => ts + 1).join(', ')
        const actionText = constraint.action === 'enable' ? 'enables' : 'skips'
        return `${scopePrefix}${sourceText} ${actionText} steps ${humanSteps}${routeConditionsText}${externalConditionsText}`
      }
      return `${scopePrefix}${sourceText} has invalid range-skip constraint (no target steps specified)${routeConditionsText}${externalConditionsText}`

    case 'conditional':
      if (constraint.targetStepIndex !== undefined && constraint.targetOptionIds && constraint.targetOptionIds.length > 0) {
        const targetStep = steps[constraint.targetStepIndex]
        if (targetStep) {
          const targetOptions = constraint.targetOptionIds.map(optionId => {
            const option = targetStep.options.find(opt => opt.id === optionId)
            return option?.displayName || option?.name || optionId
          }).join(', ')
          const actionText = constraint.action === 'enable' ? 'enables' : 'disables'
          return `${scopePrefix}${sourceText} ${actionText} ${targetStep.displayName || targetStep.name}: ${targetOptions}${externalConditionsText}`
        }
      }
      return `${scopePrefix}${sourceText} has conditional constraint${externalConditionsText}`

    default:
      return `${scopePrefix}${sourceText} has unknown constraint${routeConditionsText}${externalConditionsText}`
  }
}

/**
 * Compute disabled options for the WorkflowButtonTab based on current selection and constraints
 */
export function computeDisabledOptionsForWorkflow(
  steps: Step[],
  constraints: ConstraintMap,
  selectedPath: { [stepIndex: number]: string },
  externalContext: ExternalConditionsContext = defaultExternalContext
): { [stepIndex: number]: Set<string> } {
  const disabledMap: { [stepIndex: number]: Set<string> } = {}
  steps.forEach((_, idx) => { disabledMap[idx] = new Set<string>() })

  // Group constraints by priority for proper application order
  const sortedConstraints = Object.values(constraints)
    .filter(constraint => constraint.isActive)
    .sort((a, b) => (b.priority || 0) - (a.priority || 0)) // Higher priority first

  sortedConstraints.forEach(constraint => {
    // For backward compatibility, treat constraints without scope as global
    const constraintScope = constraint.scope || 'global'

    // For route-based constraints, check if route conditions are met with current selection
    if (constraintScope === 'route-based' && constraint.routeConditions) {
      const routeConditionsMet = constraint.routeConditions.every(condition => 
        selectedPath[condition.stepIndex] === condition.optionId
      )
      if (!routeConditionsMet) {
        return // Route conditions not met, constraint doesn't apply
      }
    }

    // For conditional-route constraints, check both route and external conditions
    if (constraintScope === 'conditional-route') {
      if (constraint.routeConditions) {
        const routeConditionsMet = constraint.routeConditions.every(condition => 
          selectedPath[condition.stepIndex] === condition.optionId
        )
        if (!routeConditionsMet) {
          return
        }
      }

      if (constraint.externalConditions && !evaluateConditions(constraint.externalConditions, externalContext)) {
        return
      }
    }

    // For conditional constraints, check external conditions only
    if (constraint.type === 'conditional' && constraint.externalConditions) {
      if (!evaluateConditions(constraint.externalConditions, externalContext)) {
        return
      }
    }

    // If source option isn't selected in the current path, skip applying (only for non-global constraints)
    if (selectedPath[constraint.sourceStepIndex] !== constraint.sourceOptionId) {
      return
    }

    // Apply constraint effects based on action type
    const action = constraint.action || 'disable' // Default to disable for backward compatibility

    if (constraint.type === 'previous-step') {
      // previous-step disables current source option when a target option is selected earlier
      if (constraint.targetStepIndex !== undefined && constraint.targetOptionId) {
        // If the selected option at targetStepIndex equals the targetOptionId, then source option should be disabled
        if (selectedPath[constraint.targetStepIndex] === constraint.targetOptionId) {
          if (action === 'disable') {
            disabledMap[constraint.sourceStepIndex].add(constraint.sourceOptionId)
          }
        }
      }
      // Support multi-targets via targetOptionIds: if any target option is selected, disable source
      if (constraint.targetStepIndex !== undefined && constraint.targetOptionIds && constraint.targetOptionIds.length > 0) {
        if (constraint.targetOptionIds.some(optionId => selectedPath[constraint.targetStepIndex!] === optionId)) {
          if (action === 'disable') {
            disabledMap[constraint.sourceStepIndex].add(constraint.sourceOptionId)
          }
        }
      }
      // support legacy multi-targets
      if (Array.isArray(constraint.targetSteps) && constraint.targetOptionId) {
        for (const ts of constraint.targetSteps) {
          if (selectedPath[ts] === constraint.targetOptionId) {
            if (action === 'disable') {
              disabledMap[constraint.sourceStepIndex].add(constraint.sourceOptionId)
            }
          }
        }
      }
    } else if (constraint.type === 'next-step') {
      // next-step disables specific option(s) in target step
      if (constraint.targetStepIndex !== undefined && constraint.targetOptionId) {
        if (action === 'disable') {
          disabledMap[constraint.targetStepIndex].add(constraint.targetOptionId)
        } else if (action === 'enable') {
          disabledMap[constraint.targetStepIndex].delete(constraint.targetOptionId)
        }
      }
      // Support multi-targets via targetOptionIds: disable all selected target options
      if (constraint.targetStepIndex !== undefined && constraint.targetOptionIds && constraint.targetOptionIds.length > 0) {
        constraint.targetOptionIds.forEach(optionId => {
          if (action === 'disable') {
            disabledMap[constraint.targetStepIndex!].add(optionId)
          } else if (action === 'enable') {
            disabledMap[constraint.targetStepIndex!].delete(optionId)
          }
        })
      }
    } else if (constraint.type === 'range-skip') {
      // range-skip should only affect explicitly specified targetSteps
      if (Array.isArray(constraint.targetSteps) && constraint.targetSteps.length > 0) {
        constraint.targetSteps.forEach(ts => {
          if (ts >= 0 && ts < steps.length) {
            if (Array.isArray(constraint.targetOptionIds) && constraint.targetOptionIds.length > 0) {
              steps[ts].options.forEach(opt => {
                if (constraint.targetOptionIds!.includes(opt.id)) {
                  if (action === 'disable') {
                    disabledMap[ts].add(opt.id)
                  } else if (action === 'enable') {
                    disabledMap[ts].delete(opt.id)
                  }
                }
              })
            } else {
              steps[ts].options.forEach(opt => {
                if (action === 'disable') {
                  disabledMap[ts].add(opt.id)
                } else if (action === 'enable') {
                  disabledMap[ts].delete(opt.id)
                }
              })
            }
          }
        })
      }
      // If no explicit targetSteps, don't disable anything (range-skip requires explicit targets)
    } else if (constraint.type === 'conditional') {
      // Conditional constraints can affect any specified target
      if (constraint.targetStepIndex !== undefined && constraint.targetOptionIds) {
        constraint.targetOptionIds.forEach(optionId => {
          if (action === 'disable') {
            disabledMap[constraint.targetStepIndex!].add(optionId)
          } else if (action === 'enable') {
            disabledMap[constraint.targetStepIndex!].delete(optionId)
          }
        })
      }
    }
  })

  return disabledMap
}

/**
 * Auto-clean invalid constraints when steps are modified
 */
export function cleanInvalidConstraints(
  constraints: ConstraintMap,
  steps: Step[]
): ConstraintMap {
  const { valid } = validateConstraints(constraints, steps)
  const cleanedConstraints: ConstraintMap = {}
  
  valid.forEach(constraint => {
    cleanedConstraints[constraint.id] = constraint
  })
  
  return cleanedConstraints
}

/**
 * Evaluate all constraints and return evaluation results with priorities
 */
export function evaluateConstraints(
  constraints: ConstraintMap,
  selectedPath: { [stepIndex: number]: string },
  externalContext: ExternalConditionsContext = defaultExternalContext
): ConstraintEvaluationResult[] {
  const results: ConstraintEvaluationResult[] = []

  Object.values(constraints).forEach(constraint => {
    if (!constraint.isActive) {
      results.push({
        constraint,
        applies: false,
        reason: 'Constraint is inactive',
        priority: constraint.priority || 0,
        action: constraint.action || 'disable'
      })
      return
    }

    let applies = false
    let reason = ''

    // Check if source option is selected
    if (selectedPath[constraint.sourceStepIndex] !== constraint.sourceOptionId) {
      reason = 'Source option not selected'
    } else {
      // Check scope-specific conditions
      const scope = constraint.scope || 'global'
      
      if (scope === 'route-based' && constraint.routeConditions) {
        const routeConditionsMet = constraint.routeConditions.every(condition => 
          selectedPath[condition.stepIndex] === condition.optionId
        )
        if (!routeConditionsMet) {
          reason = 'Route conditions not met'
        } else {
          applies = true
          reason = 'Route conditions satisfied'
        }
      } else if (scope === 'conditional-route') {
        let routeOk = true
        let externalOk = true

        if (constraint.routeConditions) {
          routeOk = constraint.routeConditions.every(condition => 
            selectedPath[condition.stepIndex] === condition.optionId
          )
        }

        if (constraint.externalConditions) {
          externalOk = evaluateConditions(constraint.externalConditions, externalContext)
        }

        if (!routeOk) {
          reason = 'Route conditions not met'
        } else if (!externalOk) {
          reason = 'External conditions not met'
        } else {
          applies = true
          reason = 'All conditions satisfied'
        }
      } else if (constraint.type === 'conditional' && constraint.externalConditions) {
        const externalOk = evaluateConditions(constraint.externalConditions, externalContext)
        if (!externalOk) {
          reason = 'External conditions not met'
        } else {
          applies = true
          reason = 'External conditions satisfied'
        }
      } else {
        // Global or simple constraint
        applies = true
        reason = 'Global constraint applies'
      }
    }

    results.push({
      constraint,
      applies,
      reason,
      priority: constraint.priority || 0,
      action: constraint.action || 'disable'
    })
  })

  // Sort by priority (highest first)
  return results.sort((a, b) => b.priority - a.priority)
}

/**
 * Detect conflicts between constraints
 */
export function detectConstraintConflicts(
  constraints: ConstraintMap,
  steps: Step[]
): ConstraintConflict[] {
  const conflicts: ConstraintConflict[] = []
  const constraintsByTarget: { [key: string]: WorkflowConstraint[] } = {}

  // Group constraints by their target (step + option)
  Object.values(constraints).forEach(constraint => {
    if (!constraint.isActive) return

    // Collect all targets for this constraint
    const targets: Array<{ step: number; option: string }> = []

    if (constraint.type === 'next-step' || constraint.type === 'conditional') {
      if (constraint.targetStepIndex !== undefined) {
        if (constraint.targetOptionId) {
          targets.push({ step: constraint.targetStepIndex, option: constraint.targetOptionId })
        }
        if (constraint.targetOptionIds) {
          constraint.targetOptionIds.forEach(optionId => {
            targets.push({ step: constraint.targetStepIndex!, option: optionId })
          })
        }
      }
    } else if (constraint.type === 'range-skip' && constraint.targetSteps) {
      constraint.targetSteps.forEach(stepIndex => {
        if (constraint.targetOptionIds) {
          constraint.targetOptionIds.forEach(optionId => {
            targets.push({ step: stepIndex, option: optionId })
          })
        } else {
          // If no specific options, affects all options in the step
          steps[stepIndex]?.options.forEach(option => {
            targets.push({ step: stepIndex, option: option.id })
          })
        }
      })
    }

    // Add to groups
    targets.forEach(target => {
      const key = `${target.step}:${target.option}`
      if (!constraintsByTarget[key]) {
        constraintsByTarget[key] = []
      }
      constraintsByTarget[key].push(constraint)
    })
  })

  // Check for conflicts within each target group
  Object.entries(constraintsByTarget).forEach(([key, targetConstraints]) => {
    if (targetConstraints.length <= 1) return

    const [stepStr, option] = key.split(':')
    const step = parseInt(stepStr)

    // Check for conflicting actions
    const enableConstraints = targetConstraints.filter(c => c.action === 'enable')
    const disableConstraints = targetConstraints.filter(c => c.action === 'disable' || !c.action) // default is disable

    if (enableConstraints.length > 0 && disableConstraints.length > 0) {
      conflicts.push({
        conflictingConstraints: [...enableConstraints, ...disableConstraints],
        targetStep: step,
        targetOption: option,
        reason: `Conflicting actions: ${enableConstraints.length} enable vs ${disableConstraints.length} disable`,
        resolution: 'action-precedence',
        conflictLevel: 'warning'
      })
    }

    // Check for same-priority conflicts
    const samePriorityGroups: { [priority: number]: WorkflowConstraint[] } = {}
    targetConstraints.forEach(constraint => {
      const priority = constraint.priority || 0
      if (!samePriorityGroups[priority]) {
        samePriorityGroups[priority] = []
      }
      samePriorityGroups[priority].push(constraint)
    })

    Object.entries(samePriorityGroups).forEach(([priority, constraints]) => {
      if (constraints.length > 1) {
        const actionSet = new Set(constraints.map(c => c.action || 'disable'))
        const actions = Array.from(actionSet)
        if (actions.length > 1) {
          conflicts.push({
            conflictingConstraints: constraints,
            targetStep: step,
            targetOption: option,
            reason: `Same priority (${priority}) with different actions: ${actions.join(', ')}`,
            resolution: 'action-precedence',
            conflictLevel: 'warning'
          })
        }
      }
    })
  })

  return conflicts
}

/**
 * Assign default priorities to constraints based on their type and scope
 */
export function assignDefaultPriorities(constraint: Omit<WorkflowConstraint, 'id' | 'createdAt'>): number {
  // Priority order: conditional-route (100) > route-based (50) > range-based (25) > global (10)
  const scopePriority = (() => {
    switch (constraint.scope) {
      case 'conditional-route': return 100
      case 'route-based': return 50
      default: return 10 // global
    }
  })()

  const typePriority = (() => {
    switch (constraint.type) {
      case 'conditional': return 5
      case 'range-skip': return 3
      case 'next-step': return 2
      case 'previous-step': return 1
      default: return 0
    }
  })()

  return scopePriority + typePriority
}

/**
 * Adjust constraint indices when a step is inserted at a specific position
 * This ensures constraints remain logically correct after step insertion
 */
export function adjustConstraintIndicesForStepInsertion(
  constraints: ConstraintMap,
  insertIndex: number
): ConstraintMap {
  const adjustedConstraints: ConstraintMap = {}
  
  Object.entries(constraints).forEach(([id, constraint]) => {
    const adjustedConstraint: WorkflowConstraint = { ...constraint }
    
    // Adjust source step index if it's at or after the insert position
    if (constraint.sourceStepIndex >= insertIndex) {
      adjustedConstraint.sourceStepIndex = constraint.sourceStepIndex + 1
    }
    
    // Adjust target step index if it exists and is at or after the insert position
    if (constraint.targetStepIndex !== undefined && constraint.targetStepIndex >= insertIndex) {
      adjustedConstraint.targetStepIndex = constraint.targetStepIndex + 1
    }
    
    // Adjust target steps array if it exists
    if (constraint.targetSteps) {
      adjustedConstraint.targetSteps = constraint.targetSteps.map(stepIndex => 
        stepIndex >= insertIndex ? stepIndex + 1 : stepIndex
      )
    }
    
    // Adjust route conditions if they exist
    if (constraint.routeConditions) {
      adjustedConstraint.routeConditions = constraint.routeConditions.map(condition => ({
        ...condition,
        stepIndex: condition.stepIndex >= insertIndex ? condition.stepIndex + 1 : condition.stepIndex
      }))
    }
    
    // Adjust constraint exceptions if they exist
    if (constraint.exceptions) {
      adjustedConstraint.exceptions = constraint.exceptions.map(exception => ({
        ...exception,
        path: exception.path.map(condition => ({
          ...condition,
          stepIndex: condition.stepIndex >= insertIndex ? condition.stepIndex + 1 : condition.stepIndex
        })),
        target: exception.target.map(target => ({
          ...target,
          step: target.step >= insertIndex ? target.step + 1 : target.step
        }))
      }))
    }
    
    adjustedConstraints[id] = adjustedConstraint
  })
  
  return adjustedConstraints
}

/**
 * Clean up constraints when a step is deleted
 * Removes any constraints that reference the deleted step as source or target
 */
export function cleanConstraintsForDeletedStep(
  constraints: ConstraintMap,
  deletedStepIndex: number
): ConstraintMap {
  const cleanedConstraints: ConstraintMap = {}
  
  Object.entries(constraints).forEach(([id, constraint]) => {
    let shouldKeep = true
    
    // Remove constraints that have the deleted step as source
    if (constraint.sourceStepIndex === deletedStepIndex) {
      shouldKeep = false
    }
    
    // Remove constraints that have the deleted step as target
    if (constraint.targetStepIndex === deletedStepIndex) {
      shouldKeep = false
    }
    
    // Remove constraints that have the deleted step in targetSteps
    if (constraint.targetSteps && constraint.targetSteps.includes(deletedStepIndex)) {
      // If this was the only target step, remove the constraint
      if (constraint.targetSteps.length === 1) {
        shouldKeep = false
      } else {
        // Otherwise, remove just this step from targetSteps
        const updatedConstraint = {
          ...constraint,
          targetSteps: constraint.targetSteps.filter(stepIndex => stepIndex !== deletedStepIndex)
        }
        cleanedConstraints[id] = updatedConstraint
        return
      }
    }
    
    // Remove constraints that have the deleted step in route conditions
    if (constraint.routeConditions) {
      const updatedRouteConditions = constraint.routeConditions.filter(
        condition => condition.stepIndex !== deletedStepIndex
      )
      
      // If route conditions are empty after filtering, handle based on scope
      if (updatedRouteConditions.length === 0 && constraint.scope === 'route-based') {
        // Convert to global scope if no route conditions remain
        const updatedConstraint = {
          ...constraint,
          scope: 'global' as const,
          routeConditions: undefined
        }
        cleanedConstraints[id] = updatedConstraint
        return
      } else if (updatedRouteConditions.length !== constraint.routeConditions.length) {
        // Update with filtered route conditions
        const updatedConstraint = {
          ...constraint,
          routeConditions: updatedRouteConditions
        }
        cleanedConstraints[id] = updatedConstraint
        return
      }
    }
    
    // Remove constraints that have the deleted step in exceptions
    if (constraint.exceptions) {
      const updatedExceptions = constraint.exceptions
        .map(exception => ({
          ...exception,
          path: exception.path.filter(condition => condition.stepIndex !== deletedStepIndex),
          target: exception.target.filter(target => target.step !== deletedStepIndex)
        }))
        .filter(exception => exception.path.length > 0 && exception.target.length > 0)
      
      if (updatedExceptions.length !== constraint.exceptions.length) {
        const updatedConstraint = {
          ...constraint,
          exceptions: updatedExceptions.length > 0 ? updatedExceptions : undefined
        }
        cleanedConstraints[id] = updatedConstraint
        return
      }
    }
    
    if (shouldKeep) {
      cleanedConstraints[id] = constraint
    }
  })
  
  return cleanedConstraints
}

/**
 * Clean up constraints when an option is deleted
 * Removes any constraints that reference the deleted option as source or target
 */
export function cleanConstraintsForDeletedOption(
  constraints: ConstraintMap,
  stepIndex: number,
  deletedOptionId: string
): ConstraintMap {
  const cleanedConstraints: ConstraintMap = {}
  
  Object.entries(constraints).forEach(([id, constraint]) => {
    let shouldKeep = true
    
    // Remove constraints that have the deleted option as source
    if (constraint.sourceStepIndex === stepIndex && constraint.sourceOptionId === deletedOptionId) {
      shouldKeep = false
    }
    
    // Handle constraints that have the deleted option as target
    if (constraint.targetStepIndex === stepIndex) {
      // Check single target option
      if (constraint.targetOptionId === deletedOptionId) {
        shouldKeep = false
      }
      
      // Check multiple target options
      if (constraint.targetOptionIds && constraint.targetOptionIds.includes(deletedOptionId)) {
        const updatedTargetOptionIds = constraint.targetOptionIds.filter(id => id !== deletedOptionId)
        
        if (updatedTargetOptionIds.length === 0) {
          // No target options left, remove constraint
          shouldKeep = false
        } else {
          // Update with remaining target options
          const updatedConstraint = {
            ...constraint,
            targetOptionIds: updatedTargetOptionIds
          }
          cleanedConstraints[id] = updatedConstraint
          return
        }
      }
    }
    
    // Handle constraints with targetSteps that include this step and option
    if (constraint.targetSteps && constraint.targetSteps.includes(stepIndex)) {
      if (constraint.targetOptionIds && constraint.targetOptionIds.includes(deletedOptionId)) {
        const updatedTargetOptionIds = constraint.targetOptionIds.filter(id => id !== deletedOptionId)
        
        if (updatedTargetOptionIds.length === 0) {
          // No target options left, remove constraint
          shouldKeep = false
        } else {
          // Update with remaining target options
          const updatedConstraint = {
            ...constraint,
            targetOptionIds: updatedTargetOptionIds
          }
          cleanedConstraints[id] = updatedConstraint
          return
        }
      }
    }
    
    // Handle route conditions that reference the deleted option
    if (constraint.routeConditions) {
      const updatedRouteConditions = constraint.routeConditions.filter(
        condition => !(condition.stepIndex === stepIndex && condition.optionId === deletedOptionId)
      )
      
      if (updatedRouteConditions.length === 0 && constraint.scope === 'route-based') {
        // Convert to global scope if no route conditions remain
        const updatedConstraint = {
          ...constraint,
          scope: 'global' as const,
          routeConditions: undefined
        }
        cleanedConstraints[id] = updatedConstraint
        return
      } else if (updatedRouteConditions.length !== constraint.routeConditions.length) {
        // Update with filtered route conditions
        const updatedConstraint = {
          ...constraint,
          routeConditions: updatedRouteConditions
        }
        cleanedConstraints[id] = updatedConstraint
        return
      }
    }
    
    // Handle exceptions that reference the deleted option
    if (constraint.exceptions) {
      const updatedExceptions = constraint.exceptions
        .map(exception => ({
          ...exception,
          path: exception.path.filter(
            condition => !(condition.stepIndex === stepIndex && condition.optionId === deletedOptionId)
          ),
          target: exception.target.filter(
            target => !(target.step === stepIndex && target.option === deletedOptionId)
          )
        }))
        .filter(exception => exception.path.length > 0 && exception.target.length > 0)
      
      if (updatedExceptions.length !== constraint.exceptions.length) {
        const updatedConstraint = {
          ...constraint,
          exceptions: updatedExceptions.length > 0 ? updatedExceptions : undefined
        }
        cleanedConstraints[id] = updatedConstraint
        return
      }
    }
    
    if (shouldKeep) {
      cleanedConstraints[id] = constraint
    }
  })
  
  return cleanedConstraints
}

/**
 * Adjust constraint indices when a step is deleted
 * Decrements indices for steps that come after the deleted step
 */
export function adjustConstraintIndicesForStepDeletion(
  constraints: ConstraintMap,
  deletedStepIndex: number
): ConstraintMap {
  const adjustedConstraints: ConstraintMap = {}
  
  Object.entries(constraints).forEach(([id, constraint]) => {
    const adjustedConstraint: WorkflowConstraint = { ...constraint }
    
    // Adjust source step index if it's after the deleted step
    if (constraint.sourceStepIndex > deletedStepIndex) {
      adjustedConstraint.sourceStepIndex = constraint.sourceStepIndex - 1
    }
    
    // Adjust target step index if it exists and is after the deleted step
    if (constraint.targetStepIndex !== undefined && constraint.targetStepIndex > deletedStepIndex) {
      adjustedConstraint.targetStepIndex = constraint.targetStepIndex - 1
    }
    
    // Adjust target steps array if it exists
    if (constraint.targetSteps) {
      adjustedConstraint.targetSteps = constraint.targetSteps.map(stepIndex => 
        stepIndex > deletedStepIndex ? stepIndex - 1 : stepIndex
      )
    }
    
    // Adjust route conditions if they exist
    if (constraint.routeConditions) {
      adjustedConstraint.routeConditions = constraint.routeConditions.map(condition => ({
        ...condition,
        stepIndex: condition.stepIndex > deletedStepIndex ? condition.stepIndex - 1 : condition.stepIndex
      }))
    }
    
    // Adjust constraint exceptions if they exist
    if (constraint.exceptions) {
      adjustedConstraint.exceptions = constraint.exceptions.map(exception => ({
        ...exception,
        path: exception.path.map(condition => ({
          ...condition,
          stepIndex: condition.stepIndex > deletedStepIndex ? condition.stepIndex - 1 : condition.stepIndex
        })),
        target: exception.target.map(target => ({
          ...target,
          step: target.step > deletedStepIndex ? target.step - 1 : target.step
        }))
      }))
    }
    
    adjustedConstraints[id] = adjustedConstraint
  })
  
  return adjustedConstraints
}
