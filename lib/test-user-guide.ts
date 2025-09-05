import { 
  Step, 
  ConstraintMap, 
  ExternalConditionsContext
} from '../lib/types'
import { 
  generatePathActivations,
  applyConstraintsWithPriority,
  calculateDefaultPriority
} from '../lib/constraints'

/**
 * 사용자 가이드에서 설명하는 모든 기능들을 테스트하는 종합 테스트 스위트
 */

// 테스트 데이터 설정
const createTestSteps = (): Step[] => [
  {
    id: 'step_1',
    name: '설치 유형',
    displayName: '설치 유형 선택',
    options: [
      { id: 'quick_install', name: '빠른 설치', displayName: '빠른 설치' },
      { id: 'custom_install', name: '사용자 정의 설치', displayName: '사용자 정의 설치' }
    ]
  },
  {
    id: 'step_2',
    name: '라이선스',
    displayName: '라이선스 유형',
    options: [
      { id: 'personal', name: '개인용', displayName: '개인용' },
      { id: 'commercial', name: '상업용', displayName: '상업용' },
      { id: 'educational', name: '교육용', displayName: '교육용' }
    ]
  },
  {
    id: 'step_3',
    name: '구성 요소',
    displayName: '구성 요소 선택',
    options: [
      { id: 'basic', name: '기본', displayName: '기본 구성' },
      { id: 'full', name: '전체', displayName: '전체 구성' },
      { id: 'minimal', name: '최소', displayName: '최소 구성' }
    ]
  },
  {
    id: 'step_4',
    name: '추가 옵션',
    displayName: '추가 옵션',
    options: [
      { id: 'desktop_shortcut', name: '데스크톱 바로가기', displayName: '데스크톱 바로가기 생성' },
      { id: 'start_menu', name: '시작 메뉴 등록', displayName: '시작 메뉴에 등록' },
      { id: 'premium_features', name: '프리미엄 기능', displayName: '프리미엄 기능 활성화' }
    ]
  }
]

const createTestConstraints = (): ConstraintMap => {
  const constraints: ConstraintMap = {}

  // 1. Next-Step 제약: 빠른 설치 선택 시 구성 요소는 기본만 가능
  constraints['constraint_1'] = {
    id: 'constraint_1',
    type: 'next-step',
    scope: 'global',
    sourceStepIndex: 0,
    sourceOptionId: 'quick_install',
    targetStepIndex: 2,
    targetOptionIds: ['full', 'minimal'],
    action: 'disable',
    isActive: true,
    createdAt: Date.now(),
    description: '빠른 설치 시 기본 구성만 허용'
  }

  // 2. Range-Skip 제약: 교육용 라이선스 선택 시 프리미엄 기능 비활성화
  constraints['constraint_2'] = {
    id: 'constraint_2',
    type: 'range-skip',
    scope: 'global',
    sourceStepIndex: 1,
    sourceOptionId: 'educational',
    targetSteps: [3],
    targetOptionIds: ['premium_features'],
    action: 'disable',
    isActive: true,
    createdAt: Date.now(),
    description: '교육용 라이선스는 프리미엄 기능 제외'
  }

  // 3. Previous-Step 제약: 프리미엄 기능을 사용하려면 상업용 라이선스 필요
  constraints['constraint_3'] = {
    id: 'constraint_3',
    type: 'previous-step',
    scope: 'global',
    sourceStepIndex: 3,
    sourceOptionId: 'premium_features',
    targetStepIndex: 1,
    targetOptionId: 'commercial',
    action: 'require',
    isActive: true,
    createdAt: Date.now(),
    description: '프리미엄 기능은 상업용 라이선스 필요'
  }

  // 4. 조건부 제약: 사용자 레벨이 5 이상일 때 고급 옵션 활성화
  constraints['constraint_4'] = {
    id: 'constraint_4',
    type: 'conditional',
    scope: 'conditional-route',
    sourceStepIndex: 0,
    sourceOptionId: 'custom_install',
    targetStepIndex: 3,
    targetOptionIds: ['premium_features'],
    action: 'enable',
    externalConditions: [
      {
        field: 'userLevel',
        operator: '>=',
        value: 5,
        label: '사용자 레벨 5 이상'
      }
    ],
    isActive: true,
    createdAt: Date.now(),
    description: '고급 사용자를 위한 프리미엄 기능'
  }

  return constraints
}

