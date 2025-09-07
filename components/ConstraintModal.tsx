import React, { useState } from "react";
import {
    Step,
    StepOption,
    WorkflowConstraint,
    RouteCondition,
    ConstraintActionType,
    LogicalOperator,
    ConditionExpression,
} from "../lib/types";
import styles from "./ConstraintModal.module.css";

// Helper function to check if two route conditions arrays are identical
const areRouteConditionsEqual = (conditions1: RouteCondition[], conditions2: RouteCondition[]): boolean => {
    if (conditions1.length !== conditions2.length) return false;
    
    const sorted1 = [...conditions1].sort((a, b) => 
        a.stepIndex === b.stepIndex ? a.optionId.localeCompare(b.optionId) : a.stepIndex - b.stepIndex
    );
    const sorted2 = [...conditions2].sort((a, b) => 
        a.stepIndex === b.stepIndex ? a.optionId.localeCompare(b.optionId) : a.stepIndex - b.stepIndex
    );
    
    return sorted1.every((condition, index) => 
        condition.stepIndex === sorted2[index].stepIndex && 
        condition.optionId === sorted2[index].optionId
    );
};

// Helper function to check if two condition expressions are equivalent
const areConditionExpressionsEqual = (expr1?: ConditionExpression, expr2?: ConditionExpression): boolean => {
    if (!expr1 && !expr2) return true;
    if (!expr1 || !expr2) return false;
    
    if (expr1.type !== expr2.type) return false;
    
    if (expr1.type === "condition" && expr2.type === "condition") {
        if (!expr1.condition || !expr2.condition) return false;
        return expr1.condition.stepIndex === expr2.condition.stepIndex && 
               expr1.condition.optionId === expr2.condition.optionId;
    }
    
    if (expr1.type === "group" && expr2.type === "group") {
        if (expr1.operator !== expr2.operator) return false;
        if (!expr1.children || !expr2.children) return expr1.children === expr2.children;
        if (expr1.children.length !== expr2.children.length) return false;
        
        return expr1.children.every((child, index) => 
            areConditionExpressionsEqual(child, expr2.children![index])
        );
    }
    
    return false;
};

// Helper function to check if a constraint matches the given conditions and action
const doesConstraintMatch = (
    constraint: WorkflowConstraint,
    routeConditions: RouteCondition[],
    conditionExpression: ConditionExpression | undefined,
    conditionOperator: LogicalOperator,
    action: ConstraintActionType,
    useAdvancedConditions: boolean
): boolean => {
    // Check action type
    if (constraint.action !== action) return false;
    
    // Check condition structure
    if (useAdvancedConditions) {
        return areConditionExpressionsEqual(constraint.conditionExpression, conditionExpression);
    } else {
        return constraint.conditionOperator === conditionOperator &&
               areRouteConditionsEqual(constraint.routeConditions || [], routeConditions);
    }
};

// Helper function to merge target options from existing constraint with new targets
const mergeConstraintTargets = (
    existingConstraint: WorkflowConstraint,
    newTargetPairs: Array<{stepIndex: number, optionId: string}>
): {mergedConstraint: WorkflowConstraint, hasNewTargets: boolean} => {
    const existingTargets = new Set<string>();
    
    // Collect existing targets
    if (existingConstraint.targetStepIndex !== undefined && existingConstraint.targetOptionId) {
        existingTargets.add(`${existingConstraint.targetStepIndex}:${existingConstraint.targetOptionId}`);
    }
    
    if (existingConstraint.targetOptionIds) {
        existingConstraint.targetOptionIds.forEach(optionId => {
            if (existingConstraint.targetStepIndex !== undefined) {
                existingTargets.add(`${existingConstraint.targetStepIndex}:${optionId}`);
            }
        });
    }
    
    // Track which targets are actually new
    let hasNewTargets = false;
    const allTargets = new Set(existingTargets);
    
    newTargetPairs.forEach(target => {
        const targetKey = `${target.stepIndex}:${target.optionId}`;
        if (!allTargets.has(targetKey)) {
            allTargets.add(targetKey);
            hasNewTargets = true;
        }
    });
    
    // If no new targets, return the original constraint
    if (!hasNewTargets) {
        return {
            mergedConstraint: existingConstraint,
            hasNewTargets: false
        };
    }
    
    // Convert back to constraint format
    const targetArray = Array.from(allTargets).map(target => {
        const [stepIndex, optionId] = target.split(':');
        return { stepIndex: parseInt(stepIndex), optionId };
    });
    
    // Group by step index
    const targetsByStep = targetArray.reduce((acc, target) => {
        if (!acc[target.stepIndex]) {
            acc[target.stepIndex] = [];
        }
        acc[target.stepIndex].push(target.optionId);
        return acc;
    }, {} as {[stepIndex: number]: string[]});
    
    // For now, we'll use the first step as the primary target
    // In the future, we might want to support multi-step constraints
    const primaryStepIndex = Math.min(...Object.keys(targetsByStep).map(Number));
    const primaryOptionIds = targetsByStep[primaryStepIndex];
    
    return {
        mergedConstraint: {
            ...existingConstraint,
            targetStepIndex: primaryStepIndex,
            targetOptionId: primaryOptionIds[0], // Keep first option for compatibility
            targetOptionIds: primaryOptionIds,
            updatedAt: Date.now()
        },
        hasNewTargets: true
    };
};

