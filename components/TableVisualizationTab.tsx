import React from "react";
import { Step, PathActivationMap } from "../hooks/useStepManager";

interface TableVisualizationTabProps {
  steps: Step[];
  pathActivations?: PathActivationMap;
}

const BUFFER = 5; // 위/아래 여유 행

const TableVisualizationTab: React.FC<TableVisualizationTabProps> = ({
  steps,
  pathActivations,
}) => {
  const [filters, setFilters] = React.useState<(string | null)[]>(
    steps.map(() => null)
  );

  const containerRef = React.useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = React.useState(0);
  const [rowHeights, setRowHeights] = React.useState<number[]>([]);
  const [viewportHeight, setViewportHeight] = React.useState(400);

  React.useEffect(() => {
    setFilters(steps.map(() => null));
  }, [steps]);

  React.useEffect(() => {
    if (containerRef.current) {
      setViewportHeight(containerRef.current.clientHeight);
    }
  }, []);

  function getAllCombinations<T>(arrays: T[][]): T[][] {
    if (arrays.length === 0) return [[]];
    const [first, ...rest] = arrays;
    const restCombinations = getAllCombinations(rest);
    return first.flatMap((item) =>
      restCombinations.map((comb) => [item, ...comb])
    );
  }

  const stepNames = steps.map((step) => step.displayName || step.name);
  const optionArrays = steps.map((step) =>
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
  );

  const filteredCombinations = getAllCombinations(optionArrays).filter((row) =>
    filters.every((filter, idx) => filter === null || row[idx].id === filter)
  );

  const optionCounts = optionArrays.map((options, stepIdx) => {
    const countMap: Record<string, number> = {};
    getAllCombinations(optionArrays)
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

  const isRowActive = (
    row: {
      id: string;
      name: string;
      displayName: string;
      isActive?: boolean;
    }[],
    rowIndex: number
  ): boolean => {
    if (pathActivations && Array.isArray(pathActivations[String(rowIndex)])) {
      return pathActivations[String(rowIndex)].every(
        (cellActive, idx) =>
          !!cellActive && !!row[idx].isActive && steps[idx].isActive
      );
    }
    return row.every((option, idx) => !!option.isActive && steps[idx].isActive);
  };

  // --- 가상 스크롤 계산 ---
  const total = filteredCombinations.length;

  // 누적 높이 계산
  const cumHeights = React.useMemo(() => {
    const arr: number[] = [];
    let sum = 0;
    for (let i = 0; i < total; i++) {
      const h = rowHeights[i] || 40; // 초기 추정 높이
      arr.push(sum);
      sum += h;
    }
    return arr;
  }, [rowHeights, total]);

  // start / end 인덱스 계산
  let start = 0;
  while (
    start < total &&
    cumHeights[start] + (rowHeights[start] || 40) < scrollTop
  )
    start++;
  let end = start;
  while (
    end < total &&
    cumHeights[end] < scrollTop + viewportHeight + BUFFER * 40
  )
    end++;

  const visibleRows = filteredCombinations.slice(start, end);

  // --- ResizeObserver로 동적 row 높이 측정 ---
  React.useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      setRowHeights((prev) => {
        const newHeights = [...prev];
        entries.forEach((entry) => {
          const index = Number(entry.target.getAttribute("data-index"));
          newHeights[index] = entry.contentRect.height;
        });
        return newHeights;
      });
    });

    const rows = containerRef.current.querySelectorAll("tbody tr.data-row");
    rows.forEach((row, idx) => {
      row.setAttribute("data-index", String(start + idx));
      observer.observe(row);
    });

    return () => observer.disconnect();
  }, [visibleRows, start]);

  return (
    <div className="table-container" style={{ width: "100%" }}>
      <h2>📊 표 시각화</h2>

      {/* 필터 UI */}
      <div
        style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 12 }}
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
                  return `<td style="color: #6b7280;"><s>${safe}</s></td>`;
                return `<td>${safe}</td>`;
              };

              const rowsHtml = filteredCombinations
                .map((row, rIdx) => {
                  const idxCell = `<td>${rIdx + 1}</td>`;
                  const cells = row
                    .map((option, cIdx) => {
                      const cellActive =
                        pathActivations &&
                        Array.isArray(pathActivations[String(rIdx)])
                          ? !!pathActivations[String(rIdx)][cIdx]
                          : !!(steps[cIdx].isActive && option.isActive);
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
                  .map((row, rIdx) =>
                    [
                      String(rIdx + 1),
                      ...row.map((o) => o.displayName || o.name),
                    ].join("\t")
                  )
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

      {/* 테이블 */}
      <div
        className="excel-table-container"
        ref={containerRef}
        style={{ height: "100vh", overflowY: "auto" }}
        onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
      >
        <table className="excel-table" role="grid" style={{ width: "100%" }}>
          <thead>
            <tr>
              {stepNames.map((name, idx) => (
                <th key={idx}>{name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* 위쪽 패딩 */}
            {start > 0 && (
              <tr style={{ height: cumHeights[start] }}>
                <td
                  colSpan={stepNames.length}
                  style={{ padding: 0, border: "none" }}
                />
              </tr>
            )}

            {visibleRows.map((row, idx) => {
              const realIndex = start + idx;
              const active = isRowActive(row, realIndex);
              return (
                <tr
                  key={realIndex}
                  className={active ? "data-row" : "data-row inactive-row"}
                >
                  {row.map((option, stepIdx) => {
                    const cellActive =
                      pathActivations &&
                      Array.isArray(pathActivations[String(realIndex)])
                        ? !!pathActivations[String(realIndex)][stepIdx]
                        : !!(steps[stepIdx].isActive && option.isActive);
                    return (
                      <td
                        key={option.id || stepIdx}
                        className={
                          !cellActive && option.name !== "-"
                            ? "inactive-cell"
                            : "data-cell"
                        }
                      >
                        <div className="cell-inner">
                          {option.displayName || option.name}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}

            {/* 아래쪽 패딩 */}
            {end < total && (
              <tr
                style={{
                  height:
                    cumHeights[total - 1] -
                    cumHeights[end] +
                    (rowHeights[total - 1] || 40),
                }}
              >
                <td
                  colSpan={stepNames.length}
                  style={{ padding: 0, border: "none" }}
                />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TableVisualizationTab;
