import { ExternalCondition, ExternalConditionsContext, ConditionOperator } from './types'

/**
 * Default external conditions context for testing and development
 */
export const defaultExternalContext: ExternalConditionsContext = {
  inventory: 25,
  userLevel: 5,
  date: new Date().toISOString().split('T')[0], // Today's date
  time: new Date().toTimeString().slice(0, 5), // Current time HH:MM
  custom: {
    hasSubscription: true,
    region: 'US',
    credits: 100
  }
}

/**
 * Evaluate a single external condition against the context
 */
export function evaluateCondition(
  condition: ExternalCondition,
  context: ExternalConditionsContext = defaultExternalContext
): boolean {
  let contextValue: string | number | boolean

  // Get the value from context
  switch (condition.field) {
    case 'inventory':
      contextValue = context.inventory
      break
    case 'userLevel':
      contextValue = context.userLevel
      break
    case 'date':
      contextValue = context.date
      break
    case 'time':
      contextValue = context.time
      break
    case 'custom':
      // For custom fields, use the condition value as the key
      const customKey = String(condition.value)
      contextValue = context.custom[customKey] ?? false
      break
    default:
      return false
  }

  // Apply the operator
  return applyOperator(contextValue, condition.operator, condition.value)
}

/**
 * Apply the specified operator to compare values
 */
function applyOperator(
  contextValue: string | number | boolean,
  operator: ConditionOperator,
  conditionValue: string | number
): boolean {
  // Convert values for comparison
  const numContext = typeof contextValue === 'number' ? contextValue : Number(contextValue)
  const numCondition = typeof conditionValue === 'number' ? conditionValue : Number(conditionValue)
  const strContext = String(contextValue).toLowerCase()
  const strCondition = String(conditionValue).toLowerCase()

  switch (operator) {
    case '>=':
      return numContext >= numCondition
    case '<=':
      return numContext <= numCondition
    case '>':
      return numContext > numCondition
    case '<':
      return numContext < numCondition
    case '==':
      return contextValue === conditionValue
    case '!=':
      return contextValue !== conditionValue
    case 'contains':
      return strContext.includes(strCondition)
    case 'not-contains':
      return !strContext.includes(strCondition)
    default:
      return false
  }
}

/**
 * Evaluate multiple conditions with AND logic
 */
export function evaluateConditions(
  conditions: ExternalCondition[],
  context: ExternalConditionsContext = defaultExternalContext
): boolean {
  if (!conditions || conditions.length === 0) return true
  
  return conditions.every(condition => evaluateCondition(condition, context))
}

/**
 * Get human-readable description of a condition
 */
export function getConditionDescription(condition: ExternalCondition): string {
  if (condition.label) return condition.label

  const fieldLabels: Record<string, string> = {
    inventory: 'Inventory',
    userLevel: 'User Level',
    date: 'Date',
    time: 'Time',
    custom: 'Custom Field'
  }

  const operatorLabels: Record<ConditionOperator, string> = {
    '>=': 'at least',
    '<=': 'at most',
    '>': 'greater than',
    '<': 'less than',
    '==': 'equals',
    '!=': 'not equals',
    'contains': 'contains',
    'not-contains': 'does not contain'
  }

  const fieldLabel = fieldLabels[condition.field] || condition.field
  const operatorLabel = operatorLabels[condition.operator] || condition.operator

  return `${fieldLabel} ${operatorLabel} ${condition.value}`
}

/**
 * Get available condition fields for UI
 */
export function getAvailableConditionFields(): Array<{ value: string; label: string }> {
  return [
    { value: 'inventory', label: 'Inventory Count' },
    { value: 'userLevel', label: 'User Level' },
    { value: 'date', label: 'Current Date' },
    { value: 'time', label: 'Current Time' },
    { value: 'custom', label: 'Custom Field' }
  ]
}

/**
 * Get available operators for a field type
 */
export function getAvailableOperators(field: string): Array<{ value: ConditionOperator; label: string }> {
  const numericOperators = [
    { value: '>=' as ConditionOperator, label: 'Greater than or equal to' },
    { value: '<=' as ConditionOperator, label: 'Less than or equal to' },
    { value: '>' as ConditionOperator, label: 'Greater than' },
    { value: '<' as ConditionOperator, label: 'Less than' },
    { value: '==' as ConditionOperator, label: 'Equals' },
    { value: '!=' as ConditionOperator, label: 'Not equals' }
  ]

  const stringOperators = [
    { value: '==' as ConditionOperator, label: 'Equals' },
    { value: '!=' as ConditionOperator, label: 'Not equals' },
    { value: 'contains' as ConditionOperator, label: 'Contains' },
    { value: 'not-contains' as ConditionOperator, label: 'Does not contain' }
  ]

  switch (field) {
    case 'inventory':
    case 'userLevel':
      return numericOperators
    case 'date':
    case 'time':
    case 'custom':
      return [...numericOperators, ...stringOperators]
    default:
      return stringOperators
  }
}
