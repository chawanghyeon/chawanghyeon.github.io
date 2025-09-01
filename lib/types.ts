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

// Each step, parent option, option activation state
export type OptionActivationMap = {
  [stepIndex: number]: {
    [parentOptionIndex: number]: boolean[]
  }
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
  optionActivations: OptionActivationMap
  pathActivations: PathActivationMap
  createdAt: number
  updatedAt: number
}

// Multi-sheet data structure
export interface WorkflowData {
  sheets: WorkflowSheet[]
  activeSheetId: string
  nextSheetId: number
}

export type TabType = 'design' | 'table' | 'data'

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
