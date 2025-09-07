import React from "react";
import { Step, ConstraintMap, ConstraintApplicationResult } from "../lib/types";
import TextDetailTooltip from "./ui/TextDetailTooltip";
import { getAllCombinations } from "../lib/utils";
import { applyConstraintsWithPriority } from "../lib/constraints";

interface TableVisualizationTabProps {
    steps: Step[];
    constraints?: ConstraintMap;
    pathActivations?: Record<string, boolean[]>;
    onToggleOptionActive?: (
        pathKey: string,
        stepIdx: number,
        isActive: boolean
    ) => void;
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
                offsetY: 0,
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
            offsetY: startIndex * itemHeight,
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
    const optionArrays = React.useMemo(
        () =>
            steps.map((step) =>
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
            ),
        [steps]
    );

    // Memoize all combinations calculation
    const allCombinations = React.useMemo(
        () => getAllCombinations(optionArrays),
        [optionArrays]
    );

    // Analyze constraints for all combinations
    const constraintAnalysis = React.useMemo(() => {
        if (Object.keys(constraints).length === 0) return null;

        const analysis: {
            [pathIndex: string]: {
                combination: Array<{
                    id: string;
                    name: string;
                    displayName: string;
                }>;
                appliedConstraints: ConstraintApplicationResult;
                pathIndex: number;
            };
        } = {};

        allCombinations.forEach((combination, pathIndex) => {
            // Convert combination to selected path format
            const selectedPath: { [stepIndex: number]: string } = {};
            combination.forEach((option, stepIndex) => {
                selectedPath[stepIndex] = option.id;
            });

            // Apply constraints for this specific path
            const result = applyConstraintsWithPriority(
                steps,
                constraints,
                selectedPath
            );

            analysis[pathIndex] = {
                combination,
                appliedConstraints: result,
                pathIndex,
            };
        });

        return analysis;
    }, [constraints, steps, allCombinations]);

    // Helper function to determine cell status based on constraints
    const getCellStatus = React.useCallback(
        (
            pathIndex: number,
            stepIndex: number,
            option: {
                id: string;
                name: string;
                displayName: string;
                isActive?: boolean;
            }
        ): {
            isActive: boolean;
            status:
                | "normal"
                | "disabled-by-constraint"
                | "required-by-constraint"
                | "enabled-by-constraint"
                | "conflicted"
                | "inactive";
            constraintReason?: string;
        } => {
            // If no constraints are defined, fall back to original logic
            if (!constraintAnalysis || Object.keys(constraints).length === 0) {
                if (
                    pathActivations &&
                    Array.isArray(pathActivations[String(pathIndex)])
                ) {
                    const isActive =
                        !!pathActivations[String(pathIndex)][stepIndex] &&
                        !!option.isActive &&
                        !!steps[stepIndex].isActive;
                    return {
                        isActive,
                        status: isActive ? "normal" : "inactive",
                    };
                }
                const isActive =
                    !!option.isActive && !!steps[stepIndex].isActive;
                return {
                    isActive,
                    status: isActive ? "normal" : "inactive",
                };
            }

            // Use constraint analysis result
            const analysis = constraintAnalysis[pathIndex];
            if (!analysis) {
                // Fallback if no analysis available
                const isActive =
                    !!option.isActive && !!steps[stepIndex].isActive;
                return {
                    isActive,
                    status: isActive ? "normal" : "inactive",
                };
            }

            const { appliedConstraints } = analysis;

            // Check for conflicts affecting this option
            const hasConflict = appliedConstraints.conflicts.some(conflict => 
                conflict.targetStep === stepIndex && 
                conflict.targetOption === option.id
            );

            if (hasConflict) {
                return {
                    isActive: false,
                    status: "conflicted",
                    constraintReason: "이 옵션에 대해 정책 충돌이 발생했습니다",
                };
            }

            // Check if this option is disabled by constraints
            if (appliedConstraints.disabledOptions[stepIndex]?.has(option.id)) {
                return {
                    isActive: false,
                    status: "disabled-by-constraint",
                    constraintReason: "이 옵션은 정책에 의해 비활성화되었습니다",
                };
            }

            // Check if this option is required by constraints (always active)
            if (appliedConstraints.requiredOptions[stepIndex]?.has(option.id)) {
                return {
                    isActive: true,
                    status: "required-by-constraint",
                    constraintReason: "이 옵션은 정책에 의해 필수로 설정되었습니다",
                };
            }

            // Check if this option is explicitly enabled by constraints
            if (appliedConstraints.enabledOptions[stepIndex]?.has(option.id)) {
                return {
                    isActive: true,
                    status: "enabled-by-constraint",
                    constraintReason: "이 옵션은 정책에 의해 활성화되었습니다",
                };
            }

            // Default behavior: check original activation state
            // Note: For enabled options, we still need to check if the step/option is originally active
            if (
                pathActivations &&
                Array.isArray(pathActivations[String(pathIndex)])
            ) {
                const isActive =
                    !!pathActivations[String(pathIndex)][stepIndex] &&
                    !!option.isActive &&
                    !!steps[stepIndex].isActive;
                return {
                    isActive,
                    status: isActive ? "normal" : "inactive",
                };
            }

            // Final fallback: check base activation state
            const isActive = !!option.isActive && !!steps[stepIndex].isActive;
            return {
                isActive,
                status: isActive ? "normal" : "inactive",
            };
        },
        [constraintAnalysis, constraints, pathActivations, steps]
    );

