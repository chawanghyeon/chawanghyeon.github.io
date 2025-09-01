// 각 경로(조합)별, 단계별 옵션 활성화 상태
export type PathActivationMap = {
  [pathKey: string]: boolean[] // pathKey: 경로 인덱스, boolean[]: 각 단계별 옵션 활성화
}

import React, { useState, useCallback } from 'react'

export interface StepOption {
  id: string
  name: string
  displayName: string
  isActive?: boolean
}

export interface Step {
  id: string
  name: string
  displayName: string
  options: StepOption[]
  isActive?: boolean
}

// 각 단계별, 부모 옵션별, 옵션별 활성화 상태
export type OptionActivationMap = {
  [stepIndex: number]: {
    [parentOptionIndex: number]: boolean[]
  }
}

export type TabType = 'design' | 'table' | 'data'

let idCounter = 0;

function generateId(prefix: string) {
  // For new items created by user interaction (client-side only)
  return `${prefix}_${Date.now()}_${++idCounter}`
}

export const useStepManager = () => {
  const STORAGE_KEY = "chawanghyeon_workflow_v2"; // Changed version to reset localStorage
  const saveTimer = React.useRef<number | null>(null);

  function normalizeSteps(rawSteps: any[]): Step[] {
    if (!Array.isArray(rawSteps)) return [];
    return rawSteps.map((s, stepIndex) => ({
      id: s.id ?? `step_${stepIndex + 1}`, // Use deterministic index-based ID
      name: `${stepIndex + 1}단계`, // Always assign correct step number based on index
      displayName: s.displayName ?? "",
      isActive: s.isActive ?? true,
      options: (s.options || []).map((o: any, optionIndex: number) => ({
        id: o.id ?? `option_${stepIndex}_${optionIndex}`, // Use deterministic index-based ID
        name: o.name ?? `옵션${optionIndex + 1}`,
        displayName: o.displayName ?? "",
        isActive: o.isActive ?? true,
      })),
    }));
  }
  // 특정 위치에 단계 삽입
  const addStepAtIndex = useCallback((insertIdx: number) => {
    setSteps((prev) => {
      const stepId = generateId("step");
      const newStep: Step = {
        id: stepId,
        name: `${insertIdx + 2}단계`,
        displayName: "",
        options: [
          {
            id: generateId("option"),
            name: "옵션1",
            displayName: "",
            isActive: true,
          },
        ],
        isActive: true,
      };
      const newSteps = [
        ...prev.slice(0, insertIdx + 1),
        newStep,
        ...prev.slice(insertIdx + 1),
      ];
      return newSteps.map((step, i) => ({ ...step, name: `${i + 1}단계` }));
    });
  }, []);
  const [steps, setSteps] = useState<Step[]>([
    {
      id: "step_1", // Use static ID for initial state to avoid hydration issues
      name: "1단계",
      displayName: "",
      options: [
        {
          id: "option_1", // Use static ID for initial state to avoid hydration issues
          name: "옵션1",
          displayName: "",
          isActive: true,
        },
      ],
      isActive: true,
    },
  ]);
  const [optionActivations, setOptionActivations] =
    useState<OptionActivationMap>({
      0: { 0: [true] },
    });
  // 경로별 활성화 상태 (표 기반)
  const [pathActivations, setPathActivations] = useState<PathActivationMap>({});
  const [currentTab, setCurrentTab] = useState<TabType>("design");

  // 모든 경로(조합) 구하기
  function getAllCombinations<T>(arrays: T[][]): T[][] {
    if (arrays.length === 0) return [[]];
    const [first, ...rest] = arrays;
    const restCombinations = getAllCombinations(rest);
    return first.flatMap((item) =>
      restCombinations.map((comb) => [item, ...comb])
    );
  }

  // steps/option 변경 시 pathActivations 동기화
  React.useEffect(() => {
    const optionArrays = steps.map((step) => step.options);
    const allCombinations = getAllCombinations(optionArrays);
    setPathActivations((prev) => {
      const newMap: PathActivationMap = {};
      allCombinations.forEach((row, idx) => {
        const key = String(idx);
        // 기존 값 유지, 없으면 모두 true
        newMap[key] =
          prev[key] && prev[key].length === row.length
            ? prev[key]
            : Array(row.length).fill(true);
      });
      return newMap;
    });
  }, [steps]);

  // --- Hydrate from localStorage on client mount ---
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.steps) setSteps(normalizeSteps(parsed.steps));
      if (parsed?.optionActivations)
        setOptionActivations(parsed.optionActivations);
      if (parsed?.pathActivations) setPathActivations(parsed.pathActivations);
    } catch (err) {
      // ignore parse errors
      // console.warn('Failed to load saved workflow', err)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Auto-save (debounced) whenever relevant state changes ---
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    // debounce writes
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      try {
        const payload = { steps, optionActivations, pathActivations };
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      } catch (err) {
        // ignore storage errors
      }
    }, 400);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [steps, optionActivations, pathActivations]);

  // 단계 추가
  const addRootStep = useCallback(() => {
    setSteps((prev) => {
      const stepId = generateId("step");
      const newStep: Step = {
        id: stepId,
        name: `${prev.length + 1}단계`,
        displayName: "",
        options: [
          {
            id: generateId("option"),
            name: "옵션1",
            displayName: "",
            isActive: true,
          },
        ],
        isActive: true,
      };
      // 옵션 활성화 맵에 새 단계 추가
      setOptionActivations((prevAct) => {
        const newIdx = prev.length;
        // 부모 옵션 개수 = 이전 단계 옵션 개수, 없으면 1
        const parentOptions = prev[newIdx - 1]?.options.length || 1;
        const newMap = { ...prevAct };
        newMap[newIdx] = {};
        for (let i = 0; i < parentOptions; i++) {
          newMap[newIdx][i] = [true];
        }
        return newMap;
      });
      const newSteps = [...prev, newStep];
      // 모든 단계의 이름을 올바르게 업데이트
      return newSteps.map((step, i) => ({ ...step, name: `${i + 1}단계` }));
    });
  }, [setOptionActivations]);

  // 옵션에 다음 단계 추가 (리스트형 구조에서는 불필요, 자리만 남김)
  const addNextStep = useCallback(() => {}, []);

  // Step/Option 이름, 활성화, 삭제, 추가, 접기/펼치기 등 기본 기능
  const updateStepName = useCallback((stepId: string, name: string) => {
    setSteps((prev) =>
      prev.map((step) =>
        step.id === stepId ? { ...step, displayName: name } : step
      )
    );
  }, []);
  const updateOptionName = useCallback(
    (stepId: string, optionId: string, name: string) => {
      setSteps((prev) =>
        prev.map((step) =>
          step.id === stepId
            ? {
                ...step,
                options: step.options.map((opt) =>
                  opt.id === optionId ? { ...opt, displayName: name } : opt
                ),
              }
            : step
        )
      );
    },
    []
  );
  const deleteStep = useCallback((stepId: string) => {
    setSteps((prev) => {
      const filteredSteps = prev.filter((step) => step.id !== stepId);
      // 삭제 후 단계 번호를 다시 할당
      return filteredSteps.map((step, i) => ({ ...step, name: `${i + 1}단계` }));
    });
  }, []);
  // 옵션 추가: 모든 단계의 해당 옵션 리스트에 동기화, 활성화 맵도 동기화
  const addOption = useCallback(
    (stepId: string) => {
      setSteps((prev) => {
        const idx = prev.findIndex((s) => s.id === stepId);
        if (idx === -1) return prev;
        const newOption = {
          id: generateId("option"),
          name: `옵션${prev[idx].options.length + 1}`,
          displayName: "",
          isActive: true,
        };
        // 옵션 구조 동기화
        const newSteps = prev.map((step, i) =>
          i === idx ? { ...step, options: [...step.options, newOption] } : step
        );
        // 옵션 활성화 맵 동기화
        setOptionActivations((prevAct) => {
          const newMap = { ...prevAct };
          // 각 부모 옵션별로 새 옵션 활성화 true 추가
          Object.keys(newMap[idx] || {}).forEach((parentIdxStr) => {
            const parentIdx = Number(parentIdxStr);
            newMap[idx][parentIdx] = [...(newMap[idx][parentIdx] || []), true];
          });
          // 다음 단계가 있다면, 그 단계의 부모 옵션 개수도 늘려야 함
          if (newMap[idx + 1]) {
            newMap[idx + 1][Object.keys(newMap[idx + 1]).length] = Array(
              newSteps[idx + 1].options.length
            ).fill(true);
          }
          return newMap;
        });
        return newSteps;
      });
    },
    [setOptionActivations]
  );
  // 옵션 삭제: 구조 동기화, 활성화 맵 동기화
  const deleteOption = useCallback((stepId: string, optionId: string) => {
    setSteps(prev => {
      const idx = prev.findIndex(s => s.id === stepId)
      if (idx === -1) return prev
      if (prev[idx].options.length <= 1) return prev
      const delIdx = prev[idx].options.findIndex(opt => opt.id === optionId)
      if (delIdx === -1) return prev
      // 옵션 구조 동기화
      const newSteps = prev.map((step, i) =>
        i === idx ? { ...step, options: step.options.filter((_, j) => j !== delIdx) } : step
      )
      // 옵션 활성화 맵 동기화
      setOptionActivations(prevAct => {
        const newMap = { ...prevAct }
        Object.keys(newMap[idx] || {}).forEach((parentIdxStr) => {
          const parentIdx = Number(parentIdxStr)
          newMap[idx][parentIdx] = (newMap[idx][parentIdx] || []).filter((_: unknown, j: number) => j !== delIdx)
        })
        return newMap
      })
      return newSteps
    })
  }, [setOptionActivations])
  const toggleStepActive = useCallback((stepId: string, isActive: boolean) => {
    setSteps(prev => prev.map(step => step.id === stepId ? { ...step, isActive } : step))
  }, [])
  // 표 기반: 경로별 옵션 활성화 상태 토글
  const toggleOptionActive = useCallback((pathKey: string, stepIdx: number, isActive: boolean) => {
    setPathActivations(prev => {
      const newMap = { ...prev }
      if (!newMap[pathKey]) return prev
      newMap[pathKey][stepIdx] = isActive
      return newMap
    })
  }, [])
  // Collapse 기능 제거 (리스트형 구조에서는 불필요)
  const toggleStepCollapse = useCallback(() => {}, [])
  const toggleOptionCollapse = useCallback(() => {}, [])
  // 다음 단계 활성화도 optionActivations에서 관리 (별도 구현 필요시 추가)
  const toggleOptionNextStepActive = useCallback((stepId: string, optionId: string, isActive: boolean, parentOptionIdx: number) => {
    // 예시: 옵션별로 다음 단계 활성화 상태를 별도 관리하려면 이와 유사하게 구현
    // 현재는 toggleOptionActive와 동일하게 동작
    setSteps(prev => {
      const idx = prev.findIndex(s => s.id === stepId)
      if (idx === -1) return prev
      const optIdx = prev[idx].options.findIndex(opt => opt.id === optionId)
      if (optIdx === -1) return prev
      setOptionActivations(prevAct => {
        const newMap = { ...prevAct }
        if (!newMap[idx]) newMap[idx] = {}
        if (!newMap[idx][parentOptionIdx]) newMap[idx][parentOptionIdx] = Array(prev[idx].options.length).fill(true)
        newMap[idx][parentOptionIdx][optIdx] = isActive
        return newMap
      })
      return prev
    })
  }, [setOptionActivations])

  return {
    steps,
    optionActivations,
    pathActivations,
    currentTab,
    addRootStep,
    updateStepName,
    updateOptionName,
    deleteStep,
    addOption,
    deleteOption,
    toggleOptionActive,
    toggleOptionNextStepActive,
    setCurrentTab,
    addStepAtIndex
  }
}
