import React from 'react'
import { Step } from '../../lib/types'
import AutoResizeInput from '../AutoResizeInput'
import Button from '../ui/Button'

interface StepItemProps {
  step: Step
  stepIndex: number
  onUpdateStepName: (stepId: string, name: string) => void
  onDeleteStep: (stepId: string) => void
  onAddOption: (stepId: string) => void
  onDeleteOption: (stepId: string, optionId: string) => void
  onUpdateOptionName: (stepId: string, optionId: string, name: string) => void
  onAddStepAtIndex: (index: number) => void
}

const StepItem: React.FC<StepItemProps> = ({
  step,
  stepIndex,
  onUpdateStepName,
  onDeleteStep,
  onAddOption,
  onDeleteOption,
  onUpdateOptionName,
  onAddStepAtIndex,
}) => {
  return (
    <div className="step-item mb-4 p-4 border border-gray-200 rounded-lg bg-white">
      <div className="flex items-center gap-3 mb-3">
        <strong className="text-gray-700">{step.name}</strong>
        <AutoResizeInput
          value={step.displayName}
          onChange={(e) => onUpdateStepName(step.id, e.target.value)}
          placeholder="단계 설명을 입력하세요"
          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
        />
        <Button 
          variant="danger" 
          size="small" 
          onClick={() => onDeleteStep(step.id)}
        >
          삭제
        </Button>
      </div>

      <div className="options-container">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium text-gray-600">선택지:</span>
          <Button 
            variant="primary" 
            size="small" 
            onClick={() => onAddOption(step.id)}
          >
            + 선택지 추가
          </Button>
        </div>

        <div className="options-list space-y-2">
          {step.options.map((option) => (
            <div key={option.id} className="flex items-center gap-2">
              <span className="text-sm text-gray-500 w-16">{option.name}</span>
              <AutoResizeInput
                value={option.displayName}
                onChange={(e) => onUpdateOptionName(step.id, option.id, e.target.value)}
                placeholder="선택지 설명을 입력하세요"
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
              />
              {step.options.length > 1 && (
                <Button 
                  variant="danger" 
                  size="small" 
                  onClick={() => onDeleteOption(step.id, option.id)}
                >
                  삭제
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100">
        <Button 
          variant="link" 
          size="small" 
          onClick={() => onAddStepAtIndex(stepIndex)}
        >
          + 다음에 단계 추가
        </Button>
      </div>
    </div>
  )
}

export default StepItem