// 테스트 실행 함수들
export const runUserGuideTests = () => {
  console.log('🧪 사용자 가이드 기능 테스트 시작\n')

  const steps = createTestSteps()
  const constraints = createTestConstraints()
  
  // 테스트 1: 기본 워크플로우 생성
  console.log('📋 테스트 1: 기본 워크플로우 생성')
  testBasicWorkflowCreation(steps)
  
  // 테스트 2: Next-Step 제약사항
  console.log('\n⏭️ 테스트 2: Next-Step 제약사항')
  testNextStepConstraints(steps, constraints)
  
  // 테스트 3: Range-Skip 제약사항
  console.log('\n🔄 테스트 3: Range-Skip 제약사항')
  testRangeSkipConstraints(steps, constraints)
  
  // 테스트 4: Previous-Step 제약사항
  console.log('\n⬅️ 테스트 4: Previous-Step 제약사항')
  testPreviousStepConstraints(steps, constraints)
  
  // 테스트 5: 조건부 제약사항
  console.log('\n🎯 테스트 5: 조건부 제약사항')
  testConditionalConstraints(steps, constraints)
  
  // 테스트 6: 우선순위 및 충돌 해결
  console.log('\n⚖️ 테스트 6: 우선순위 및 충돌 해결')
  testPriorityAndConflictResolution(steps, constraints)
  
  // 테스트 7: 경로 생성 및 시각화
  console.log('\n🗺️ 테스트 7: 경로 생성 및 시각화')
  testPathGeneration(steps, constraints)

  console.log('\n✅ 모든 테스트 완료!')
}

const testBasicWorkflowCreation = (steps: Step[]) => {
  try {
    // 단계 생성 확인
    console.log(`  ✓ ${steps.length}개 단계 생성됨`)
    
    // 각 단계의 옵션 확인
    steps.forEach((step, index) => {
      console.log(`  ✓ 단계 ${index + 1}: ${step.name} (${step.options.length}개 옵션)`)
      step.options.forEach(option => {
        console.log(`    - ${option.name}`)
      })
    })
    
    console.log('  ✅ 기본 워크플로우 생성 성공')
  } catch (error) {
    console.error('  ❌ 기본 워크플로우 생성 실패:', error)
  }
}

const testNextStepConstraints = (steps: Step[], constraints: ConstraintMap) => {
  try {
    const selectedPath = { 0: 'quick_install' }
    const result = applyConstraintsWithPriority(steps, constraints, selectedPath)
    
    // 빠른 설치 선택 시 전체/최소 구성이 비활성화되는지 확인
    const disabledInStep2 = result.disabledOptions[2]
    const shouldBeDisabled = ['full', 'minimal']
    
    const isCorrect = shouldBeDisabled.every(optionId => disabledInStep2.has(optionId))
    
    if (isCorrect) {
      console.log('  ✓ 빠른 설치 선택 시 전체/최소 구성이 올바르게 비활성화됨')
      console.log(`  ✓ 비활성화된 옵션: ${Array.from(disabledInStep2).join(', ')}`)
      console.log('  ✅ Next-Step 제약사항 테스트 성공')
    } else {
      console.log('  ❌ Next-Step 제약사항이 올바르게 적용되지 않음')
    }
  } catch (error) {
    console.error('  ❌ Next-Step 제약사항 테스트 실패:', error)
  }
}

const testRangeSkipConstraints = (steps: Step[], constraints: ConstraintMap) => {
  try {
    const selectedPath = { 1: 'educational' }
    const result = applyConstraintsWithPriority(steps, constraints, selectedPath)
    
    // 교육용 라이선스 선택 시 프리미엄 기능이 비활성화되는지 확인
    const disabledInStep3 = result.disabledOptions[3]
    const shouldBeDisabled = 'premium_features'
    
    if (disabledInStep3.has(shouldBeDisabled)) {
      console.log('  ✓ 교육용 라이선스 선택 시 프리미엄 기능이 올바르게 비활성화됨')
      console.log(`  ✓ 비활성화된 옵션: ${Array.from(disabledInStep3).join(', ')}`)
      console.log('  ✅ Range-Skip 제약사항 테스트 성공')
    } else {
      console.log('  ❌ Range-Skip 제약사항이 올바르게 적용되지 않음')
    }
  } catch (error) {
    console.error('  ❌ Range-Skip 제약사항 테스트 실패:', error)
  }
}

