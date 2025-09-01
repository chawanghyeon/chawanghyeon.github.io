export interface StorageInfo {
  used: number
  available: number
  total: number
  usedPercentage: number
  mode: 'localStorage' | 'fileSystem'
  fileName?: string
}

export interface StorageOptions {
  backup?: boolean
  maxRetries?: number
  useFileSystem?: boolean
}

// File System Access API types
declare global {
  interface Window {
    showSaveFilePicker?: (options?: SaveFilePickerOptions) => Promise<FileSystemFileHandle>
    showOpenFilePicker?: (options?: OpenFilePickerOptions) => Promise<FileSystemFileHandle[]>
  }
}

interface SaveFilePickerOptions {
  suggestedName?: string
  types?: {
    description: string
    accept: Record<string, string[]>
  }[]
}

interface OpenFilePickerOptions {
  multiple?: boolean
  types?: {
    description: string
    accept: Record<string, string[]>
  }[]
}

interface FileSystemFileHandle {
  createWritable(): Promise<FileSystemWritableFileStream>
  getFile(): Promise<File>
  name: string
}

interface FileSystemWritableFileStream {
  write(data: string | BufferSource | Blob): Promise<void>
  close(): Promise<void>
}

export class StorageManager {
  private static readonly BACKUP_SUFFIX = '_backup'
  private static readonly FILE_HANDLE_KEY = 'workflow_file_handle'
  private static fileHandle: FileSystemFileHandle | null = null

  /**
   * Check if File System Access API is supported
   */
  static isFileSystemSupported(): boolean {
    return typeof window !== 'undefined' && 'showSaveFilePicker' in window
  }

  /**
   * Get localStorage usage information
   */
  static getStorageInfo(): StorageInfo {
    if (typeof window === 'undefined') {
      return { used: 0, available: 0, total: 0, usedPercentage: 0, mode: 'localStorage' }
    }

    let used = 0
    let total = 0

    try {
      // Calculate current usage
      for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          used += localStorage[key].length + key.length
        }
      }

      // Estimate total available space (this is approximate)
      // Most browsers have a 5-10MB limit, we'll use 5MB as conservative estimate
      total = 5 * 1024 * 1024 // 5MB in bytes
      
