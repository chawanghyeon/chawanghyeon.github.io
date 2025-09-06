import { WorkflowConstraint, Step, UserFriendlyConstraint } from './types'

// Translation mappings for user-friendly language
export const TRANSLATIONS = {
  // Technical terms to user-friendly terms
  constraints: '정책',
  globalConstraint: '모든 경우에 적용',
  routeBasedConstraint: '특정 조건에서만 적용', 
  conditionalConstraint: '상황에 따라 적용',
  
  // Actions
  disable: '차단',
  enable: '허용',
  require: '필수',
  
  // Scopes
  global: '전체 적용',
  'route-based': '조건부 적용',
  'conditional-route': '상황별 적용',
  
  // Condition fields
  inventory: '재고',
  userLevel: '사용자 레벨',
  date: '날짜',
  time: '시간',
  custom: '사용자 정의',
  
  // Operators
  '>=': '이상',
  '<=': '이하',
  '==': '같음',
  '!=': '다름',
  '>': '초과',
  '<': '미만',
  contains: '포함',
  'not-contains': '포함하지 않음',
  
  // Priority levels
  low: '낮음',
  medium: '보통',
  high: '높음',
  
  // Severity levels
  info: '정보',
  warning: '주의',
  error: '오류'
}

// Convert technical constraint to user-friendly format
export function translateConstraintToUserFriendly(
  constraint: WorkflowConstraint, 
  steps: Step[]
): UserFriendlyConstraint {
  const sourceStep = steps[constraint.sourceStepIndex]
  const sourceOption = sourceStep?.options.find(opt => opt.id === constraint.sourceOptionId)
  
  // Determine target information
  let targetSteps: string[] = []
  let targetOptions: string[] = []
  
  if (constraint.targetStepIndex !== undefined) {
    const targetStep = steps[constraint.targetStepIndex]
    targetSteps = [targetStep?.displayName || targetStep?.name || `단계 ${constraint.targetStepIndex + 1}`]
    
    if (constraint.targetOptionIds) {
      targetOptions = constraint.targetOptionIds.map(optId => {
        const option = targetStep?.options.find(opt => opt.id === optId)
        return option?.displayName || option?.name || optId
      })
    }
  }
  
  if (constraint.targetSteps) {
    targetSteps = constraint.targetSteps.map(stepIdx => {
      const step = steps[stepIdx]
      return step?.displayName || step?.name || `단계 ${stepIdx + 1}`
    })
  }
  
  // Generate user-friendly description
  const description = generateUserFriendlyDescription(constraint, steps)
  
  // Determine category
  const category = categorizeConstraint(constraint)
  
  // Calculate impact level
  const impact = calculateImpactLevel(constraint, steps)
  
  // Build conditions array
  const conditions = buildConditionsText(constraint, steps)
  
  return {
    id: constraint.id,
    title: generateConstraintTitle(constraint, steps),
    description,
    category,
    impact,
    isActive: constraint.isActive,
    createdAt: constraint.createdAt,
    lastModified: constraint.createdAt, // Could be updated if we track modifications
    appliesTo: {
      sourceStep: sourceStep?.displayName || sourceStep?.name || `단계 ${constraint.sourceStepIndex + 1}`,
      sourceOption: sourceOption?.displayName || sourceOption?.name || '알 수 없는 옵션',
      targetSteps,
      targetOptions
    },
    conditions,
    action: TRANSLATIONS[constraint.action || 'disable'] as '차단' | '허용' | '필수',
    priority: constraint.priority || 50
  }
}

function generateConstraintTitle(constraint: WorkflowConstraint, steps: Step[]): string {
  const sourceStep = steps[constraint.sourceStepIndex]
  const sourceOption = sourceStep?.options.find(opt => opt.id === constraint.sourceOptionId)
  const action = TRANSLATIONS[constraint.action || 'disable']
  
  if (constraint.targetStepIndex !== undefined) {
    const targetStep = steps[constraint.targetStepIndex]
    return `${sourceStep?.displayName || sourceStep?.name} → ${targetStep?.displayName || targetStep?.name} ${action}`
  }
  
  return `${sourceStep?.displayName || sourceStep?.name}: ${sourceOption?.displayName || sourceOption?.name} 선택 시 ${action}`
}

