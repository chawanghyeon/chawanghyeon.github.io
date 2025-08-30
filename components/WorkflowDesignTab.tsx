
import React from 'react'
import { Step } from '../hooks/useStepManager'

import { OptionActivationMap, PathActivationMap } from '../hooks/useStepManager'
import MenuPortal from './MenuPortal'

// 표 형태로 모든 경로(조합)를 행으로, 각 단계별 옵션을 열로 렌더링
type Props = {
  steps: Step[]
  optionActivations: OptionActivationMap // This line remains unchanged
  pathActivations: PathActivationMap
  onAddRootStep: () => void
  onUpdateStepName: (stepId: string, name: string) => void
  onUpdateOptionName: (stepId: string, optionId: string, name: string) => void
  onDeleteStep: (stepId: string) => void
  onAddOption: (stepId: string) => void
  onDeleteOption: (stepId: string, optionId: string) => void
  onToggleOptionActive: (pathKey: string, stepIdx: number, isActive: boolean) => void
  onToggleOptionNextStepActive: (stepId: string, optionId: string, isActive: boolean, parentOptionIdx: number) => void
  onAddStepAtIndex: (stepIdx: number) => void
}

const WorkflowDesignTab: React.FC<Props> = (props) => {
  // 조합별 토글 UI 상태
  const [comboSelections, setComboSelections] = React.useState<{
    [stepIdx: number]: string;
  }>({});

  // 조합별 토글 실행 핸들러
  const handleComboToggle = (targetActive: boolean) => {
    if (Object.keys(comboSelections).length === 0) return;
    const optionArrays = steps.map((step) => step.options);
    function getAllCombinations<T>(arrays: T[][]): T[][] {
      if (arrays.length === 0) return [[]];
      const [first, ...rest] = arrays;
      const restCombinations = getAllCombinations(rest);
      return first.flatMap((item) =>
        restCombinations.map((comb) => [item, ...comb])
      );
    }
    const allCombinations = getAllCombinations(optionArrays);
    allCombinations.forEach((row, rowIdx) => {
      const match = Object.entries(comboSelections).every(
        ([stepIdx, optionId]) => row[Number(stepIdx)].id === optionId
      );
      if (match) {
        Object.keys(row).forEach((colIdx) => {
          onToggleOptionActive(String(rowIdx), Number(colIdx), targetActive);
        });
      }
    });
  };
  const {
    steps,
    optionActivations,
    pathActivations,
    onAddRootStep,
    onUpdateStepName,
    onUpdateOptionName,
    onDeleteStep,
    onAddOption,
    onDeleteOption,
    onToggleOptionActive,
    onToggleOptionNextStepActive,
    onAddStepAtIndex,
  } = props;
  return (
    <section className="workflow-design-tab">
      <div className="combo-toolbar">
        <div className="combo-toolbar-row">
          <strong className="combo-label">조합별 토글</strong>
          <div className="combo-selects">
            {steps.map((step, stepIdx) => (
              <div className="combo-item" key={step.id}>
                <label className="combo-step-label">{stepIdx + 1}단계</label>
                <select
                  aria-label={`단계 ${stepIdx + 1} 옵션 선택`}
                  value={comboSelections[stepIdx] || ""}
                  onChange={(e) =>
                    setComboSelections((sel) => ({
                      ...sel,
                      [stepIdx]: e.target.value,
                    }))
                  }
                  className="combo-select"
                >
                  <option value="">(선택안함)</option>
                  {step.options.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.displayName || opt.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() =>
                    setComboSelections((sel) => {
                      const copy = { ...sel };
                      delete copy[stepIdx];
                      return copy;
                    })
                  }
                  className="btn-link small"
                  title="이 단계 조합에서 제외"
                >
                  제외
                </button>
              </div>
            ))}
          </div>

          <div className="combo-actions">
            <button
              onClick={() => handleComboToggle(true)}
              className="btn-primary small"
            >
              선택 조합 활성화
            </button>
            <button
              onClick={() => handleComboToggle(false)}
              className="btn-muted small"
            >
              선택 조합 비활성화
            </button>
          </div>
        </div>
      </div>

      <div className="tab-content horizontal-tree-root">
        <div className="horizontal-tree-container">
          <WorkflowPathTable
            steps={steps}
            pathActivations={pathActivations}
            onUpdateStepName={onUpdateStepName}
            onUpdateOptionName={onUpdateOptionName}
            onAddOption={onAddOption}
            onDeleteOption={onDeleteOption}
            onToggleOptionActive={onToggleOptionActive}
            onDeleteStep={onDeleteStep}
            onAddStepAtIndex={onAddStepAtIndex}
          />
        </div>
      </div>
    </section>
  );
};

