import {
    Step,
    WorkflowConstraint,
    ConstraintMap,
    ConstraintEvaluationResult,
    ConstraintConflict,
    ConstraintApplicationResult,
    PolicyStatus,
    LogicalOperator,
    RouteCondition,
    ConditionExpression,
} from "./types";

/**
 * Enhanced constraint system with Zendesk-style policy management
 * Supports complex AND/OR conditions, priority management, and conflict resolution
 */

/**
 * Calculate default priority based on constraint scope and action
 * Priority range: 1-100, where higher values = higher priority
 */
export function calculateDefaultPriority(
    constraint: Partial<WorkflowConstraint>
): number {
    let basePriority = 50; // Default middle priority

    // Scope-based priority adjustment (more specific = higher priority)
    switch (constraint.scope) {
        case "conditional-route":
            basePriority = 80; // High priority for complex conditions
            break;
        case "route-based":
            basePriority = 60; // Medium-high priority for route-based
            break;
        case "global":
        default:
            basePriority = 40; // Lower priority for global constraints
            break;
    }

    // Action-based priority adjustment
    switch (constraint.action) {
        case "require":
            basePriority += 10; // Require is most important
            break;
        case "enable":
            basePriority += 5; // Enable has medium importance
            break;
        case "disable":
        default:
            basePriority += 0; // Disable has base priority
            break;
    }

    // Ensure priority stays within 1-100 range
    return Math.min(100, Math.max(1, basePriority));
}

/**
 * Assign default priorities to constraints
 */
export function assignDefaultPriorities(
    constraint: Partial<WorkflowConstraint>
): number {
    return constraint.priority || calculateDefaultPriority(constraint);
}

/**
 * Evaluate if route conditions match the current path with AND/OR logic
 */
export function evaluateRouteConditions(
    conditions: RouteCondition[],
    operator: LogicalOperator,
    selectedPath: { [stepIndex: number]: string }
): boolean {
    if (!conditions || conditions.length === 0) return true;

    const results = conditions.map((condition) => {
        const selectedOption = selectedPath[condition.stepIndex];
        return selectedOption === condition.optionId;
    });

    if (operator === "AND") {
        return results.every((result) => result);
    } else {
        // OR
        return results.some((result) => result);
    }
}

/**
 * Evaluate complex condition expressions with nested AND/OR logic
 */
export function evaluateConditionExpression(
    expression: ConditionExpression,
    selectedPath: { [stepIndex: number]: string }
): boolean {
    if (expression.type === "condition") {
        // Simple condition evaluation
        if (!expression.condition) return false;
        const selectedOption = selectedPath[expression.condition.stepIndex];
        return selectedOption === expression.condition.optionId;
    } else if (expression.type === "group") {
        // Group evaluation with nested children
        if (!expression.children || expression.children.length === 0) return true;
        
        const results = expression.children.map(child => 
            evaluateConditionExpression(child, selectedPath)
        );

        if (expression.operator === "AND") {
            return results.every(result => result);
        } else {
            // OR
            return results.some(result => result);
        }
    }
    
    return false;
}

/**
 * Determine policy status based on usage and conflicts
 */
export function determinePolicyStatus(
    constraint: WorkflowConstraint,
    appliedResults: ConstraintEvaluationResult[],
    conflicts: ConstraintConflict[]
): PolicyStatus {
    // Check if constraint is in conflict
    const hasConflict = conflicts.some((conflict) =>
        conflict.conflictingConstraints.some((c) => c.id === constraint.id)
    );

    if (hasConflict) return "conflicted";

    // Check if constraint is overridden
    if (constraint.overriddenBy && constraint.overriddenBy.length > 0) {
        return "overridden";
    }

    // Check if constraint is applied
    const isApplied = appliedResults.some(
        (result) => result.constraint.id === constraint.id && result.applies
    );

    if (!constraint.isActive) return "inactive";
    if (!isApplied) return "unused";

    return "active";
}

/**
 * Enhanced constraint application with proper priority logic and conflict detection
 */
