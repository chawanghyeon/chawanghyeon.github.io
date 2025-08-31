import React from "react";
import { Step, PathActivationMap } from "../hooks/useStepManager";

interface TableVisualizationTabProps {
  steps: Step[];
  pathActivations?: PathActivationMap;
}

const TableVisualizationTab: React.FC<TableVisualizationTabProps> = ({
  steps,
  pathActivations,
}) => {
  // 필터 상태: 각 단계별로 선택된 옵션 id (null이면 전체)
  const [filters, setFilters] = React.useState<(string | null)[]>(
    steps.map(() => null)
  );

  // steps 변경 시 필터 초기화
  React.useEffect(() => {
    setFilters(steps.map(() => null));
  }, [steps]);
  // Generate all combinations of options for each step (Cartesian product)
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

  // 필터링된 조합만 반환
  const filteredCombinations = getAllCombinations(optionArrays).filter((row) =>
    filters.every((filter, idx) => filter === null || row[idx].id === filter)
  );

  // 각 단계별로 경우의 수(유니크 값 개수) 계산 (필터 적용 전 기준)
  const optionCounts = optionArrays.map((options, stepIdx) => {
    // 필터 적용 후 남아있는 조합에서 해당 단계의 각 옵션별 등장 횟수
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

  // Check if a row is active (fallback to step/option isActive if pathActivations not provided)
  const isRowActive = (
    row: {
      id: string;
      name: string;
      displayName: string;
      isActive?: boolean;
    }[],
    rowIndex: number
  ): boolean => {
    // If we have per-path activations, use those
    if (pathActivations && Array.isArray(pathActivations[String(rowIndex)])) {
      const arr = pathActivations[String(rowIndex)];
      return arr.every((cellActive, idx) => {
        const option = row[idx];
        if (!option) return false;
        if (!steps[idx].isActive) return false;
        return !!cellActive && !!option.isActive;
      });
    }

    // Fallback: a row is active only if every step and option is active
    return row.every((option, idx) => {
      if (!option) return false;
      if (!steps[idx].isActive) return false;
      if (!option.isActive) return false;
      return true;
    });
  };

  return (
    <div className="table-container">
      <h2>📊 표 시각화</h2>
      {/* 단계별 필터 UI */}
      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        {steps.map((step, stepIdx) => (
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
      <div id="tableVisualization">
        {steps.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <h3>표 시각화</h3>
            <p>단계를 추가하면 모든 경로가 표로 표시됩니다.</p>
          </div>
        ) : filteredCombinations.length === 0 ? (
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
                    {stepNames.map((stepName, idx) => (
                      <th key={idx}>{stepName}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredCombinations.map((row, index) => {
                    const isActive = isRowActive(row, index);
                    return (
                      <tr
                        key={index}
                        className={
                          isActive ? "data-row" : "data-row inactive-row"
                        }
                      >
                        {row.map((option, idx) => {
                          // determine cell active state from pathActivations if available
                          const cellActive =
                            pathActivations &&
                            Array.isArray(pathActivations[String(index)])
                              ? !!pathActivations[String(index)][idx]
                              : !!(steps[idx].isActive && option.isActive);
                          return (
                            <td
                              key={option.id || idx}
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
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TableVisualizationTab;