    // Helper function to determine if a cell should be active based on constraints (backward compatibility)
    const isCellActiveWithConstraints = React.useCallback(
        (
            pathIndex: number,
            stepIndex: number,
            option: {
                id: string;
                name: string;
                displayName: string;
                isActive?: boolean;
            }
        ): boolean => {
            return getCellStatus(pathIndex, stepIndex, option).isActive;
        },
        [getCellStatus]
    );

    // Immediate scroll handler for ultra-responsive scrolling
    const handleScroll = React.useCallback(
        (e: React.UIEvent<HTMLDivElement>) => {
            setScrollTop(e.currentTarget.scrollTop);
        },
        [setScrollTop]
    );

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
    const filteredCombinations = React.useMemo(
        () =>
            allCombinations.map((row, originalIndex) => ({ row, originalIndex }))
                .filter(({ row }) =>
                    filters.every(
                        (filter, idx) => filter === null || row[idx].id === filter
                    )
                ),
        [allCombinations, filters]
    );

    // Deduplicated combinations to remove identical rows (based on final display state after constraints)
    const deduplicatedCombinations = React.useMemo(() => {
        const seenCombinations = new Set<string>();
        const uniqueCombinations: Array<{
            combination: typeof filteredCombinations[0]['row'];
            originalIndex: number;
        }> = [];

        filteredCombinations.forEach(({ row, originalIndex }) => {
            // Create a unique key based on the final display state (considering constraints)
            const finalStateKey = row.map((option, stepIdx) => {
                const cellStatus = getCellStatus(originalIndex, stepIdx, option);
                
                // Use the actual display text that will be shown in the table
                if (!cellStatus.isActive && option.name !== "-") {
                    return 'X'; // This is what shows in inactive cells
                } else {
                    return option.displayName || option.name; // This is what shows in active cells
                }
            }).join('|');
            
            if (!seenCombinations.has(finalStateKey)) {
                seenCombinations.add(finalStateKey);
                uniqueCombinations.push({
                    combination: row,
                    originalIndex: originalIndex
                });
            }
        });

        return uniqueCombinations;
    }, [filteredCombinations, getCellStatus]);

