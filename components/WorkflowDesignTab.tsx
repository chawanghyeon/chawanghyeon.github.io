import React from 'react'
import { Step, StepOption } from '../hooks/useStepManager'

interface WorkflowDesignTabProps {
  steps: Record<string, Step>;
  rootSteps: string[];
  onAddRootStep: () => void;
  onAddNextStep: (parentStepId: string, parentOptionId: string) => void;
  onUpdateStepName: (stepId: string, name: string) => void;
  onUpdateOptionName: (stepId: string, optionId: string, name: string) => void;
  onDeleteStep: (stepId: string) => void;
  onAddOption: (stepId: string) => void;
  onDeleteOption: (stepId: string, optionId: string) => void;
  onToggleStepActive: (stepId: string, isActive: boolean) => void;
  onToggleOptionActive: (stepId: string, optionId: string, isActive: boolean) => void;
  onToggleStepCollapse: (stepId: string) => void;
  onToggleOptionCollapse: (stepId: string, optionId: string) => void;
}

const WorkflowDesignTab: React.FC<WorkflowDesignTabProps> = ({
  steps,
  rootSteps,
  onAddRootStep,
  onAddNextStep,
  onUpdateStepName,
  onUpdateOptionName,
  onDeleteStep,
  onAddOption,
  onDeleteOption,
  onToggleStepActive,
  onToggleOptionActive,
  onToggleStepCollapse,
  onToggleOptionCollapse
}) => {
  // visited set을 사용해 무한 재귀 방지
  const renderStepNode = (
    stepId: string,
    level: number = 0,
    visited: Set<string> = new Set()
  ): React.ReactNode => {
    if (visited.has(stepId)) {
      return <div key={stepId} className="tree-node cycle-warning">⚠️ 순환 참조</div>;
    }
    const step: Step | undefined = steps[stepId];
    if (!step) return null;
    const hasChildSteps = step.options.some((option: StepOption) => option.nextSteps.length > 0);
    const newVisited = new Set(visited);
    newVisited.add(stepId);
    return (
      <div key={stepId} className={`tree-node ${step.isActive ? '' : 'inactive'}`}>
        <div className="step-box">
          <div className="step-header">
            <div className="step-controls">
              {(hasChildSteps || step.options.length > 0) && (
                <button
                  type="button"
                  className={`collapse-btn step-collapse-btn ${step.isCollapsed ? 'collapsed' : 'expanded'}`}
                  onClick={() => onToggleStepCollapse(stepId)}
                  title={step.isCollapsed ? '펼치기' : '접기'}
                >
                  {step.isCollapsed ? '▶' : '▼'}
                </button>
              )}
              <label className="checkbox-wrapper">
                <input
                  type="checkbox"
                  checked={step.isActive}
                  onChange={(e) => onToggleStepActive(stepId, e.target.checked)}
                  className="step-checkbox"
                />
                <span className="checkbox-text">활성화</span>
              </label>
            </div>
            <div className="step-actions">
              <button
                type="button"
                onClick={() => onAddOption(stepId)}
                className="btn-secondary btn-small"
                title="선택지 추가"
              >
                + 선택지
              </button>
              <button
                type="button"
                onClick={() => onDeleteStep(stepId)}
                className="btn-danger btn-small"
                title="단계 삭제"
              >
                삭제
              </button>
            </div>
          </div>
          <div className="step-content">
            <input
              type="text"
              className={`step-input ${step.isActive ? '' : 'disabled'}`}
              value={step.displayName}
              onChange={(e) => onUpdateStepName(stepId, e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && step.isActive && step.parentStepId && step.parentOptionId) {
                  onAddNextStep(step.parentStepId, step.parentOptionId);
                }
              }}
              placeholder="단계 이름을 입력하세요"
              disabled={!step.isActive}
            />
          </div>
        </div>

        {/* Options - only show if step is not collapsed */}
        {!step.isCollapsed && (
          <div className="options-container">
            {step.options.map((option: StepOption, index: number) => (
              <div key={option.id} className={`option-branch ${option.isActive ? '' : 'inactive'}`}>
                <div className="tree-connector"></div>
                <div className="option-box">
                  <div className="option-header">
                    <div className="option-controls">
                      <span className="option-indicator">↳</span>
                      {option.nextSteps.length > 0 && (
                        <button
                          type="button"
                          className={`collapse-btn option-collapse-btn ${option.isCollapsed ? 'collapsed' : 'expanded'}`}
                          onClick={() => onToggleOptionCollapse(stepId, option.id)}
                          title={option.isCollapsed ? '펼치기' : '접기'}
                        >
                          {option.isCollapsed ? '▶' : '▼'}
                        </button>
                      )}
                      <label className="checkbox-wrapper">
                        <input
                          type="checkbox"
                          checked={option.isActive}
                          onChange={(e) => onToggleOptionActive(stepId, option.id, e.target.checked)}
                          className="option-checkbox"
                        />
                        <span className="checkbox-text">활성화</span>
                      </label>
                    </div>
                    <div className="option-actions">
                      <button
                        type="button"
                        onClick={() => onAddNextStep(stepId, option.id)}
                        className="btn-secondary btn-small"
                        title="다음 단계 추가"
                      >
                        + 다음단계
                      </button>
                      {step.options.length > 1 && (
                        <button
                          type="button"
                          onClick={() => onDeleteOption(stepId, option.id)}
                          className="btn-danger btn-small"
                          title="선택지 삭제"
                        >
                          삭제
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="option-content">
                    <input
                      type="text"
                      className={`option-input ${option.isActive ? '' : 'disabled'}`}
                      value={option.displayName}
                      onChange={(e) => onUpdateOptionName(stepId, option.id, e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && option.isActive) {
                          onAddOption(stepId);
                        }
                      }}
                      placeholder="선택지 이름을 입력하세요"
                      disabled={!option.isActive}
                    />
                  </div>
                </div>

                {/* Child steps */}
                {option.nextSteps.length > 0 && !option.isCollapsed && (
                  <div className="children-container">
                    {option.nextSteps.map((nextStepId: string) => renderStepNode(nextStepId, level + 1, newVisited))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="design-container">
      <div className="toolbar">
        <button 
          onClick={() => {
            console.log('🔴 Button clicked!')
            onAddRootStep()
            console.log('🔴 onAddRootStep called!')
          }} 
          className="primary-btn"
        >
          <span className="btn-icon">➕</span>
          <span className="btn-text">단계 추가하기</span>
        </button>
        <div className="save-status">자동 저장됨</div>
      </div>
      
      <div className="workflow-canvas">
        {rootSteps.length === 0 ? (
          <div className="empty-state">
            <p>아직 워크플로우가 없습니다.</p>
            <p>단계를 추가해주세요.</p>
          </div>
        ) : (
          rootSteps.map((stepId: string) => renderStepNode(stepId, 0, new Set()))
        )}
      </div>
    </div>
  )
}

export default WorkflowDesignTab
