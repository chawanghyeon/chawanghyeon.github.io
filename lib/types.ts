// Shared type definitions for the workflow management system

export interface StepOption {
  id: string
  name: string
  displayName: string
  isActive?: boolean
}

export interface Step {
  id: string
  name: string
  displayName: string
  options: StepOption[]
  isActive?: boolean
}

// Path-based activation state (for table view)
export type PathActivationMap = {
  [pathKey: string]: boolean[] // pathKey: path index, boolean[]: option activation per step
}

// Sheet data structure
export interface WorkflowSheet {
  id: string
  name: string
  steps: Step[]
  constraints?: ConstraintMap // Optional for backward compatibility
  createdAt: number
  updatedAt: number
}

// Multi-sheet data structure
export interface WorkflowData {
  sheets: WorkflowSheet[]
  activeSheetId: string
  nextSheetId: number
  lastUpdated?: number // Optional field for forcing re-renders
}

// Constraint types for Workflow-Button Tab
export type ConstraintScope = 'global' | 'route-based' | 'conditional-route'

// Route condition for route-based constraints
export interface RouteCondition {
  stepIndex: number
  optionId: string
}

// External condition types for conditional constraints
export type ConditionField = 'inventory' | 'userLevel' | 'date' | 'time' | 'custom'
export type ConditionOperator = '>=' | '<=' | '==' | '!=' | '>' | '<' | 'contains' | 'not-contains'

export interface ExternalCondition {
  field: ConditionField
  operator: ConditionOperator
  value: string | number
  label?: string // Human-readable label for display
}

// Constraint action types
export type ConstraintActionType = 'disable' | 'enable' | 'require'

// Exception for overriding constraints in specific cases
export interface ConstraintException {
  id: string
  path: RouteCondition[] // Required path conditions for this exception to apply
  action: ConstraintActionType // Action to take when exception conditions are met
  target: Array<{ step: number; option: string }> // Which options to affect
  conditions?: ExternalCondition[] // Additional external conditions for the exception
  priority?: number // Priority for this exception (higher = more important)
  description?: string // Human-readable description
}

export interface WorkflowConstraint {
  id: string
  scope: ConstraintScope // 'global' applies to all paths, 'route-based' applies only when route conditions are met, 'conditional-route' includes external conditions
  sourceStepIndex: number
  sourceOptionId: string
  targetStepIndex?: number // For previous-step and next-step constraints
  targetOptionId?: string // For previous-step and next-step constraints  
  targetSteps?: number[] // For range-skip: allow multiple target step indexes / ranges
  targetOptionIds?: string[] // For range-skip: allow listing specific option ids to disable in target steps
  startStep?: number // For range-skip constraints
  endStep?: number // For range-skip constraints
  routeConditions?: RouteCondition[] // For route-based constraints: conditions that must be met for the constraint to apply
  externalConditions?: ExternalCondition[] // For conditional constraints: external conditions like inventory, user level, etc.
  action?: ConstraintActionType // What action to take when conditions are met (disable, enable, require)
  exceptions?: ConstraintException[] // Override behavior for specific paths/conditions
  priority?: number // Higher numbers = higher priority, for conflict resolution
  description?: string
  isActive: boolean
  createdAt: number
  conflictsWith?: string[] // Array of constraint IDs that conflict with this constraint
  overrides?: string[] // Array of constraint IDs that this constraint overrides
}

// Constraint data structure for sheets
export interface ConstraintMap {
  [constraintId: string]: WorkflowConstraint
}

// External conditions context (mock data for evaluation)
export interface ExternalConditionsContext {
  inventory: number
  userLevel: number
  date: string // ISO date string
  time: string // HH:MM format
  custom: { [key: string]: string | number | boolean }
}

// Constraint evaluation result
export interface ConstraintEvaluationResult {
  constraint: WorkflowConstraint
  applies: boolean
  reason: string
  priority: number
  action: ConstraintActionType
  effectiveAction?: ConstraintActionType // Final action after resolving conflicts/exceptions
  exceptionApplied?: ConstraintException // Exception that was applied, if any
}

// Conflict detection result
export interface ConstraintConflict {
  conflictingConstraints: WorkflowConstraint[]
  targetStep: number
  targetOption: string
  reason: string
  resolution: 'priority' | 'action-precedence' | 'exception-override'
  appliedConstraint?: WorkflowConstraint // Which constraint was ultimately applied
  conflictLevel: 'warning' | 'error' // Severity of the conflict
}

// Enhanced constraint application result
export interface ConstraintApplicationResult {
  disabledOptions: { [stepIndex: number]: Set<string> }
  enabledOptions: { [stepIndex: number]: Set<string> }
  requiredOptions: { [stepIndex: number]: Set<string> }
  conflicts: ConstraintConflict[]
  appliedConstraints: ConstraintEvaluationResult[]
  exceptionsApplied: ConstraintException[]
}

export type TabType = 'table' | 'data' | 'button' | 'guide'

// UI Component Props
export interface BaseComponentProps {
  className?: string
  children?: React.ReactNode
}

export interface TableCellPosition {
  pathKey: string
  colIdx: number
}

// Button variants
export type ButtonVariant = 'primary' | 'muted' | 'link' | 'danger'
export type ButtonSize = 'small' | 'medium' | 'large'

// Input types
export type InputType = 'text' | 'file' | 'number'

// Common event handlers
export type ValueChangeHandler<T = string> = (value: T) => void
export type ClickHandler = () => void
export type FileChangeHandler = (file: File | null, mode?: 'replace' | 'append') => void

// User-friendly constraint interface for policy translations
export interface UserFriendlyConstraint {
  id: string
  title: string
  description: string
  category: string
  impact: 'high' | 'medium' | 'low'
  isActive: boolean
  createdAt?: string | number
  lastModified?: string | number
  appliesTo: {
    sourceStep: string
    sourceOption: string
    targetSteps: string[]
    targetOptions: string[]
  }
  conditions: string[]
  action: '차단' | '허용' | '필수'
  priority: number
}
