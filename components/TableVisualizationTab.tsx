import React from "react";
import { Step, ConstraintMap, ConstraintApplicationResult } from "../lib/types";
import TextDetailTooltip from "./ui/TextDetailTooltip";
import { calculateStepCombinationStats, getAllCombinations } from "../lib/utils";
import { applyConstraintsWithPriority } from "../lib/constraints";
import { defaultExternalContext } from "../lib/condition-evaluator";

interface TableVisualizationTabProps {
  steps: Step[];
  constraints?: ConstraintMap;
  pathActivations?: Record<string, boolean[]>;
  onToggleOptionActive?: (pathKey: string, stepIdx: number, isActive: boolean) => void;
}

// 가상화 스크롤 설정
const ITEM_HEIGHT = 40; // 고정 행 높이
const OVERSCAN = 5; // 버퍼 행 수

// 가상화 스크롤 훅
function useVirtualScroll(
  itemCount: number,
  itemHeight: number,
  containerHeight: number,
  scrollTop: number
) {
  return React.useMemo(() => {
    if (itemCount === 0) {
      return {
        visibleStartIndex: 0,
        visibleStopIndex: 0,
        visibleItems: [],
        totalHeight: 0,
        offsetY: 0
      };
    }

    const visibleStart = Math.floor(scrollTop / itemHeight);
    const visibleEnd = Math.min(
      itemCount - 1,
      Math.floor((scrollTop + containerHeight) / itemHeight)
    );

    const startIndex = Math.max(0, visibleStart - OVERSCAN);
    const stopIndex = Math.min(itemCount - 1, visibleEnd + OVERSCAN);

    const visibleItems = [];
    for (let i = startIndex; i <= stopIndex; i++) {
      visibleItems.push(i);
    }

    return {
      visibleStartIndex: startIndex,
      visibleStopIndex: stopIndex,
      visibleItems,
      totalHeight: itemCount * itemHeight,
      offsetY: startIndex * itemHeight
    };
  }, [itemCount, itemHeight, containerHeight, scrollTop]);
}