export function applyConstraintsWithPriority(
    steps: Step[],
    constraints: ConstraintMap,
    selectedPath: { [stepIndex: number]: string }
): ConstraintApplicationResult {
    const disabledOptions: { [stepIndex: number]: Set<string> } = {};
    const enabledOptions: { [stepIndex: number]: Set<string> } = {};
    const requiredOptions: { [stepIndex: number]: Set<string> } = {};
    const conflicts: ConstraintConflict[] = [];
    const appliedConstraints: ConstraintEvaluationResult[] = [];

    // Initialize sets for each step
    steps.forEach((_, stepIndex) => {
        disabledOptions[stepIndex] = new Set();
        enabledOptions[stepIndex] = new Set();
        requiredOptions[stepIndex] = new Set();
    });

    // Get active constraints and sort by priority (HIGHER numbers = higher priority, applied FIRST)
    const activeConstraints = Object.values(constraints)
        .filter((constraint) => constraint.isActive)
        .sort((a, b) => (b.priority || 50) - (a.priority || 50));

    // Track applied actions per target to detect conflicts
    const appliedActions: {
        [stepIndex: number]: {
            [optionId: string]: Array<{
                constraint: WorkflowConstraint;
                action: string;
                priority: number;
                scope: string;
            }>;
        };
    } = {};

    // Initialize tracking structure
    steps.forEach((_, stepIndex) => {
        appliedActions[stepIndex] = {};
    });

    // Helper function to record action application
    const recordAction = (
        stepIndex: number,
        optionId: string,
        constraint: WorkflowConstraint,
        action: string
    ) => {
        if (!appliedActions[stepIndex][optionId]) {
            appliedActions[stepIndex][optionId] = [];
        }
        appliedActions[stepIndex][optionId].push({
            constraint,
            action,
            priority: constraint.priority || 50,
            scope: constraint.scope,
        });
    };

    // Helper function to apply action with conflict detection
    const applyActionWithConflictDetection = (
        stepIndex: number,
        optionId: string,
        constraint: WorkflowConstraint,
        action: string
    ) => {
        recordAction(stepIndex, optionId, constraint, action);

        // Check for conflicts with same priority level
        const actionsOnTarget = appliedActions[stepIndex][optionId] || [];
        const currentPriority = constraint.priority || 50;
        
        // Check if there's already a higher priority action applied
        const higherPriorityActions = actionsOnTarget.filter(
            (a) => a.priority > currentPriority
        );
        
        if (higherPriorityActions.length > 0) {
            // Don't apply this action - higher priority action already exists
            return;
        }
        
        const samePriorityActions = actionsOnTarget.filter(
            (a) => a.priority === currentPriority
        );

        if (samePriorityActions.length > 1) {
            const conflictingActions = samePriorityActions.filter(
                (a) => a.action !== action
            );
            if (conflictingActions.length > 0) {
                conflicts.push({
                    conflictingConstraints: [
                        constraint,
                        ...conflictingActions.map((a) => a.constraint),
                    ],
                    targetStep: stepIndex,
                    targetOption: optionId,
                    conflictType: "priority",
                    reason: `Multiple actions on same target with same priority ${currentPriority}`,
                    resolution: "priority",
                    conflictLevel: "error",
                });
                // In case of same priority conflict, don't apply the action
                return;
            }
        }

        // Check for lower priority actions that should be overridden
        const lowerPriorityActions = actionsOnTarget.filter(
            (a) => a.priority < currentPriority
        );
        
        // If we have lower priority actions, we need to override them
        if (lowerPriorityActions.length > 0) {
            // Remove effects of lower priority actions by clearing the options first
            disabledOptions[stepIndex].delete(optionId);
            enabledOptions[stepIndex].delete(optionId);
            requiredOptions[stepIndex].delete(optionId);
        }

        // Path-based policies override global ones regardless of priority
        const globalActions = actionsOnTarget.filter(
            (a) => a.scope === "global"
        );
        const pathActions = actionsOnTarget.filter((a) => a.scope !== "global");

        if (pathActions.length > 0 && globalActions.length > 0) {
            // Path-based overrides global - this is expected behavior, not a conflict
            const finalAction =
                constraint.scope !== "global"
                    ? action
                    : pathActions[pathActions.length - 1].action;
            switch (finalAction) {
                case "disable":
                    disabledOptions[stepIndex].add(optionId);
                    enabledOptions[stepIndex].delete(optionId);
                    requiredOptions[stepIndex].delete(optionId);
                    break;
                case "enable":
                    enabledOptions[stepIndex].add(optionId);
                    disabledOptions[stepIndex].delete(optionId);
                    break;
                case "require":
                    requiredOptions[stepIndex].add(optionId);
                    disabledOptions[stepIndex].delete(optionId);
                    break;
            }
        } else {
            // Normal action application based on priority order
            switch (action) {
                case "disable":
                    disabledOptions[stepIndex].add(optionId);
                    enabledOptions[stepIndex].delete(optionId);
                    requiredOptions[stepIndex].delete(optionId);
                    break;
                case "enable":
                    enabledOptions[stepIndex].add(optionId);
                    disabledOptions[stepIndex].delete(optionId);
                    break;
                case "require":
                    requiredOptions[stepIndex].add(optionId);
                    disabledOptions[stepIndex].delete(optionId);
                    break;
            }
        }
    };

    // Apply each active constraint in priority order
    activeConstraints.forEach((constraint) => {
        // Check conditions in order of complexity: expression > routeConditions > legacy source
        let conditionsMet = false;

        if (constraint.conditionExpression) {
            // Use complex condition expression if available
            conditionsMet = evaluateConditionExpression(
                constraint.conditionExpression,
                selectedPath
            );
        } else if (constraint.routeConditions && constraint.routeConditions.length > 0) {
            // Use simple route conditions with AND/OR operator
            conditionsMet = evaluateRouteConditions(
                constraint.routeConditions,
                constraint.conditionOperator || "AND",
                selectedPath
            );
        } else if (constraint.sourceStepIndex !== undefined && constraint.sourceOptionId) {
            // For legacy constraints without route conditions, check source selection
            conditionsMet = selectedPath[constraint.sourceStepIndex] === constraint.sourceOptionId;
        } else {
            // No conditions specified - always apply (global constraint)
            conditionsMet = true;
        }

        if (!conditionsMet) {
            return; // Skip if conditions are not met
        }

        // Apply constraint to target step(s) and option(s)
        const action = constraint.action || "disable";

        // Priority 1: Handle new unified targetPairs (complete multi-step target information)
        if (constraint.targetPairs && constraint.targetPairs.length > 0) {
            constraint.targetPairs.forEach((target) => {
                if (target.stepIndex >= 0 && target.stepIndex < steps.length) {
                    const targetStep = steps[target.stepIndex];
                    const targetOption = targetStep.options.find(opt => opt.id === target.optionId);
                    
                    if (targetOption) {
                        applyActionWithConflictDetection(
                            target.stepIndex,
                            target.optionId,
                            constraint,
                            action
                        );
                    }
                }
            });
        }
        // Priority 2: Handle single target step (legacy and backward compatibility)
        else if (constraint.targetStepIndex !== undefined) {
            const targetStep = steps[constraint.targetStepIndex];
            if (!targetStep) {
                return; // Skip if target step is missing
            }

            const targetOptions = constraint.targetOptionIds || 
                (constraint.targetOptionId ? [constraint.targetOptionId] : []);

            if (targetOptions.length > 0) {
                // Validate that target options exist
                const validTargetOptions = targetOptions.filter(optionId =>
                    targetStep.options.find(opt => opt.id === optionId)
                );
                
                validTargetOptions.forEach((optionId) => {
                    applyActionWithConflictDetection(
                        constraint.targetStepIndex!,
                        optionId,
                        constraint,
                        action
                    );
                });
            } else {
                // Apply to all options in the step
                targetStep.options.forEach((option) => {
                    applyActionWithConflictDetection(
                        constraint.targetStepIndex!,
                        option.id,
                        constraint,
                        action
                    );
                });
            }
        }
        // Priority 3: Handle multiple target steps (legacy multi-step support)
        else if (constraint.targetSteps && constraint.targetSteps.length > 0) {
            constraint.targetSteps.forEach((stepIndex) => {
                if (stepIndex >= 0 && stepIndex < steps.length) {
                    const targetStep = steps[stepIndex];
                    const targetOptions = constraint.targetOptionIds || [];

                    if (targetOptions.length > 0) {
                        // Validate that target options exist
                        const validTargetOptions = targetOptions.filter(optionId =>
                            targetStep.options.find(opt => opt.id === optionId)
                        );
                        
                        validTargetOptions.forEach((optionId) => {
                            applyActionWithConflictDetection(
                                stepIndex,
                                optionId,
                                constraint,
                                action
                            );
                        });
                    } else {
                        // Apply to all options in the step
                        targetStep.options.forEach((option) => {
                            applyActionWithConflictDetection(
                                stepIndex,
                                option.id,
                                constraint,
                                action
                            );
                        });
                    }
                }
            });
        }

        appliedConstraints.push({
            constraint,
            applies: true,
            reason: "Conditions met and action applied",
            priority: constraint.priority || 50,
            action,
            status: determinePolicyStatus(constraint, [], conflicts),
        });
    });

    // Handle 'require' action: disable all other options in the same step that are not required
    steps.forEach((step, stepIndex) => {
        const requiredInThisStep = requiredOptions[stepIndex];
        if (requiredInThisStep && requiredInThisStep.size > 0) {
            // For each option in this step, if it's not required, disable it
            step.options.forEach((option) => {
                if (!requiredInThisStep.has(option.id)) {
                    disabledOptions[stepIndex].add(option.id);
                    enabledOptions[stepIndex].delete(option.id);
                }
            });
        }
    });

    // Detect circular references
    const circularConflicts = detectCircularReferences(activeConstraints);
    conflicts.push(...circularConflicts);

    return {
        disabledOptions,
        enabledOptions,
        requiredOptions,
        conflicts,
        appliedConstraints,
        exceptionsApplied: [],
    };
}