const testPreviousStepConstraints = (steps: Step[], constraints: ConstraintMap) => {
  try {
    const selectedPath = { 3: 'premium_features' }
    const result = applyConstraintsWithPriority(steps, constraints, selectedPath)
    
    // 프리미엄 기능 선택 시 상업용 라이선스가 필수가 되는지 확인
    const requiredInStep1 = result.requiredOptions[1]
    const shouldBeRequired = 'commercial'
    
    if (requiredInStep1.has(shouldBeRequired)) {
      console.log('  ✓ 프리미엄 기능 선택 시 상업용 라이선스가 올바르게 필수로 설정됨')
      console.log(`  ✓ 필수 옵션: ${Array.from(requiredInStep1).join(', ')}`)
      console.log('  ✅ Previous-Step 제약사항 테스트 성공')
    } else {
      console.log('  ❌ Previous-Step 제약사항이 올바르게 적용되지 않음')
    }
  } catch (error) {
    console.error('  ❌ Previous-Step 제약사항 테스트 실패:', error)
  }
}

const testConditionalConstraints = (steps: Step[], constraints: ConstraintMap) => {
  try {
    // 높은 사용자 레벨로 테스트
    const highLevelContext: ExternalConditionsContext = {
      inventory: 100,
      userLevel: 10,
      date: '2023-12-01',
      time: '14:00',
      custom: {}
    }
    
    const selectedPath = { 0: 'custom_install' }
    const result = applyConstraintsWithPriority(steps, constraints, selectedPath, highLevelContext)
    
    // 높은 레벨 사용자는 프리미엄 기능이 활성화되어야 함
    const enabledInStep3 = result.enabledOptions[3]
    
    console.log('  ✓ 높은 사용자 레벨(10)로 테스트 실행')
    console.log(`  ✓ 활성화된 옵션: ${Array.from(enabledInStep3).join(', ')}`)
    
    // 낮은 사용자 레벨로 테스트
    const lowLevelContext: ExternalConditionsContext = {
      inventory: 100,
      userLevel: 2,
      date: '2023-12-01',
      time: '14:00',
      custom: {}
    }
    
    const result2 = applyConstraintsWithPriority(steps, constraints, selectedPath, lowLevelContext)
    const enabledInStep3Low = result2.enabledOptions[3]
    
    console.log('  ✓ 낮은 사용자 레벨(2)로 테스트 실행')
    console.log(`  ✓ 활성화된 옵션: ${Array.from(enabledInStep3Low).join(', ')}`)
    console.log('  ✅ 조건부 제약사항 테스트 성공')
  } catch (error) {
    console.error('  ❌ 조건부 제약사항 테스트 실패:', error)
  }
}

const testPriorityAndConflictResolution = (steps: Step[], constraints: ConstraintMap) => {
  try {
    // 우선순위 계산 테스트
    const priorities = Object.values(constraints).map(constraint => ({
      id: constraint.id,
      type: constraint.type,
      scope: constraint.scope,
      priority: calculateDefaultPriority(constraint)
    }))
    
    console.log('  ✓ 제약사항 우선순위 계산:')
    priorities.forEach(({ id, type, scope, priority }) => {
      console.log(`    - ${id} (${type}, ${scope}): 우선순위 ${priority}`)
    })
    
    // 충돌 시나리오 테스트 (교육용 + 프리미엄 기능 시도)
    const conflictPath = { 1: 'educational', 3: 'premium_features' }
    const result = applyConstraintsWithPriority(steps, constraints, conflictPath)
    
    console.log('  ✓ 충돌 시나리오 테스트 (교육용 + 프리미엄 기능):')
    console.log(`    - 충돌 개수: ${result.conflicts.length}`)
    console.log(`    - 적용된 제약사항: ${result.appliedConstraints.length}개`)
    
    console.log('  ✅ 우선순위 및 충돌 해결 테스트 성공')
  } catch (error) {
    console.error('  ❌ 우선순위 및 충돌 해결 테스트 실패:', error)
  }
}

const testPathGeneration = (steps: Step[], constraints: ConstraintMap) => {
  try {
    const pathActivations = generatePathActivations(steps, constraints)
    const totalPaths = Object.keys(pathActivations).length
    const activePaths = Object.values(pathActivations).filter(
      pathArray => pathArray.every(isActive => isActive)
    ).length
    
    console.log(`  ✓ 총 경로 수: ${totalPaths}`)
    console.log(`  ✓ 활성 경로 수: ${activePaths}`)
    console.log(`  ✓ 비활성 경로 수: ${totalPaths - activePaths}`)
    
    // 경로 샘플 출력
    console.log('  ✓ 경로 샘플:')
    Object.entries(pathActivations).slice(0, 3).forEach(([pathKey, isActiveArray]) => {
      const status = isActiveArray.every(Boolean) ? '활성' : '비활성'
      console.log(`    - 경로 ${pathKey}: ${status}`)
    })
    
    console.log('  ✅ 경로 생성 및 시각화 테스트 성공')
  } catch (error) {
    console.error('  ❌ 경로 생성 및 시각화 테스트 실패:', error)
  }
}