const WorkflowPathTable: React.FC<WorkflowPathTableProps> = ({
  steps,
  pathActivations,
  onUpdateStepName,
  onUpdateOptionName,
  onAddOption,
  onDeleteOption,
  onToggleOptionActive,
  onDeleteStep,
  onAddStepAtIndex,
}) => {
  const [hoveredCell, setHoveredCell] = React.useState<{
    pathKey: string;
    colIdx: number;
  } | null>(null);
  const [cellAnchorRect, setCellAnchorRect] = React.useState<DOMRect | null>(null)
  const [selectedCell, setSelectedCell] = React.useState<{
    pathKey: string;
    colIdx: number;
  } | null>(null);
  const [openHeader, setOpenHeader] = React.useState<number | null>(null);
  const [headerAnchorRect, setHeaderAnchorRect] = React.useState<DOMRect | null>(null)
  const tableRef = React.useRef<HTMLTableElement | null>(null);

  // Close menu when clicking outside
  React.useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      // Close any open menus/selections on a global click.
      // Note: menu and caret buttons stop propagation when they are clicked,
      // so this will not immediately close a menu when the user clicks it to open.
      if (!tableRef.current) return;
      setHoveredCell(null);
      setOpenHeader(null);
      setSelectedCell(null);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);
  // 모든 경로(조합) 구하기
  function getAllCombinations<T>(arrays: T[][]): T[][] {
    if (arrays.length === 0) return [[]];
    const [first, ...rest] = arrays;
    const restCombinations = getAllCombinations(rest);
    return first.flatMap((item) =>
      restCombinations.map((comb) => [item, ...comb])
    );
  }
  const optionArrays = steps.map((step) => step.options);
  const allCombinations = getAllCombinations(optionArrays);

  // 단계별 전체 활성/비활성화 핸들러
  const handleStepToggleAll = (stepIdx: number, active: boolean) => {
    // For each path, toggle the cell in this stepIdx
    Object.keys(pathActivations).forEach((pathKey) => {
      onToggleOptionActive(pathKey, stepIdx, active);
    });
  };

  // 해당 단계의 모든 옵션이 활성화되어 있는지 체크
  // 단계별 전체 활성화 상태: 모든 경로에서 해당 단계의 셀이 활성화되어 있는지 체크
  const isStepAllActive = (stepIdx: number) => {
    if (!pathActivations) return false;
    return Object.values(pathActivations).every(
      (row) => Array.isArray(row) && row[stepIdx]
    );
  };

  return (
    <table
      ref={tableRef}
      className="workflow-path-table"
      style={{ borderCollapse: "collapse", minWidth: 600 }}
    >
      <thead>
        <tr>
          <th
            style={{
              border: "1px solid #ccc",
              padding: 8,
              background: "#f8f8f8",
              textAlign: "center",
              minWidth: 110,
            }}
          >
            {allCombinations.length} rows
          </th>
          {steps.map((step, idx) => (
            <th
              key={step.id}
              style={{
                border: "1px solid #ccc",
                padding: 8,
                background: "#f8f8f8",
                position: "relative",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span>{idx + 1}단계</span>
                  <input
                    type="text"
                    className="step-input"
                    value={step.displayName}
                    onChange={(e) => onUpdateStepName(step.id, e.target.value)}
                    placeholder="단계 이름"
                    style={{ width: 60 }}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {/* Header caret and menu */}
                  <span className="header-caret-wrap">
                    <button
                      className="cell-caret header-caret"
                      aria-haspopup="true"
                      aria-expanded={openHeader === idx}
                      onClick={(e) => {
                        e.stopPropagation();
                        const newOpen = openHeader === idx ? null : idx;
                        setOpenHeader(newOpen);
                        setHeaderAnchorRect(
                          newOpen === null
                            ? null
                            : (
                                e.currentTarget as HTMLElement
                              ).getBoundingClientRect()
                        );
                      }}
                      title="단계 메뉴"
                    >
                      ▾
                    </button>
                    {openHeader === idx && headerAnchorRect && (
                      <MenuPortal anchorRect={headerAnchorRect}>
                        <div
                          className="header-menu"
                          role="menu"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            className="cell-menu-item"
                            onClick={() => onAddOption(step.id)}
                          >
                            선택지 추가
                          </button>
                          <button
                            className="cell-menu-item"
                            onClick={() =>
                              handleStepToggleAll(idx, !isStepAllActive(idx))
                            }
                          >
                            {isStepAllActive(idx)
                              ? "전체 비활성화"
                              : "전체 활성화"}
                          </button>
                          <button
                            className="cell-menu-item"
                            onClick={() => onDeleteStep(step.id)}
                            disabled={steps.length === 1}
                          >
                            현재 단계 삭제
                          </button>
                          <button
                            className="cell-menu-item"
                            onClick={() => onAddStepAtIndex(idx)}
                          >
                            오른쪽에 단계 추가
                          </button>
                        </div>
                      </MenuPortal>
                    )}
                  </span>
                </div>
              </div>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {allCombinations.map((row, rowIdx) => {
          const pathKey = String(rowIdx);
          const isRowAllActive =
            Array.isArray(pathActivations[pathKey]) &&
            pathActivations[pathKey].every(Boolean);
          const handleRowBulkToggle = () => {
            const targetActive = !isRowAllActive;
            row.forEach((_, colIdx) => {
              onToggleOptionActive(pathKey, colIdx, targetActive);
            });
          };
          return (
            <tr key={rowIdx}>
              <td
                style={{
                  border: "1px solid #ccc",
                  padding: 6,
                  background: "#f0f0f0",
                  textAlign: "center",
                }}
              >
                <button
                  onClick={handleRowBulkToggle}
                  className="btn-small"
                  title={
                    isRowAllActive
                      ? "이 경로 전체 비활성화"
                      : "이 경로 전체 활성화"
                  }
                >
                  {isRowAllActive
                    ? `${rowIdx + 1} 비활성화`
                    : `${rowIdx + 1} 활성화`}
                </button>
              </td>
              {row.map((option, colIdx) => {
                const isCellActive = pathActivations[pathKey]?.[colIdx] ?? true;
                const isRowHighlighted = selectedCell?.pathKey === pathKey;
                const isCellSelected =
                  selectedCell?.pathKey === pathKey &&
                  selectedCell?.colIdx === colIdx;

                // 옵션 전체 활성화/비활성화 핸들러
                // Determine all path indices where this column has the same option id
                const matchedOptionIndices = allCombinations.reduce(
                  (acc: number[], comb, idx) => {
                    if (comb[colIdx].id === option.id) acc.push(idx);
                    return acc;
                  },
                  []
                );
                const isOptionAllActive =
                  matchedOptionIndices.length > 0 &&
                  matchedOptionIndices.every(
                    (i) => pathActivations[String(i)]?.[colIdx]
                  );
                const handleOptionBulkToggle = () => {
                  const targetActive = !isOptionAllActive;
                  matchedOptionIndices.forEach((i) =>
                    onToggleOptionActive(String(i), colIdx, targetActive)
                  );
                };

                // 이전 단계 옵션 기준 전체 토글 핸들러
                const handlePrevOptionBulkToggle = () => {
                  if (colIdx === 0) return;
                  // 이전 옵션별로 현재 옵션이 있는 경로만 토글
                  const prevOptionId = row[colIdx - 1].id;
                  const matchedPrevIndices = allCombinations.reduce(
                    (acc: number[], comb, idx) => {
                      if (
                        comb[colIdx - 1].id === prevOptionId &&
                        comb[colIdx].id === option.id
                      )
                        acc.push(idx);
                      return acc;
                    },
                    []
                  );
                  const targetActive =
                    matchedPrevIndices.length > 0
                      ? !matchedPrevIndices.every(
                          (i) => pathActivations[String(i)]?.[colIdx]
                        )
                      : true;
                  matchedPrevIndices.forEach((i) =>
                    onToggleOptionActive(String(i), colIdx, targetActive)
                  );
                };
                // 다음 단계 옵션 기준 전체 토글 핸들러
                const handleNextOptionBulkToggle = () => {
                  if (colIdx === steps.length - 1) return;
                  const nextOptionId = row[colIdx + 1].id;
                  const matchedNextIndices = allCombinations.reduce(
                    (acc: number[], comb, idx) => {
                      if (
                        comb[colIdx + 1].id === nextOptionId &&
                        comb[colIdx].id === option.id
                      )
                        acc.push(idx);
                      return acc;
                    },
                    []
                  );
                  const targetActive =
                    matchedNextIndices.length > 0
                      ? !matchedNextIndices.every(
                          (i) => pathActivations[String(i)]?.[colIdx]
                        )
                      : true;
                  matchedNextIndices.forEach((i) =>
                    onToggleOptionActive(String(i), colIdx, targetActive)
                  );
                };

                return (
                  <td
                    key={option.id}
                    className={
                      "workflow-cell" +
                      (isRowHighlighted ? " highlight" : "") +
                      (isCellSelected ? " selected" : "")
                    }
                    onClick={() => setSelectedCell({ pathKey, colIdx })}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ")
                        setSelectedCell({ pathKey, colIdx });
                    }}
                  >
                    <div className="cell-content">
                      <input
                        type="text"
                        className="option-input"
                        value={option.displayName}
                        onChange={(e) =>
                          onUpdateOptionName(
                            steps[colIdx].id,
                            option.id,
                            e.target.value
                          )
                        }
                        placeholder="선택지 이름"
                        style={{ width: 60 }}
                      />
                      <label className="cell-checkbox">
                        <input
                          type="checkbox"
                          checked={isCellActive}
                          onChange={(e) =>
                            onToggleOptionActive(
                              pathKey,
                              colIdx,
                              e.target.checked
                            )
                          }
                          aria-label={`경로 ${pathKey} 단계 ${colIdx} 활성화`}
                        />
                      </label>

                      {/* Hover caret wrapped so menu anchors to caret position */}
                      <span className="caret-wrap">
                        <button
                          className="cell-caret"
                          aria-haspopup="true"
                          aria-expanded={
                            hoveredCell?.pathKey === pathKey &&
                            hoveredCell?.colIdx === colIdx
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            const alreadyOpen =
                              hoveredCell &&
                              hoveredCell.pathKey === pathKey &&
                              hoveredCell.colIdx === colIdx;
                            const newHover = alreadyOpen
                              ? null
                              : { pathKey, colIdx };
                            setHoveredCell(newHover);
                            setCellAnchorRect(
                              newHover
                                ? (
                                    e.currentTarget as HTMLElement
                                  ).getBoundingClientRect()
                                : null
                            );
                          }}
                          title="셀 메뉴"
                        >
                          ▾
                        </button>

                        {/* Action menu (anchored to caret via portal) */}
                        {hoveredCell?.pathKey === pathKey &&
                          hoveredCell?.colIdx === colIdx &&
                          cellAnchorRect && (
                            <MenuPortal anchorRect={cellAnchorRect}>
                              <div
                                className="cell-menu"
                                role="menu"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  className="cell-menu-item"
                                  onClick={() =>
                                    onDeleteOption(steps[colIdx].id, option.id)
                                  }
                                >
                                  옵션 삭제
                                </button>
                                <button
                                  className="cell-menu-item"
                                  onClick={handleOptionBulkToggle}
                                >
                                  {isOptionAllActive
                                    ? "옵션 전체 비활성화"
                                    : "옵션 전체 활성화"}
                                </button>
                                <button
                                  className="cell-menu-item"
                                  onClick={handlePrevOptionBulkToggle}
                                  disabled={colIdx === 0}
                                >
                                  이전 옵션 기준 전체 토글
                                </button>
                                <button
                                  className="cell-menu-item"
                                  onClick={handleNextOptionBulkToggle}
                                  disabled={colIdx === steps.length - 1}
                                >
                                  다음 옵션 기준 전체 토글
                                </button>
                              </div>
                            </MenuPortal>
                          )}
                      </span>
                    </div>
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

// 표 형태로 모든 경로(조합)를 행으로, 각 단계별 옵션을 열로 렌더링
type WorkflowPathTableProps = {
  steps: Step[]
  pathActivations: PathActivationMap
  onUpdateStepName: (stepId: string, name: string) => void
  onUpdateOptionName: (stepId: string, optionId: string, name: string) => void
  onAddOption: (stepId: string) => void
  onDeleteOption: (stepId: string, optionId: string) => void
  onToggleOptionActive: (pathKey: string, stepIdx: number, isActive: boolean) => void
  onDeleteStep: (stepId: string) => void
  onAddStepAtIndex: (stepIdx: number) => void
}

export default WorkflowDesignTab
