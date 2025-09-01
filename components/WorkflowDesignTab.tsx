import React from "react";
import { Step, OptionActivationMap, PathActivationMap } from "../lib/types";
import AutoResizeInput from "./AutoResizeInput";
import MenuPortal from "./MenuPortal";
import { useIsClient } from "../hooks/useIsClient";

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

// 가상화 스크롤 설정
const ITEM_HEIGHT = 30; // 고정 행 높이
const OVERSCAN = 5; // 버퍼 행 수

// Global width cache for Excel-like behavior
const cellWidthCache = new Map<string, number>();
const MIN_CELL_WIDTH = 60;
const MAX_CELL_WIDTH = 300;

// 조합 생성 함수
function generateAllCombinations<T>(arrays: T[][]): T[][] {
  if (arrays.length === 0) return [[]];
  const [first, ...rest] = arrays;
  const restCombinations = generateAllCombinations(rest);
  const out: T[][] = [];
  for (let i = 0; i < first.length; i++) {
    const item = first[i];
    for (let j = 0; j < restCombinations.length; j++) {
      out.push([item, ...restCombinations[j]]);
    }
  }
  return out;
}

// Excel-like stable width input component
const StableWidthInput: React.FC<{
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  cellKey: string; // Unique key for this cell (pathKey:colIdx:optionId)
  className?: string;
}> = React.memo(({ value, onChange, placeholder, cellKey, className }) => {
  const isClient = useIsClient();
  const inputRef = React.useRef<HTMLInputElement>(null);
  
  // Use ref to track internal value and avoid state updates during typing
  const internalValueRef = React.useRef(value);
  const isTypingRef = React.useRef(false);
  const changeTimeoutRef = React.useRef<NodeJS.Timeout>();
  
  // Width state with stable caching
  const [width, setWidth] = React.useState(() => {
    const cached = cellWidthCache.get(cellKey);
    if (cached) return cached;
    
    // Calculate reasonable initial width
    const estimatedWidth = Math.max(MIN_CELL_WIDTH, Math.min(MAX_CELL_WIDTH, (value || placeholder || '').length * 8 + 20));
    cellWidthCache.set(cellKey, estimatedWidth);
    return estimatedWidth;
  });

  // Only update internal value when external value changes AND input is not focused
  React.useEffect(() => {
    if (document.activeElement !== inputRef.current && !isTypingRef.current) {
      internalValueRef.current = value;
      if (inputRef.current) {
        inputRef.current.value = value;
      }
    }
  }, [value]);

  // Handle input changes with minimal state updates
  const handleChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    internalValueRef.current = newValue;
    isTypingRef.current = true;
    
    // Clear previous timeout
    if (changeTimeoutRef.current) {
      clearTimeout(changeTimeoutRef.current);
    }
    
    // Debounce the external onChange call
    changeTimeoutRef.current = setTimeout(() => {
      onChange({ target: { value: newValue } } as React.ChangeEvent<HTMLInputElement>);
      isTypingRef.current = false;
    }, 500); // Longer debounce for stability
  }, [onChange]);

  // Update width only when really necessary
  const updateWidth = React.useCallback(() => {
    if (!inputRef.current || typeof window === 'undefined' || isTypingRef.current) return;
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (context) {
      context.font = getComputedStyle(inputRef.current).font;
      const textWidth = context.measureText(internalValueRef.current).width;
      const newWidth = Math.max(MIN_CELL_WIDTH, Math.min(MAX_CELL_WIDTH, textWidth + 20));
      
      // Only update if width changed significantly
      if (Math.abs(newWidth - width) > 15) {
        setWidth(newWidth);
        cellWidthCache.set(cellKey, newWidth);
      }
    }
  }, [cellKey, width]);

  // Minimal width updates with long debounce
  React.useEffect(() => {
    if (typeof window === 'undefined' || isTypingRef.current) return;
    const timeoutId = setTimeout(updateWidth, 1000);
    return () => clearTimeout(timeoutId);
  }, [updateWidth]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (changeTimeoutRef.current) {
        clearTimeout(changeTimeoutRef.current);
      }
    };
  }, []);

  return (
    <input
      ref={inputRef}
      type="text"
      className={className}
      defaultValue={value} // Use defaultValue instead of controlled value
      onChange={handleChange}
      placeholder={placeholder}
      title={internalValueRef.current || placeholder}
      {...(isClient && { 'data-cell-key': cellKey })} // Only add data-cell-key on client
      style={{
        width: `${width}px`,
        minWidth: `${MIN_CELL_WIDTH}px`,
        maxWidth: `${MAX_CELL_WIDTH}px`,
        transition: 'none',
        border: '1px solid #ccc',
        padding: '4px 8px',
        fontSize: '14px',
        fontFamily: 'inherit'
      }}
    />
  );
});

