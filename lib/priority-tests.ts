/**
 * Comprehensive test cases for enhanced priority logic and conflict detection
 */

import { WorkflowConstraint, Step, ConstraintMap } from './types'
import { 
  applyConstraintsWithPriority, 
  detectSamePriorityConflicts, 
  detectCircularReferences,
  normalizePriorities,
  recalculatePriorities
} from './constraints'

// Test data setup
const createTestSteps = (): Step[] => [
  {
    id: 'step1',
    name: 'Step 1',
    displayName: 'First Step',
    options: [
      { id: 'opt1_1', name: 'Option 1.1', displayName: 'First Option' },
      { id: 'opt1_2', name: 'Option 1.2', displayName: 'Second Option' }
    ]
  },
  {
    id: 'step2',
    name: 'Step 2',
    displayName: 'Second Step',
    options: [
      { id: 'opt2_1', name: 'Option 2.1', displayName: 'Option A' },
      { id: 'opt2_2', name: 'Option 2.2', displayName: 'Option B' }
    ]
  },
  {
    id: 'step3',
    name: 'Step 3',
    displayName: 'Third Step',
    options: [
      { id: 'opt3_1', name: 'Option 3.1', displayName: 'Final Option A' },
      { id: 'opt3_2', name: 'Option 3.2', displayName: 'Final Option B' }
    ]
  }
]

const createTestConstraint = (
  id: string,
  sourceStepIndex: number,
  sourceOptionId: string,
  targetStepIndex: number,
  targetOptionId: string,
  priority: number = 1,
  scope: 'global' | 'route-based' | 'conditional-route' = 'global',
  action: 'disable' | 'enable' | 'require' = 'disable'
): WorkflowConstraint => ({
  id,
  scope,
  sourceStepIndex,
  sourceOptionId,
  targetStepIndex,
  targetOptionId,
  action,
  priority,
  isActive: true,
  createdAt: Date.now(),
  description: `Test constraint ${id}`
})

// Test Cases

/**
 * Test 1: Basic Priority Application (Lower Numbers First)
 */
function testBasicPriorityApplication(): { success: boolean, message: string } {
  console.log('🧪 Test 1: Basic Priority Application')
  
  const steps = createTestSteps()
  const constraints: ConstraintMap = {
    'c1': createTestConstraint('c1', 0, 'opt1_1', 1, 'opt2_1', 3, 'global', 'disable'),
    'c2': createTestConstraint('c2', 0, 'opt1_1', 1, 'opt2_1', 1, 'global', 'enable'), // Higher priority (lower number)
  }
  
  const selectedPath = { 0: 'opt1_1' }
  const result = applyConstraintsWithPriority(steps, constraints, selectedPath)
  
  // The enable action (priority 1) should override the disable action (priority 3)
  const isEnabled = result.enabledOptions[1]?.has('opt2_1')
  const isDisabled = result.disabledOptions[1]?.has('opt2_1')
  
  if (isEnabled && !isDisabled) {
    console.log('✅ Priority application working correctly')
    return { success: true, message: 'Lower priority numbers applied first' }
  } else {
    console.log('❌ Priority application failed')
    return { success: false, message: 'Priority order not respected' }
  }
}

/**
 * Test 2: Global vs Path-Based Policy Override
 */
function testGlobalVsPathBasedPolicies(): { success: boolean, message: string } {
  console.log('🧪 Test 2: Global vs Path-Based Policy Override')
  
  const steps = createTestSteps()
  const constraints: ConstraintMap = {
    'global': createTestConstraint('global', 0, 'opt1_1', 1, 'opt2_1', 1, 'global', 'disable'),
    'path': createTestConstraint('path', 0, 'opt1_1', 1, 'opt2_1', 5, 'route-based', 'enable'), // Lower priority but path-based
  }
  
  const selectedPath = { 0: 'opt1_1' }
  const result = applyConstraintsWithPriority(steps, constraints, selectedPath)
  
  // Path-based should override global regardless of priority
  const isEnabled = result.enabledOptions[1]?.has('opt2_1')
  const isDisabled = result.disabledOptions[1]?.has('opt2_1')
  
  if (isEnabled && !isDisabled) {
    console.log('✅ Path-based policies override global policies')
    return { success: true, message: 'Path-based policies correctly override global ones' }
  } else {
    console.log('❌ Path-based override failed')
    return { success: false, message: 'Path-based policies not overriding global policies' }
  }
}

/**
 * Test 3: Same Priority Conflict Detection
 */
