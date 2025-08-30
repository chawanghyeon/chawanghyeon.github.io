import React, { useRef } from 'react'
import { Step } from '../hooks/useStepManager'

interface DataManagementTabProps {
  steps: Step[]
}

const DataManagementTab: React.FC<DataManagementTabProps> = ({ steps }) => {
  const STORAGE_KEY = "chawanghyeon_workflow_v1";
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleExport = () => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY) || "{}";
      const blob = new Blob([raw], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "workflow-data.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("내보내기 실패");
    }
  };

  const handleImportFile = (
    e: React.ChangeEvent<HTMLInputElement>,
    mode: "replace" | "append"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || "");
        const parsed = JSON.parse(text);
        if (!parsed) throw new Error("Invalid JSON");
        if (mode === "replace") {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
          alert("데이터 교체 완료 — 페이지를 새로고침합니다");
          window.location.reload();
        } else {
          // append: merge top-level keys (steps, optionActivations, pathActivations)
          const existingRaw = window.localStorage.getItem(STORAGE_KEY);
          const existing = existingRaw ? JSON.parse(existingRaw) : {};
          const merged = { ...existing, ...parsed };
          // For steps, append with new IDs when conflicts
          if (Array.isArray(existing.steps) && Array.isArray(parsed.steps)) {
            merged.steps = [...existing.steps, ...parsed.steps];
          }
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          alert("데이터 추가 완료 — 페이지를 새로고침합니다");
          window.location.reload();
        }
      } catch (err) {
        alert("잘못된 JSON 파일입니다");
      }
    };
    reader.readAsText(file);
    // reset input so same file can be reselected
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  // 통계 계산 (리스트형 구조)
  const totalSteps = steps.length
  const activeSteps = steps.filter(step => step.isActive).length
  const totalOptions = steps.reduce((sum, step) => sum + step.options.length, 0)
  const activeOptions = steps.reduce((sum, step) => sum + step.options.filter(option => option.isActive).length, 0)

  return (
    <div className="data-container">
      <h2>💾 데이터 관리</h2>
      <div className="data-info">
        <h3>저장된 데이터 정보</h3>
        <div className="data-stats">
          <div className="stat-item">
            <span className="stat-label">총 단계:</span>
            <span className="stat-value">{totalSteps}</span>
            <span className="stat-detail">(활성: {activeSteps})</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">총 선택지:</span>
            <span className="stat-value">{totalOptions}</span>
            <span className="stat-detail">(활성: {activeOptions})</span>
          </div>
          <p>데이터는 브라우저의 로컬 스토리지에 자동으로 저장됩니다.</p>
          <div
            style={{
              marginTop: 12,
              display: "flex",
              gap: 8,
              alignItems: "center",
            }}
          >
            <button className="btn-primary small" onClick={handleExport}>
              JSON 내보내기
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              style={{ display: "none" }}
              onChange={(e) => handleImportFile(e, "replace")}
            />
            <button
              className="btn-muted small"
              onClick={() => fileInputRef.current?.click()}
            >
              JSON 교체(불러오기)
            </button>
            <input
              ref={null}
              type="file"
              accept="application/json"
              style={{ display: "none" }}
              onChange={(e) => handleImportFile(e, "append")}
            />
            <button
              className="btn-link small"
              onClick={() => {
                // trigger append import via temporary input
                const tmp = document.createElement("input");
                tmp.type = "file";
                tmp.accept = "application/json";
                tmp.onchange = (ev: any) =>
                  handleImportFile(ev.target, "append");
                tmp.click();
              }}
            >
              JSON 추가(병합)
            </button>
            <button
              className="btn-danger small"
              onClick={() => {
                if (
                  !confirm(
                    "정말 저장된 모든 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
                  )
                )
                  return;
                try {
                  window.localStorage.removeItem(STORAGE_KEY);
                } catch (err) {}
                window.location.reload();
              }}
            >
              데이터 전체 삭제
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DataManagementTab
