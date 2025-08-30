import { useState, useEffect, useCallback, useRef } from 'react'

// Types for the workflow system
export interface StepOption {
  id: string
  name: string
  displayName: string
  nextSteps: string[]
  isActive: boolean
  isCollapsed: boolean
}

export interface Step {
  id: string
  name: string
  displayName: string
  options: StepOption[]
  parentStepId: string | null
  parentOptionId: string | null
  isActive: boolean
  isCollapsed: boolean
}

export type TabType = 'design' | 'visualization' | 'table' | 'data'

export const useStepManager = () => {
  const [steps, setSteps] = useState<Record<string, Step>>({})
  const [rootSteps, setRootSteps] = useState<string[]>([])
  const [stepCounter, setStepCounter] = useState(0)
  const [currentTab, setCurrentTab] = useState<TabType>('design')
  const nextIdRef = useRef(1)
  const storageKey = 'stepManager_data'

  // Generate unique step ID
  const generateStepId = useCallback(() => {
    return 'step_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  }, [])

  // Check if step name is unique
  // step 이름은 동일한 부모(같은 옵션 하위 or root) 내에서만 유니크
  const isStepNameUnique = useCallback((name: string, excludeStepId?: string, parentStepId?: string | null, parentOptionId?: string | null): boolean => {
    const trimmedName = name.trim();
    if (!trimmedName) return false;
    // root 단계: rootSteps에 속한 step들만 검사
    if (!parentStepId && !parentOptionId) {
      return !rootSteps.some(rootId => {
        if (rootId === excludeStepId) return false;
        const step = steps[rootId];
        return step && step.name === trimmedName;
      });
    }
    // 옵션 하위 단계: parentOptionId, parentStepId가 같은 step들만 검사
    return !Object.values(steps).some(step => {
      if (step.id === excludeStepId) return false;
      return step.parentStepId === parentStepId && step.parentOptionId === parentOptionId && step.name === trimmedName;
    });
  }, [steps, rootSteps])

  // Check if option name is unique within a step
  // option 이름은 해당 step 내에서만 유니크, step 이름과 겹쳐도 허용
  const isOptionNameUniqueInStep = useCallback((stepId: string, name: string, excludeOptionId?: string): boolean => {
    const trimmedName = name.trim()
    if (!trimmedName) return false
    const step = steps[stepId]
    if (!step) return false
    return !step.options.some(option => option.id !== excludeOptionId && option.name === trimmedName)
  }, [steps])

  // Generate unique step name
  const generateUniqueStepName = useCallback((baseName: string): string => {
    let name = baseName
    let counter = 1
    
    while (!isStepNameUnique(name)) {
      name = `${baseName} ${counter}`
      counter++
    }
    
    return name
  }, [isStepNameUnique])

  // Generate unique option name within a step
  const generateUniqueOptionName = useCallback((stepId: string, baseName: string): string => {
    let name = baseName
    let counter = 1
    
    while (!isOptionNameUniqueInStep(stepId, name)) {
      name = `${baseName} ${counter}`
      counter++
    }
    
    return name
  }, [isOptionNameUniqueInStep])

  // Get step suggestions
  const getStepSuggestion = useCallback((stepNumber: number) => {
    const suggestions = [
      '사용자 로그인 확인',
      '권한 검증',
      '데이터 유효성 검사',
      '비즈니스 로직 실행',
      '결과 저장',
      '알림 발송',
      '로그 기록',
      '완료 처리'
    ]
    
    return stepNumber <= suggestions.length 
      ? suggestions[stepNumber - 1] 
      : `단계 ${stepNumber}`
  }, [])

  // Load data from localStorage
  const loadData = useCallback(() => {
    try {
      const savedData = localStorage.getItem(storageKey)
      if (savedData) {
        const data = JSON.parse(savedData)
        const stepsMap: Record<string, Step> = {};
        
        if (data.steps) {
          Object.entries(data.steps).forEach(([key, value]) => {
            const step = value as Step
            
            // Migration: Add displayName if it doesn't exist
            if (!step.hasOwnProperty('displayName')) {
              step.displayName = step.name || ''
            }
            
            // Migration: Add displayName to options if it doesn't exist
            step.options = step.options.map(option => {
              if (!option.hasOwnProperty('displayName')) {
                option.displayName = option.name || ''
              }
              return option
            })
            
            stepsMap[key] = step
          })
        }
        
        setSteps(stepsMap)
        setRootSteps(data.rootSteps || [])
        setStepCounter(data.stepCounter || 0)
        nextIdRef.current = data.nextId || 1
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    }
  }, [storageKey])

  // Save data to localStorage
  const saveData = useCallback(() => {
    try {
      const stepsObject = steps
      const data = {
        steps: stepsObject,
        rootSteps,
        stepCounter,
        nextId: nextIdRef.current
      }
      localStorage.setItem(storageKey, JSON.stringify(data))
    } catch (error) {
      console.error('Failed to save data:', error)
    }
  }, [steps, rootSteps, stepCounter, storageKey])

  // Add root step - ULTRA SIMPLIFIED VERSION
  const addRootStep = useCallback(() => {
    const timestamp = Date.now();
    const stepId = `step_${timestamp}`;
    const optionId = `${stepId}_option_1`;
    setStepCounter(prevCounter => {
      const newCounter = prevCounter + 1;
      const newStep: Step = {
        id: stepId,
        name: `단계 ${newCounter}`,
        displayName: '',
        options: [{
          id: optionId,
          name: '확인',
          displayName: '',
          nextSteps: [],
          isActive: true,
          isCollapsed: false
        }],
        parentStepId: null,
        parentOptionId: null,
        isActive: true,
        isCollapsed: false
      };
      setSteps(prev => ({ ...prev, [stepId]: newStep }));
      setRootSteps(prev => [...prev, stepId]);
      return newCounter;
    });
  }, [])

  // Add next step (불변성 보장, 안전하게)
  const addNextStep = useCallback((parentStepId: string, parentOptionId: string) => {
    setSteps(prev => {
      // 사이클 방지: parentStepId가 자신의 조상인지 확인
      const isCycle = (checkId: string, targetId: string): boolean => {
        if (checkId === targetId) return true;
        const step = prev[checkId];
        if (!step) return false;
        for (const opt of step.options) {
          for (const nextId of opt.nextSteps) {
            if (isCycle(nextId, targetId)) return true;
          }
        }
        return false;
      };
      const stepId = generateStepId();
      if (isCycle(parentStepId, stepId)) {
        alert('순환 참조가 발생할 수 있어 다음 단계를 추가할 수 없습니다.');
        return prev;
      }
      const parent = prev[parentStepId];
      if (parent) {
        const parentOption = parent.options.find(opt => opt.id === parentOptionId);
        if (parentOption) {
          if (parentOption.nextSteps.includes(stepId)) {
            alert('이미 같은 단계가 연결되어 있습니다.');
            return prev;
          }
          if (stepId === parentStepId) {
            alert('자기 자신을 다음 단계로 연결할 수 없습니다.');
            return prev;
          }
        }
      }
      // steps(prev) 기반으로 유니크 step name 생성
      const getUniqueStepName = (baseName: string, stepsObj: Record<string, Step>, parentStepId: string | null, parentOptionId: string | null): string => {
        let name = baseName;
        let counter = 1;
        const isUnique = (n: string) => {
          if (!parentStepId && !parentOptionId) {
            // root 단계
            return !rootSteps.some(rootId => {
              const step = stepsObj[rootId];
              return step && step.name === n;
            });
          }
          // 옵션 하위 단계
          return !Object.values(stepsObj).some(step => step.parentStepId === parentStepId && step.parentOptionId === parentOptionId && step.name === n);
        };
        while (!isUnique(name)) {
          name = `${baseName} ${counter}`;
          counter++;
        }
        return name;
      };
      // steps(prev) 기반으로 유니크 option name 생성
      const getUniqueOptionName = (stepId: string, baseName: string, stepsObj: Record<string, Step>): string => {
        let name = baseName;
        let counter = 1;
        const step = stepsObj[stepId];
        if (!step) return name;
        const isUnique = (n: string) => !step.options.some(option => option.name === n);
        while (!isUnique(name)) {
          name = `${baseName} ${counter}`;
          counter++;
        }
        return name;
      };
      const newStepCounter = Object.keys(prev).length + 1;
      const baseName = getStepSuggestion(newStepCounter);
  const uniqueName = getUniqueStepName(baseName, prev, parentStepId, parentOptionId);
      const newStep: Step = {
        id: stepId,
        name: uniqueName,
        displayName: '',
        options: [
          {
            id: `${stepId}_option_1`,
            name: getUniqueOptionName(stepId, '확인', { ...prev, [stepId]: { ...prev[stepId], options: [] } }),
            displayName: '',
            nextSteps: [],
            isActive: true,
            isCollapsed: false
          }
        ],
        parentStepId,
        parentOptionId,
        isActive: true,
        isCollapsed: false
      };
      let updatedParent = parent;
      if (parent) {
        const updatedOptions = parent.options.map(opt => {
          if (opt.id === parentOptionId) {
            if (opt.nextSteps.includes(stepId) || stepId === parentStepId) {
              return opt;
            }
            return { ...opt, nextSteps: [...opt.nextSteps, stepId] };
          }
          return opt;
        });
        updatedParent = { ...parent, options: updatedOptions };
      }
      setStepCounter(Object.keys(prev).length + 1);
      return {
        ...prev,
        [stepId]: newStep,
        ...(parent ? { [parentStepId]: updatedParent } : {})
      };
    });
  }, [generateStepId, getStepSuggestion])

  // Update step name
  const updateStepName = useCallback((stepId: string, newName: string) => {
    setSteps(prevSteps => {
      const newSteps = { ...prevSteps }
      const step = newSteps[stepId]
      if (step) {
        const trimmedName = newName.trim()
        let finalInternalName = step.name
        
        if (!trimmedName) {
          finalInternalName = generateUniqueStepName('untitled')
        } else {
          if (!isStepNameUnique(trimmedName, stepId, step.parentStepId, step.parentOptionId)) {
            alert('동일한 위치(같은 부모) 내에 이미 존재하는 단계 이름입니다. 다른 이름을 사용해주세요.')
            return prevSteps
          }
          finalInternalName = trimmedName
        }
        
        const updatedStep = { 
          ...step, 
          displayName: newName,
          name: finalInternalName
        }
        newSteps[stepId] = updatedStep
      }
      return newSteps
    })
  }, [isStepNameUnique, generateUniqueStepName])

  // Update option name
  const updateOptionName = useCallback((stepId: string, optionId: string, newName: string) => {
    setSteps(prevSteps => {
      const newSteps = { ...prevSteps }
      const step = newSteps[stepId]
      if (step) {
        const trimmedName = newName.trim()
        let finalInternalName = step.options.find(opt => opt.id === optionId)?.name || ''
        
        if (!trimmedName) {
          finalInternalName = generateUniqueOptionName(stepId, 'untitled')
        } else {
          if (!isOptionNameUniqueInStep(stepId, trimmedName, optionId)) {
            alert('이 단계에 이미 존재하는 옵션 이름입니다. 다른 이름을 사용해주세요.')
            return prevSteps
          }
          finalInternalName = trimmedName
        }
        
        const updatedOptions = step.options.map(opt => {
          if (opt.id === optionId) {
            // displayName은 입력값, name은 내부 유니크값
            return {
              ...opt,
              displayName: newName,
              name: finalInternalName
            }
          }
          return { ...opt } // 반드시 새 객체로 복사
        })
        const updatedStep = { ...step, options: updatedOptions }
        newSteps[stepId] = updatedStep
      }
      return newSteps
    })
  }, [isOptionNameUniqueInStep, generateUniqueOptionName])

  // Delete step
  const deleteStep = useCallback((stepId: string) => {
    if (!confirm('이 단계와 모든 하위 단계가 삭제됩니다. 계속하시겠습니까?')) {
      return
    }

    setSteps(prevSteps => {
      const newSteps = { ...prevSteps }
      const step = newSteps[stepId]
      if (!step) return prevSteps

      // Delete recursively
      const deleteRecursively = (id: string) => {
        const stepToDelete = newSteps[id]
        if (stepToDelete) {
          stepToDelete.options.forEach(option => {
            option.nextSteps.forEach(nextStepId => {
              deleteRecursively(nextStepId)
            })
          })
          delete newSteps[id]
        }
      }

      deleteRecursively(stepId)

      // Update parent
      if (step.parentStepId && step.parentOptionId) {
        const parentStep = newSteps[step.parentStepId]
        if (parentStep) {
          const updatedOptions = parentStep.options.map(opt => {
            if (opt.id === step.parentOptionId) {
              return { ...opt, nextSteps: opt.nextSteps.filter(id => id !== stepId) }
            }
            return opt
          })
          const updatedParentStep = { ...parentStep, options: updatedOptions }
          newSteps[step.parentStepId] = updatedParentStep
        }
      }

      return newSteps
    })

    // Update root steps if needed
    setRootSteps(prevRoots => prevRoots.filter(id => id !== stepId))
  }, [])

  // Add option
  const addOption = useCallback((stepId: string) => {
    setSteps(prevSteps => {
      const newSteps = { ...prevSteps }
      const step = newSteps[stepId]
      if (step) {
        const optionNumber = step.options.length + 1
        const optionId = `${stepId}_option_${optionNumber}`
        
        const optionSuggestions = ['예', '아니오', '확인', '취소', '계속', '중단', '동의', '거부']
        const baseName = optionNumber <= optionSuggestions.length 
          ? optionSuggestions[optionNumber - 1] 
          : `옵션 ${optionNumber}`
        
        const uniqueName = generateUniqueOptionName(stepId, baseName)
        
        const newOption = {
          id: optionId,
          name: uniqueName,
          displayName: '',
          nextSteps: [],
          isActive: true,
          isCollapsed: false
        }
        
        const updatedStep = { 
          ...step, 
          options: [...step.options, newOption] 
        }
        newSteps[stepId] = updatedStep
      }
      return newSteps
    })
  }, [generateUniqueOptionName])

  // Delete option
  const deleteOption = useCallback((stepId: string, optionId: string) => {
    setSteps(prevSteps => {
      const newSteps = { ...prevSteps }
      const step = newSteps[stepId]
      if (step && step.options.length > 1) {
        const option = step.options.find(opt => opt.id === optionId)
        if (option) {
          // Delete child steps
          const deleteRecursively = (stepIdToDelete: string) => {
            const stepToDelete = newSteps[stepIdToDelete]
            if (stepToDelete) {
              stepToDelete.options.forEach(childOption => {
                childOption.nextSteps.forEach(nextStepId => {
                  deleteRecursively(nextStepId)
                })
              })
              delete newSteps[stepIdToDelete]
            }
          }
          
          option.nextSteps.forEach(nextStepId => {
            deleteRecursively(nextStepId)
          })

          const updatedOptions = step.options.filter(opt => opt.id !== optionId)
          const updatedStep = { ...step, options: updatedOptions }
          newSteps[stepId] = updatedStep
        }
      }
      return newSteps
    })
  }, [])

  // Toggle functions
  const toggleStepActive = useCallback((stepId: string, isActive: boolean) => {
    setSteps(prevSteps => {
      const newSteps = { ...prevSteps }
      const step = newSteps[stepId]
      if (step) {
        const updatedStep = { ...step, isActive }
        newSteps[stepId] = updatedStep
      }
      return newSteps
    })
  }, [])

  const toggleOptionActive = useCallback((stepId: string, optionId: string, isActive: boolean) => {
    setSteps(prevSteps => {
      const newSteps = { ...prevSteps }
      const step = newSteps[stepId]
      if (step) {
        const updatedOptions = step.options.map(opt =>
          opt.id === optionId ? { ...opt, isActive } : opt
        )
        const updatedStep = { ...step, options: updatedOptions }
        newSteps[stepId] = updatedStep
      }
      return newSteps
    })
  }, [])

  const toggleStepCollapse = useCallback((stepId: string) => {
    setSteps(prevSteps => {
      const newSteps = { ...prevSteps }
      const step = newSteps[stepId]
      if (step) {
        const updatedStep = { ...step, isCollapsed: !step.isCollapsed }
        newSteps[stepId] = updatedStep
      }
      return newSteps
    })
  }, [])

  const toggleOptionCollapse = useCallback((stepId: string, optionId: string) => {
    setSteps(prevSteps => {
      const newSteps = { ...prevSteps }
      const step = newSteps[stepId]
      if (step) {
        const updatedOptions = step.options.map(opt =>
          opt.id === optionId ? { ...opt, isCollapsed: !opt.isCollapsed } : opt
        )
        const updatedStep = { ...step, options: updatedOptions }
        newSteps[stepId] = updatedStep
      }
      return newSteps
    })
  }, [])

  // Export to JSON
  const exportToJSON = useCallback(() => {
    const stepsObject = steps
    const data = {
      steps: stepsObject,
      rootSteps,
      stepCounter,
      exportDate: new Date().toISOString()
    }
    
    const dataStr = JSON.stringify(data, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `workflow_${new Date().toISOString().split('T')[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
  }, [steps, rootSteps, stepCounter])

  // Import from JSON
  const importFromJSON = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        const stepsMap: Record<string, Step> = {};

        
        if (data.steps) {
          Object.entries(data.steps).forEach(([key, value]) => {
            stepsMap[key] = value as Step
          })
        }
        
        setSteps(stepsMap)
        setRootSteps(data.rootSteps || [])
        setStepCounter(data.stepCounter || 0)
        
        alert('데이터를 성공적으로 가져왔습니다!')
      } catch (error) {
        alert('잘못된 파일 형식입니다.')
        console.error('Import error:', error)
      }
    }
    reader.readAsText(file)
  }, [])

  // Clear all data
  const clearAllData = useCallback(() => {
    if (confirm('모든 데이터가 삭제됩니다. 계속하시겠습니까?')) {
      setSteps({})
      setRootSteps([])
      setStepCounter(0)
      nextIdRef.current = 1
      localStorage.removeItem(storageKey)
      alert('모든 데이터가 삭제되었습니다.')
    }
  }, [storageKey])

  // Switch tab
  const switchTab = useCallback((targetTab: TabType) => {
    setCurrentTab(targetTab)
  }, [])

  // Load data on mount
  useEffect(() => {
    console.log('🔵 Loading data on mount...')
    loadData()
  }, [loadData])

  // Auto-save: steps, rootSteps, stepCounter가 변경될 때마다 저장
  useEffect(() => {
    // steps는 객체이므로, Object.keys로 빈 객체 여부 확인
    const hasSteps = Object.keys(steps).length > 0;
    if (hasSteps || rootSteps.length > 0) {
      const timeoutId = setTimeout(() => {
        saveData();
      }, 500); // 0.5초 debounce
      return () => clearTimeout(timeoutId);
    }
  }, [steps, rootSteps, stepCounter, saveData]);

  return {
    steps,
    rootSteps,
    stepCounter,
    currentTab,
    addRootStep,
    addNextStep,
    updateStepName,
    updateOptionName,
    deleteStep,
    addOption,
    deleteOption,
    toggleStepActive,
    toggleOptionActive,
    toggleStepCollapse,
    toggleOptionCollapse,
    exportToJSON,
    importFromJSON,
    clearAllData,
    switchTab
  }
}