function testSamePriorityConflictDetection(): { success: boolean, message: string } {
  console.log('🧪 Test 3: Same Priority Conflict Detection')
  
  const constraints: ConstraintMap = {
    'c1': createTestConstraint('c1', 0, 'opt1_1', 1, 'opt2_1', 2, 'global', 'disable'),
    'c2': createTestConstraint('c2', 0, 'opt1_2', 1, 'opt2_1', 2, 'global', 'enable'), // Same priority, same target
  }
  
  const conflicts = detectSamePriorityConflicts(constraints)
  
  if (conflicts.length > 0 && conflicts[0].conflictLevel === 'error') {
    console.log('✅ Same priority conflicts detected correctly')
    return { success: true, message: 'Same priority conflicts properly detected' }
  } else {
    console.log('❌ Same priority conflict detection failed')
    return { success: false, message: 'Failed to detect same priority conflicts' }
  }
}

/**
 * Test 4: Circular Reference Detection
 */
function testCircularReferenceDetection(): { success: boolean, message: string } {
  console.log('🧪 Test 4: Circular Reference Detection')
  
  const constraints: WorkflowConstraint[] = [
    // A -> B -> A circular reference
    {
      id: 'c1',
      scope: 'global',
      sourceStepIndex: 0,
      sourceOptionId: 'opt1_1',
      targetStepIndex: 1,
      targetOptionId: 'opt2_1',
      action: 'disable',
      priority: 1,
      isActive: true,
      createdAt: Date.now()
    },
    {
      id: 'c2',
      scope: 'global',
      sourceStepIndex: 1,
      sourceOptionId: 'opt2_1',
      targetStepIndex: 0,
      targetOptionId: 'opt1_1', // This creates circular reference
      action: 'disable',
      priority: 1,
      isActive: true,
      createdAt: Date.now()
    }
  ]
  
  const conflicts = detectCircularReferences(constraints)
  
  if (conflicts.length > 0 && conflicts[0].targetStep === -1) {
    console.log('✅ Circular references detected correctly')
    return { success: true, message: 'Circular references properly detected' }
  } else {
    console.log('❌ Circular reference detection failed')
    return { success: false, message: 'Failed to detect circular references' }
  }
}

/**
 * Test 5: Range-Based vs Single Policy Conflicts
 */
function testRangeVsSinglePolicyConflicts(): { success: boolean, message: string } {
  console.log('🧪 Test 5: Range-Based vs Single Policy Conflicts')
  
  const steps = createTestSteps()
  const constraints: ConstraintMap = {
    'range': {
      id: 'range',
      scope: 'global',
      sourceStepIndex: 0,
      sourceOptionId: 'opt1_1',
      targetSteps: [1, 2], // Range-based: affects multiple steps
      targetOptionIds: ['opt2_1', 'opt3_1'],
      action: 'disable',
      priority: 2,
      isActive: true,
      createdAt: Date.now()
    },
    'single': createTestConstraint('single', 0, 'opt1_1', 1, 'opt2_1', 1, 'global', 'enable') // Single target, higher priority
  }
  
  const selectedPath = { 0: 'opt1_1' }
  const result = applyConstraintsWithPriority(steps, constraints, selectedPath)
  
  // Single policy with higher priority should override range-based
  const isEnabled = result.enabledOptions[1]?.has('opt2_1')
  const isDisabled = result.disabledOptions[1]?.has('opt2_1')
  
  if (isEnabled && !isDisabled) {
    console.log('✅ Single policy correctly overrides range-based policy')
    return { success: true, message: 'Higher priority single policies override range-based policies' }
  } else {
    console.log('❌ Range vs single policy conflict resolution failed')
    return { success: false, message: 'Failed to resolve range vs single policy conflicts' }
  }
}

/**
 * Test 6: Priority Normalization
 */
function testPriorityNormalization(): { success: boolean, message: string } {
  console.log('🧪 Test 6: Priority Normalization')
  
  const constraints: ConstraintMap = {
    'c1': createTestConstraint('c1', 0, 'opt1_1', 1, 'opt2_1', 10),
    'c2': createTestConstraint('c2', 0, 'opt1_2', 1, 'opt2_2', 5),
    'c3': createTestConstraint('c3', 1, 'opt2_1', 2, 'opt3_1', 15),
  }
  
  const normalized = normalizePriorities(constraints)
  const priorities = Object.values(normalized).sort((a, b) => a - b)
  
  // Should be [1, 2, 3]
  const isNormalized = priorities.length === 3 && 
                      priorities[0] === 1 && 
                      priorities[1] === 2 && 
                      priorities[2] === 3
  
  if (isNormalized) {
    console.log('✅ Priority normalization working correctly')
    return { success: true, message: 'Priorities normalized to consecutive values starting from 1' }
  } else {
    console.log('❌ Priority normalization failed')
    return { success: false, message: 'Failed to normalize priorities' }
  }
}

/**
 * Test 7: Priority Recalculation After Deletion
 */
