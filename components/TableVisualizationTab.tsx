import React from 'react'
import { Step } from '../hooks/useStepManager'

interface TableVisualizationTabProps {
  steps: Step[]
}

interface WorkflowPath {
  [stepName: string]: string | null
}

const TableVisualizationTab: React.FC<TableVisualizationTabProps> = ({ steps }) => {
  // Generate all combinations of options for each step (Cartesian product)
  function getAllCombinations<T>(arrays: T[][]): T[][] {
    if (arrays.length === 0) return [[]]
    const [first, ...rest] = arrays
    const restCombinations = getAllCombinations(rest)
    return first.flatMap(item => restCombinations.map(comb => [item, ...comb]))
  }

  const stepNames = steps.map((step) => step.displayName || step.name)
  const optionArrays = steps.map((step) => step.options.length > 0 ? step.options : [{ id: '', name: '-', displayName: '-', nextStepActive: true, isActive: true }])
  const allCombinations = getAllCombinations(optionArrays)

  // Check if a row is active
  const isRowActive = (row: any[]): boolean => {
    return row.every((option, idx) => {
      if (!option) return false
      if (!steps[idx].isActive) return false
      if (!option.isActive) return false
      return true
    })
  }

  return (
    <div className="table-container">
      <h2>📊 표 시각화</h2>
      <div id="tableVisualization">
        {steps.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <h3>표 시각화</h3>
            <p>단계를 추가하면 모든 경로가 표로 표시됩니다.</p>
          </div>
        ) : allCombinations.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h3>경로 없음</h3>
            <p>완성된 경로가 없습니다. 단계를 추가해보세요.</p>
          </div>
        ) : (
          <div className="excel-table-wrapper">
            <div className="excel-table-container">
              <table className="excel-table" role="grid">
                <thead>
                  <tr>
                    <th className="row-number-header">#</th>
                    {stepNames.map((stepName, idx) => (
                      <th key={idx}>{stepName}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allCombinations.map((row, index) => {
                    const isActive = isRowActive(row);
                    return (
                      <tr
                        key={index}
                        className={
                          isActive ? "data-row" : "data-row inactive-row"
                        }
                      >
                        <td className="row-number" data-row-index={index}>
                          {index + 1}
                        </td>
                        {row.map((option, idx) => (
                          <td
                            key={option.id || idx}
                            className={
                              !isActive && option.name !== "-"
                                ? "inactive-cell"
                                : "data-cell"
                            }
                          >
                            <div className="cell-inner">
                              {option.displayName || option.name}
                            </div>
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TableVisualizationTab