      // Try to get more accurate total by testing
      try {
        const testKey = '_storage_test_' + Date.now()
        let testSize = 0
        let testData = 'a'
        
        // Binary search to find approximate limit
        while (testSize < total) {
          try {
            localStorage.setItem(testKey, testData)
            testSize = testData.length
            testData = testData.repeat(2)
          } catch {
            break
          }
        }
        
        localStorage.removeItem(testKey)
        if (testSize > 0) {
          total = Math.max(total, used + testSize)
        }
      } catch {
        // If test fails, stick with conservative estimate
      }

    } catch (error) {
      console.warn('Failed to calculate storage info:', error)
    }

    const available = Math.max(0, total - used)
    const usedPercentage = total > 0 ? (used / total) * 100 : 0
    const mode = this.fileHandle ? 'fileSystem' : 'localStorage'
    const fileName = this.fileHandle?.name

    return { used, available, total, usedPercentage, mode, fileName }
  }

  /**
   * Estimate the size of data when serialized
   */
  static estimateSize(data: unknown): number {
    try {
      return JSON.stringify(data).length
    } catch {
      return 0
    }
  }

  /**
   * Check if data can fit in localStorage
   */
  static canFitData(data: unknown): boolean {
    // If using file system, assume unlimited space
    if (this.fileHandle) return true
    
    const storageInfo = this.getStorageInfo()
    const estimatedSize = this.estimateSize(data)
    
    // Leave 10% buffer
    return estimatedSize < (storageInfo.available * 0.9)
  }

  /**
   * Initialize file system access by prompting user to select/create a file
   */
  static async initializeFileSystem(suggestedName: string = 'workflow-data.json'): Promise<boolean> {
    if (!this.isFileSystemSupported()) {
      console.warn('File System Access API not supported')
      return false
    }

    try {
      const fileHandle = await window.showSaveFilePicker!({
        suggestedName,
        types: [{
          description: 'JSON files',
          accept: { 'application/json': ['.json'] }
        }]
      })

      this.fileHandle = fileHandle
      return true
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Failed to initialize file system:', error)
      }
      return false
    }
  }

  /**
   * Load existing file from file system
   */
  static async loadFromFileSystem(): Promise<boolean> {
    if (!this.isFileSystemSupported()) {
      console.warn('File System Access API not supported')
      return false
    }

    try {
      const [fileHandle] = await window.showOpenFilePicker!({
        types: [{
          description: 'JSON files',
          accept: { 'application/json': ['.json'] }
        }]
      })

      this.fileHandle = fileHandle
      return true
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Failed to load file from file system:', error)
      }
      return false
    }
  }

  /**
   * Write data to file system
   */
  private static async writeToFileSystem(data: unknown): Promise<boolean> {
    if (!this.fileHandle) return false

    try {
      const writable = await this.fileHandle.createWritable()
      await writable.write(JSON.stringify(data, null, 2))
      await writable.close()
      return true
    } catch (error) {
      console.error('Failed to write to file system:', error)
      return false
    }
  }

  /**
   * Read data from file system
   */
  private static async readFromFileSystem(): Promise<unknown | null> {
    if (!this.fileHandle) return null

    try {
      const file = await this.fileHandle.getFile()
      const text = await file.text()
      return JSON.parse(text)
    } catch (error) {
      console.error('Failed to read from file system:', error)
      return null
    }
  }

  /**
   * Save data to localStorage or file system
   */
  static async setItem(key: string, data: unknown, options: StorageOptions = {}): Promise<boolean> {
    if (typeof window === 'undefined') return false

    const { backup = true, maxRetries = 3, useFileSystem = false } = options
    
    // If file system is preferred and available, use it
    if (useFileSystem && this.isFileSystemSupported()) {
      if (!this.fileHandle) {
        const initialized = await this.initializeFileSystem(`${key}.json`)
        if (!initialized) {
          console.warn('Failed to initialize file system, falling back to localStorage')
          return this.setItemLocalStorage(key, data, { backup, maxRetries })
        }
      }
      
      return await this.writeToFileSystem(data)
    }

    // If file handle exists, always use file system
    if (this.fileHandle) {
      return await this.writeToFileSystem(data)
    }

    // Fall back to localStorage
    return this.setItemLocalStorage(key, data, { backup, maxRetries })
  }

  /**
   * Save data to localStorage with error handling
   */
  private static setItemLocalStorage(key: string, data: unknown, options: StorageOptions = {}): boolean {
    if (typeof window === 'undefined') return false

    const { backup = true, maxRetries = 3 } = options
    
    try {
      const serialized = JSON.stringify(data)

      // Create backup if requested
      if (backup) {
        try {
          const existing = localStorage.getItem(key)
          if (existing) {
            localStorage.setItem(key + this.BACKUP_SUFFIX, existing)
          }
        } catch {
          // Backup failed, but continue with main save
        }
      }

      // Try to save with retries
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          localStorage.setItem(key, serialized)
          return true
        } catch (error) {
          if (error instanceof DOMException && error.name === 'QuotaExceededError') {
            // Try cleanup and retry
            if (attempt < maxRetries - 1) {
              this.performCleanup(key)
              continue
            }
            
            // Last attempt failed, throw with context
            throw new Error(`Storage quota exceeded. Used: ${this.getStorageInfo().usedPercentage.toFixed(1)}%`)
          }
          throw error
        }
      }
      
      return false
    } catch (error) {
      console.error('Failed to save to localStorage:', error)
      
      // Try to restore backup if main save failed
      if (backup) {
        try {
          const backupKey = key + this.BACKUP_SUFFIX
          const backupData = localStorage.getItem(backupKey)
          if (backupData) {
            localStorage.setItem(key, backupData)
          }
        } catch {
          // Backup restore failed
        }
      }
      
      throw error
    }
  }

  /**
   * Get data from localStorage or file system
   */
  static async getItem(key: string): Promise<unknown> {
    if (typeof window === 'undefined') return null

    // If file handle exists, read from file system
    if (this.fileHandle) {
      return await this.readFromFileSystem()
    }

    // Fall back to localStorage
    return this.getItemLocalStorage(key)
  }

  /**
   * Get data from localStorage
   */
  private static getItemLocalStorage(key: string): unknown {
    if (typeof window === 'undefined') return null

    try {
      const data = localStorage.getItem(key)
      if (!data) return null

      return JSON.parse(data)
    } catch (error) {
      console.warn('Failed to parse stored data:', error)
      
      // Try backup if main data is corrupted
      try {
        const backupKey = key + this.BACKUP_SUFFIX
        const backupData = localStorage.getItem(backupKey)
        if (backupData) {
          return JSON.parse(backupData)
        }
      } catch {
        // Backup also failed
      }
      
      return null
    }
  }

  /**
   * Remove item and its backup
   */
  static removeItem(key: string): void {
    if (typeof window === 'undefined') return

    try {
      localStorage.removeItem(key)
      localStorage.removeItem(key + this.BACKUP_SUFFIX)
    } catch (error) {
      console.warn('Failed to remove from localStorage:', error)
    }
  }

  /**
   * Perform cleanup to free up space
   */
  static performCleanup(protectedKey?: string): number {
    if (typeof window === 'undefined') return 0

    let freedSpace = 0
    
    try {
      // Remove old backups first
      const keysToRemove: string[] = []
      
      for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          // Remove old backups that aren't for the current key
          if (key.endsWith(this.BACKUP_SUFFIX) && key !== protectedKey + this.BACKUP_SUFFIX) {
            keysToRemove.push(key)
          }
        }
      }
      
      // Remove identified keys
      keysToRemove.forEach(key => {
        try {
          const size = localStorage[key].length + key.length
          localStorage.removeItem(key)
          freedSpace += size
        } catch {
          // Continue with other keys
        }
      })
      
      // If still not enough space, remove old workflow data (except current)
      if (freedSpace < 1024 * 1024) { // Less than 1MB freed
        const workflowKeys = Object.keys(localStorage).filter(key => 
          key.startsWith('chawanghyeon_workflow') && 
          key !== protectedKey &&
          !key.endsWith(this.BACKUP_SUFFIX)
        )
        
        // Sort by potential age (based on key name patterns)
        workflowKeys.sort().slice(0, -1).forEach(key => {
          try {
            const size = localStorage[key].length + key.length
            localStorage.removeItem(key)
            freedSpace += size
          } catch {
            // Continue with other keys
          }
        })
      }
      
    } catch (error) {
      console.warn('Cleanup failed:', error)
    }
    
    return freedSpace
  }

  /**
   * Get all workflow-related keys
   */
  static getWorkflowKeys(): string[] {
    if (typeof window === 'undefined') return []

    const keys: string[] = []
    
    try {
      for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key) && key.startsWith('chawanghyeon_workflow')) {
          keys.push(key)
        }
      }
    } catch (error) {
      console.warn('Failed to get workflow keys:', error)
    }
    
    return keys
  }

  /**
   * Clear all workflow data
   */
  static clearWorkflowData(): void {
    if (typeof window === 'undefined') return

    try {
      const keys = this.getWorkflowKeys()
      keys.forEach(key => this.removeItem(key))
    } catch (error) {
      console.warn('Failed to clear workflow data:', error)
    }
  }

  /**
   * Switch to file system mode
   */
  static async enableFileSystemMode(suggestedName?: string): Promise<boolean> {
    return await this.initializeFileSystem(suggestedName)
  }

  /**
   * Switch to localStorage mode
   */
  static disableFileSystemMode(): void {
    this.fileHandle = null
  }

  /**
   * Check if currently using file system
   */
  static isUsingFileSystem(): boolean {
    return this.fileHandle !== null
  }

  /**
   * Get current file name if using file system
   */
  static getCurrentFileName(): string | null {
    return this.fileHandle?.name || null
  }

  /**
   * Export data to a new file
   */
  static async exportToFile(data: unknown, suggestedName: string = 'workflow-export.json'): Promise<boolean> {
    if (!this.isFileSystemSupported()) {
      console.warn('File System Access API not supported')
      return false
    }

    try {
      const fileHandle = await window.showSaveFilePicker!({
        suggestedName,
        types: [{
          description: 'JSON files',
          accept: { 'application/json': ['.json'] }
        }]
      })

      const writable = await fileHandle.createWritable()
      await writable.write(JSON.stringify(data, null, 2))
      await writable.close()
      return true
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Failed to export to file:', error)
      }
      return false
    }
  }

  /**
   * Import data from a file
   */
  static async importFromFile(): Promise<unknown | null> {
    if (!this.isFileSystemSupported()) {
      console.warn('File System Access API not supported')
      return null
    }

    try {
      const [fileHandle] = await window.showOpenFilePicker!({
        types: [{
          description: 'JSON files',
          accept: { 'application/json': ['.json'] }
        }]
      })

      const file = await fileHandle.getFile()
      const text = await file.text()
      return JSON.parse(text)
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Failed to import from file:', error)
      }
      return null
    }
  }
}