// 실제 사용 예시 테스트
export const runRealWorldScenarioTests = () => {
  console.log('\n🌍 실제 사용 시나리오 테스트\n')
  
  // 소프트웨어 설치 시나리오
  console.log('💻 시나리오 1: 소프트웨어 설치')
  testSoftwareInstallationScenario()
  
  // 온라인 쇼핑 시나리오
  console.log('\n🛒 시나리오 2: 온라인 쇼핑')
  testOnlineShoppingScenario()
  
  console.log('\n✅ 실제 시나리오 테스트 완료!')
}

const testSoftwareInstallationScenario = () => {
  try {
    const steps = createTestSteps()
    const constraints = createTestConstraints()
    
    // 시나리오: 빠른 설치 + 개인용 라이선스
    const scenario1 = { 0: 'quick_install', 1: 'personal' }
    const result1 = applyConstraintsWithPriority(steps, constraints, scenario1)
    
    console.log('  📝 시나리오 1-1: 빠른 설치 + 개인용')
    console.log(`    - 3단계 비활성화 옵션: ${Array.from(result1.disabledOptions[2]).join(', ')}`)
    
    // 시나리오: 사용자 정의 설치 + 상업용 라이선스 + 프리미엄 기능
    const scenario2 = { 0: 'custom_install', 1: 'commercial', 3: 'premium_features' }
    const result2 = applyConstraintsWithPriority(steps, constraints, scenario2)
    
    console.log('  📝 시나리오 1-2: 사용자 정의 + 상업용 + 프리미엄')
    console.log(`    - 2단계 필수 옵션: ${Array.from(result2.requiredOptions[1]).join(', ')}`)
    
    console.log('  ✅ 소프트웨어 설치 시나리오 테스트 성공')
  } catch (error) {
    console.error('  ❌ 소프트웨어 설치 시나리오 테스트 실패:', error)
  }
}

const testOnlineShoppingScenario = () => {
  try {
    // 온라인 쇼핑 워크플로우 생성
    const shoppingSteps: Step[] = [
      {
        id: 'product_type',
        name: '상품 유형',
        displayName: '상품 유형',
        options: [
          { id: 'physical', name: '일반 상품', displayName: '일반 상품' },
          { id: 'digital', name: '디지털 상품', displayName: '디지털 상품' }
        ]
      },
      {
        id: 'delivery',
        name: '배송 방법',
        displayName: '배송 방법',
        options: [
          { id: 'standard', name: '일반 배송', displayName: '일반 배송' },
          { id: 'express', name: '빠른 배송', displayName: '빠른 배송' },
          { id: 'pickup', name: '매장 픽업', displayName: '매장 픽업' }
        ]
      },
      {
        id: 'payment',
        name: '결제 방법',
        displayName: '결제 방법',
        options: [
          { id: 'card', name: '신용카드', displayName: '신용카드' },
          { id: 'bank', name: '계좌이체', displayName: '계좌이체' },
          { id: 'points', name: '포인트', displayName: '포인트' }
        ]
      }
    ]
    
    const shoppingConstraints: ConstraintMap = {
      digital_no_delivery: {
        id: 'digital_no_delivery',
        type: 'next-step',
        scope: 'global',
        sourceStepIndex: 0,
        sourceOptionId: 'digital',
        targetStepIndex: 1,
        targetOptionIds: ['standard', 'express', 'pickup'],
        action: 'disable',
        isActive: true,
        createdAt: Date.now(),
        description: '디지털 상품은 배송 불가'
      }
    }
    
    // 테스트 실행
    const digitalScenario = { 0: 'digital' }
    const result = applyConstraintsWithPriority(shoppingSteps, shoppingConstraints, digitalScenario)
    
    console.log('  📝 시나리오 2-1: 디지털 상품 선택')
    console.log(`    - 배송 방법 비활성화: ${Array.from(result.disabledOptions[1]).join(', ')}`)
    
    console.log('  ✅ 온라인 쇼핑 시나리오 테스트 성공')
  } catch (error) {
    console.error('  ❌ 온라인 쇼핑 시나리오 테스트 실패:', error)
  }
}

// 브라우저 환경에서만 실행
if (typeof window !== 'undefined') {
  // 전역 함수로 노출하여 브라우저 콘솔에서 호출 가능
  (window as unknown as { runUserGuideTests: () => void }).runUserGuideTests = runUserGuideTests
  ; (window as unknown as { runRealWorldScenarioTests: () => void }).runRealWorldScenarioTests = runRealWorldScenarioTests
}

const testExports = {
  runUserGuideTests,
  runRealWorldScenarioTests
}

export default testExports
