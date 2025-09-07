import React, { useState, useEffect, useRef } from "react";
import { Step, WorkflowConstraint, ConstraintMap } from "../lib/types";
import ConstraintModal from "./ConstraintModal";
import styles from "./WorkflowButtonTab.module.css";

interface WorkflowButtonTabProps {
    steps: Step[];
    constraints: ConstraintMap;
    onAddStepAtIndex: (insertIdx: number) => void;
    onUpdateStepName: (stepId: string, name: string) => void;
    onDeleteStep: (stepId: string) => void;
    onAddOption: (stepId: string) => void;
    onUpdateOptionName: (
        stepId: string,
        optionId: string,
        name: string
    ) => void;
    onDeleteOption: (stepId: string, optionId: string) => void;
    onMoveStep?: (fromIndex: number, toIndex: number) => void;
    onAddConstraint: (
        constraint: Omit<WorkflowConstraint, "id" | "createdAt">
    ) => void;
    onUpdateConstraint: (
        constraintId: string,
        updates: Partial<WorkflowConstraint>
    ) => void;
    onDeleteConstraint: (constraintId: string) => void;
}

const WorkflowButtonTab: React.FC<WorkflowButtonTabProps> = ({
    steps,
    constraints,
    onAddStepAtIndex,
    onUpdateStepName,
    onDeleteStep,
    onAddOption,
    onUpdateOptionName,
    onDeleteOption,
    onMoveStep,
    onAddConstraint,
    onUpdateConstraint,
    onDeleteConstraint,
}) => {
    const [selectedPath, setSelectedPath] = useState<{
        [stepIndex: number]: string;
    }>({});
    const [editingStep, setEditingStep] = useState<string | null>(null);
    const [editingOption, setEditingOption] = useState<{
        stepId: string;
        optionId: string;
    } | null>(null);
    const [tempStepName, setTempStepName] = useState("");
    const [tempOptionName, setTempOptionName] = useState("");
    const [addingNewStep, setAddingNewStep] = useState<{
        insertIndex: number;
    } | null>(null);
    const [addingNewOption, setAddingNewOption] = useState<{
        stepId: string;
    } | null>(null);
    const [newStepName, setNewStepName] = useState("");
    const [newOptionName, setNewOptionName] = useState("");
    // 새 옵션 이름 변경을 위한 임시 상태
    const [pendingOptionRename, setPendingOptionRename] = useState<{
        stepId: string;
        optionName: string;
        prevOptionIds: string[];
    } | null>(null);
    const [showMoveMenu, setShowMoveMenu] = useState<string | null>(null);
    const [showPolicyModal, setShowPolicyModal] = useState(false);
    const moveMenuRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

    // Get the first selected option for policy creation
    const getFirstSelectedOption = () => {
        const firstSelectedStepIndex = Object.keys(selectedPath)
            .map(Number)
            .sort((a, b) => a - b)[0];

        if (firstSelectedStepIndex !== undefined) {
            return {
                stepIndex: firstSelectedStepIndex,
                optionId: selectedPath[firstSelectedStepIndex],
            };
        }
        return null;
    };

    // Close move menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Element;

            // Close move menu if clicking outside
            if (showMoveMenu) {
                const menuElement = moveMenuRefs.current[showMoveMenu];
                if (menuElement && !menuElement.contains(target)) {
                    setShowMoveMenu(null);
                }
            }

            // Cancel editing states if clicking outside the editing area
            const clickedEditingArea =
                target.closest(".editing-area") ||
                target.closest(`.${styles.editingArea}`);
            const clickedInput = target.closest("input");
            const clickedSaveCancelButtons = target.closest(
                ".save-cancel-buttons"
            );

            // Don't cancel if clicking within editing areas or on inputs/buttons
            if (
                !clickedEditingArea &&
                !clickedInput &&
                !clickedSaveCancelButtons
            ) {
                const isInteractiveElement =
                    target.closest("button") ||
                    target.closest("select") ||
                    target.closest('[role="button"]');

                // Only cancel editing if not clicking on interactive elements
                if (!isInteractiveElement) {
                    if (editingStep) {
                        cancelStepEdit();
                    }
                    if (editingOption) {
                        cancelOptionEdit();
                    }
                    if (addingNewStep) {
                        cancelNewStep();
                    }
                    if (addingNewOption) {
                        cancelNewOption();
                    }
                }
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [
        showMoveMenu,
        editingStep,
        editingOption,
        addingNewStep,
        addingNewOption,
    ]);

    // Handle option selection - toggle selection on/off
    const handleOptionSelect = (stepIndex: number, optionId: string) => {
        setSelectedPath((prev) => {
            const currentSelection = prev[stepIndex];

            // If the same option is clicked again, deselect it
            if (currentSelection === optionId) {
                const newPath = { ...prev };
                delete newPath[stepIndex];
                return newPath;
            }

            // Otherwise, select the new option
            return {
                ...prev,
                [stepIndex]: optionId,
            };
        });
    };

    // Step editing functions
    const startEditingStep = (stepId: string, currentName: string) => {
        setEditingStep(stepId);
        setTempStepName(currentName);
    };

    const saveStepName = () => {
        if (editingStep && tempStepName.trim()) {
            onUpdateStepName(editingStep, tempStepName.trim());
            setEditingStep(null);
            setTempStepName("");
        }
    };

    const cancelStepEdit = () => {
        setEditingStep(null);
        setTempStepName("");
    };

    // Option editing functions
    const startEditingOption = (
        stepId: string,
        optionId: string,
        currentName: string
    ) => {
        setEditingOption({ stepId, optionId });
        setTempOptionName(currentName);
    };

    const saveOptionName = () => {
        if (editingOption && tempOptionName.trim()) {
            onUpdateOptionName(
                editingOption.stepId,
                editingOption.optionId,
                tempOptionName.trim()
            );
            setEditingOption(null);
            setTempOptionName("");
        }
    };

    const cancelOptionEdit = () => {
        setEditingOption(null);
        setTempOptionName("");
    };

    // New step functions
    const startAddingStep = (insertIndex: number) => {
        setAddingNewStep({ insertIndex });
        setNewStepName("");
    };

    const saveNewStep = () => {
        if (addingNewStep && newStepName.trim()) {
            // 새 단계를 추가
            onAddStepAtIndex(addingNewStep.insertIndex);

            // 상태를 먼저 정리
            const stepName = newStepName.trim();
            const insertIndex = addingNewStep.insertIndex;
            setAddingNewStep(null);
            setNewStepName("");

            // 새로 추가된 단계의 이름을 설정 (약간의 지연 후)
            setTimeout(() => {
                // steps 배열이 업데이트된 후 실행
                if (steps.length > insertIndex) {
                    const newStepId = steps[insertIndex]?.id;
                    if (newStepId) {
                        onUpdateStepName(newStepId, stepName);
                    }
                }
            }, 100);
        }
    };

    const cancelNewStep = () => {
        setAddingNewStep(null);
        setNewStepName("");
    };

    const handleNewStepKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            saveNewStep();
            // Continue adding more steps
            if (addingNewStep) {
                setTimeout(
                    () => startAddingStep(addingNewStep.insertIndex + 1),
                    100
                );
            }
        } else if (e.key === "Escape") {
            cancelNewStep();
        }
    };

    // New option functions
    const startAddingOption = (stepId: string) => {
        setAddingNewOption({ stepId });
        setNewOptionName("");
    };

    const saveNewOption = () => {
        if (addingNewOption && newOptionName.trim()) {
            const stepId = addingNewOption.stepId;
            const optionName = newOptionName.trim();
            const step = steps.find((s) => s.id === stepId);
            const prevOptionIds = step ? step.options.map(opt => opt.id) : [];

            onAddOption(stepId);
            setAddingNewOption(null);
            setNewOptionName("");
            setPendingOptionRename({ stepId, optionName, prevOptionIds });
        }
    };

    // 옵션 추가 후 steps가 변경되면 새 옵션 이름을 변경
    useEffect(() => {
        if (pendingOptionRename) {
            const { stepId, optionName, prevOptionIds } = pendingOptionRename;
            const updatedStep = steps.find((s) => s.id === stepId);
            if (updatedStep) {
                const newOption = updatedStep.options.find(opt => !prevOptionIds.includes(opt.id));
                if (newOption) {
                    onUpdateOptionName(stepId, newOption.id, optionName);
                    setPendingOptionRename(null);
                }
            }
        }
    }, [steps, pendingOptionRename, onUpdateOptionName]);

    const cancelNewOption = () => {
        setAddingNewOption(null);
        setNewOptionName("");
    };

    const handleNewOptionKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            saveNewOption();
            // Continue adding more options
            if (addingNewOption) {
                setTimeout(
                    () => startAddingOption(addingNewOption.stepId),
                    100
                );
            }
        } else if (e.key === "Escape") {
            cancelNewOption();
        }
    };

    return (
        <section className={styles.workflowButtonTab}>
            {/* Add First Step */}
            {steps.length === 0 && (
                <div className={styles.emptyWorkflow}>
                    {addingNewStep?.insertIndex === 0 ? (
                        <div
                            className={`${styles.newStepForm} ${styles.editingArea}`}
                        >
                            <input
                                type="text"
                                value={newStepName}
                                onChange={(e) => setNewStepName(e.target.value)}
                                onKeyDown={handleNewStepKeyDown}
                                onBlur={cancelNewStep}
                                placeholder="새 단계 이름을 입력하세요..."
                                className={styles.newStepInput}
                                autoFocus
                            />
                            <div
                                className={`${styles.newStepActions} save-cancel-buttons`}
                            >
                                <button
                                    onClick={saveNewStep}
                                    className={styles.saveBtn}
                                >
                                    ✓
                                </button>
                                <button
                                    onClick={cancelNewStep}
                                    className={styles.cancelBtn}
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className={styles.emptyState}>
                            <h4>워크플로우가 비어있습니다</h4>
                            <p>첫 번째 단계를 추가해보세요!</p>
                            <button
                                className={styles.addFirstStepBtn}
                                onClick={() => startAddingStep(0)}
                            >
                                + 첫 단계 추가
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Sequential Steps */}
            <div className={styles.buttonSequenceContainer}>
                {steps.map((step, stepIndex) => (
                    <React.Fragment key={step.id}>
                        <div className={styles.stepDropdownContainer}>
                            <div className={styles.stepHeader}>
                                <div className={styles.stepTitleSection}>
                                    {editingStep === step.id ? (
                                        <div
                                            className={`${styles.stepEditForm} ${styles.editingArea}`}
                                        >
                                            <input
                                                type="text"
                                                value={tempStepName}
                                                onChange={(e) =>
                                                    setTempStepName(
                                                        e.target.value
                                                    )
                                                }
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter")
                                                        saveStepName();
                                                    if (e.key === "Escape")
                                                        cancelStepEdit();
                                                }}
                                                className={styles.stepNameInput}
                                                autoFocus
                                            />
                                            <div
                                                className={`${styles.editActions} save-cancel-buttons`}
                                            >
                                                <button
                                                    onClick={saveStepName}
                                                    className={styles.saveBtn}
                                                    title="저장"
                                                >
                                                    ✓
                                                </button>
                                                <button
                                                    onClick={cancelStepEdit}
                                                    className={styles.cancelBtn}
                                                    title="취소"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div
                                            className={styles.stepTitleDisplay}
                                        >
                                            <h4
                                                onClick={() =>
                                                    startEditingStep(
                                                        step.id,
                                                        step.displayName ||
                                                            step.name
                                                    )
                                                }
                                            >
                                                {step.displayName || step.name}
                                            </h4>
                                            <div className={styles.stepActions}>
                                                <button
                                                    className={
                                                        styles.editStepBtn
                                                    }
                                                    onClick={() =>
                                                        startEditingStep(
                                                            step.id,
                                                            step.displayName ||
                                                                step.name
                                                        )
                                                    }
                                                    title="단계 이름 수정"
                                                >
                                                    ✏️
                                                </button>
                                                {steps.length > 1 && (
                                                    <div
                                                        className={
                                                            styles.moveStepContainer
                                                        }
                                                        ref={(el) => {
                                                            if (el)
                                                                moveMenuRefs.current[
                                                                    step.id
                                                                ] = el;
                                                        }}
                                                    >
                                                        <button
                                                            className={
                                                                styles.moveStepBtn
                                                            }
                                                            onClick={() =>
                                                                setShowMoveMenu(
                                                                    showMoveMenu ===
                                                                        step.id
                                                                        ? null
                                                                        : step.id
                                                                )
                                                            }
                                                            title="단계 위치 이동"
                                                        >
                                                            ↕️
                                                        </button>
                                                        {showMoveMenu ===
                                                            step.id && (
                                                            <div
                                                                className={
                                                                    styles.moveStepMenu
                                                                }
                                                            >
                                                                {steps.map(
                                                                    (
                                                                        _,
                                                                        targetIndex
                                                                    ) => {
                                                                        const currentIndex =
                                                                            steps.findIndex(
                                                                                (
                                                                                    s
                                                                                ) =>
                                                                                    s.id ===
                                                                                    step.id
                                                                            );
                                                                        if (
                                                                            currentIndex ===
                                                                            targetIndex
                                                                        )
                                                                            return null;

                                                                        return (
                                                                            <div
                                                                                key={
                                                                                    targetIndex
                                                                                }
                                                                                className={
                                                                                    styles.moveStepOption
                                                                                }
                                                                                onClick={() => {
                                                                                    if (
                                                                                        onMoveStep
                                                                                    ) {
                                                                                        onMoveStep(
                                                                                            currentIndex,
                                                                                            targetIndex
                                                                                        );
                                                                                    }
                                                                                    setShowMoveMenu(
                                                                                        null
                                                                                    );
                                                                                }}
                                                                            >
                                                                                {targetIndex ===
                                                                                    0 &&
                                                                                    "맨 앞으로"}
                                                                                {targetIndex ===
                                                                                    steps.length -
                                                                                        1 &&
                                                                                    "맨 뒤로"}
                                                                                {targetIndex !==
                                                                                    0 &&
                                                                                    targetIndex !==
                                                                                        steps.length -
                                                                                            1 &&
                                                                                    `${
                                                                                        targetIndex +
                                                                                        1
                                                                                    }번째 위치로`}
                                                                            </div>
                                                                        );
                                                                    }
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                <button
                                                    className={
                                                        styles.deleteStepBtn
                                                    }
                                                    onClick={() => {
                                                        if (
                                                            confirm(
                                                                `"${
                                                                    step.displayName ||
                                                                    step.name
                                                                }" 단계를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`
                                                            )
                                                        ) {
                                                            onDeleteStep(
                                                                step.id
                                                            );
                                                        }
                                                    }}
                                                    title="단계 삭제"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                            <span className={styles.stepNumber}>
                                                단계 {stepIndex + 1}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className={styles.stepContent}>
                                {/* Unified Option List - Click to Select and Edit */}
                                <div className={styles.optionsList}>
                                    {step.options.map((option) => {
                                        const isSelected =
                                            selectedPath[stepIndex] ===
                                            option.id;
                                        const isEditing =
                                            editingOption?.stepId === step.id &&
                                            editingOption?.optionId ===
                                                option.id;

                                        return (
                                            <div
                                                key={option.id}
                                                className={`${
                                                    styles.optionItem
                                                } ${
                                                    isSelected
                                                        ? styles.selected
                                                        : ""
                                                }`}
                                                onClick={() =>
                                                    !isEditing &&
                                                    handleOptionSelect(
                                                        stepIndex,
                                                        option.id
                                                    )
                                                }
                                                style={{
                                                    cursor: isEditing
                                                        ? "default"
                                                        : "pointer",
                                                }}
                                            >
                                                {isEditing ? (
                                                    <div
                                                        className={`${styles.optionEditForm} ${styles.editingArea}`}
                                                    >
                                                        <input
                                                            type="text"
                                                            value={
                                                                tempOptionName
                                                            }
                                                            onChange={(e) =>
                                                                setTempOptionName(
                                                                    e.target
                                                                        .value
                                                                )
                                                            }
                                                            onKeyDown={(e) => {
                                                                if (
                                                                    e.key ===
                                                                    "Enter"
                                                                )
                                                                    saveOptionName();
                                                                if (
                                                                    e.key ===
                                                                    "Escape"
                                                                )
                                                                    cancelOptionEdit();
                                                            }}
                                                            className={
                                                                styles.optionNameInput
                                                            }
                                                            autoFocus
                                                        />
                                                        <div
                                                            className={`${styles.editActions} save-cancel-buttons`}
                                                        >
                                                            <button
                                                                onClick={
                                                                    saveOptionName
                                                                }
                                                                className={
                                                                    styles.saveBtn
                                                                }
                                                                title="저장"
                                                            >
                                                                ✓
                                                            </button>
                                                            <button
                                                                onClick={
                                                                    cancelOptionEdit
                                                                }
                                                                className={
                                                                    styles.cancelBtn
                                                                }
                                                                title="취소"
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div
                                                        className={
                                                            styles.optionDisplay
                                                        }
                                                    >
                                                        <span
                                                            className={
                                                                styles.optionName
                                                            }
                                                        >
                                                            {option.displayName ||
                                                                option.name}
                                                            {isSelected && (
                                                                <span
                                                                    className={
                                                                        styles.selectedIndicator
                                                                    }
                                                                >
                                                                    {" "}
                                                                    ✓
                                                                </span>
                                                            )}
                                                        </span>
                                                        <div
                                                            className={
                                                                styles.optionActions
                                                            }
                                                        >
                                                            <button
                                                                className={
                                                                    styles.editOptionBtn
                                                                }
                                                                onClick={(
                                                                    e
                                                                ) => {
                                                                    e.stopPropagation();
                                                                    startEditingOption(
                                                                        step.id,
                                                                        option.id,
                                                                        option.displayName ||
                                                                            option.name
                                                                    );
                                                                }}
                                                                title="옵션 이름 수정"
                                                            >
                                                                ✏️
                                                            </button>
                                                            {step.options
                                                                .length > 1 && (
                                                                <button
                                                                    className={
                                                                        styles.deleteOptionBtn
                                                                    }
                                                                    onClick={(
                                                                        e
                                                                    ) => {
                                                                        e.stopPropagation();
                                                                        if (
                                                                            confirm(
                                                                                `"${
                                                                                    option.displayName ||
                                                                                    option.name
                                                                                }" 옵션을 삭제하시겠습니까?`
                                                                            )
                                                                        ) {
                                                                            onDeleteOption(
                                                                                step.id,
                                                                                option.id
                                                                            );
                                                                        }
                                                                    }}
                                                                    title="옵션 삭제"
                                                                >
                                                                    🗑️
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {/* Add Option */}
                                    {addingNewOption?.stepId === step.id ? (
                                        <div
                                            className={`${styles.newOptionForm} ${styles.editingArea}`}
                                        >
                                            <input
                                                type="text"
                                                value={newOptionName}
                                                onChange={(e) =>
                                                    setNewOptionName(
                                                        e.target.value
                                                    )
                                                }
                                                onKeyDown={
                                                    handleNewOptionKeyDown
                                                }
                                                onBlur={cancelNewOption}
                                                placeholder="새 옵션 이름을 입력하세요..."
                                                className={
                                                    styles.newOptionInput
                                                }
                                                autoFocus
                                            />
                                            <div
                                                className={`${styles.newOptionActions} save-cancel-buttons`}
                                            >
                                                <button
                                                    onClick={saveNewOption}
                                                    className={styles.saveBtn}
                                                >
                                                    ✓
                                                </button>
                                                <button
                                                    onClick={cancelNewOption}
                                                    className={styles.cancelBtn}
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            className={styles.addOptionBtn}
                                            onClick={() =>
                                                startAddingOption(step.id)
                                            }
                                            title="이 단계에 새 옵션 추가"
                                        >
                                            + 옵션 추가
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Arrow and Add Step Between */}
                        {stepIndex < steps.length - 1 && (
                            <div className={styles.stepConnector}>
                                <div className={styles.stepArrow}>→</div>
                            </div>
                        )}

                        {/* Add Step at End */}
                        {stepIndex === steps.length - 1 && (
                            <div className={styles.stepConnector}>
                                {addingNewStep?.insertIndex ===
                                stepIndex + 1 ? (
                                    <div
                                        className={`${styles.newStepForm} ${styles.editingArea}`}
                                    >
                                        <input
                                            type="text"
                                            value={newStepName}
                                            onChange={(e) =>
                                                setNewStepName(e.target.value)
                                            }
                                            onKeyDown={handleNewStepKeyDown}
                                            onBlur={cancelNewStep}
                                            placeholder="새 단계 이름을 입력하세요..."
                                            className={styles.newStepInput}
                                            autoFocus
                                        />
                                        <div
                                            className={`${styles.newStepActions} save-cancel-buttons`}
                                        >
                                            <button
                                                onClick={saveNewStep}
                                                className={styles.saveBtn}
                                            >
                                                ✓
                                            </button>
                                            <button
                                                onClick={cancelNewStep}
                                                className={styles.cancelBtn}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        className={styles.addStepBetweenBtn}
                                        onClick={() =>
                                            startAddingStep(stepIndex + 1)
                                        }
                                        title="다음 단계 추가"
                                    >
                                        + 단계 추가
                                    </button>
                                )}
                            </div>
                        )}
                    </React.Fragment>
                ))}
            </div>

            {/* Current Path Summary */}
            {Object.keys(selectedPath).length > 0 && (
                <div className={styles.pathSummary}>
                    <div className={styles.pathHeader}>
                        <h4>선택된 경로:</h4>
                        <button
                            className={styles.createPolicyBtn}
                            onClick={() => setShowPolicyModal(true)}
                            title="선택된 경로를 기반으로 정책 생성"
                        >
                            📋 정책 생성
                        </button>
                    </div>
                    <div className={styles.pathDisplay}>
                        {steps.map((step, stepIndex) => {
                            const selectedOptionId = selectedPath[stepIndex];
                            const selectedOption = step.options.find(
                                (opt) => opt.id === selectedOptionId
                            );

                            return (
                                <span key={step.id} className={styles.pathStep}>
                                    {selectedOption ? (
                                        <>
                                            <strong>
                                                {step.displayName || step.name}:
                                            </strong>{" "}
                                            {selectedOption.displayName ||
                                                selectedOption.name}
                                        </>
                                    ) : (
                                        <span className={styles.unselected}>
                                            {step.displayName || step.name}:
                                            미선택
                                        </span>
                                    )}
                                    {stepIndex < steps.length - 1 && " → "}
                                </span>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Policy Creation Modal */}
            {showPolicyModal && getFirstSelectedOption() && (
                <ConstraintModal
                    steps={steps}
                    constraints={Object.values(constraints)}
                    selectedPath={selectedPath}
                    onClose={() => setShowPolicyModal(false)}
                    onAddConstraint={onAddConstraint}
                    onUpdateConstraint={onUpdateConstraint}
                    onDeleteConstraint={onDeleteConstraint}
                />
            )}
        </section>
    );
};

export default WorkflowButtonTab;
