import React from "react";
import AutoResizeInput from "./AutoResizeInput";
import { Step } from "../hooks/useStepManager";

import {
  OptionActivationMap,
  PathActivationMap,
} from "../hooks/useStepManager";
import MenuPortal from "./MenuPortal";

type Props = {
  steps: Step[];
  optionActivations: OptionActivationMap;
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

const BUFFER = 5; // 위/아래 여유 행
const ESTIMATED_ROW_HEIGHT = 40; // 초기 추정 높이 (px) — 실제는 ResizeObserver로 갱신됨

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

  const containerRef = React.useRef<HTMLDivElement | null>(null);
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

  // --- combinations (memoized) ---
  // centralized, memoized combination generator to avoid re-compute on each render
  const optionArrays = React.useMemo(
    () => steps.map((step) => step.options),
    [steps]
  );
  const allCombinations = React.useMemo(() => {
    function generate<T>(arrays: T[][]): T[][] {
      if (arrays.length === 0) return [[]];
      const [first, ...rest] = arrays;
      const restCombinations = generate(rest);
      const out: T[][] = [];
      for (let i = 0; i < first.length; i++) {
        const item = first[i];
        for (let j = 0; j < restCombinations.length; j++) {
          out.push([item, ...restCombinations[j]]);
        }
      }
      return out;
    }
    return generate(optionArrays);
  }, [optionArrays]);

  const displayCombinations = React.useMemo(
    () => filteredCombinations ?? allCombinations,
    [filteredCombinations, allCombinations]
  );

  // --- 가상 스크롤 상태 ---
  const total = displayCombinations.length;
  const [rowHeights, setRowHeights] = React.useState<number[]>(() =>
    new Array(total).fill(ESTIMATED_ROW_HEIGHT)
  );
  const [scrollTop, setScrollTop] = React.useState(0);
  const [viewportHeight, setViewportHeight] = React.useState(400);

  // keep rowHeights length in sync with total
  React.useEffect(() => {
    setRowHeights((prev) => {
      if (prev.length === total) return prev;
      const next = new Array(total).fill(ESTIMATED_ROW_HEIGHT);
      for (let i = 0; i < Math.min(prev.length, total); i++) next[i] = prev[i];
      return next;
    });
  }, [total]);

  // measure container height
  React.useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(() => {
      if (containerRef.current)
        setViewportHeight(containerRef.current.clientHeight);
    });
    ro.observe(containerRef.current);
    setViewportHeight(containerRef.current.clientHeight);
    return () => ro.disconnect();
  }, []);

  // cumHeights: offset at index i = sum of heights before i
  const cumHeights = React.useMemo(() => {
    const arr: number[] = [];
    let sum = 0;
    for (let i = 0; i < total; i++) {
      arr.push(sum);
      sum += rowHeights[i] || ESTIMATED_ROW_HEIGHT;
    }
    return arr;
  }, [rowHeights, total]);

  // compute start/end by scanning cumHeights
  let start = 0;
  while (
    start < total &&
    cumHeights[start] + (rowHeights[start] || ESTIMATED_ROW_HEIGHT) < scrollTop
  ) {
    start++;
  }
  let end = start;
  const bufferPx = BUFFER * ESTIMATED_ROW_HEIGHT;
  while (
    end < total &&
    cumHeights[end] < scrollTop + viewportHeight + bufferPx
  ) {
    end++;
  }
  const visibleRows = displayCombinations.slice(start, end);

  // total content height
  const totalHeight =
    total === 0
      ? 0
      : cumHeights[total - 1] + (rowHeights[total - 1] || ESTIMATED_ROW_HEIGHT);

  // ResizeObserver to measure visible rows. Batch updates to avoid many state updates.
  React.useEffect(() => {
    if (!containerRef.current) return;
    const pending: { index: number; height: number }[] = [];
    let scheduled = false;
    const observer = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        const idxAttr = entry.target.getAttribute("data-index");
        if (!idxAttr) return;
        const index = Number(idxAttr);
        if (!Number.isNaN(index) && index >= 0 && index < total) {
          pending.push({ index, height: entry.contentRect.height });
        }
      });
      if (!scheduled) {
        scheduled = true;
        requestAnimationFrame(() => {
          setRowHeights((prev) => {
            const next = prev.slice();
            for (const p of pending) {
              next[p.index] = p.height;
            }
            return next;
          });
          pending.length = 0;
          scheduled = false;
        });
      }
    });

    const tbodyRows =
      containerRef.current.querySelectorAll("tbody tr.data-row");
    tbodyRows.forEach((tr) => {
      const idxAttr = tr.getAttribute("data-index");
      if (idxAttr !== null) observer.observe(tr);
    });

    return () => observer.disconnect();
  }, [start, end, total]);

  // Scroll handler attached to container — use RAF to throttle updates
  const rafRef = React.useRef<number | null>(null);
  const pendingScrollTop = React.useRef(0);
  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    pendingScrollTop.current = e.currentTarget.scrollTop;
    if (rafRef.current == null) {
      rafRef.current = requestAnimationFrame(() => {
        setScrollTop(pendingScrollTop.current);
        rafRef.current = null;
      });
    }
  };

  // helpers for activation logic are identical to original
  // Precompute maps for faster lookups
  type LocalOption = { id: string; name?: string; displayName?: string };

  const optionToCombinationIndices = React.useMemo(() => {
    // map: `${colIdx}:${optionId}` -> number[] (combination indices)
    const map = new Map<string, number[]>();
    for (let i = 0; i < allCombinations.length; i++) {
      const comb = allCombinations[i] as LocalOption[];
      for (let col = 0; col < comb.length; col++) {
        const optId = comb[col].id;
        const k = `${col}:${optId}`;
        const arr = map.get(k);
        if (arr) arr.push(i);
        else map.set(k, [i]);
      }
    }
    return map;
  }, [allCombinations]);

  const isStepAllActive = React.useCallback(
    (stepIdx: number) => {
      if (!pathActivations) return false;
      return Object.values(pathActivations).every(
        (row) => Array.isArray(row) && row[stepIdx]
      );
    },
    [pathActivations]
  );

  return (
    <div
      ref={containerRef}
      className="excel-table-container"
      style={{ height: "100vh", overflowY: "auto" }}
      onScroll={onScroll}
    >
      <table
        ref={tableRef}
        className="workflow-path-table"
        style={{ borderCollapse: "collapse", minWidth: 600, width: "100%" }}
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
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <span>{idx + 1}단계</span>
                    <AutoResizeInput
                      type="text"
                      className="step-input"
                      value={step.displayName}
                      onChange={(e) =>
                        onUpdateStepName(step.id, e.target.value)
                      }
                      placeholder="단계 이름"
                      minWidth={60}
                      maxWidth={300}
                    />
                  </div>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
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
                              onClick={() => {
                                // toggle all in this step
                                const target = !isStepAllActive(idx);
                                Object.keys(pathActivations).forEach(
                                  (pathKey) => {
                                    onToggleOptionActive(pathKey, idx, target);
                                  }
                                );
                              }}
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
          {/* top padding */}
          {start > 0 && (
            <tr style={{ height: `${cumHeights[start]}px` }}>
              <td
                colSpan={steps.length + 1}
                style={{ padding: 0, border: "none" }}
              />
            </tr>
          )}

          {/* visible rows */}
          {visibleRows.map((row, rowIdx) => {
            const realIndex = start + rowIdx;
            // find pathKey in original allCombinations
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
              <tr
                key={realIndex}
                data-index={String(realIndex)}
                className="data-row"
                // className may be extended for highlight/selection
              >
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
                      ? `${realIndex + 1} 비활성화`
                      : `${realIndex + 1} 활성화`}
                  </button>
                </td>

                {row.map((option, colIdx) => {
                  const isCellActive =
                    pathActivations[pathKey]?.[colIdx] ?? true;
                  const isRowHighlighted = selectedCell?.pathKey === pathKey;
                  const isCellSelected =
                    selectedCell?.pathKey === pathKey &&
                    selectedCell?.colIdx === colIdx;

                  // matchedOptionIndices for bulk toggles (use precomputed map)
                  const matchedOptionIndices =
                    optionToCombinationIndices.get(`${colIdx}:${option.id}`) ||
                    [];
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

                  // previous and next option bulk toggles
                  const handlePrevOptionBulkToggle = () => {
                    if (colIdx === 0) return;
                    const prevOptionId = row[colIdx - 1].id;
                    // matchedPrevIndices: combinations where prev option id and current option id match
                    const matchedPrevIndices = (
                      optionToCombinationIndices.get(
                        `${colIdx - 1}:${prevOptionId}`
                      ) || []
                    ).filter(
                      (i) => allCombinations[i][colIdx].id === option.id
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

                  const handleNextOptionBulkToggle = () => {
                    if (colIdx === steps.length - 1) return;
                    const nextOptionId = row[colIdx + 1].id;
                    const matchedNextIndices = (
                      optionToCombinationIndices.get(
                        `${colIdx + 1}:${nextOptionId}`
                      ) || []
                    ).filter(
                      (i) => allCombinations[i][colIdx].id === option.id
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
                      style={{ border: "1px solid #ddd", padding: 6 }}
                    >
                      <div
                        className="cell-content"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
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
                                      onDeleteOption(
                                        steps[colIdx].id,
                                        option.id
                                      )
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

          {/* bottom padding */}
          {end < total && (
            <tr
              style={{
                height: `${Math.max(
                  0,
                  totalHeight - (cumHeights[end] || 0)
                )}px`,
              }}
            >
              <td
                colSpan={steps.length + 1}
                style={{ padding: 0, border: "none" }}
              />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default WorkflowDesignTab;
