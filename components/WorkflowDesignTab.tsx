import React from "react";
import AutoResizeInput from "./AutoResizeInput";
import { Step } from "../hooks/useStepManager";

import {
  OptionActivationMap,
  PathActivationMap,
} from "../hooks/useStepManager";
import MenuPortal from "./MenuPortal";

// 표 형태로 모든 경로(조합)를 행으로, 각 단계별 옵션을 열로 렌더링
type Props = {
  steps: Step[];
  optionActivations: OptionActivationMap; // This line remains unchanged
  pathActivations: PathActivationMap;
  onAddRootStep: () => void;
  onUpdateStepName: (stepId: string, name: string) => void;
  onUpdateOptionName: (stepId: string, optionId: string, name: string) => void;
  onDeleteStep: (stepId: string) => void;
  onAddOption: (stepId: string) => void;
  onDeleteOption: (stepId: string, optionId: string) => void;
  onToggleOptionActive: (
    pathKey: string,
    stepIdx: number,
    isActive: boolean
  ) => void;
  onToggleOptionNextStepActive: (
    stepId: string,
    optionId: string,
    isActive: boolean,
    parentOptionIdx: number
  ) => void;
  onAddStepAtIndex: (stepIdx: number) => void;
};

const WorkflowDesignTab: React.FC<Props> = (props) => {
  // 단계별 필터 상태: 각 단계별로 선택된 옵션 id (null이면 전체)
  const [filters, setFilters] = React.useState<(string | null)[]>(
    props.steps.map(() => null)
  );
  // steps 변경 시 필터 초기화
  React.useEffect(() => {
    setFilters(props.steps.map(() => null));
  }, [props.steps]);
  // 조합별 토글 UI 상태
  const [comboSelections, setComboSelections] = React.useState<{
    [stepIdx: number]: string;
  }>({});

  // 조합별 토글 실행 핸들러
  const handleComboToggle = (targetActive: boolean) => {
    if (Object.keys(comboSelections).length === 0) return;
    const optionArrays = props.steps.map((step) => step.options);
    function getAllCombinations<T>(arrays: T[][]): T[][] {
      if (arrays.length === 0) return [[]];
      const [first, ...rest] = arrays;
      const restCombinations = getAllCombinations(rest);
      return first.flatMap((item) =>
        restCombinations.map((comb) => [item, ...comb])
      );
    }
    const allCombinations = getAllCombinations(optionArrays);
    allCombinations.forEach((row: { id: string }[], rowIdx: number) => {
      const match = Object.entries(comboSelections).every(
        ([stepIdx, optionId]) => row[Number(stepIdx)].id === optionId
      );
      if (match) {
        Object.keys(row).forEach((colIdx) => {
          props.onToggleOptionActive(
            String(rowIdx),
            Number(colIdx),
            targetActive
          );
        });
      }
    });
  };
  // (불필요한 구조분해 props 제거, 필요한 곳에서 props.XXX로 접근)
  // 필터링 로직: 필터 조건에 맞는 조합만 반환
  const optionArrays = props.steps.map((step) => step.options);
  function getAllCombinations<T>(arrays: T[][]): T[][] {
    if (arrays.length === 0) return [[]];
    const [first, ...rest] = arrays;
    const restCombinations = getAllCombinations(rest);
    return first.flatMap((item) =>
      restCombinations.map((comb) => [item, ...comb])
    );
  }
  const allCombinations = getAllCombinations(optionArrays);
  const filteredCombinations = allCombinations.filter((row) =>
    filters.every((filter, idx) => filter === null || row[idx].id === filter)
  );
  // 각 단계별로 경우의 수(유니크 값 개수) 계산 (필터 적용 전 기준)
  const optionCounts = optionArrays.map((options, stepIdx) => {
    const countMap: Record<string, number> = {};
    allCombinations
      .filter((row) =>
        filters.every(
          (filter, idx) =>
            idx === stepIdx || filter === null || row[idx].id === filter
        )
      )
      .forEach((row) => {
        const opt = row[stepIdx];
        countMap[opt.id] = (countMap[opt.id] || 0) + 1;
      });
    return countMap;
  });

  return (
    <section className="workflow-design-tab">
      {/* 단계별 필터 UI */}
      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        {props.steps.map((step, stepIdx) => (
          <div key={step.id} style={{ minWidth: 120 }}>
            <label style={{ fontWeight: 500, fontSize: 13 }}>
              {step.displayName || step.name}
            </label>
            <select
              style={{ width: "100%", marginTop: 2 }}
              value={filters[stepIdx] ?? ""}
              onChange={(e) => {
                const v = e.target.value || null;
                setFilters((f) =>
                  f.map((old, i) =>
                    i === stepIdx ? (v === "" ? null : v) : old
                  )
                );
              }}
            >
              <option value="">전체 ({optionArrays[stepIdx].length})</option>
              {optionArrays[stepIdx].map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.displayName || opt.name} (
                  {optionCounts[stepIdx][opt.id] || 0})
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <div className="combo-toolbar">
        <div className="combo-toolbar-row">
          <strong className="combo-label">조합별 토글</strong>
          <div className="combo-selects">
            {props.steps.map((step, stepIdx) => (
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
                  {step.options.map(
                    (opt: {
                      id: string;
                      displayName: string;
                      name: string;
                    }) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.displayName || opt.name}
                      </option>
                    )
                  )}
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
            steps={props.steps}
            pathActivations={props.pathActivations}
            onUpdateStepName={props.onUpdateStepName}
            onUpdateOptionName={props.onUpdateOptionName}
            onAddOption={props.onAddOption}
            onDeleteOption={props.onDeleteOption}
            onToggleOptionActive={props.onToggleOptionActive}
            onDeleteStep={props.onDeleteStep}
            onAddStepAtIndex={props.onAddStepAtIndex}
            filteredCombinations={filteredCombinations}
          />
        </div>
      </div>
    </section>
  );
};

type Combination = {
  id: string;
  name: string;
  displayName: string;
  isActive?: boolean;
}[];
const WorkflowPathTable: React.FC<
  WorkflowPathTableProps & { filteredCombinations?: Combination[] }
> = ({
  steps,
  pathActivations,
  onUpdateStepName,
  onUpdateOptionName,
  onAddOption,
  onDeleteOption,
  onToggleOptionActive,
  onDeleteStep,
  onAddStepAtIndex,
  filteredCombinations,
}) => {
  const [hoveredCell, setHoveredCell] = React.useState<{
    pathKey: string;
    colIdx: number;
  } | null>(null);
  const [cellAnchorRect, setCellAnchorRect] = React.useState<DOMRect | null>(
    null
  );
  const [selectedCell, setSelectedCell] = React.useState<{
    pathKey: string;
    colIdx: number;
  } | null>(null);
  const [openHeader, setOpenHeader] = React.useState<number | null>(null);
  const [headerAnchorRect, setHeaderAnchorRect] =
    React.useState<DOMRect | null>(null);
  const tableRef = React.useRef<HTMLTableElement | null>(null);

  // Close menu when clicking outside
  React.useEffect(() => {
    const onDocClick = () => {
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
  const displayCombinations = filteredCombinations ?? allCombinations;

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
            {displayCombinations.length} rows
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
                  <AutoResizeInput
                    type="text"
                    className="step-input"
                    value={step.displayName}
                    onChange={(e) => onUpdateStepName(step.id, e.target.value)}
                    placeholder="단계 이름"
                    minWidth={60}
                    maxWidth={300}
                    style={{}}
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
        {displayCombinations.map((row, rowIdx) => {
          // pathKey는 실제 인덱스가 아니라, 원본 allCombinations에서의 인덱스를 찾아야 함
          const pathKey = String(
            allCombinations.findIndex((r) =>
              r.every((opt, i) => opt.id === row[i].id)
            )
          );
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
                      <AutoResizeInput
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
                        minWidth={60}
                        maxWidth={300}
                        style={{}}
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
  steps: Step[];
  pathActivations: PathActivationMap;
  onUpdateStepName: (stepId: string, name: string) => void;
  onUpdateOptionName: (stepId: string, optionId: string, name: string) => void;
  onAddOption: (stepId: string) => void;
  onDeleteOption: (stepId: string, optionId: string) => void;
  onToggleOptionActive: (
    pathKey: string,
    stepIdx: number,
    isActive: boolean
  ) => void;
  onDeleteStep: (stepId: string) => void;
  onAddStepAtIndex: (stepIdx: number) => void;
};

export default WorkflowDesignTab;
