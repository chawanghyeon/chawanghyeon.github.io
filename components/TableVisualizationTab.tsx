import React from 'react'
import { Step, PathActivationMap } from '../hooks/useStepManager'

interface TableVisualizationTabProps {
  steps: Step[]
  pathActivations?: PathActivationMap
}

interface WorkflowPath {
  [stepName: string]: string | null
}

const TableVisualizationTab: React.FC<TableVisualizationTabProps> = ({ steps, pathActivations }) => {
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

  // Check if a row is active (fallback to step/option isActive if pathActivations not provided)
  const isRowActive = (row: any[], rowIndex: number): boolean => {
    // If we have per-path activations, use those
    if (pathActivations && Array.isArray(pathActivations[String(rowIndex)])) {
      const arr = pathActivations[String(rowIndex)]
      return arr.every((cellActive, idx) => {
        const option = row[idx]
        if (!option) return false
        if (!steps[idx].isActive) return false
        return !!cellActive && !!option.isActive
      })
    }

    // Fallback: a row is active only if every step and option is active
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
      <div style={{ marginBottom: 8 }}>
        <button
          className="btn-primary small"
          onClick={async () => {
            try {
              // Build HTML table string with inline <s> for strikethrough cells so Excel preserves it
              const cols = ["#", ...stepNames]
              const buildCell = (text: string, inactive: boolean) => {
                const safe = String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
                if (inactive) return `<td style="color: #6b7280;"><s>${safe}</s></td>`
                return `<td>${safe}</td>`
              }

              const rowsHtml = allCombinations.map((row, rIdx) => {
                const idxCell = `<td>${rIdx + 1}</td>`
                const cells = row.map((option, cIdx) => {
                  const cellActive = pathActivations && Array.isArray(pathActivations[String(rIdx)])
                    ? !!pathActivations[String(rIdx)][cIdx]
                    : !!(steps[cIdx].isActive && option.isActive)
                  return buildCell(option.displayName || option.name, !cellActive && option.name !== "-")
                }).join("")
                return `<tr>${idxCell}${cells}</tr>`
              }).join("")

              const html = `<table><thead><tr>${cols.map(c => `<th>${String(c).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</th>`).join("")}</tr></thead><tbody>${rowsHtml}</tbody></table>`

              // Try to write HTML and plain text
              if (navigator.clipboard && (navigator.clipboard as any).write) {
                const blobHtml = new Blob([html], { type: 'text/html' })
                const blobText = new Blob([rowsHtml.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()], { type: 'text/plain' })
                const data = [new ClipboardItem({ 'text/html': blobHtml, 'text/plain': blobText })]
                // @ts-ignore
                await (navigator.clipboard as any).write(data)
              } else if (navigator.clipboard && (navigator.clipboard as any).writeText) {
                // fallback to CSV-like plain text
                const csv = allCombinations.map((row, rIdx) => [String(rIdx + 1), ...row.map(o => o.displayName || o.name)].join('\t')).join('\n')
                await navigator.clipboard.writeText(csv)
              } else {
                alert('클립보드 복사 기능을 사용할 수 없습니다. 브라우저를 업데이트 해보세요.')
              }
              alert('표를 클립보드로 복사했습니다. (HTML 형식, Excel에 붙여넣으면 취소선이 유지됩니다)')
            } catch (err) {
              console.error(err)
              alert('복사에 실패했습니다.')
            }
          }}
        >
          복사하기
        </button>
      </div>
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
                    const isActive = isRowActive(row, index);
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
                        {row.map((option, idx) => {
                          // determine cell active state from pathActivations if available
                          const cellActive = pathActivations && Array.isArray(pathActivations[String(index)])
                            ? !!pathActivations[String(index)][idx]
                            : !!(steps[idx].isActive && option.isActive)
                          return (
                            <td
                              key={option.id || idx}
                              className={!cellActive && option.name !== "-" ? "inactive-cell" : "data-cell"}
                            >
                              <div className="cell-inner">
                                {option.displayName || option.name}
                              </div>
                            </td>
                          )
                        })}
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
