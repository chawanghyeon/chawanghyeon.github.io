import React from 'react'
import { Step } from '../../lib/types'
import Button from '../ui/Button'
import Toolbar from '../ui/Toolbar'
import StepItem from './StepItem'

interface WorkflowStepListProps {
  steps: Step[]
  onAddRootStep: () => void
  onUpdateStepName: (stepId: string, name: string) => void
  onUpdateOptionName: (stepId: string, optionId: string, name: string) => void
  onDeleteStep: (stepId: string) => void
  onAddOption: (stepId: string) => void
  onDeleteOption: (stepId: string, optionId: string) => void
  onAddStepAtIndex: (index: number) => void
}

const WorkflowStepList: React.FC<WorkflowStepListProps> = ({
  steps,
  onAddRootStep,
  onUpdateStepName,
  onUpdateOptionName,
  onDeleteStep,
  onAddOption,
  onDeleteOption,
  onAddStepAtIndex,
}) => {
  return (
    <div className="workflow-step-list">
      <Toolbar>
        <div className="flex items-center gap-3">
          <span className="font-semibold text-gray-700">워크플로우 설계</span>
          <Button variant="primary" size="small" onClick={onAddRootStep}>
            + 단계 추가 (Ctrl+Enter)
          </Button>
        </div>
        <div className="text-sm text-gray-500">
          총 {steps.length}개 단계
        </div>
      </Toolbar>

      <div className="steps-container">
        {steps.map((step, index) => (
          <StepItem
            key={step.id}
            step={step}
            stepIndex={index}
            onUpdateStepName={onUpdateStepName}
            onDeleteStep={onDeleteStep}
            onAddOption={onAddOption}
            onDeleteOption={onDeleteOption}
            onUpdateOptionName={onUpdateOptionName}
            onAddStepAtIndex={onAddStepAtIndex}
          />
        ))}

        {steps.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>아직 단계가 없습니다.</p>
            <Button variant="primary" onClick={onAddRootStep} className="mt-2">
              첫 번째 단계 추가
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default WorkflowStepList
