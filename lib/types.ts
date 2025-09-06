// Shared type definitions for the workflow management system

export interface StepOption {
    id: string;
    name: string;
    displayName: string;
    isActive?: boolean;
}

export interface Step {
    id: string;
    name: string;
    displayName: string;
    options: StepOption[];
    isActive?: boolean;
}

// Sheet data structure
export interface WorkflowSheet {
    id: string;
    name: string;
    steps: Step[];
    constraints?: ConstraintMap; // Optional for backward compatibility
    policyGroups?: PolicyGroupMap; // Policy groups for organization
    createdAt: number;
    updatedAt: number;
}

// Multi-sheet data structure
export interface WorkflowData {
    sheets: WorkflowSheet[];
    activeSheetId: string;
    nextSheetId: number;
    lastUpdated?: number; // Optional field for forcing re-renders
}

// Constraint types for Workflow-Button Tab
export type ConstraintScope = "global" | "route-based" | "conditional-route";

// Policy Group for organizing policies (Zendesk style)
export interface PolicyGroup {
    id: string;
    name: string;
    description?: string;
    color?: string;
    isCollapsed?: boolean;
    createdAt: number;
}

// Enhanced Constraint Action Types (simplified to 3 core actions)
export type ConstraintActionType =
    | "disable"    // 비활성화
    | "enable"     // 활성화  
    | "require";   // 필수

// Policy Status for visual indication
export type PolicyStatus =
    | "active"
    | "inactive"
    | "conflicted"
    | "unused"
    | "overridden";

// Route condition for route-based constraints
export interface RouteCondition {
    stepIndex: number;
    optionId: string;
    operator?: "equals" | "not_equals"; // For future expansion
}

// Logical operators for combining conditions
export type LogicalOperator = "AND" | "OR";

// Complex condition structure for nested AND/OR logic
export interface ConditionExpression {
    id?: string; // Optional unique identifier
    type: "condition" | "group";
    
    // For simple condition type
    condition?: RouteCondition;
    
    // For group type
    operator?: LogicalOperator;
    children?: ConditionExpression[];
    
    // Optional metadata
    name?: string;
    description?: string;
}

// Enhanced Condition Group for complex logic
export interface ConditionGroup {
    id: string;
    operator: LogicalOperator;
    conditions: RouteCondition[];
    nestedGroups?: ConditionGroup[]; // For nested AND/OR logic
    // New field for complex expressions
    expression?: ConditionExpression;
}

// Exception for overriding constraints in specific cases
export interface ConstraintException {
    id: string;
    name: string;
    description?: string;
    path: RouteCondition[]; // Required path conditions for this exception to apply
    operator: LogicalOperator; // How to combine path conditions
    action: ConstraintActionType; // Action to take when exception conditions are met
    target: Array<{ step: number; option: string }>; // Which options to affect
    priority?: number; // Priority for this exception (higher = more important)
    isActive: boolean;
    createdAt: number;
}

export interface WorkflowConstraint {
    id: string;
    name: string; // Human-readable policy name (Zendesk style)
    scope: ConstraintScope; // 'global' applies to all paths, 'route-based' applies only when route conditions are met, 'conditional-route' includes external conditions
    sourceStepIndex: number;
    sourceOptionId: string;
    targetStepIndex?: number; // For previous-step and next-step constraints
    targetOptionId?: string; // For previous-step and next-step constraints
    targetSteps?: number[]; // For range-skip: allow multiple target step indexes / ranges
    targetOptionIds?: string[]; // For range-skip: allow listing specific option ids to disable in target steps
    startStep?: number; // For range-skip constraints
    endStep?: number; // For range-skip constraints

    // Enhanced condition logic (Zendesk style)
    conditionGroups?: ConditionGroup[]; // Complex AND/OR condition combinations
    routeConditions?: RouteCondition[]; // Simple route conditions (kept for backward compatibility)
    conditionOperator?: LogicalOperator; // How to combine condition groups
    conditionExpression?: ConditionExpression; // New: Complex nested AND/OR expressions

    action?: ConstraintActionType; // What action to take when conditions are met (disable, enable, require)
    exceptions?: ConstraintException[]; // Override behavior for specific paths/conditions

    // Priority and conflict management (Zendesk style)
    priority?: number; // Higher numbers = higher priority, for conflict resolution
    groupId?: string; // ID of the policy group this constraint belongs to
    tags?: string[]; // Tags for categorization and filtering

    // Status and metadata
    status?: PolicyStatus; // Current status of the policy
    description?: string;
    isActive: boolean;
    createdAt: number;
    updatedAt?: number;
    lastUsed?: number; // Timestamp of last usage for detecting unused policies

    // Conflict resolution
    conflictsWith?: string[]; // Array of constraint IDs that conflict with this constraint
    overrides?: string[]; // Array of constraint IDs that this constraint overrides
    overriddenBy?: string[]; // Array of constraint IDs that override this constraint
}

// Constraint data structure for sheets
export interface ConstraintMap {
    [constraintId: string]: WorkflowConstraint;
}

// Policy Groups data structure
export interface PolicyGroupMap {
    [groupId: string]: PolicyGroup;
}

// Enhanced constraint evaluation result (Zendesk style)
export interface ConstraintEvaluationResult {
    constraint: WorkflowConstraint;
    applies: boolean;
    reason: string;
    priority: number;
    action: ConstraintActionType;
    effectiveAction?: ConstraintActionType; // Final action after resolving conflicts/exceptions
    exceptionApplied?: ConstraintException; // Exception that was applied, if any
    status: PolicyStatus; // Visual status indicator
    conflictReason?: string; // Reason for conflict if any
    overriddenBy?: WorkflowConstraint[]; // Constraints that override this one
}

// Enhanced conflict detection result
export interface ConstraintConflict {
    conflictingConstraints: WorkflowConstraint[];
    targetStep: number;
    targetOption: string;
    conflictType: "priority" | "action" | "logic"; // Type of conflict
    resolution: "auto" | "manual" | "priority"; // How the conflict was resolved
    winningConstraint?: WorkflowConstraint; // Which constraint won the conflict
    reason: string;
    conflictLevel: "warning" | "error"; // Severity of the conflict
}

// Enhanced constraint application result
export interface ConstraintApplicationResult {
    disabledOptions: { [stepIndex: number]: Set<string> };
    enabledOptions: { [stepIndex: number]: Set<string> };
    requiredOptions: { [stepIndex: number]: Set<string> };
    conflicts: ConstraintConflict[];
    appliedConstraints: ConstraintEvaluationResult[];
    exceptionsApplied: ConstraintException[];
}

export type TabType = "table" | "data" | "button" | "policy";