function generateUserFriendlyDescription(constraint: WorkflowConstraint, steps: Step[]): string {
  const sourceStep = steps[constraint.sourceStepIndex]
  const sourceOption = sourceStep?.options.find(opt => opt.id === constraint.sourceOptionId)
  const action = TRANSLATIONS[constraint.action || 'disable']
  
  let description = `"${sourceStep?.displayName || sourceStep?.name}"에서 "${sourceOption?.displayName || sourceOption?.name}"을(를) 선택하면`
  
  // Add target information
  if (constraint.targetStepIndex !== undefined) {
    const targetStep = steps[constraint.targetStepIndex]
    if (constraint.targetOptionIds && constraint.targetOptionIds.length > 0) {
      const targetOptions = constraint.targetOptionIds.map(optId => {
        const option = targetStep?.options.find(opt => opt.id === optId)
        return option?.displayName || option?.name || optId
      }).join(', ')
      description += ` "${targetStep?.displayName || targetStep?.name}"의 [${targetOptions}] 옵션을 ${action}합니다.`
    } else {
      description += ` "${targetStep?.displayName || targetStep?.name}"의 모든 옵션을 ${action}합니다.`
    }
  }
  
  if (constraint.targetSteps && constraint.targetSteps.length > 0) {
    const targetStepNames = constraint.targetSteps.map(stepIdx => {
      const step = steps[stepIdx]
      return step?.displayName || step?.name || `단계 ${stepIdx + 1}`
    }).join(', ')
    description += ` [${targetStepNames}] 단계를 ${action}합니다.`
  }
  
  // Add condition information
  if (constraint.routeConditions && constraint.routeConditions.length > 0) {
    const conditionsText = constraint.routeConditions.map(condition => {
      const conditionStep = steps[condition.stepIndex]
      const conditionOption = conditionStep?.options.find(opt => opt.id === condition.optionId)
      return `"${conditionStep?.displayName || conditionStep?.name}: ${conditionOption?.displayName || conditionOption?.name}"`
    }).join(' 그리고 ')
    description += ` (조건: ${conditionsText}가 선택된 경우에만)`
  }
  
  if (constraint.externalConditions && constraint.externalConditions.length > 0) {
    const conditionsText = constraint.externalConditions.map(condition => {
      const field = TRANSLATIONS[condition.field] || condition.field
      const operator = TRANSLATIONS[condition.operator] || condition.operator
      return `${field} ${operator} ${condition.value}`
    }).join(' 그리고 ')
    description += ` (추가 조건: ${conditionsText})`
  }
  
  return description
}