/**
 * Normalize priorities to ensure they are consecutive starting from 1
 */
export function normalizePriorities(constraints: ConstraintMap): {
    [constraintId: string]: number;
} {
    const constraintEntries = Object.entries(constraints);
    const sorted = constraintEntries
        .map(([id, constraint]) => ({
            id,
            priority: constraint.priority || 50,
        }))
        .sort((a, b) => a.priority - b.priority);

    const normalizedPriorities: { [constraintId: string]: number } = {};
    sorted.forEach((item, index) => {
        normalizedPriorities[item.id] = index + 1;
    });

    return normalizedPriorities;
}

/**
 * Recalculate priorities after constraint deletion or changes
 */
export function recalculatePriorities(
    constraints: ConstraintMap,
    deletedConstraintIds: string[] = []
): { [constraintId: string]: number } {
    // Filter out deleted constraints
    const remainingConstraints: ConstraintMap = {};
    Object.entries(constraints).forEach(([id, constraint]) => {
        if (!deletedConstraintIds.includes(id)) {
            remainingConstraints[id] = constraint;
        }
    });

    return normalizePriorities(remainingConstraints);
}

/**
 * Check if there are conflicts between constraints with same priority
 */
export function detectSamePriorityConflicts(
    constraints: ConstraintMap
): ConstraintConflict[] {
    const conflicts: ConstraintConflict[] = [];
    const constraintsByPriority: { [priority: number]: WorkflowConstraint[] } =
        {};

    // Group constraints by priority
    Object.values(constraints).forEach((constraint) => {
        if (!constraint.isActive) return;

        const priority = constraint.priority || 50;
        if (!constraintsByPriority[priority]) {
            constraintsByPriority[priority] = [];
        }
        constraintsByPriority[priority].push(constraint);
    });

    // Check for conflicts within each priority group
    Object.entries(constraintsByPriority).forEach(
        ([priority, constraintGroup]) => {
            if (constraintGroup.length <= 1) return;

            // Track targets for each constraint in this priority group
            const targetMap: { [targetKey: string]: WorkflowConstraint[] } = {};

            constraintGroup.forEach((constraint) => {
                // Single target
                if (constraint.targetStepIndex !== undefined) {
                    const targetOptions =
                        constraint.targetOptionIds ||
                        [constraint.targetOptionId].filter(Boolean);
                    targetOptions.forEach((optionId) => {
                        const key = `${constraint.targetStepIndex}-${optionId}`;
                        if (!targetMap[key]) targetMap[key] = [];
                        targetMap[key].push(constraint);
                    });
                }

                // Multiple targets
                if (constraint.targetSteps) {
                    constraint.targetSteps.forEach((stepIndex) => {
                        const targetOptions = constraint.targetOptionIds || [];
                        if (targetOptions.length > 0) {
                            targetOptions.forEach((optionId) => {
                                const key = `${stepIndex}-${optionId}`;
                                if (!targetMap[key]) targetMap[key] = [];
                                targetMap[key].push(constraint);
                            });
                        } else {
                            // Apply to all options in step - this is a potential conflict point
                            const key = `${stepIndex}-all`;
                            if (!targetMap[key]) targetMap[key] = [];
                            targetMap[key].push(constraint);
                        }
                    });
                }
            });

            // Find conflicts
            Object.entries(targetMap).forEach(
                ([targetKey, affectingConstraints]) => {
                    if (affectingConstraints.length > 1) {
                        const [stepIndex, optionId] = targetKey.split("-");
                        conflicts.push({
                            conflictingConstraints: affectingConstraints,
                            targetStep: parseInt(stepIndex),
                            targetOption: optionId,
                            conflictType: "priority",
                            reason: `Multiple constraints with same priority ${priority} targeting same option`,
                            resolution: "priority",
                            conflictLevel: "error",
                        });
                    }
                }
            );
        }
    );

    return conflicts;
}