const TableVisualizationTab: React.FC<TableVisualizationTabProps> = ({
  steps,
  constraints = {},
  pathActivations,
  onToggleOptionActive,
}) => {
  const [filters, setFilters] = React.useState<(string | null)[]>(
    steps.map(() => null)
  );

  const containerRef = React.useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = React.useState(0);
  const [containerHeight, setContainerHeight] = React.useState(400);

  // Memoize option arrays computation
  const optionArrays = React.useMemo(() => steps.map((step) =>
    step.options.length > 0
      ? step.options
      : [
          {
            id: "",
            name: "-",
            displayName: "-",
            nextStepActive: true,
            isActive: true,
          },
        ]
  ), [steps]);

  // Memoize all combinations calculation
  const allCombinations = React.useMemo(() => 
    getAllCombinations(optionArrays), 
    [optionArrays]
  );

  // Analyze constraints for all combinations
  const constraintAnalysis = React.useMemo(() => {
    if (Object.keys(constraints).length === 0) return null;

    const analysis: {
      [pathIndex: string]: {
        combination: Array<{ id: string; name: string; displayName: string }>;
        appliedConstraints: ConstraintApplicationResult;
        pathIndex: number;
      }
    } = {};

    allCombinations.forEach((combination, pathIndex) => {
      // Convert combination to selected path format
      const selectedPath: { [stepIndex: number]: string } = {};
      combination.forEach((option, stepIndex) => {
        selectedPath[stepIndex] = option.id;
      });

      // Apply constraints for this specific path
      const result = applyConstraintsWithPriority(steps, constraints, selectedPath, defaultExternalContext);

      analysis[pathIndex] = {
        combination,
        appliedConstraints: result,
        pathIndex
      };
    });

    return analysis;
  }, [constraints, steps, allCombinations]);

  // Helper function to determine if a cell should be active based on constraints
  const isCellActiveWithConstraints = React.useCallback((
    pathIndex: number,
    stepIndex: number,
    option: { id: string; name: string; displayName: string; isActive?: boolean }
  ): boolean => {
    // If no constraints are defined, fall back to original logic
    if (!constraintAnalysis || Object.keys(constraints).length === 0) {
      if (pathActivations && Array.isArray(pathActivations[String(pathIndex)])) {
        return !!pathActivations[String(pathIndex)][stepIndex] && !!option.isActive && !!steps[stepIndex].isActive;
      }
      return !!option.isActive && !!steps[stepIndex].isActive;
    }

    // Use constraint analysis result
    const analysis = constraintAnalysis[pathIndex];
    if (!analysis) {
      // Fallback if no analysis available
      return !!option.isActive && !!steps[stepIndex].isActive;
    }

    const { appliedConstraints } = analysis;
    
    // Check if this option is disabled by constraints
    if (appliedConstraints.disabledOptions[stepIndex]?.has(option.id)) {
      return false;
    }

    // Check if this option is required by constraints (always active)
    if (appliedConstraints.requiredOptions[stepIndex]?.has(option.id)) {
      return true;
    }

    // Check if this option is explicitly enabled by constraints
    if (appliedConstraints.enabledOptions[stepIndex]?.has(option.id)) {
      return true;
    }

    // Default behavior: check original activation state
    if (pathActivations && Array.isArray(pathActivations[String(pathIndex)])) {
      return !!pathActivations[String(pathIndex)][stepIndex] && !!option.isActive && !!steps[stepIndex].isActive;
    }

    return !!option.isActive && !!steps[stepIndex].isActive;
  }, [constraintAnalysis, constraints, pathActivations, steps]);

  // Immediate scroll handler for ultra-responsive scrolling
  const handleScroll = React.useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, [setScrollTop]);

  React.useEffect(() => {
    setFilters(steps.map(() => null));
  }, [steps]);

  // 컨테이너 높이 측정
  React.useEffect(() => {
    if (!containerRef.current) return;
    
    const updateHeight = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight);
      }
    };

    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(containerRef.current);
    updateHeight();

    return () => resizeObserver.disconnect();
  }, [setContainerHeight]);

  const stepNames = steps.map((step) => step.displayName || step.name);
  
  // Memoize filtered combinations
  const filteredCombinations = React.useMemo(() => 
    allCombinations.filter((row) =>
      filters.every((filter, idx) => filter === null || row[idx].id === filter)
    ), 
    [allCombinations, filters]
  );

  // Memoize option counts calculation
  const optionCounts = React.useMemo(() => 
    optionArrays.map((options, stepIdx) => {
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
    }), 
    [optionArrays, allCombinations, filters]
  );

  // 가상화 스크롤 계산
  const virtualResult = useVirtualScroll(
    filteredCombinations.length,
    ITEM_HEIGHT,
    containerHeight,
    scrollTop
  );

  const isRowActive = React.useCallback((
    row: {
      id: string;
      name: string;
      displayName: string;
      isActive?: boolean;
    }[],
    rowIndex: number
  ): boolean => {
    return row.every((option, stepIdx) => isCellActiveWithConstraints(rowIndex, stepIdx, option));
  }, [isCellActiveWithConstraints]);

  // Calculate scenario counts
  const scenarioStats = React.useMemo(() => {
    const total = filteredCombinations.length;
    let enabled = 0;
    let disabled = 0;

    filteredCombinations.forEach((row, rowIndex) => {
      const isActive = isRowActive(row, rowIndex);
      if (isActive) {
        enabled++;
      } else {
        disabled++;
      }
    });

    return { total, enabled, disabled };
  }, [filteredCombinations, isRowActive]);

  // Calculate per-step statistics
  const stepStats = React.useMemo(() => {
    if (!pathActivations) return [];
    return calculateStepCombinationStats(steps, pathActivations);
  }, [steps, pathActivations]);

  return (
    <div className="table-container" style={{ width: "100%", overflow: "hidden" }}>
      <h2>📊 표 시각화</h2>

      {/* Constraint Status Indicator */}
      {Object.keys(constraints).length > 0 && (
        <div style={{ 
          marginBottom: 12, 
          padding: 8, 
          backgroundColor: "#e3f2fd", 
          borderRadius: 6,
          border: "1px solid #2196f3",
          display: "flex",
          alignItems: "center",
          gap: 8
        }}>
          <span style={{ fontSize: "14px", color: "#1976d2", fontWeight: 600 }}>
            ⚙️ 제약 조건 적용됨
          </span>
          <span style={{ fontSize: "13px", color: "#666" }}>
            ({Object.values(constraints).filter(c => c.isActive).length}개 활성 제약 조건)
          </span>
        </div>
      )}

      {/* Scenario Statistics */}
      <div style={{ 
        marginBottom: 16, 
        padding: 12, 
        backgroundColor: "#f8f9fa", 
        borderRadius: 8,
        border: "1px solid #e9ecef"
      }}>
        <h4 style={{ margin: "0 0 8px 0", fontSize: "0.9rem", color: "#495057" }}>전체 시나리오 통계</h4>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontWeight: 600, color: "#6c757d" }}>총계:</span>
            <span style={{ fontWeight: 700, color: "#495057" }}>{scenarioStats.total}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontWeight: 600, color: "#28a745" }}>활성화:</span>
            <span style={{ fontWeight: 700, color: "#28a745" }}>{scenarioStats.enabled}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontWeight: 600, color: "#dc3545" }}>비활성화:</span>
            <span style={{ fontWeight: 700, color: "#dc3545" }}>{scenarioStats.disabled}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontWeight: 600, color: "#6c757d" }}>활성화율:</span>
            <span style={{ fontWeight: 700, color: "#6c757d" }}>
              {scenarioStats.total > 0 ? Math.round((scenarioStats.enabled / scenarioStats.total) * 100) : 0}%
            </span>
          </div>
        </div>
      </div>

      {/* Per-Step Statistics */}
      {stepStats.length > 0 && (
        <div style={{ 
          marginBottom: 16, 
          padding: 12, 
          backgroundColor: "#f8f9fa", 
          borderRadius: 8,
          border: "1px solid #e9ecef" 
        }}>
          <h4 style={{ margin: "0 0 8px 0", fontSize: "0.9rem", color: "#495057" }}>단계별 통계</h4>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {steps.map((step, stepIdx) => {
              const stats = stepStats[stepIdx];
              if (!stats) return null;
              
              return (
                <div key={step.id} style={{ 
                  padding: 8, 
                  backgroundColor: "white", 
                  borderRadius: 6,
                  border: "1px solid #dee2e6",
                  minWidth: 120
                }}>
                  <div style={{ fontWeight: 600, fontSize: "0.8rem", marginBottom: 4, color: "#495057" }}>
                    {step.displayName || step.name}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
                      <span style={{ color: "#6c757d" }}>총계:</span>
                      <span style={{ fontWeight: 600 }}>{stats.total}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
                      <span style={{ color: "#28a745" }}>활성:</span>
                      <span style={{ fontWeight: 600, color: "#28a745" }}>{stats.enabled}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
                      <span style={{ color: "#dc3545" }}>비활성:</span>
                      <span style={{ fontWeight: 600, color: "#dc3545" }}>{stats.disabled}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
                      <span style={{ color: "#6c757d" }}>활성율:</span>
                      <span style={{ fontWeight: 600, color: "#6c757d" }}>{stats.enabledPercentage}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 필터 UI */}
      <div
        style={{ 
          display: "flex", 
          flexWrap: "wrap", 
          gap: 12, 
          marginBottom: 12,
          overflowX: "auto",
          minWidth: "100%"
        }}
      >
        {steps.map((step, stepIdx) => (
          <div key={step.id} style={{ flex: "1 1 120px" }}>
            <label style={{ fontWeight: 500, fontSize: "0.8rem" }}>
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
      <div style={{ marginBottom: 8 }}>
        <button
          className="btn-primary small"
          onClick={async () => {
            try {
              // Build HTML table string with inline <s> for strikethrough cells so Excel preserves it
              const cols = ["#", ...stepNames];
              const buildCell = (text: string, inactive: boolean) => {
                const safe = String(text)
                  .replace(/&/g, "&amp;")
                  .replace(/</g, "&lt;")
                  .replace(/>/g, "&gt;");
                if (inactive)
                  // Use uppercase ASCII X as the cell content for disabled options
                  return `<td style="color: #6b7280; text-align: center;">X</td>`;
                return `<td>${safe}</td>`;
              };

              const rowsHtml = filteredCombinations
                .map((row, rIdx) => {
                  const idxCell = `<td>${rIdx + 1}</td>`;
                  const cells = row
                    .map((option, cIdx) => {
                      const cellActive = isCellActiveWithConstraints(rIdx, cIdx, option);
                      return buildCell(
                        option.displayName || option.name,
                        !cellActive && option.name !== "-"
                      );
                    })
                    .join("");
                  return `<tr>${idxCell}${cells}</tr>`;
                })
                .join("");

              const html = `<table><thead><tr>${cols
                .map(
                  (c) =>
                    `<th>${String(c)
                      .replace(/&/g, "&amp;")
                      .replace(/</g, "&lt;")
                      .replace(/>/g, "&gt;")}</th>`
                )
                .join("")}</tr></thead><tbody>${rowsHtml}</tbody></table>`;

              // Try to write HTML and plain text
              if (
                navigator.clipboard &&
                (
                  navigator.clipboard as Clipboard & {
                    write?: (data: ClipboardItem[]) => Promise<void>;
                  }
                ).write
              ) {
                const blobHtml = new Blob([html], { type: "text/html" });
                const blobText = new Blob(
                  [
                    rowsHtml
                      .replace(/<[^>]+>/g, "")
                      .replace(/\s+/g, " ")
                      .trim(),
                  ],
                  { type: "text/plain" }
                );
                const data = [
                  new ClipboardItem({
                    "text/html": blobHtml,
                    "text/plain": blobText,
                  }),
                ];
                await (
                  navigator.clipboard as Clipboard & {
                    write?: (data: ClipboardItem[]) => Promise<void>;
                  }
                ).write(data);
              } else if (
                navigator.clipboard &&
                (
                  navigator.clipboard as Clipboard & {
                    writeText?: (text: string) => Promise<void>;
                  }
                ).writeText
              ) {
                // fallback to CSV-like plain text
                const csv = filteredCombinations
                  .map((row, rIdx) => {
                    const cells = row.map((o, cIdx) => {
                      const cellActive = isCellActiveWithConstraints(rIdx, cIdx, o);
                      return cellActive || o.name === "-" ? (o.displayName || o.name) : "X";
                    });
                    return [String(rIdx + 1), ...cells].join("\t");
                  })
                  .join("\n");
                await navigator.clipboard.writeText(csv);
              } else {
                alert(
                  "클립보드 복사 기능을 사용할 수 없습니다. 브라우저를 업데이트 해보세요."
                );
              }
              alert(
                "표를 클립보드로 복사했습니다. (HTML 형식, Excel에 붙여넣으면 취소선이 유지됩니다)"
              );
            } catch (err) {
              console.error(err);
              alert("복사에 실패했습니다.");
            }
          }}
        >
          복사하기
        </button>
      </div>

      {/* 가상화 테이블 */}
      <div
        className="excel-table-container"
        ref={containerRef}
        style={{ 
          height: "60vh", 
          overflow: "auto",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          position: "relative"
        }}
        onScroll={handleScroll}
      >
        {/* 전체 높이를 위한 컨테이너 */}
        <div style={{ 
          height: virtualResult.totalHeight, 
          position: "relative",
          minWidth: `${Math.max(600, stepNames.length * 200 + 100)}px`
        }}>
          {/* 헤더 (고정) */}
          <div 
            style={{
              position: "sticky",
              top: 0,
              zIndex: 10,
              backgroundColor: "#f8f9fa",
              borderBottom: "2px solid #dee2e6",
              minWidth: `${Math.max(600, stepNames.length * 200 + 100)}px`
            }}
          >
            <table 
              className="excel-table" 
              role="grid" 
              style={{ 
                width: "100%",
                borderCollapse: "collapse",
                tableLayout: "fixed",
                minWidth: `${Math.max(600, stepNames.length * 200 + 100)}px`
              }}
            >
              <colgroup>
                {stepNames.map((_, idx) => (
                  <col key={idx} style={{ width: `${100 / stepNames.length}%` }} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  {stepNames.map((name, idx) => (
                    <th key={idx} style={{
                      padding: 8,
                      border: "1px solid #dee2e6",
                      background: "#f8f9fa"
                    }}>
                      {name}
                    </th>
                  ))}
                </tr>
              </thead>
            </table>
          </div>

          {/* 가상화된 행들 */}
          <div 
            style={{
              position: "absolute",
              top: virtualResult.offsetY + 40, // 헤더 높이만큼 오프셋
              left: 0,
              right: 0,
              minWidth: `${Math.max(600, stepNames.length * 200 + 100)}px`
            }}
          >
            <table 
              className="excel-table" 
              role="grid" 
              style={{ 
                width: "100%",
                borderCollapse: "collapse",
                tableLayout: "fixed",
                minWidth: `${Math.max(600, stepNames.length * 200 + 100)}px`
              }}
            >
              <colgroup>
                {stepNames.map((_, idx) => (
                  <col key={idx} style={{ width: `${100 / stepNames.length}%` }} />
                ))}
              </colgroup>
              <tbody>
                {virtualResult.visibleItems.map((index) => {
                  const row = filteredCombinations[index];
                  if (!row) return null;

                  const active = isRowActive(row, index);
                  return (
                    <tr
                      key={index}
                      className={active ? "data-row" : "data-row inactive-row"}
                      style={{ height: ITEM_HEIGHT }}
                    >
                      {row.map((option, stepIdx) => {
                        const cellActive = isCellActiveWithConstraints(index, stepIdx, option);
                        return (
                          <td
                            key={option.id || stepIdx}
                            className={
                              !cellActive && option.name !== "-"
                                ? "inactive-cell"
                                : "data-cell"
                            }
                            style={{
                              padding: 4,
                              border: "1px solid #dee2e6",
                              cursor: onToggleOptionActive ? "pointer" : "default"
                            }}
                            onClick={() => {
                              if (onToggleOptionActive && option.name !== "-") {
                                onToggleOptionActive(String(index), stepIdx, !cellActive);
                              }
                            }}
                          >
                            {(!cellActive && option.name !== "-") ? (
                              <div className="cell-inner">X</div>
                            ) : (
                              <TextDetailTooltip text={option.displayName || option.name}>
                                <div className="cell-inner">{option.displayName || option.name}</div>
                              </TextDetailTooltip>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TableVisualizationTab;