function categorizeConstraint(constraint: WorkflowConstraint): string {
  if (constraint.externalConditions && constraint.externalConditions.length > 0) {
    return '비즈니스 로직'
  }
  
  if (constraint.routeConditions && constraint.routeConditions.length > 0) {
    return '플로우 제어'
  }
  
  switch (constraint.action) {
    case 'require':
      return '검증 및 확인'
    case 'enable':
      return '사용자 경험'
    case 'disable':
    default:
      return '플로우 제어'
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function calculateImpactLevel(constraint: WorkflowConstraint, _steps: Step[]): 'low' | 'medium' | 'high' {
  let impactScore = 0
  
  // High priority constraints have higher impact
  if (constraint.priority && constraint.priority > 80) impactScore += 2
  else if (constraint.priority && constraint.priority > 50) impactScore += 1
  
  // Action type affects impact
  if (constraint.action === 'require') impactScore += 2
  else if (constraint.action === 'disable') impactScore += 1
  
  // Scope affects impact
  if (constraint.scope === 'global') impactScore += 2
  else if (constraint.scope === 'conditional-route') impactScore += 1
  
  // Multiple targets increase impact
  if (constraint.targetSteps && constraint.targetSteps.length > 2) impactScore += 1
  if (constraint.targetOptionIds && constraint.targetOptionIds.length > 3) impactScore += 1
  
  if (impactScore >= 4) return 'high'
  if (impactScore >= 2) return 'medium'
  return 'low'
}

function buildConditionsText(constraint: WorkflowConstraint, steps: Step[]): string[] {
  const conditions: string[] = []
  
  if (constraint.routeConditions && constraint.routeConditions.length > 0) {
    constraint.routeConditions.forEach(condition => {
      const conditionStep = steps[condition.stepIndex]
      const conditionOption = conditionStep?.options.find(opt => opt.id === condition.optionId)
      conditions.push(`${conditionStep?.displayName || conditionStep?.name}: ${conditionOption?.displayName || conditionOption?.name}`)
    })
  }
  
  if (constraint.externalConditions && constraint.externalConditions.length > 0) {
    constraint.externalConditions.forEach(condition => {
      const field = TRANSLATIONS[condition.field] || condition.field
      const operator = TRANSLATIONS[condition.operator] || condition.operator
      conditions.push(`${field} ${operator} ${condition.value}`)
    })
  }
  
  return conditions
}

// Generate natural language documentation in Korean
export function generatePolicyDocumentation(constraints: WorkflowConstraint[], steps: Step[]): string {
  const userFriendlyConstraints = constraints.map(c => translateConstraintToUserFriendly(c, steps))
  
  let documentation = '# 워크플로우 정책 가이드\n\n'
  documentation += `생성일: ${new Date().toLocaleDateString('ko-KR')}\n\n`
  documentation += '이 문서는 현재 설정된 모든 워크플로우 정책을 설명합니다.\n\n'
  
  // Group by category
  const categories = {
    '플로우 제어': userFriendlyConstraints.filter(c => c.category === '플로우 제어'),
    '검증 및 확인': userFriendlyConstraints.filter(c => c.category === '검증 및 확인'),
    '비즈니스 로직': userFriendlyConstraints.filter(c => c.category === '비즈니스 로직'),
    '사용자 경험': userFriendlyConstraints.filter(c => c.category === '사용자 경험')
  }
  
  Object.entries(categories).forEach(([category, constraintList]) => {
    if (constraintList.length === 0) return
    
    documentation += `## ${category}\n\n`
    
    constraintList.forEach((constraint, index) => {
      documentation += `### ${index + 1}. ${constraint.title}\n\n`
      documentation += `**설명:** ${constraint.description}\n\n`
      documentation += `**영향도:** ${constraint.impact === 'high' ? '높음' : constraint.impact === 'medium' ? '보통' : '낮음'}\n\n`
      documentation += `**상태:** ${constraint.isActive ? '활성' : '비활성'}\n\n`
      
      if (constraint.conditions.length > 0) {
        documentation += `**적용 조건:**\n`
        constraint.conditions.forEach(condition => {
          documentation += `- ${condition}\n`
        })
        documentation += '\n'
      }
      
      documentation += '---\n\n'
    })
  })
  
  // Add summary
  const activeCount = userFriendlyConstraints.filter(c => c.isActive).length
  const totalCount = userFriendlyConstraints.length
  
  documentation += `## 요약\n\n`
  documentation += `- 총 정책 수: ${totalCount}개\n`
  documentation += `- 활성 정책: ${activeCount}개\n`
  documentation += `- 비활성 정책: ${totalCount - activeCount}개\n\n`
  
  Object.entries(categories).forEach(([category, constraintList]) => {
    if (constraintList.length > 0) {
      documentation += `- ${category}: ${constraintList.length}개\n`
    }
  })
  
  return documentation
}

// Generate impact analysis report
export function generateImpactAnalysis(constraints: WorkflowConstraint[], steps: Step[]): string {
  const userFriendlyConstraints = constraints.map(c => translateConstraintToUserFriendly(c, steps))
  
  let analysis = '# 정책 영향 분석 보고서\n\n'
  analysis += `분석일: ${new Date().toLocaleDateString('ko-KR')}\n\n`
  
  const highImpact = userFriendlyConstraints.filter(c => c.impact === 'high')
  const mediumImpact = userFriendlyConstraints.filter(c => c.impact === 'medium')
  const lowImpact = userFriendlyConstraints.filter(c => c.impact === 'low')
  
  analysis += `## 영향도 분석\n\n`
  analysis += `- 높은 영향도: ${highImpact.length}개\n`
  analysis += `- 보통 영향도: ${mediumImpact.length}개\n`
  analysis += `- 낮은 영향도: ${lowImpact.length}개\n\n`
  
  if (highImpact.length > 0) {
    analysis += `### 높은 영향도 정책\n\n`
    highImpact.forEach((constraint, index) => {
      analysis += `${index + 1}. **${constraint.title}**\n`
      analysis += `   - ${constraint.description}\n\n`
    })
  }
  
  return analysis
}