/**
 * Detect circular references between constraints
 */
export function detectCircularReferences(
    constraints: WorkflowConstraint[]
): ConstraintConflict[] {
    const conflicts: ConstraintConflict[] = [];
    // Build a graph of constraint dependencies
    const dependencyGraph: { [constraintId: string]: string[] } = {};
    const constraintMap: { [constraintId: string]: WorkflowConstraint } = {};

    // Index constraints
    constraints.forEach((constraint) => {
        constraintMap[constraint.id] = constraint;
        dependencyGraph[constraint.id] = [];
    });

    // Build dependency edges
    constraints.forEach((constraint) => {
        constraints.forEach((otherConstraint) => {
            if (constraint.id === otherConstraint.id) return;

            // Check if this constraint affects the source of another constraint
            const affectsOtherSource =
                (otherConstraint.targetStepIndex ===
                    constraint.sourceStepIndex &&
                    otherConstraint.targetOptionIds?.includes(
                        constraint.sourceOptionId
                    )) ||
                otherConstraint.targetSteps?.includes(
                    constraint.sourceStepIndex
                );

            if (affectsOtherSource) {
                dependencyGraph[constraint.id].push(otherConstraint.id);
            }
        });
    });

    // Detect cycles using DFS
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (
        constraintId: string,
        path: string[]
    ): string[] | null => {
        if (recursionStack.has(constraintId)) {
            // Found a cycle
            const cycleStart = path.indexOf(constraintId);
            return path.slice(cycleStart);
        }

        if (visited.has(constraintId)) {
            return null;
        }

        visited.add(constraintId);
        recursionStack.add(constraintId);
        path.push(constraintId);

        for (const dependency of dependencyGraph[constraintId]) {
            const cycle = hasCycle(dependency, [...path]);
            if (cycle) {
                return cycle;
            }
        }

        recursionStack.delete(constraintId);
        return null;
    };

    // Check for cycles starting from each constraint
    Object.keys(dependencyGraph).forEach((constraintId) => {
        if (!visited.has(constraintId)) {
            const cycle = hasCycle(constraintId, []);
            if (cycle) {
                const cycleConstraints = cycle.map((id) => constraintMap[id]);
                conflicts.push({
                    conflictingConstraints: cycleConstraints,
                    targetStep: -1, // Indicates circular reference
                    targetOption: "",
                    conflictType: "logic",
                    reason: `Circular reference detected: ${cycle.join(
                        " → "
                    )} → ${cycle[0]}`,
                    resolution: "priority",
                    conflictLevel: "error",
                });
            }
        }
    });

    return conflicts;
}

