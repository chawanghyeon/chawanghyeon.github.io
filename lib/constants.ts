// Shared constants for the workflow management system

export const STORAGE_KEY = "chawanghyeon_workflow_v1"

export const BUFFER = 5 // Buffer for virtualized tables

export const VIEWPORT_HEIGHT = 400 // Default viewport height

export const DEFAULT_ROW_HEIGHT = 40

export const MIN_INPUT_WIDTH = 40
export const MAX_INPUT_WIDTH = 300

// Tab configuration
export const TABS = [
  { id: 'button', label: '🔘 워크플로우' },
  { id: 'table', label: '📊 표 시각화' },
  { id: 'data', label: '💾 데이터 관리' }
] as const

// Menu positioning
export const MENU_MARGIN = 6

// Debounce timings
export const SAVE_DEBOUNCE_MS = 400
export const RESIZE_DEBOUNCE_MS = 100

// File handling
export const ACCEPTED_FILE_TYPES = {
  JSON: 'application/json'
} as const

export const DEFAULT_EXPORT_FILENAME = 'workflow-data.json'

// ID generation
export const ID_PREFIXES = {
  STEP: 'step',
  OPTION: 'option'
} as const