    // Memoize option counts calculation
    const optionCounts = React.useMemo(
        () =>
            optionArrays.map((options, stepIdx) => {
                const countMap: Record<string, number> = {};
                allCombinations
                    .filter((row) =>
                        filters.every(
                            (filter, idx) =>
                                idx === stepIdx ||
                                filter === null ||
                                row[idx].id === filter
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
        deduplicatedCombinations.length,
        ITEM_HEIGHT,
        containerHeight,
        scrollTop
    );

    const isRowActive = React.useCallback(
        (
            row: {
                id: string;
                name: string;
                displayName: string;
                isActive?: boolean;
            }[],
            originalRowIndex: number
        ): boolean => {
            return row.every((option, stepIdx) =>
                isCellActiveWithConstraints(originalRowIndex, stepIdx, option)
            );
        },
        [isCellActiveWithConstraints]
    );

    // Calculate scenario counts
    const scenarioStats = React.useMemo(() => {
        const total = deduplicatedCombinations.length;
        let enabled = 0;
        let disabled = 0;

        deduplicatedCombinations.forEach(({ combination, originalIndex }) => {
            const isActive = isRowActive(combination, originalIndex);
            if (isActive) {
                enabled++;
            } else {
                disabled++;
            }
        });

        return { total, enabled, disabled };
    }, [deduplicatedCombinations, isRowActive]);

    return (
        <div
            className="table-container"
            style={{ width: "100%", overflow: "hidden" }}
        >
            {/* Scenario Statistics */}
            <div
                style={{
                    marginBottom: 16,
                    padding: 12,
                    backgroundColor: "#f8f9fa",
                    borderRadius: 8,
                    border: "1px solid #e9ecef",
                }}
            >
                <h4
                    style={{
                        margin: "0 0 8px 0",
                        fontSize: "0.9rem",
                        color: "#495057",
                    }}
                >
                    전체 시나리오 통계
                </h4>
                <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                        }}
                    >
                        <span style={{ fontWeight: 600, color: "#6c757d" }}>
                            총계:
                        </span>
                        <span style={{ fontWeight: 700, color: "#495057" }}>
                            {scenarioStats.total}
                        </span>
                        <span style={{ fontSize: "0.8rem", color: "#6c757d" }}>
                            (중복 제거됨)
                        </span>
                    </div>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                        }}
                    >
                        <span style={{ fontWeight: 600, color: "#ffa500" }}>
                            원본 조합:
                        </span>
                        <span style={{ fontWeight: 700, color: "#ffa500" }}>
                            {filteredCombinations.length}
                        </span>
                    </div>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                        }}
                    >
                        <span style={{ fontWeight: 600, color: "#28a745" }}>
                            활성화:
                        </span>
                        <span style={{ fontWeight: 700, color: "#28a745" }}>
                            {scenarioStats.enabled}
                        </span>
                    </div>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                        }}
                    >
                        <span style={{ fontWeight: 600, color: "#dc3545" }}>
                            비활성화:
                        </span>
                        <span style={{ fontWeight: 700, color: "#dc3545" }}>
                            {scenarioStats.disabled}
                        </span>
                    </div>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                        }}
                    >
                        <span style={{ fontWeight: 600, color: "#6c757d" }}>
                            활성화율:
                        </span>
                        <span style={{ fontWeight: 700, color: "#6c757d" }}>
                            {scenarioStats.total > 0
                                ? Math.round(
                                      (scenarioStats.enabled /
                                          scenarioStats.total) *
                                          100
                                  )
                                : 0}
                            %
                        </span>
                    </div>
                    {Object.keys(constraints).length > 0 && (
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                            }}
                        >
                            <span
                                style={{
                                    fontSize: "14px",
                                    color: "#1976d2",
                                    fontWeight: 600,
                                }}
                            >
                                ⚙️ 정책 적용됨
                            </span>
                            <span style={{ fontSize: "13px", color: "#666" }}>
                                (
                                {
                                    Object.values(constraints).filter(
                                        (c) => c.isActive
                                    ).length
                                }
                                개 활성 정책)
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Policy Effects Legend */}
            {Object.keys(constraints).length > 0 && (
                <div
                    style={{
                        marginBottom: 16,
                        padding: 12,
                        backgroundColor: "#fff7ed",
                        borderRadius: 8,
                        border: "1px solid #fed7aa",
                    }}
                >
                    <h4
                        style={{
                            margin: "0 0 12px 0",
                            fontSize: "0.9rem",
                            color: "#9a3412",
                        }}
                    >
                        📋 정책 효과 범례
                    </h4>
                    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: "0.8rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div
                                style={{
                                    width: 16,
                                    height: 16,
                                    backgroundColor: "#fee2e2",
                                    border: "1px solid #fecaca",
                                    borderRadius: 4,
                                }}
                            ></div>
                            <span style={{ color: "#991b1b" }}>정책에 의해 비활성화</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div
                                style={{
                                    width: 16,
                                    height: 16,
                                    backgroundColor: "#dcfce7",
                                    border: "1px solid #bbf7d0",
                                    borderRadius: 4,
                                }}
                            ></div>
                            <span style={{ color: "#166534", fontWeight: "bold" }}>정책에 의해 필수</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div
                                style={{
                                    width: 16,
                                    height: 16,
                                    backgroundColor: "#dbeafe",
                                    border: "1px solid #bfdbfe",
                                    borderRadius: 4,
                                }}
                            ></div>
                            <span style={{ color: "#1e40af" }}>정책에 의해 활성화</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div
                                style={{
                                    width: 16,
                                    height: 16,
                                    backgroundColor: "#fef3c7",
                                    border: "2px solid #f59e0b",
                                    borderRadius: 4,
                                }}
                            ></div>
                            <span style={{ color: "#92400e", fontWeight: "bold" }}>정책 충돌</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div
                                style={{
                                    width: 16,
                                    height: 16,
                                    backgroundColor: "#ffffff",
                                    border: "1px solid #d1d5db",
                                    borderRadius: 4,
                                }}
                            ></div>
                            <span style={{ color: "#6b7280" }}>기본 상태</span>
                        </div>
                    </div>
                    <p style={{ margin: "8px 0 0 0", fontSize: "0.75rem", color: "#6b7280" }}>
                        각 셀에 마우스를 올리면 적용된 정책에 대한 자세한 정보를 볼 수 있습니다.
                    </p>
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
                    minWidth: "100%",
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
                                        i === stepIdx
                                            ? v === ""
                                                ? null
                                                : v
                                            : old
                                    )
                                );
                            }}
                        >
                            <option value="">
                                전체 ({optionArrays[stepIdx].length})
                            </option>
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
                            const buildCell = (
                                text: string,
                                inactive: boolean
                            ) => {
                                const safe = String(text)
                                    .replace(/&/g, "&amp;")
                                    .replace(/</g, "&lt;")
                                    .replace(/>/g, "&gt;");
                                if (inactive)
                                    // Use uppercase ASCII X as the cell content for disabled options
                                    return `<td style="color: #6b7280; text-align: center;">X</td>`;
                                return `<td>${safe}</td>`;
                            };

                            const rowsHtml = deduplicatedCombinations
                                .map(({ combination, originalIndex }, displayIndex) => {
                                    const idxCell = `<td>${displayIndex + 1}</td>`;
                                    const cells = combination
                                        .map((option, cIdx) => {
                                            const cellActive =
                                                isCellActiveWithConstraints(
                                                    originalIndex,
                                                    cIdx,
                                                    option
                                                );
                                            return buildCell(
                                                option.displayName ||
                                                    option.name,
                                                !cellActive &&
                                                    option.name !== "-"
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
                                .join(
                                    ""
                                )}</tr></thead><tbody>${rowsHtml}</tbody></table>`;

                            // Try to write HTML and plain text
                            if (
                                navigator.clipboard &&
                                (
                                    navigator.clipboard as Clipboard & {
                                        write?: (
                                            data: ClipboardItem[]
                                        ) => Promise<void>;
                                    }
                                ).write
                            ) {
                                const blobHtml = new Blob([html], {
                                    type: "text/html",
                                });
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
                                        write?: (
                                            data: ClipboardItem[]
                                        ) => Promise<void>;
                                    }
                                ).write(data);
                            } else if (
                                navigator.clipboard &&
                                (
                                    navigator.clipboard as Clipboard & {
                                        writeText?: (
                                            text: string
                                        ) => Promise<void>;
                                    }
                                ).writeText
                            ) {
                                // fallback to CSV-like plain text
                                const csv = deduplicatedCombinations
                                    .map(({ combination, originalIndex }, displayIndex) => {
                                        const cells = combination.map((o, cIdx) => {
                                            const cellActive =
                                                isCellActiveWithConstraints(
                                                    originalIndex,
                                                    cIdx,
                                                    o
                                                );
                                            return cellActive || o.name === "-"
                                                ? o.displayName || o.name
                                                : "X";
                                        });
                                        return [
                                            String(displayIndex + 1),
                                            ...cells,
                                        ].join("\t");
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
                    height: "70vh",
                    overflow: "auto",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    position: "relative",
                }}
                onScroll={handleScroll}
            >
                {/* 전체 높이를 위한 컨테이너 */}
                <div
                    style={{
                        height: virtualResult.totalHeight,
                        position: "relative",
                        minWidth: `${Math.max(
                            600,
                            stepNames.length * 200 + 100
                        )}px`,
                    }}
                >
                    {/* 헤더 (고정) */}
                    <div
                        style={{
                            position: "sticky",
                            top: 0,
                            zIndex: 10,
                            backgroundColor: "#f8f9fa",
                            borderBottom: "2px solid #dee2e6",
                            minWidth: `${Math.max(
                                600,
                                stepNames.length * 200 + 100
                            )}px`,
                        }}
                    >
                        <table
                            className="excel-table"
                            role="grid"
                            style={{
                                width: "100%",
                                borderCollapse: "collapse",
                                tableLayout: "fixed",
                                minWidth: `${Math.max(
                                    600,
                                    stepNames.length * 200 + 100
                                )}px`,
                            }}
                        >
                            <colgroup>
                                {stepNames.map((_, idx) => (
                                    <col
                                        key={idx}
                                        style={{
                                            width: `${100 / stepNames.length}%`,
                                        }}
                                    />
                                ))}
                            </colgroup>
                            <thead>
                                <tr>
                                    {stepNames.map((name, idx) => (
                                        <th
                                            key={idx}
                                            style={{
                                                padding: 8,
                                                border: "1px solid #dee2e6",
                                                background: "#f8f9fa",
                                            }}
                                        >
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
                            minWidth: `${Math.max(
                                600,
                                stepNames.length * 200 + 100
                            )}px`,
                        }}
                    >
                        <table
                            className="excel-table"
                            role="grid"
                            style={{
                                width: "100%",
                                borderCollapse: "collapse",
                                tableLayout: "fixed",
                                minWidth: `${Math.max(
                                    600,
                                    stepNames.length * 200 + 100
                                )}px`,
                            }}
                        >
                            <colgroup>
                                {stepNames.map((_, idx) => (
                                    <col
                                        key={idx}
                                        style={{
                                            width: `${100 / stepNames.length}%`,
                                        }}
                                    />
                                ))}
                            </colgroup>
                            <tbody>
                                {virtualResult.visibleItems.map((index) => {
                                    const item = deduplicatedCombinations[index];
                                    if (!item) return null;

                                    const { combination: row, originalIndex } = item;
                                    const active = isRowActive(row, originalIndex);
                                    return (
                                        <tr
                                            key={index}
                                            className={
                                                active
                                                    ? "data-row"
                                                    : "data-row inactive-row"
                                            }
                                            style={{ height: ITEM_HEIGHT }}
                                        >
                                            {row.map((option, stepIdx) => {
                                                const cellStatus =
                                                    getCellStatus(
                                                        originalIndex,
                                                        stepIdx,
                                                        option
                                                    );
                                                const cellActive =
                                                    cellStatus.isActive;

                                                // Determine cell style based on constraint status
                                                let cellClass = "data-cell";
                                                const cellStyle: React.CSSProperties =
                                                    {
                                                        padding: 4,
                                                        border: "1px solid #dee2e6",
                                                        cursor: onToggleOptionActive
                                                            ? "pointer"
                                                            : "default",
                                                    };

                                                switch (cellStatus.status) {
                                                    case "disabled-by-constraint":
                                                        cellClass =
                                                            "constraint-disabled-cell";
                                                        cellStyle.backgroundColor =
                                                            "#fee2e2"; // Light red
                                                        cellStyle.color =
                                                            "#991b1b"; // Dark red
                                                        break;
                                                    case "conflicted":
                                                        cellClass =
                                                            "constraint-conflicted-cell";
                                                        cellStyle.backgroundColor =
                                                            "#fef3c7"; // Light yellow
                                                        cellStyle.color =
                                                            "#92400e"; // Dark yellow
                                                        cellStyle.fontWeight =
                                                            "bold";
                                                        cellStyle.border = "2px solid #f59e0b"; // Orange border
                                                        break;
                                                    case "required-by-constraint":
                                                        cellClass =
                                                            "constraint-required-cell";
                                                        cellStyle.backgroundColor =
                                                            "#dcfce7"; // Light green
                                                        cellStyle.color =
                                                            "#166534"; // Dark green
                                                        cellStyle.fontWeight =
                                                            "bold";
                                                        break;
                                                    case "enabled-by-constraint":
                                                        cellClass =
                                                            "constraint-enabled-cell";
                                                        cellStyle.backgroundColor =
                                                            "#dbeafe"; // Light blue
                                                        cellStyle.color =
                                                            "#1e40af"; // Dark blue
                                                        break;
                                                    case "inactive":
                                                        if (
                                                            option.name !== "-"
                                                        ) {
                                                            cellClass =
                                                                "inactive-cell";
                                                        }
                                                        break;
                                                    case "normal":
                                                    default:
                                                        // Keep default styling
                                                        break;
                                                }

                                                return (
                                                    <td
                                                        key={
                                                            option.id || stepIdx
                                                        }
                                                        className={cellClass}
                                                        style={cellStyle}
                                                        title={
                                                            cellStatus.constraintReason ||
                                                            undefined
                                                        }
                                                        onClick={() => {
                                                            if (
                                                                onToggleOptionActive &&
                                                                option.name !==
                                                                    "-" &&
                                                                cellStatus.status !==
                                                                    "disabled-by-constraint" &&
                                                                cellStatus.status !==
                                                                    "required-by-constraint"
                                                            ) {
                                                                onToggleOptionActive(
                                                                    String(
                                                                        originalIndex
                                                                    ),
                                                                    stepIdx,
                                                                    !cellActive
                                                                );
                                                            }
                                                        }}
                                                    >
                                                        {!cellActive && option.name !== "-" ? (
                                                            <div className="cell-inner">X</div>
                                                        ) : (
                                                            <TextDetailTooltip
                                                                text={option.displayName || option.name}
                                                            >
                                                                <div className="cell-inner">
                                                                    {option.displayName || option.name}
                                                                </div>
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