// Update constraint indices when steps are inserted
export const updateConstraintIndices = (
    constraints: ConstraintMap,
    insertIndex: number
): ConstraintMap => {
    const updated: ConstraintMap = {};

    Object.entries(constraints).forEach(([id, constraint]) => {
        const updatedConstraint = { ...constraint };

        // Update source step index
        if (constraint.sourceStepIndex >= insertIndex) {
            updatedConstraint.sourceStepIndex = constraint.sourceStepIndex + 1;
        }

        // Update target step index
        if (
            constraint.targetStepIndex !== undefined &&
            constraint.targetStepIndex >= insertIndex
        ) {
            updatedConstraint.targetStepIndex = constraint.targetStepIndex + 1;
        }

        // Update target steps array
        if (constraint.targetSteps) {
            updatedConstraint.targetSteps = constraint.targetSteps.map(
                (stepIndex) =>
                    stepIndex >= insertIndex ? stepIndex + 1 : stepIndex
            );
        }

        // Update targetPairs array (new unified structure)
        if (constraint.targetPairs) {
            updatedConstraint.targetPairs = constraint.targetPairs.map(
                (target) => ({
                    ...target,
                    stepIndex:
                        target.stepIndex >= insertIndex
                            ? target.stepIndex + 1
                            : target.stepIndex,
                })
            );
        }

        // Update route conditions
        if (constraint.routeConditions) {
            updatedConstraint.routeConditions = constraint.routeConditions.map(
                (condition) => ({
                    ...condition,
                    stepIndex:
                        condition.stepIndex >= insertIndex
                            ? condition.stepIndex + 1
                            : condition.stepIndex,
                })
            );
        }

        updated[id] = updatedConstraint;
    });

    return updated;
};

