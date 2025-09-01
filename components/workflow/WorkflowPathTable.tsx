import React from 'react'
import { Step, PathActivationMap, TableCellPosition } from '../../lib/types'
import { getAllCombinations } from '../../lib/utils'
import MenuPortal from '../MenuPortal'
import TextDetailTooltip from '../ui/TextDetailTooltip'

interface WorkflowPathTableProps {
  steps: Step[]
  pathActivations: PathActivationMap
  onToggleOptionActive: (pathKey: string, stepIdx: number, isActive: boolean) => void
}

const WorkflowPathTable: React.FC<WorkflowPathTableProps> = ({
  steps,
  pathActivations,
  onToggleOptionActive,
}) => {
  const [cellAnchorRect, setCellAnchorRect] = React.useState<DOMRect | null>(null)
  const [selectedCell, setSelectedCell] = React.useState<TableCellPosition | null>(null)

  const tableRef = React.useRef<HTMLTableElement | null>(null)

  // Get all possible paths
  const optionArrays = steps.map((step) => step.options)
  const allPaths = getAllCombinations(optionArrays)

  // Close menu when clicking outside
  React.useEffect(() => {
    const onDocClick = () => {
      if (!tableRef.current) return
      setSelectedCell(null)
    }
    document.addEventListener("click", onDocClick)
    return () => document.removeEventListener("click", onDocClick)
  }, [])

  const handleCellClick = (pathKey: string, colIdx: number, event: React.MouseEvent) => {
    event.stopPropagation()
    const rect = (event.target as HTMLElement).getBoundingClientRect()
    setCellAnchorRect(rect)
    setSelectedCell({ pathKey, colIdx })
  }

  const handleToggleActive = (pathKey: string, colIdx: number, isActive: boolean) => {
    onToggleOptionActive(pathKey, colIdx, isActive)
    setSelectedCell(null)
  }

  const isPathActive = (pathKey: string) => {
    const activations = pathActivations[pathKey]
    return activations && activations.every(Boolean)
  }

  const isCellActive = (pathKey: string, colIdx: number) => {
    const activations = pathActivations[pathKey]
    return activations?.[colIdx] ?? true
  }

  return (
    <div className="workflow-path-table-container" style={{ overflowX: "auto", width: "100%" }}>
      <div className="excel-table-wrapper">
        <table 
          ref={tableRef} 
          className="excel-table"
          style={{ 
            minWidth: `${Math.max(600, steps.length * 150 + 100)}px`,
            width: "auto"
          }}
        >
          <thead>
            <tr>
              <th className="row-number-header" style={{ minWidth: 60 }}>#</th>
              {steps.map((step) => (
                <th key={step.id} style={{ minWidth: 150, maxWidth: 250 }}>
                  {step.displayName || step.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allPaths.map((path, pathIdx) => {
              const pathKey = String(pathIdx)
              const isRowActive = isPathActive(pathKey)
              
              return (
                <tr 
                  key={pathKey} 
                  className={`data-row ${!isRowActive ? 'inactive-row' : ''}`}
                >
                  <td className="row-number">{pathIdx + 1}</td>
                  {path.map((option, colIdx) => {
                    const cellActive = isCellActive(pathKey, colIdx)
                    
                    return (
                      <td 
                        key={`${pathKey}-${colIdx}`}
                        className={`workflow-cell ${!cellActive ? 'inactive-cell' : ''}`}
                        onClick={(e) => handleCellClick(pathKey, colIdx, e)}
                        style={{ minWidth: 150, maxWidth: 250 }}
                      >
                        <div className="cell-content">
                          <TextDetailTooltip text={option.displayName || option.name}>
                            <div className="cell-inner">
                              {option.displayName || option.name}
                            </div>
                          </TextDetailTooltip>
                          <button 
                            className="cell-caret"
                            onClick={(e) => handleCellClick(pathKey, colIdx, e)}
                          >
                            ⋮
                          </button>
                        </div>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {selectedCell && cellAnchorRect && (
        <MenuPortal
          anchorRect={cellAnchorRect}
          onClose={() => setSelectedCell(null)}
        >
          <div className="menu-content bg-white border border-gray-200 rounded-lg shadow-lg p-2 min-w-32">
            <button
              className="menu-item w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded"
              onClick={() => handleToggleActive(
                selectedCell.pathKey, 
                selectedCell.colIdx, 
                !isCellActive(selectedCell.pathKey, selectedCell.colIdx)
              )}
            >
              {isCellActive(selectedCell.pathKey, selectedCell.colIdx) ? '비활성화' : '활성화'}
            </button>
          </div>
        </MenuPortal>
      )}
    </div>
  )
}

export default WorkflowPathTable
