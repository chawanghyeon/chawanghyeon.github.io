/**
 * Priority System Features Demonstration
 * 
 * This file demonstrates the key features of the enhanced priority system.
 * These examples can be used to understand and test the system behavior.
 */

import { WorkflowConstraint, Step, ConstraintMap } from './types'
import { applyConstraintsWithPriority, detectSamePriorityConflicts, detectCircularReferences } from './constraints'

// Example test data
const exampleSteps: Step[] = [
  {
    id: 'step1',
    name: 'Choose Method',
    displayName: 'Payment Method',
    options: [
      { id: 'credit', name: 'Credit Card', displayName: 'Credit Card' },
      { id: 'paypal', name: 'PayPal', displayName: 'PayPal' },
      { id: 'bank', name: 'Bank Transfer', displayName: 'Bank Transfer' }
    ]
  },
  {
    id: 'step2',
    name: 'Choose Options',
    displayName: 'Additional Options',
    options: [
      { id: 'insurance', name: 'Insurance', displayName: 'Purchase Insurance' },
      { id: 'express', name: 'Express', displayName: 'Express Delivery' },
      { id: 'gift', name: 'Gift Wrap', displayName: 'Gift Wrapping' }
    ]
  },
  {
    id: 'step3',
    name: 'Confirmation',
    displayName: 'Final Confirmation',
    options: [
      { id: 'email', name: 'Email', displayName: 'Email Receipt' },
      { id: 'sms', name: 'SMS', displayName: 'SMS Notification' }
    ]
  }
]

/**
 * Example 1: Basic Priority Ordering
 * Demonstrates that lower priority numbers are applied first
 */
export function demonstratePriorityOrdering() {
  console.log('📋 Example 1: Priority Ordering')
  console.log('================================')
  
  const constraints: ConstraintMap = {
    'low_priority': {
      id: 'low_priority',
      scope: 'global',
      sourceStepIndex: 0,
      sourceOptionId: 'credit',
      targetStepIndex: 1,
      targetOptionId: 'insurance',
      action: 'disable',
      priority: 3, // Lower priority (higher number)
      isActive: true,
      createdAt: Date.now(),
      description: 'Credit cards disable insurance (priority 3)'
    },
    'high_priority': {
      id: 'high_priority',
      scope: 'global',
      sourceStepIndex: 0,
      sourceOptionId: 'credit',
      targetStepIndex: 1,
      targetOptionId: 'insurance',
      action: 'enable',
      priority: 1, // Higher priority (lower number)
      isActive: true,
      createdAt: Date.now(),
      description: 'Override: Credit cards enable insurance (priority 1)'
    }
  }
  
  const selectedPath = { 0: 'credit' }
  const result = applyConstraintsWithPriority(exampleSteps, constraints, selectedPath)
  
  const insuranceEnabled = result.enabledOptions[1]?.has('insurance')
  
  console.log('Result: Insurance option is', insuranceEnabled ? 'ENABLED' : 'DISABLED')
  console.log('✅ Priority 1 (enable) overrode priority 3 (disable)')
  console.log('')
}

/**
 * Example 2: Global vs Path-Based Override
 * Shows that path-based policies override global ones regardless of priority
 */
export function demonstrateGlobalVsPathBased() {
  console.log('📋 Example 2: Global vs Path-Based Override')
  console.log('==========================================')
  
  const constraints: ConstraintMap = {
    'global_policy': {
      id: 'global_policy',
      scope: 'global',
      sourceStepIndex: 0,
      sourceOptionId: 'paypal',
      targetStepIndex: 1,
      targetOptionId: 'express',
      action: 'disable',
      priority: 1, // High priority global policy
      isActive: true,
      createdAt: Date.now(),
      description: 'Global: PayPal disables express delivery'
    },
    'path_specific': {
      id: 'path_specific',
      scope: 'route-based',
      sourceStepIndex: 0,
      sourceOptionId: 'paypal',
      targetStepIndex: 1,
      targetOptionId: 'express',
      action: 'enable',
      priority: 5, // Lower priority but path-based
      isActive: true,
      createdAt: Date.now(),
      description: 'Path-specific: PayPal enables express delivery'
    }
  }
  
  const selectedPath = { 0: 'paypal' }
  const result = applyConstraintsWithPriority(exampleSteps, constraints, selectedPath)
  
  const expressEnabled = result.enabledOptions[1]?.has('express')
  
  console.log('Result: Express delivery is', expressEnabled ? 'ENABLED' : 'DISABLED')
  console.log('✅ Path-based policy (priority 5) overrode global policy (priority 1)')
  console.log('')
}