// Placeholder functions for compatibility
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const generatePathActivations = (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _steps: Step[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _constraints: ConstraintMap
): Record<string, boolean[]> => {
    // Simple implementation - can be enhanced later if needed
    return {};
};

export const cleanInvalidConstraints = (
    constraints: ConstraintMap,
    steps: Step[]
): ConstraintMap => {
    const cleaned: ConstraintMap = {};

    Object.entries(constraints).forEach(([id, constraint]) => {
        // Basic validation - check if referenced steps still exist
        let isValid = true;

        if (constraint.sourceStepIndex >= steps.length) {
            isValid = false;
        }

        if (
            constraint.targetStepIndex !== undefined &&
            constraint.targetStepIndex >= steps.length
        ) {
            isValid = false;
        }

        if (constraint.targetSteps) {
            const invalidSteps = constraint.targetSteps.some(
                (stepIndex) => stepIndex >= steps.length
            );
            if (invalidSteps) {
                isValid = false;
            }
        }

        // Validate new targetPairs structure
        if (constraint.targetPairs) {
            const invalidTargetPairs = constraint.targetPairs.some(
                (target) => target.stepIndex >= steps.length ||
                           !steps[target.stepIndex]?.options.some(opt => opt.id === target.optionId)
            );
            if (invalidTargetPairs) {
                isValid = false;
            }
        }

        if (isValid) {
            cleaned[id] = constraint;
        }
    });

    return cleaned;
};

export const adjustConstraintIndicesForStepInsertion = (
    constraints: ConstraintMap,
    insertIndex: number
): ConstraintMap => {
    return updateConstraintIndices(constraints, insertIndex);
};

export const adjustConstraintIndicesForStepDeletion = (
    constraints: ConstraintMap,
    deletedIndex: number
): ConstraintMap => {
    const updated: ConstraintMap = {};

    Object.entries(constraints).forEach(([id, constraint]) => {
        const updatedConstraint = { ...constraint };
        let shouldKeep = true;

        // Skip constraints that reference the deleted step
        if (constraint.sourceStepIndex === deletedIndex) {
            shouldKeep = false;
        }

        if (constraint.targetStepIndex === deletedIndex) {
            shouldKeep = false;
        }

        if (constraint.targetSteps?.includes(deletedIndex)) {
            shouldKeep = false;
        }

        // Check new targetPairs structure
        if (constraint.targetPairs?.some(target => target.stepIndex === deletedIndex)) {
            shouldKeep = false;
        }

        if (shouldKeep) {
            // Adjust indices for steps after the deleted one
            if (constraint.sourceStepIndex > deletedIndex) {
                updatedConstraint.sourceStepIndex =
                    constraint.sourceStepIndex - 1;
            }

            if (
                constraint.targetStepIndex !== undefined &&
                constraint.targetStepIndex > deletedIndex
            ) {
                updatedConstraint.targetStepIndex =
                    constraint.targetStepIndex - 1;
            }

            if (constraint.targetSteps) {
                updatedConstraint.targetSteps = constraint.targetSteps
                    .filter((stepIndex) => stepIndex !== deletedIndex)
                    .map((stepIndex) =>
                        stepIndex > deletedIndex ? stepIndex - 1 : stepIndex
                    );
            }

            // Adjust targetPairs array (new unified structure)
            if (constraint.targetPairs) {
                updatedConstraint.targetPairs = constraint.targetPairs
                    .filter((target) => target.stepIndex !== deletedIndex)
                    .map((target) => ({
                        ...target,
                        stepIndex:
                            target.stepIndex > deletedIndex
                                ? target.stepIndex - 1
                                : target.stepIndex,
                    }));
            }

            if (constraint.routeConditions) {
                updatedConstraint.routeConditions = constraint.routeConditions
                    .filter((condition) => condition.stepIndex !== deletedIndex)
                    .map((condition) => ({
                        ...condition,
                        stepIndex:
                            condition.stepIndex > deletedIndex
                                ? condition.stepIndex - 1
                                : condition.stepIndex,
                    }));
            }

            updated[id] = updatedConstraint;
        }
    });

    return updated;
};

export const adjustConstraintIndicesForStepMove = (
    constraints: ConstraintMap,
    fromIndex: number,
    toIndex: number
): ConstraintMap => {
    const updated: ConstraintMap = {};

    Object.entries(constraints).forEach(([id, constraint]) => {
        const updatedConstraint = { ...constraint };

        // Helper function to adjust a single step index
        const adjustStepIndex = (stepIndex: number): number => {
            if (stepIndex === fromIndex) {
                // The moved step goes to toIndex
                return toIndex;
            } else if (fromIndex < toIndex) {
                // Moving step forward: steps between fromIndex+1 and toIndex shift backward
                if (stepIndex > fromIndex && stepIndex <= toIndex) {
                    return stepIndex - 1;
                }
            } else if (fromIndex > toIndex) {
                // Moving step backward: steps between toIndex and fromIndex-1 shift forward
                if (stepIndex >= toIndex && stepIndex < fromIndex) {
                    return stepIndex + 1;
                }
            }
            return stepIndex;
        };

        // Adjust sourceStepIndex
        updatedConstraint.sourceStepIndex = adjustStepIndex(
            constraint.sourceStepIndex
        );

        // Adjust targetStepIndex
        if (constraint.targetStepIndex !== undefined) {
            updatedConstraint.targetStepIndex = adjustStepIndex(
                constraint.targetStepIndex
            );
        }

        // Adjust targetSteps array
        if (constraint.targetSteps) {
            updatedConstraint.targetSteps =
                constraint.targetSteps.map(adjustStepIndex);
        }

        // Adjust targetPairs array (new unified structure)
        if (constraint.targetPairs) {
            updatedConstraint.targetPairs = constraint.targetPairs.map(
                (target) => ({
                    ...target,
                    stepIndex: adjustStepIndex(target.stepIndex),
                })
            );
        }

        // Adjust routeConditions
        if (constraint.routeConditions) {
            updatedConstraint.routeConditions = constraint.routeConditions.map(
                (condition) => ({
                    ...condition,
                    stepIndex: adjustStepIndex(condition.stepIndex),
                })
            );
        }

        updated[id] = updatedConstraint;
    });

    return updated;
};