interface ConstraintModalProps {
    steps: Step[];
    constraints: WorkflowConstraint[];
    selectedPath: { [stepIndex: number]: string };
    constraintId?: string;
    onClose: () => void;
    onAddConstraint: (
        constraint: Omit<WorkflowConstraint, "id" | "createdAt">
    ) => void;
    onUpdateConstraint: (
        constraintId: string,
        updates: Partial<WorkflowConstraint>
    ) => void;
    onDeleteConstraint: (constraintId: string) => void;
}

const ConstraintModal: React.FC<ConstraintModalProps> = ({
    steps,
    constraints,
    selectedPath,
    constraintId,
    onClose,
    onAddConstraint,
    onUpdateConstraint,
    onDeleteConstraint,
}) => {
    const existingConstraint = constraintId
        ? constraints.find((c) => c.id === constraintId)
        : null;
    const isEditing = !!existingConstraint;

    // Auto-populate route conditions from selected path
    const autoRouteConditions: RouteCondition[] = Object.entries(selectedPath)
        .filter(([, value]) => value)
        .map(([key, value]) => ({ stepIndex: parseInt(key), optionId: value }))
        .sort((a, b) => a.stepIndex - b.stepIndex);

    // Basic state
    const [routeConditions, setRouteConditions] = useState<RouteCondition[]>(
        existingConstraint?.routeConditions || autoRouteConditions
    );
    const [conditionOperator, setConditionOperator] = useState<LogicalOperator>(
        existingConstraint?.conditionOperator || "AND"
    );
    const [constraintAction, setConstraintAction] = useState<ConstraintActionType>(
        existingConstraint?.action || "disable"
    );
    
    // Status message for user feedback
    const [statusMessage, setStatusMessage] = useState<string>("");
    
    // Multi-selection state for targets
    const [selectedTargets, setSelectedTargets] = useState<{[stepIndex: number]: string[]}>(
        () => {
            if (existingConstraint?.targetStepIndex !== undefined && existingConstraint?.targetOptionId) {
                return {
                    [existingConstraint.targetStepIndex]: [existingConstraint.targetOptionId]
                };
            }
            return {};
        }
    );
    
    // Legacy single selection (kept for compatibility but not used in UI)
    // const [targetStepIndex, setTargetStepIndex] = useState<number>(
    //     existingConstraint?.targetStepIndex ?? -1
    // );
    // const [targetOptionId, setTargetOptionId] = useState<string>(
    //     existingConstraint?.targetOptionId || ""
    // );
    const [name, setName] = useState<string>(existingConstraint?.name || "");
    const [description, setDescription] = useState<string>(
        existingConstraint?.description || ""
    );
    const [priority, setPriority] = useState<number>(
        existingConstraint?.priority || 50
    );

    // Advanced conditions state
    const [useAdvancedConditions, setUseAdvancedConditions] = useState<boolean>(
        !!existingConstraint?.conditionExpression
    );
    const [conditionExpression, setConditionExpression] = useState<ConditionExpression>(() => {
        if (existingConstraint?.conditionExpression) {
            return existingConstraint.conditionExpression;
        }
        return {
            type: "group",
            operator: "AND",
            children: autoRouteConditions.map(condition => ({
                type: "condition" as const,
                condition: condition
            }))
        };
    });

    // Simple condition management functions
    const addRouteCondition = () => {
        setRouteConditions([
            ...routeConditions,
            { stepIndex: -1, optionId: "" }
        ]);
    };

    const updateRouteCondition = (
        index: number,
        field: keyof RouteCondition,
        value: string | number
    ) => {
        setRouteConditions((prev) =>
            prev.map((condition, i) =>
                i === index ? { ...condition, [field]: value } : condition
            )
        );
    };

    const removeRouteCondition = (index: number) => {
        setRouteConditions((prev) => prev.filter((_, i) => i !== index));
    };

    // Multi-target selection management functions
    const toggleStepSelection = (stepIndex: number) => {
        setSelectedTargets(prev => {
            const newTargets = { ...prev };
            if (newTargets[stepIndex]) {
                // If step already selected, remove it
                delete newTargets[stepIndex];
            } else {
                // If step not selected, add it with empty options array
                newTargets[stepIndex] = [];
            }
            return newTargets;
        });
    };

    const toggleOptionSelection = (stepIndex: number, optionId: string) => {
        setSelectedTargets(prev => {
            const newTargets = { ...prev };
            if (!newTargets[stepIndex]) {
                newTargets[stepIndex] = [];
            }
            
            const optionIndex = newTargets[stepIndex].indexOf(optionId);
            if (optionIndex > -1) {
                // Remove option
                newTargets[stepIndex] = newTargets[stepIndex].filter(id => id !== optionId);
                // If no options left, remove the step
                if (newTargets[stepIndex].length === 0) {
                    delete newTargets[stepIndex];
                }
            } else {
                // Add option
                newTargets[stepIndex] = [...newTargets[stepIndex], optionId];
            }
            
            return newTargets;
        });
    };

    const isStepSelected = (stepIndex: number) => {
        return stepIndex in selectedTargets;
    };

    const isOptionSelected = (stepIndex: number, optionId: string) => {
        return selectedTargets[stepIndex]?.includes(optionId) || false;
    };

    const getSelectedTargetsCount = () => {
        return Object.values(selectedTargets).reduce((total, options) => total + options.length, 0);
    };

    // Select all options for a specific step
    const selectAllForStep = (stepIndex: number) => {
        if (!steps[stepIndex]) return;

        const allOptionIds = steps[stepIndex].options.map((option: StepOption) => option.id);
        setSelectedTargets(prev => ({
            ...prev,
            [stepIndex]: allOptionIds
        }));
    };

    // Deselect all options for a specific step
    const deselectAllForStep = (stepIndex: number) => {
        setSelectedTargets(prev => ({
            ...prev,
            [stepIndex]: []
        }));
    };

    // Check if all options for a step are selected
    const areAllOptionsSelected = (stepIndex: number) => {
        if (!steps[stepIndex]) return false;

        const allOptionIds = steps[stepIndex].options.map((option: StepOption) => option.id);
        const selectedOptions = selectedTargets[stepIndex] || [];
        return allOptionIds.length > 0 && allOptionIds.every((id: string) => selectedOptions.includes(id));
    };

    // Check if some options for a step are selected (for indeterminate state)
    // const areSomeOptionsSelected = (stepIndex: number) => {
    //     const selectedOptions = selectedTargets[stepIndex] || [];
    //     return selectedOptions.length > 0 && !areAllOptionsSelected(stepIndex);
    // };

    // Select all targets across all steps
    const selectAllTargets = () => {
        const newSelectedTargets: { [stepIndex: number]: string[] } = {};
        steps.forEach((step: Step, index: number) => {
            newSelectedTargets[index] = step.options.map((option: StepOption) => option.id);
        });
        setSelectedTargets(newSelectedTargets);
    };

    // Deselect all targets across all steps
    const deselectAllTargets = () => {
        setSelectedTargets({});
    };

    // Check if all targets are selected
    const areAllTargetsSelected = () => {
        return steps.every((step: Step, stepIndex: number) => {
            const allOptionIds = step.options.map((option: StepOption) => option.id);
            const selectedOptions = selectedTargets[stepIndex] || [];
            return allOptionIds.length > 0 && allOptionIds.every((id: string) => selectedOptions.includes(id));
        });
    };

    // Check if some targets are selected (for indeterminate state)
    // const areSomeTargetsSelected = () => {
    //     return getSelectedTargetsCount() > 0 && !areAllTargetsSelected();
    // };

    // Convert simple conditions to complex expression
    const convertToAdvancedConditions = () => {
        const newExpression: ConditionExpression = {
            type: "group",
            operator: conditionOperator,
            children: routeConditions.map(condition => ({
                type: "condition" as const,
                condition: condition
            }))
        };
        setConditionExpression(newExpression);
        setUseAdvancedConditions(true);
    };

    // Convert complex expression back to simple conditions
    // Dynamic condition management functions
    const addConditionToExpression = (parentExpression: ConditionExpression) => {
        if (parentExpression.type === "group") {
            if (!parentExpression.children) {
                parentExpression.children = [];
            }
            parentExpression.children.push({
                type: "condition",
                condition: { stepIndex: -1, optionId: "" }
            });
            setConditionExpression({ ...conditionExpression });
        }
    };

    const addGroupToExpression = (parentExpression: ConditionExpression, operator: LogicalOperator = "AND") => {
        if (parentExpression.type === "group") {
            if (!parentExpression.children) {
                parentExpression.children = [];
            }
            parentExpression.children.push({
                type: "group",
                operator: operator,
                children: []
            });
            setConditionExpression({ ...conditionExpression });
        }
    };

    const removeFromExpression = (parentExpression: ConditionExpression, childIndex: number) => {
        if (parentExpression.type === "group" && parentExpression.children) {
            parentExpression.children.splice(childIndex, 1);
            setConditionExpression({ ...conditionExpression });
        }
    };

    const updateConditionInExpression = (
        targetCondition: ConditionExpression, 
        field: keyof RouteCondition, 
        value: string | number
    ) => {
        if (targetCondition.type === "condition" && targetCondition.condition) {
            targetCondition.condition = {
                ...targetCondition.condition,
                [field]: value
            };
            setConditionExpression({ ...conditionExpression });
        }
    };

    const updateOperatorInExpression = (targetGroup: ConditionExpression, operator: LogicalOperator) => {
        if (targetGroup.type === "group") {
            targetGroup.operator = operator;
            setConditionExpression({ ...conditionExpression });
        }
    };

    const convertToSimpleConditions = () => {
        const extractConditions = (expr: ConditionExpression): RouteCondition[] => {
            if (expr.type === "condition" && expr.condition) {
                return [expr.condition];
            } else if (expr.type === "group" && expr.children) {
                return expr.children.flatMap(child => extractConditions(child));
            }
            return [];
        };

        const extractedConditions = extractConditions(conditionExpression);
        setRouteConditions(extractedConditions);
        setConditionOperator(conditionExpression.operator || "AND");
        setUseAdvancedConditions(false);
    };

    // Complex condition builder component with full CRUD operations
    const renderConditionExpression = (
        expression: ConditionExpression,
        depth: number = 0,
        parentExpression?: ConditionExpression,
        indexInParent?: number
    ): React.ReactNode => {
        const indent = depth * 20;

        if (expression.type === "condition") {
            const condition = expression.condition;
            if (!condition) return null;

            return (
                <div
                    key={`condition-${depth}-${Math.random()}`}
                    style={{ marginLeft: indent }}
                    className={styles.conditionItem}
                >
                    <select
                        value={condition.stepIndex}
                        onChange={(e) => updateConditionInExpression(expression, "stepIndex", parseInt(e.target.value))}
                        className={styles.select}
                    >
                        <option value={-1}>단계 선택</option>
                        {steps.map((step, stepIndex) => (
                            <option key={stepIndex} value={stepIndex}>
                                {step.displayName || step.name}
                            </option>
                        ))}
                    </select>

                    <select
                        value={condition.optionId}
                        onChange={(e) => updateConditionInExpression(expression, "optionId", e.target.value)}
                        className={styles.select}
                        disabled={condition.stepIndex < 0}
                    >
                        <option value="">옵션 선택</option>
                        {condition.stepIndex >= 0 &&
                            steps[condition.stepIndex]?.options.map((option) => (
                                <option key={option.id} value={option.id}>
                                    {option.displayName || option.name}
                                </option>
                            ))}
                    </select>

                    {/* 조건 삭제 버튼 (루트가 아닌 경우에만) */}
                    {parentExpression && indexInParent !== undefined && (
                        <button
                            type="button"
                            onClick={() => removeFromExpression(parentExpression, indexInParent)}
                            className={styles.removeButton}
                        >
                            삭제
                        </button>
                    )}
                </div>
            );
        } else if (expression.type === "group") {
            return (
                <div
                    key={`group-${depth}-${Math.random()}`}
                    style={{ marginLeft: indent }}
                    className={styles.conditionGroup}
                >
                    <div className={styles.groupHeader}>
                        <select
                            value={expression.operator || "AND"}
                            onChange={(e) => updateOperatorInExpression(expression, e.target.value as LogicalOperator)}
                            className={styles.operatorSelect}
                        >
                            <option value="AND">AND</option>
                            <option value="OR">OR</option>
                        </select>
                        <span className={styles.groupLabel}>그룹</span>
                        
                        {/* 그룹 액션 버튼들 */}
                        <div className={styles.groupActions}>
                            <button
                                type="button"
                                onClick={() => addConditionToExpression(expression)}
                                className={styles.addConditionButton}
                                title="조건 추가"
                            >
                                + 조건
                            </button>
                            <button
                                type="button"
                                onClick={() => addGroupToExpression(expression)}
                                className={styles.addGroupButton}
                                title="하위 그룹 추가"
                            >
                                + 그룹
                            </button>
                            {/* 그룹 삭제 버튼 (루트가 아닌 경우에만) */}
                            {parentExpression && indexInParent !== undefined && (
                                <button
                                    type="button"
                                    onClick={() => removeFromExpression(parentExpression, indexInParent)}
                                    className={styles.removeGroupButton}
                                    title="그룹 삭제"
                                >
                                    × 그룹
                                </button>
                            )}
                        </div>
                    </div>
                    
                    <div className={styles.groupChildren}>
                        {expression.children && expression.children.length > 0 ? (
                            expression.children.map((child, index) =>
                                renderConditionExpression(child, depth + 1, expression, index)
                            )
                        ) : (
                            <div className={styles.emptyGroup}>
                                <p>조건이 없습니다. 위의 버튼을 사용해 조건 또는 그룹을 추가하세요.</p>
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        return null;
    };

    // Enhanced validation with multi-target support
    const isValid = () => {
        // Check if at least one target is selected
        const hasValidTargets = getSelectedTargetsCount() > 0;
        
        if (!useAdvancedConditions) {
            // Simple mode: check route conditions
            return (
                hasValidTargets &&
                routeConditions.length > 0 &&
                routeConditions.every(c => c.stepIndex >= 0 && c.optionId)
            );
        } else {
            // Advanced mode: check if expression has valid conditions
            const hasValidConditions = validateConditionExpression(conditionExpression);
            return hasValidTargets && hasValidConditions;
        }
    };

    // Recursively validate condition expression
    const validateConditionExpression = (expr: ConditionExpression): boolean => {
        if (expr.type === "condition") {
            return !!(expr.condition && 
                     expr.condition.stepIndex >= 0 && 
                     expr.condition.optionId);
        } else if (expr.type === "group") {
            return !!(expr.children && 
                     expr.children.length > 0 && 
                     expr.children.some(child => validateConditionExpression(child)));
        }
        return false;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValid()) return;

        // Generate default name if empty
        const finalName = name.trim() || `정책_${Date.now()}`;

        // Create separate constraints for each selected target
        const targetPairs: Array<{stepIndex: number, optionId: string}> = [];
        Object.entries(selectedTargets).forEach(([stepIndex, optionIds]) => {
            optionIds.forEach(optionId => {
                targetPairs.push({
                    stepIndex: parseInt(stepIndex),
                    optionId: optionId
                });
            });
        });

        if (isEditing && constraintId && targetPairs.length === 1) {
            // Editing mode: update existing constraint
            const target = targetPairs[0];
            const createConstraint = (targetStepIndex: number, targetOptionId: string, suffix?: string) => ({
                name: targetPairs.length > 1 ? `${finalName}_${suffix || targetStepIndex}` : finalName,
                description: description.trim(),
                action: constraintAction,
                targetStepIndex,
                targetOptionIds: [targetOptionId], // Use array format for consistency
                sourceStepIndex: -1, // Route-based constraints don't use source step
                sourceOptionId: "", // Route-based constraints don't use source option
                scope: "route-based" as const,
                priority,
                isActive: true,
                createdAt: Date.now(),
            });
            
            const baseConstraint = createConstraint(target.stepIndex, target.optionId);
            
            if (useAdvancedConditions) {
                const constraintWithExpression = {
                    ...baseConstraint,
                    conditionExpression,
                    routeConditions: [], // Empty for advanced mode
                    conditionOperator: "AND" as LogicalOperator,
                };
                onUpdateConstraint(constraintId, constraintWithExpression);
            } else {
                const constraintWithConditions = {
                    ...baseConstraint,
                    routeConditions,
                    conditionOperator,
                    conditionExpression: undefined,
                };
                onUpdateConstraint(constraintId, constraintWithConditions);
            }
        } else {
            // Creating new constraints - check for existing policies to merge
            if (isEditing && constraintId) {
                // Delete old constraint first when editing to multiple targets
                onDeleteConstraint(constraintId);
            }
            
            // Find existing constraints that match our conditions and action
            const existingMatchingConstraint = constraints.find(constraint => 
                doesConstraintMatch(
                    constraint,
                    routeConditions,
                    conditionExpression,
                    conditionOperator,
                    constraintAction,
                    useAdvancedConditions
                )
            );

            if (existingMatchingConstraint) {
                // Merge with existing constraint
                const mergeResult = mergeConstraintTargets(existingMatchingConstraint, targetPairs);
                
                if (mergeResult.hasNewTargets) {
                    onUpdateConstraint(existingMatchingConstraint.id, mergeResult.mergedConstraint);
                    setStatusMessage(`기존 정책 '${existingMatchingConstraint.name}'에 새로운 대상들이 병합되었습니다.`);
                    setTimeout(() => onClose(), 1500); // Show message for 1.5 seconds before closing
                    return; // Don't close immediately
                } else {
                    setStatusMessage(`모든 대상이 이미 기존 정책 '${existingMatchingConstraint.name}'에 포함되어 있어 생성을 건너뛰었습니다.`);
                    setTimeout(() => onClose(), 2000); // Show message for 2 seconds before closing
                    return; // Don't close immediately
                }
            } else {
                // Create new constraint(s) - filter out targets that already exist in other constraints
                const filteredTargetPairs = targetPairs.filter(target => {
                    // Check if this specific target already exists in any other constraint with same conditions
                    return !constraints.some(constraint => {
                        if (!doesConstraintMatch(
                            constraint,
                            routeConditions,
                            conditionExpression,
                            conditionOperator,
                            constraintAction,
                            useAdvancedConditions
                        )) {
                            return false;
                        }
                        
                        // Check if this target already exists in this constraint
                        const targetKey = `${target.stepIndex}:${target.optionId}`;
                        const existingTargets = new Set<string>();
                        
                        if (constraint.targetStepIndex !== undefined && constraint.targetOptionId) {
                            existingTargets.add(`${constraint.targetStepIndex}:${constraint.targetOptionId}`);
                        }
                        
                        if (constraint.targetOptionIds) {
                            constraint.targetOptionIds.forEach(optionId => {
                                if (constraint.targetStepIndex !== undefined) {
                                    existingTargets.add(`${constraint.targetStepIndex}:${optionId}`);
                                }
                            });
                        }
                        
                        return existingTargets.has(targetKey);
                    });
                });
                
                if (filteredTargetPairs.length === 0) {
                    setStatusMessage('모든 대상이 이미 기존 정책들에 포함되어 있어 생성을 건너뛰었습니다.');
                    setTimeout(() => onClose(), 2000); // Show message for 2 seconds before closing
                    return; // Don't close immediately
                } else {
                    // Create new constraint(s) only for targets that don't exist
                    filteredTargetPairs.forEach((target) => {
                        const stepName = steps[target.stepIndex]?.displayName || steps[target.stepIndex]?.name || target.stepIndex;
                        const optionName = steps[target.stepIndex]?.options.find(opt => opt.id === target.optionId)?.displayName || target.optionId;
                        const suffix = `${stepName}_${optionName}`;
                        
                        const createConstraint = (targetStepIndex: number, targetOptionId: string, suffix?: string) => ({
                            name: filteredTargetPairs.length > 1 ? `${finalName}_${suffix || targetStepIndex}` : finalName,
                            description: description.trim(),
                            action: constraintAction,
                            targetStepIndex,
                            targetOptionIds: [targetOptionId], // Use array format for consistency
                            sourceStepIndex: -1, // Route-based constraints don't use source step
                            sourceOptionId: "", // Route-based constraints don't use source option
                            scope: "route-based" as const,
                            priority,
                            isActive: true,
                            createdAt: Date.now(),
                        });
                        
                        const baseConstraint = createConstraint(target.stepIndex, target.optionId, suffix);
                        
                        if (useAdvancedConditions) {
                            const constraintWithExpression = {
                                ...baseConstraint,
                                conditionExpression,
                                routeConditions: [],
                                conditionOperator: "AND" as LogicalOperator,
                            };
                            onAddConstraint(constraintWithExpression);
                        } else {
                            const constraintWithConditions = {
                                ...baseConstraint,
                                routeConditions,
                                conditionOperator,
                                conditionExpression: undefined,
                            };
                            onAddConstraint(constraintWithConditions);
                        }
                    });
                    
                    // Close modal after successful creation
                    onClose();
                }
            }
        }
    };

    const handleDelete = () => {
        if (constraintId && window.confirm("정말로 이 정책을 삭제하시겠습니까?")) {
            onDeleteConstraint(constraintId);
            onClose();
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h2>{isEditing ? "정책 수정" : "새 정책 생성"}</h2>
                    <button onClick={onClose} className={styles.closeButton} type="button">
                        ×
                    </button>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    {/* Basic Information Section */}
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>기본 정보</h3>
                        
                        <div className={styles.formGroup}>
                            <label htmlFor="name">정책 이름 <span className={styles.optional}>(선택사항)</span></label>
                            <input
                                id="name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className={styles.input}
                                placeholder="정책의 이름을 입력하세요 (비워두면 자동 생성됩니다)"
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="description">설명 <span className={styles.optional}>(선택사항)</span></label>
                            <textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className={styles.textarea}
                                placeholder="정책의 설명을 입력하세요"
                                rows={3}
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="action">정책 액션 <span className={styles.required}>*</span></label>
                            <select
                                id="action"
                                value={constraintAction}
                                onChange={(e) => setConstraintAction(e.target.value as ConstraintActionType)}
                                className={styles.select}
                                required
                            >
                                <option value="disable">비활성화 - 선택된 대상을 비활성화합니다</option>
                                <option value="enable">활성화 - 선택된 대상을 활성화합니다</option>
                                <option value="require">필수 - 선택된 대상을 필수로 만듭니다</option>
                            </select>
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="priority">우선순위 (1-100)</label>
                            <input
                                id="priority"
                                type="number"
                                min="1"
                                max="100"
                                value={priority}
                                onChange={(e) => {
                                    const value = parseInt(e.target.value) || 50;
                                    // Enforce 1-100 range
                                    const clampedValue = Math.min(100, Math.max(1, value));
                                    setPriority(clampedValue);
                                }}
                                className={styles.input}
                            />
                            <small className={styles.helpText}>
                                높은 값일수록 높은 우선순위를 가집니다. 기본값: 50
                            </small>
                        </div>
                    </div>

                    {/* Conditions Section */}
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>조건 설정</h3>
                        
                        <div className={styles.formGroup}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <label>경로 조건 <span className={styles.required}>*</span></label>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (useAdvancedConditions) {
                                            convertToSimpleConditions();
                                        } else {
                                            convertToAdvancedConditions();
                                        }
                                    }}
                                    className={styles.toggleButton}
                                >
                                    {useAdvancedConditions ? '단순 모드' : '고급 모드'}
                                </button>
                            </div>
                            <small className={styles.helpText}>
                                언제 이 정책이 적용될지 조건을 설정하세요
                            </small>
                        
                        {!useAdvancedConditions ? (
                            // Simple conditions UI
                            <div className={styles.routeConditionsContainer}>
                                {routeConditions.map((condition, index) => (
                                    <div key={index} className={styles.routeCondition}>
                                        <select
                                            value={condition.stepIndex}
                                            onChange={(e) =>
                                                updateRouteCondition(
                                                    index,
                                                    "stepIndex",
                                                    parseInt(e.target.value)
                                                )
                                            }
                                            className={styles.select}
                                        >
                                            <option value={-1}>단계 선택</option>
                                            {steps.map((step, stepIndex) => (
                                                <option key={stepIndex} value={stepIndex}>
                                                    {step.displayName || step.name}
                                                </option>
                                            ))}
                                        </select>

                                        <select
                                            value={condition.optionId}
                                            onChange={(e) =>
                                                updateRouteCondition(
                                                    index,
                                                    "optionId",
                                                    e.target.value
                                                )
                                            }
                                            className={styles.select}
                                            disabled={condition.stepIndex < 0}
                                        >
                                            <option value="">옵션 선택</option>
                                            {condition.stepIndex >= 0 &&
                                                steps[condition.stepIndex]?.options.map((option) => (
                                                    <option key={option.id} value={option.id}>
                                                        {option.displayName || option.name}
                                                    </option>
                                                ))}
                                        </select>

                                        <button
                                            onClick={() => removeRouteCondition(index)}
                                            className={styles.removeButton}
                                            type="button"
                                        >
                                            삭제
                                        </button>
                                    </div>
                                ))}
                                
                                <button
                                    onClick={addRouteCondition}
                                    className={styles.addButton}
                                    type="button"
                                >
                                    조건 추가
                                </button>
                            </div>
                        ) : (
                            // Advanced conditions UI
                            <div className={styles.advancedConditionsContainer}>
                                <p className={styles.advancedModeLabel}>고급 조건 모드 (중첩된 AND/OR 지원)</p>
                                <div className={styles.expressionEditor}>
                                    {renderConditionExpression(conditionExpression)}
                                </div>
                            </div>
                        )}

                        {!useAdvancedConditions && routeConditions.length > 1 && (
                            <div className={styles.operatorContainer}>
                                <label>조건 결합 방식:</label>
                                <div className={styles.radioGroup}>
                                    <label>
                                        <input
                                            type="radio"
                                            value="AND"
                                            checked={conditionOperator === "AND"}
                                            onChange={(e) => setConditionOperator(e.target.value as LogicalOperator)}
                                        />
                                        AND (모든 조건이 만족되어야 함)
                                    </label>
                                    <label>
                                        <input
                                            type="radio"
                                            value="OR"
                                            checked={conditionOperator === "OR"}
                                            onChange={(e) => setConditionOperator(e.target.value as LogicalOperator)}
                                        />
                                        OR (조건 중 하나만 만족되면 됨)
                                    </label>
                                </div>
                            </div>
                        )}
                        </div>
                    </div>

                    {/* Target Selection Section */}
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>대상 선택</h3>
                        
                        <div className={styles.formGroup}>
                            <label>정책이 적용될 대상 단계 및 옵션 <span className={styles.required}>*</span></label>
                            <small className={styles.helpText}>
                                이 정책이 적용될 단계와 옵션을 선택하세요
                            </small>
                        <div className={styles.targetSelectionContainer}>
                            <div className={styles.selectionSummary}>
                                <span>선택된 대상: {getSelectedTargetsCount()}개</span>
                                <div className={styles.globalSelectButtons}>
                                    <button
                                        type="button"
                                        onClick={selectAllTargets}
                                        className={styles.selectAllButton}
                                        disabled={areAllTargetsSelected()}
                                    >
                                        전체 선택
                                    </button>
                                    <button
                                        type="button"
                                        onClick={deselectAllTargets}
                                        className={styles.deselectAllButton}
                                        disabled={getSelectedTargetsCount() === 0}
                                    >
                                        전체 해제
                                    </button>
                                </div>
                            </div>
                            
                            {steps.map((step, stepIndex) => (
                                <div key={stepIndex} className={styles.stepSelectionGroup}>
                                    <div className={styles.stepHeader}>
                                        <label className={styles.stepCheckboxLabel}>
                                            <input
                                                type="checkbox"
                                                checked={isStepSelected(stepIndex)}
                                                onChange={() => toggleStepSelection(stepIndex)}
                                                className={styles.stepCheckbox}
                                            />
                                            <span className={styles.stepName}>
                                                {step.displayName || step.name}
                                            </span>
                                        </label>
                                        {isStepSelected(stepIndex) && (
                                            <div className={styles.stepSelectButtons}>
                                                <button
                                                    type="button"
                                                    onClick={() => selectAllForStep(stepIndex)}
                                                    className={styles.selectAllStepButton}
                                                    disabled={areAllOptionsSelected(stepIndex)}
                                                >
                                                    모두 선택
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => deselectAllForStep(stepIndex)}
                                                    className={styles.deselectAllStepButton}
                                                    disabled={!selectedTargets[stepIndex] || selectedTargets[stepIndex].length === 0}
                                                >
                                                    모두 해제
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {isStepSelected(stepIndex) && (
                                        <div className={styles.optionsGrid}>
                                            {step.options.map((option) => (
                                                <label 
                                                    key={option.id} 
                                                    className={styles.optionCheckboxLabel}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isOptionSelected(stepIndex, option.id)}
                                                        onChange={() => toggleOptionSelection(stepIndex, option.id)}
                                                        className={styles.optionCheckbox}
                                                    />
                                                    <span className={styles.optionName}>
                                                        {option.displayName || option.name}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                            
                            {getSelectedTargetsCount() === 0 && (
                                <div className={styles.noSelectionMessage}>
                                    대상 단계를 선택한 후 해당 옵션들을 선택하세요.
                                </div>
                            )}
                        </div>
                        </div>
                    </div>

                    {/* Form Actions */}
                    <div className={styles.actions}>
                        {statusMessage && (
                            <div className={styles.statusMessage}>
                                {statusMessage}
                            </div>
                        )}
                        {!isValid() && !statusMessage && (
                            <div className={styles.validationMessage}>
                                정책을 생성하려면 조건과 대상을 모두 설정해야 합니다.
                            </div>
                        )}
                        {isEditing && !statusMessage && (
                            <button
                                type="button"
                                onClick={handleDelete}
                                className={styles.deleteButton}
                            >
                                삭제
                            </button>
                        )}
                        {!statusMessage && (
                            <>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className={styles.cancelButton}
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    disabled={!isValid()}
                                    className={styles.submitButton}
                                >
                                    {isEditing ? "수정" : "생성"}
                                </button>
                            </>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ConstraintModal;