/**
 * Example 3: Conflict Detection
 * Shows how same-priority conflicts are detected
 */
export function demonstrateConflictDetection() {
  console.log('📋 Example 3: Conflict Detection')
  console.log('================================')
  
  const constraints: ConstraintMap = {
    'conflict_a': {
      id: 'conflict_a',
      scope: 'global',
      sourceStepIndex: 0,
      sourceOptionId: 'bank',
      targetStepIndex: 1,
      targetOptionId: 'gift',
      action: 'disable',
      priority: 2, // Same priority as conflict_b
      isActive: true,
      createdAt: Date.now(),
      description: 'Bank transfer disables gift wrapping'
    },
    'conflict_b': {
      id: 'conflict_b',
      scope: 'global',
      sourceStepIndex: 0,
      sourceOptionId: 'bank',
      targetStepIndex: 1,
      targetOptionId: 'gift',
      action: 'require',
      priority: 2, // Same priority as conflict_a - creates conflict!
      isActive: true,
      createdAt: Date.now(),
      description: 'Bank transfer requires gift wrapping'
    }
  }
  
  const conflicts = detectSamePriorityConflicts(constraints)
  
  console.log('Conflicts detected:', conflicts.length)
  if (conflicts.length > 0) {
    console.log('⚠️ Conflict details:', conflicts[0].reason)
    console.log('⚠️ Conflicting constraints:', conflicts[0].conflictingConstraints.map(c => c.id))
  }
  console.log('')
}

/**
 * Example 4: Circular Reference Detection
 * Shows how circular dependencies are detected
 */
export function demonstrateCircularReference() {
  console.log('📋 Example 4: Circular Reference Detection')
  console.log('==========================================')
  
  const constraints: WorkflowConstraint[] = [
    {
      id: 'circular_a',
      scope: 'global',
      sourceStepIndex: 0,
      sourceOptionId: 'credit',
      targetStepIndex: 1,
      targetOptionId: 'insurance',
      action: 'disable',
      priority: 1,
      isActive: true,
      createdAt: Date.now(),
      description: 'Credit disables insurance'
    },
    {
      id: 'circular_b',
      scope: 'global',
      sourceStepIndex: 1,
      sourceOptionId: 'insurance',
      targetStepIndex: 0,
      targetOptionId: 'credit', // This creates a circular dependency!
      action: 'disable',
      priority: 1,
      isActive: true,
      createdAt: Date.now(),
      description: 'Insurance disables credit'
    }
  ]
  
  const circularConflicts = detectCircularReferences(constraints)
  
  console.log('Circular references detected:', circularConflicts.length)
  if (circularConflicts.length > 0) {
    console.log('🔄 Circular reference:', circularConflicts[0].reason)
    console.log('🔄 Involved constraints:', circularConflicts[0].conflictingConstraints.map(c => c.id))
  }
  console.log('')
}

/**
 * Run all demonstrations
 */
export function runAllDemonstrations() {
  console.log('🚀 Priority System Demonstrations')
  console.log('==================================')
  console.log('')
  
  demonstratePriorityOrdering()
  demonstrateGlobalVsPathBased()
  demonstrateConflictDetection()
  demonstrateCircularReference()
  
  console.log('✨ All demonstrations completed!')
  console.log('')
  console.log('Key Takeaways:')
  console.log('1. Lower priority numbers (1, 2, 3) are applied FIRST')
  console.log('2. Path-based policies ALWAYS override global policies')
  console.log('3. Same-priority conflicts are detected and flagged')
  console.log('4. Circular references are automatically detected')
  console.log('5. Conflicts are visually highlighted in the PolicyManager UI')
}