StableWidthInput.displayName = 'StableWidthInput';
const MemoizedStableWidthInput = React.memo(StableWidthInput, (prevProps, nextProps) => {
  // Very simple comparison - only re-render if absolutely necessary
  return prevProps.cellKey === nextProps.cellKey &&
         prevProps.placeholder === nextProps.placeholder &&
         prevProps.className === nextProps.className;
  // Note: Removed value comparison since we're using defaultValue + refs
});

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

const WorkflowDesignTab: React.FC<Props> = (props) => {
  // 필터 상태
  const [filters, setFilters] = React.useState<(string | null)[]>(
    props.steps.map(() => null)
  );

  // 조합별 토글 UI 상태
  const [comboSelections, setComboSelections] = React.useState<{
    [stepIdx: number]: string;
  }>({});

  // 가상화 스크롤 상태
  const [scrollTop, setScrollTop] = React.useState(0);
  const [containerHeight, setContainerHeight] = React.useState(400);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // UI 상태
  const [hoveredCell, setHoveredCell] = React.useState<{
    rowIndex: number;
    colIndex: number;
  } | null>(null);
  const [selectedCell, setSelectedCell] = React.useState<{
    rowIndex: number;
    colIndex: number;
  } | null>(null);
  
  // 메뉴 상태
  const [cellAnchorRect, setCellAnchorRect] = React.useState<DOMRect | null>(null);
  const [openHeader, setOpenHeader] = React.useState<number | null>(null);
  const [headerAnchorRect, setHeaderAnchorRect] = React.useState<DOMRect | null>(null);

  // steps 변경 시 필터 초기화
  React.useEffect(() => {
    setFilters(props.steps.map(() => null));
  }, [props.steps]);

  // 메뉴 닫기 이벤트
  React.useEffect(() => {
    const handleClickOutside = () => {
      setHoveredCell(null);
      setOpenHeader(null);
      setCellAnchorRect(null);
      setHeaderAnchorRect(null);
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

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
  }, []);

  // 조합 생성 및 필터링
  const optionArrays = React.useMemo(
    () => props.steps.map((step) => step.options),
    [props.steps]
  );
  
  const allCombinations = React.useMemo(() => 
    generateAllCombinations(optionArrays), 
    [optionArrays]
  );
  
  const filteredCombinations = React.useMemo(() => 
    allCombinations.filter((row) =>
      filters.every((filter, idx) => filter === null || row[idx].id === filter)
    ), 
    [allCombinations, filters]
  );

  // Precompute maps for faster lookups (bulk toggle 기능을 위해)
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

  // 가상화 스크롤 계산
  const virtualResult = useVirtualScroll(
    filteredCombinations.length,
    ITEM_HEIGHT,
    containerHeight,
    scrollTop
  );

  // 스크롤 핸들러
  const handleScroll = React.useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // 단계 전체 활성화 상태 확인
  const isStepAllActive = React.useCallback(
    (stepIdx: number) => {
      if (!props.pathActivations) return false;
      return Object.values(props.pathActivations).every(
        (row) => Array.isArray(row) && row[stepIdx]
      );
    },
    [props.pathActivations]
  );

  // 행 bulk toggle 핸들러 생성
  const { onToggleOptionActive } = props;
  const createRowBulkToggleHandler = React.useCallback(
    (pathKey: string, row: LocalOption[], isRowAllActive: boolean) => () => {
      const targetActive = !isRowAllActive;
      row.forEach((_, colIdx) => {
        onToggleOptionActive(pathKey, colIdx, targetActive);
      });
    },
    [onToggleOptionActive]
  );

  // 조합별 토글 실행 핸들러
  const handleComboToggle = (targetActive: boolean) => {
    if (Object.keys(comboSelections).length === 0) return;
    
    allCombinations.forEach((row, rowIdx) => {
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

  // 단계별 활성화 통계 계산 (고급 버전)
  const stepStats = React.useMemo(() => {
    return props.steps.map((step, stepIdx) => {
      // 전체 조합에서 이 단계의 통계 계산
      const totalPaths = allCombinations.length;
      const activePaths = Object.values(props.pathActivations).filter(
        (pathArray) => Array.isArray(pathArray) && pathArray[stepIdx]
      ).length;
      
      // 이 단계의 각 옵션별 활성화 상태
      const optionStats: { [optionId: string]: { active: number; total: number } } = {};
      
      step.options.forEach(option => {
        const optionCombinations = optionToCombinationIndices.get(`${stepIdx}:${option.id}`) || [];
        const activeCount = optionCombinations.filter(
          combIdx => props.pathActivations[String(combIdx)]?.[stepIdx]
        ).length;
        
        optionStats[option.id] = {
          active: activeCount,
          total: optionCombinations.length
        };
      });
      
      return {
        totalCount: totalPaths,
        activeCount: activePaths,
        percentage: totalPaths > 0 ? Math.round((activePaths / totalPaths) * 100) : 0,
        optionStats
      };
    });
  }, [props.steps, props.pathActivations, allCombinations, optionToCombinationIndices]);

  return (
    <section className="workflow-design-tab">
      {/* 상단 액션 버튼 */}
      <div style={{ 
        marginBottom: 16, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
      }}>
        <h3 style={{ margin: 0 }}>워크플로우 설계</h3>
        <button
          onClick={props.onAddRootStep}
          className="btn-primary"
        >
          단계 추가
        </button>
      </div>

      {/* 단계별 필터 UI (통계 포함) */}
      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        {props.steps.map((step, stepIdx) => {
          const stats = stepStats[stepIdx];
          const stepStats_display = stats ? 
            `총 ${stats.totalCount} / 활성 ${stats.activeCount} / 비활성 ${stats.totalCount - stats.activeCount}` : 
            '';
          
          return (
            <div key={step.id} style={{ minWidth: 180 }}>
              <label style={{ fontWeight: 500, fontSize: 13, display: 'block' }}>
                {stepIdx + 1}단계 필터
              </label>
              <div style={{ fontSize: 11, color: '#6c757d', marginBottom: 2 }}>
                {stepStats_display}
              </div>
              <select
                style={{ width: "100%", marginTop: 2 }}
                value={filters[stepIdx] ?? ""}
                onChange={(e) => {
                  const newFilters = [...filters];
                  newFilters[stepIdx] = e.target.value || null;
                  setFilters(newFilters);
                }}
              >
                <option value="">전체</option>
                {step.options.map((option) => {
                  const optionStats = stats?.optionStats[option.id];
                  const optionStatsDisplay = optionStats ? 
                    ` (${optionStats.active}/${optionStats.total})` : '';
                  
                  return (
                    <option key={option.id} value={option.id}>
                      {(option.displayName || option.name) + optionStatsDisplay}
                    </option>
                  );
                })}
              </select>
            </div>
          );
        })}
      </div>

      {/* 조합별 토글 UI */}
      <div className="combo-toolbar">
        <div className="combo-toolbar-row">
          <strong className="combo-label">조합별 토글</strong>
          <div className="combo-selects">
            {props.steps.map((step, stepIdx) => (
              <div key={step.id} className="combo-item">
                <span className="combo-step-label">{stepIdx + 1}단계:</span>
                <select
                  className="combo-select"
                  value={comboSelections[stepIdx] || ""}
                  onChange={(e) => {
                    if (e.target.value) {
                      setComboSelections(prev => ({
                        ...prev,
                        [stepIdx]: e.target.value
                      }));
                    } else {
                      setComboSelections(prev => {
                        const next = { ...prev };
                        delete next[stepIdx];
                        return next;
                      });
                    }
                  }}
                >
                  <option value="">선택안함</option>
                  {step.options.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.displayName || option.name}
                    </option>
                  ))}
                </select>
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

      {/* 가상화 테이블 */}
      <div className="tab-content horizontal-tree-root">
        <div 
          ref={containerRef}
          className="virtual-table-container"
          style={{
            height: '60vh',
            overflow: 'auto',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            position: 'relative'
          }}
          onScroll={handleScroll}
        >
          {/* 전체 높이를 위한 컨테이너 */}
          <div style={{ 
            height: virtualResult.totalHeight, 
            position: 'relative',
            minWidth: `${60 + (props.steps.length * 180)}px` // 동적 최소 너비 설정
          }}>
            {/* 헤더 (고정) */}
            <div 
              style={{
                position: 'sticky',
                top: 0,
                zIndex: 10,
                backgroundColor: '#f8f9fa',
                borderBottom: '2px solid #dee2e6',
                minWidth: `${60 + (props.steps.length * 180)}px` // 헤더도 동일한 최소 너비
              }}
            >
              <table style={{ 
                width: '100%', 
                borderCollapse: 'collapse',
                tableLayout: 'fixed', // 고정 레이아웃으로 변경
                minWidth: `${60 + (props.steps.length * 180)}px`
              }}>
                <colgroup>
                  <col style={{ width: '60px' }} />
                  {props.steps.map((_, idx) => (
                    <col key={idx} style={{ width: '180px' }} />
                  ))}
                </colgroup>
                <thead>
                  <tr>
                    <th style={{
                      padding: 8,
                      border: '1px solid #dee2e6',
                      background: '#f8f9fa',
                      width: 60,
                      textAlign: 'center'
                    }}>
                      #
                    </th>
                    {props.steps.map((step, stepIdx) => (
                      <th key={step.id} style={{
                        padding: 8,
                        border: '1px solid #dee2e6',
                        background: '#f8f9fa',
                        width: 180
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span>{stepIdx + 1}단계</span>
                          <AutoResizeInput
                            type="text"
                            value={step.displayName}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => props.onUpdateStepName(step.id, e.target.value)}
                            placeholder="단계 이름"
                            style={{ fontSize: '0.9rem', flex: 1 }}
                          />
                          <span className="header-caret-wrap">
                            <button
                              className="cell-caret header-caret"
                              aria-haspopup="true"
                              onClick={(e) => {
                                e.stopPropagation();
                                const rect = e.currentTarget.getBoundingClientRect();
                                setHeaderAnchorRect(rect);
                                setOpenHeader(openHeader === stepIdx ? null : stepIdx);
                              }}
                              title="단계 메뉴"
                            >
                              ▾
                            </button>
                            {openHeader === stepIdx && headerAnchorRect && (
                              <MenuPortal anchorRect={headerAnchorRect}>
                                <div
                                  className="header-menu"
                                  role="menu"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    className="cell-menu-item"
                                    onClick={() => {
                                      props.onAddOption(step.id);
                                      setOpenHeader(null);
                                    }}
                                  >
                                    선택지 추가
                                  </button>
                                  <button
                                    className="cell-menu-item"
                                    onClick={() => {
                                      // 이 단계의 모든 경로를 토글
                                      const allActive = isStepAllActive(stepIdx);
                                      Object.keys(props.pathActivations).forEach((pathKey) => {
                                        props.onToggleOptionActive(pathKey, stepIdx, !allActive);
                                      });
                                      setOpenHeader(null);
                                    }}
                                  >
                                    {isStepAllActive(stepIdx) ? "전체 비활성화" : "전체 활성화"}
                                  </button>
                                  <button
                                    className="cell-menu-item"
                                    onClick={() => {
                                      props.onDeleteStep(step.id);
                                      setOpenHeader(null);
                                    }}
                                    disabled={props.steps.length === 1}
                                  >
                                    현재 단계 삭제
                                  </button>
                                  <button
                                    className="cell-menu-item"
                                    onClick={() => {
                                      props.onAddStepAtIndex(stepIdx);
                                      setOpenHeader(null);
                                    }}
                                  >
                                    오른쪽에 단계 추가
                                  </button>
                                </div>
                              </MenuPortal>
                            )}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
              </table>
            </div>

            {/* 가상화된 행들 */}
            <div 
              style={{
                position: 'absolute',
                top: virtualResult.offsetY + 40, // 헤더 높이만큼 오프셋
                left: 0,
                right: 0,
                minWidth: `${60 + (props.steps.length * 180)}px` // 행들도 동일한 최소 너비
              }}
            >
              <table style={{ 
                width: '100%', 
                borderCollapse: 'collapse',
                tableLayout: 'fixed', // 고정 레이아웃으로 변경
                minWidth: `${60 + (props.steps.length * 180)}px`
              }}>
                <colgroup>
                  <col style={{ width: '60px' }} />
                  {props.steps.map((_, idx) => (
                    <col key={idx} style={{ width: '180px' }} />
                  ))}
                </colgroup>
                <tbody>
                  {virtualResult.visibleItems.map((index) => {
                    const combination = filteredCombinations[index];
                    if (!combination) return null;

                    const isRowActive = props.pathActivations[String(index)]?.every(Boolean) ?? false;

                    return (
                      <tr
                        key={index}
                        style={{ 
                          height: ITEM_HEIGHT,
                          backgroundColor: selectedCell?.rowIndex === index ? '#e3f2fd' : 
                                         hoveredCell?.rowIndex === index ? '#f5f5f5' : 'white'
                        }}
                        onMouseEnter={() => setHoveredCell({ rowIndex: index, colIndex: -1 })}
                        onMouseLeave={() => setHoveredCell(null)}
                      >
                        {/* 행 번호 및 전체 토글 */}
                        <td style={{
                          padding: 4,
                          border: '1px solid #dee2e6',
                          textAlign: 'center',
                          width: 60,
                          background: '#f8f9fa'
                        }}>
                          <button
                            onClick={createRowBulkToggleHandler(String(index), combination, isRowActive)}
                            className={isRowActive ? "btn-muted small" : "btn-primary small"}
                            style={{ fontSize: '0.7rem', padding: '2px 6px' }}
                          >
                            {index + 1}
                          </button>
                        </td>

                        {/* 각 단계의 옵션 셀 */}
                        {combination.map((option, colIdx) => {
                          const isCellActive = props.pathActivations[String(index)]?.[colIdx] ?? true;
                          const isCellSelected = selectedCell?.rowIndex === index && selectedCell?.colIndex === colIdx;
                          const isCellHovered = hoveredCell?.rowIndex === index && hoveredCell?.colIndex === colIdx;

                          return (
                            <td
                              key={`${index}-${colIdx}`}
                              style={{
                                padding: 4,
                                border: '1px solid #dee2e6',
                                width: 180,
                                backgroundColor: isCellSelected ? '#e3f2fd' : 
                                               isCellHovered ? '#f0f0f0' : 'white'
                              }}
                              onMouseEnter={() => setHoveredCell({ rowIndex: index, colIndex: colIdx })}
                              onClick={() => setSelectedCell({ rowIndex: index, colIndex: colIdx })}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <MemoizedStableWidthInput
                                  value={option.displayName || option.name || ""}
                                  onChange={(e) => props.onUpdateOptionName(props.steps[colIdx].id, option.id, e.target.value)}
                                  placeholder="선택지 이름"
                                  cellKey={`${index}:${colIdx}:${option.id}`}
                                  className="option-input"
                                />
                                <label style={{ display: 'flex', alignItems: 'center' }}>
                                  <input
                                    type="checkbox"
                                    checked={isCellActive}
                                    onChange={(e) => props.onToggleOptionActive(String(index), colIdx, e.target.checked)}
                                  />
                                </label>
                                
                                <span className="caret-wrap">
                                  <button
                                    className="cell-caret"
                                    aria-haspopup="true"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      setCellAnchorRect(rect);
                                      setHoveredCell({ rowIndex: index, colIndex: colIdx });
                                    }}
                                    title="셀 메뉴"
                                  >
                                    ▾
                                  </button>

                                  {hoveredCell?.rowIndex === index && hoveredCell?.colIndex === colIdx && cellAnchorRect && (
                                    <MenuPortal anchorRect={cellAnchorRect}>
                                      <div
                                        className="cell-menu"
                                        role="menu"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <button
                                          className="cell-menu-item"
                                          onClick={() => {
                                            const matchedOptionIndices = optionToCombinationIndices.get(`${colIdx}:${option.id}`) || [];
                                            const isOptionAllActive = matchedOptionIndices.length > 0 &&
                                              matchedOptionIndices.every((i) => props.pathActivations[String(i)]?.[colIdx]);
                                            const targetActive = !isOptionAllActive;
                                            matchedOptionIndices.forEach((i) =>
                                              props.onToggleOptionActive(String(i), colIdx, targetActive)
                                            );
                                            setHoveredCell(null);
                                          }}
                                        >
                                          {(() => {
                                            const matchedOptionIndices = optionToCombinationIndices.get(`${colIdx}:${option.id}`) || [];
                                            const isOptionAllActive = matchedOptionIndices.length > 0 &&
                                              matchedOptionIndices.every((i) => props.pathActivations[String(i)]?.[colIdx]);
                                            return isOptionAllActive ? "동일 옵션 모두 비활성화" : "동일 옵션 모두 활성화";
                                          })()}
                                        </button>
                                        {colIdx > 0 && (
                                          <button 
                                            className="cell-menu-item" 
                                            onClick={() => {
                                              // 현재 셀의 이전 단계 옵션 ID
                                              const prevOptionId = combination[colIdx - 1].id;
                                              // 현재 셀의 옵션 ID
                                              const currentOptionId = option.id;
                                              
                                              // 이전 옵션과 현재 옵션이 연결된 모든 조합의 인덱스 찾기
                                              const connectedIndices: number[] = [];
                                              allCombinations.forEach((comb, combIdx) => {
                                                if (comb[colIdx - 1].id === prevOptionId && comb[colIdx].id === currentOptionId) {
                                                  connectedIndices.push(combIdx);
                                                }
                                              });
                                              
                                              // 연결된 경로들의 현재 활성화 상태 확인
                                              const isAllActive = connectedIndices.length > 0 &&
                                                connectedIndices.every(i => props.pathActivations[String(i)]?.[colIdx]);
                                              const targetActive = !isAllActive;
                                              
                                              // 연결된 모든 경로를 토글
                                              connectedIndices.forEach(i =>
                                                props.onToggleOptionActive(String(i), colIdx, targetActive)
                                              );
                                              setHoveredCell(null);
                                            }}
                                          >
                                            이전 옵션과 연결된 모든 경로 토글
                                          </button>
                                        )}
                                        {colIdx < props.steps.length - 1 && (
                                          <button 
                                            className="cell-menu-item" 
                                            onClick={() => {
                                              // 현재 셀의 다음 단계 옵션 ID
                                              const nextOptionId = combination[colIdx + 1].id;
                                              // 현재 셀의 옵션 ID
                                              const currentOptionId = option.id;
                                              
                                              // 현재 옵션과 다음 옵션이 연결된 모든 조합의 인덱스 찾기
                                              const connectedIndices: number[] = [];
                                              allCombinations.forEach((comb, combIdx) => {
                                                if (comb[colIdx].id === currentOptionId && comb[colIdx + 1].id === nextOptionId) {
                                                  connectedIndices.push(combIdx);
                                                }
                                              });
                                              
                                              // 연결된 경로들의 현재 활성화 상태 확인
                                              const isAllActive = connectedIndices.length > 0 &&
                                                connectedIndices.every(i => props.pathActivations[String(i)]?.[colIdx]);
                                              const targetActive = !isAllActive;
                                              
                                              // 연결된 모든 경로를 토글
                                              connectedIndices.forEach(i =>
                                                props.onToggleOptionActive(String(i), colIdx, targetActive)
                                              );
                                              setHoveredCell(null);
                                            }}
                                          >
                                            다음 옵션과 연결된 모든 경로 토글
                                          </button>
                                        )}
                                        <button
                                          className="cell-menu-item"
                                          onClick={() => {
                                            props.onDeleteOption(props.steps[colIdx].id, option.id);
                                            setHoveredCell(null);
                                          }}
                                          disabled={props.steps[colIdx].options.length === 1}
                                        >
                                          선택지 삭제
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
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WorkflowDesignTab;