function testPriorityRecalculationAfterDeletion(): { success: boolean, message: string } {
  console.log('🧪 Test 7: Priority Recalculation After Deletion')
  
  const constraints: ConstraintMap = {
    'c1': createTestConstraint('c1', 0, 'opt1_1', 1, 'opt2_1', 1),
    'c2': createTestConstraint('c2', 0, 'opt1_2', 1, 'opt2_2', 2),
    'c3': createTestConstraint('c3', 1, 'opt2_1', 2, 'opt3_1', 3),
    'c4': createTestConstraint('c4', 1, 'opt2_2', 2, 'opt3_2', 4),
  }
  
  // Delete c2 (priority 2)
  const recalculated = recalculatePriorities(constraints, ['c2'])
  
  // Remaining constraints should have priorities [1, 2, 3] instead of [1, 3, 4]
  const remainingPriorities = Object.values(recalculated).sort((a, b) => a - b)
  const isCorrect = remainingPriorities.length === 3 && 
                   remainingPriorities[0] === 1 && 
                   remainingPriorities[1] === 2 && 
                   remainingPriorities[2] === 3
  
  if (isCorrect) {
    console.log('✅ Priority recalculation after deletion working correctly')
    return { success: true, message: 'Priorities correctly recalculated after constraint deletion' }
  } else {
    console.log('❌ Priority recalculation failed')
    return { success: false, message: 'Failed to recalculate priorities after deletion' }
  }
}

/**
 * Test 8: Complex Multi-Step Circular Reference
 */
function testComplexCircularReference(): { success: boolean, message: string } {
  console.log('🧪 Test 8: Complex Multi-Step Circular Reference')
  
  const constraints: WorkflowConstraint[] = [
    // A -> B -> C -> A circular reference
    {
      id: 'c1',
      scope: 'global',
      sourceStepIndex: 0,
      sourceOptionId: 'opt1_1',
      targetStepIndex: 1,
      targetOptionId: 'opt2_1',
      action: 'disable',
      priority: 1,
      isActive: true,
      createdAt: Date.now()
    },
    {
      id: 'c2',
      scope: 'global',
      sourceStepIndex: 1,
      sourceOptionId: 'opt2_1',
      targetStepIndex: 2,
      targetOptionId: 'opt3_1',
      action: 'disable',
      priority: 1,
      isActive: true,
      createdAt: Date.now()
    },
    {
      id: 'c3',
      scope: 'global',
      sourceStepIndex: 2,
      sourceOptionId: 'opt3_1',
      targetStepIndex: 0,
      targetOptionId: 'opt1_1', // Completes the circle
      action: 'disable',
      priority: 1,
      isActive: true,
      createdAt: Date.now()
    }
  ]
  
  const conflicts = detectCircularReferences(constraints)
  
  if (conflicts.length > 0 && conflicts[0].conflictingConstraints.length === 3) {
    console.log('✅ Complex circular references detected correctly')
    return { success: true, message: 'Multi-step circular references properly detected' }
  } else {
    console.log('❌ Complex circular reference detection failed')
    return { success: false, message: 'Failed to detect complex circular references' }
  }
}

/**
 * Run all tests
 */
export function runAllPriorityTests(): void {
  console.log('🚀 Running Enhanced Priority Logic Tests')
  console.log('=====================================')
  
  const tests = [
    testBasicPriorityApplication,
    testGlobalVsPathBasedPolicies,
    testSamePriorityConflictDetection,
    testCircularReferenceDetection,
    testRangeVsSinglePolicyConflicts,
    testPriorityNormalization,
    testPriorityRecalculationAfterDeletion,
    testComplexCircularReference
  ]
  
  let passed = 0
  let failed = 0
  
  tests.forEach((test, index) => {
    try {
      const result = test()
      if (result.success) {
        passed++
        console.log(`  ✅ Test ${index + 1}: ${result.message}`)
      } else {
        failed++
        console.log(`  ❌ Test ${index + 1}: ${result.message}`)
      }
    } catch (error) {
      failed++
      console.log(`  ❌ Test ${index + 1}: Error - ${error}`)
    }
    console.log('')
  })
  
  console.log('=====================================')
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`)
  console.log(`Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`)
  
  if (failed === 0) {
    console.log('🎉 All tests passed! Priority logic is working correctly.')
  } else {
    console.log('⚠️  Some tests failed. Please review the implementation.')
  }
}

// Export individual test functions for manual execution
export {
  testBasicPriorityApplication,
  testGlobalVsPathBasedPolicies,
  testSamePriorityConflictDetection,
  testCircularReferenceDetection,
  testRangeVsSinglePolicyConflicts,
  testPriorityNormalization,
  testPriorityRecalculationAfterDeletion,
  testComplexCircularReference
}
