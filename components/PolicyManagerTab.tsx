import React, { useState, useCallback, useMemo } from "react";
import { Step, WorkflowConstraint, ConstraintMap, ConditionExpression } from "../lib/types";
import {
    detectSamePriorityConflicts,
    detectCircularReferences,
    recalculatePriorities,
} from "../lib/constraints";
import ConstraintModal from "./ConstraintModal";
import styles from "./PolicyManager.module.css";

// Helper function to render condition expression as human-readable text
function formatConditionExpression(expression: ConditionExpression, steps: Step[]): string {
    if (expression.type === "condition" && expression.condition) {
        const { stepIndex, optionId } = expression.condition;
        const step = steps[stepIndex];
        const option = step?.options.find(opt => opt.id === optionId);
        const stepName = step?.displayName || step?.name || `단계${stepIndex + 1}`;
        const optionName = option?.displayName || option?.name || optionId;
        return `${stepName}: ${optionName}`;
    } else if (expression.type === "group" && expression.children) {
        const childTexts = expression.children.map(child => formatConditionExpression(child, steps));
        const operator = expression.operator === "AND" ? " 그리고 " : " 또는 ";
        return `(${childTexts.join(operator)})`;
    }
    return "";
}


interface PolicyManagerTabProps {
    steps: Step[];
    constraints: ConstraintMap;
    onAddConstraint: (
        constraint: Omit<WorkflowConstraint, "id" | "createdAt">
    ) => void;
    onUpdateConstraint: (
        constraintId: string,
        updates: Partial<WorkflowConstraint>
    ) => void;
    onDeleteConstraint: (constraintId: string) => void;
}

interface PolicyRule {
    id: string;
    ruleId: string;
    targetStepName: string;
    targetOptionNames: string[];
    status: "active" | "inactive" | "unused";
    priority: number;
    hasConflicts: boolean;
    conflictsWith: string[];
    conflictType?: "same-priority" | "circular-reference" | "target-overlap";
    conflictMessage?: string;
    isTargetMissing?: boolean;
    missingReason?: string;
    conditionSummary?: string; // New: summary of conditions for this rule
}

const PolicyManagerTab: React.FC<PolicyManagerTabProps> = ({
    steps,
    constraints,
    onAddConstraint,
    onUpdateConstraint,
    onDeleteConstraint,
}) => {
    // 상태 관리
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<
        "all" | "active" | "inactive" | "unused"
    >("all");
    const [stepFilter, setStepFilter] = useState<string>("all");
    const [priorityFilter, setPriorityFilter] = useState<{
        min: number | null;
        max: number | null;
    }>({ min: null, max: null });
    const [conflictFilter, setConflictFilter] = useState<
        "all" | "conflicts" | "no-conflicts"
    >("all");
    const [selectedRules, setSelectedRules] = useState<string[]>([]);
    const [editingPriority, setEditingPriority] = useState<string | null>(null);
    const [showSimulator, setShowSimulator] = useState(false);
    const [simulatorRule, setSimulatorRule] = useState<PolicyRule | null>(null);
    const [showConstraintModal, setShowConstraintModal] = useState<{
        constraintId?: string;
    } | null>(null);

    // Policy Groups (Zendesk style) - TODO: Implement UI
    // const [policyGroups, setPolicyGroups] = useState<{ [id: string]: { name: string; color: string; isCollapsed: boolean } }>({
    //     default: { name: "기본 정책", color: "#6b7280", isCollapsed: false },
    //     priority: { name: "우선순위 정책", color: "#ef4444", isCollapsed: false },
    //     workflow: { name: "워크플로우 정책", color: "#3b82f6", isCollapsed: false },
    // });
    // const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>("all");

    // 우선순위 정규화 함수: 1부터 연속된 값으로 재정렬
    function normalizePriorities() {
        const normalizedPriorities = recalculatePriorities(constraints);
        Object.entries(normalizedPriorities).forEach(
            ([constraintId, newPriority]) => {
                const currentConstraint = constraints[
                    constraintId
                ] as WorkflowConstraint;
                if (
                    currentConstraint &&
                    currentConstraint.priority !== newPriority
                ) {
                    onUpdateConstraint(constraintId, { priority: newPriority });
                }
            }
        );
    }

    // 정책 규칙으로 변환
    const policyRules = useMemo((): PolicyRule[] => {
        const rules = Object.entries(constraints).map(
            ([id, constraint]) => {
                const targetStep =
                    constraint.targetStepIndex !== undefined
                        ? steps[constraint.targetStepIndex]
                        : undefined;
                
                // Handle both targetOptionIds (array) and targetOptionId (single) for backward compatibility
                let targetOptionIds: string[] = [];
                if (constraint.targetOptionIds && constraint.targetOptionIds.length > 0) {
                    targetOptionIds = constraint.targetOptionIds;
                } else if (constraint.targetOptionId) {
                    targetOptionIds = [constraint.targetOptionId];
                }
                
                const targetOptions = targetOptionIds.map((optId) => {
                    const targetOption = targetStep?.options.find(
                        (opt) => opt.id === optId
                    );
                    return (
                        targetOption?.displayName ||
                        targetOption?.name ||
                        `[삭제된 옵션: ${optId.slice(-8)}]`
                    );
                });

                // If no specific options are targeted, show "모든 옵션"
                if (targetOptions.length === 0 && targetStep) {
                    targetOptions.push("모든 옵션");
                }

                // Check if target step/options exist
                const isTargetMissing =
                    constraint.targetStepIndex !== undefined &&
                    (!targetStep ||
                        (targetOptionIds.length > 0 &&
                            targetOptionIds.some(
                                (optId) =>
                                    !targetStep.options.find(
                                        (opt) => opt.id === optId
                                    )
                            )));

                // Determine missing reason
                let missingReason = "";
                if (isTargetMissing) {
                    missingReason = "대상 단계/옵션이 존재하지 않음";
                }

                // Determine status
                let status: "active" | "inactive" | "unused";
                if (isTargetMissing) {
                    status = "unused";
                } else {
                    status = constraint.isActive ? "active" : "inactive";
                }

                // Generate condition summary
                let conditionSummary = "";
                if (constraint.conditionExpression) {
                    conditionSummary = formatConditionExpression(constraint.conditionExpression, steps);
                } else if (constraint.routeConditions && constraint.routeConditions.length > 0) {
                    const routeTexts = constraint.routeConditions.map(rc => {
                        const step = steps[rc.stepIndex];
                        const option = step?.options.find(opt => opt.id === rc.optionId);
                        const stepName = step?.displayName || step?.name || `단계${rc.stepIndex + 1}`;
                        const optionName = option?.displayName || option?.name || rc.optionId;
                        return `${stepName}: ${optionName}`;
                    });
                    conditionSummary = routeTexts.join(constraint.conditionOperator === "OR" ? " 또는 " : " 그리고 ");
                }

                return {
                    id,
                    ruleId: `POL-${id.slice(-8)}`,
                    targetStepName:
                        targetStep?.displayName ||
                        targetStep?.name ||
                        "[삭제된 단계]",
                    targetOptionNames: targetOptions.length > 0 ? targetOptions : ["대상 없음"],
                    status,
                    priority: constraint.priority || 50,
                    hasConflicts: false,
                    conflictsWith: [] as string[],
                    conflictType: undefined as
                        | "same-priority"
                        | "circular-reference"
                        | "target-overlap"
                        | undefined,
                    conflictMessage: undefined as string | undefined,
                    isTargetMissing,
                    missingReason,
                    conditionSummary,
                };
            }
        );

        // 동일 우선순위 충돌 감지 (unused 정책 제외)
        const activeConstraintsForConflict = Object.values(constraints).filter(
            (c) => {
                const rule = rules.find((r) => r.id === c.id);
                return rule && rule.status !== "unused" && c.isActive;
            }
        );
        const samePriorityConflicts = detectSamePriorityConflicts(
            Object.fromEntries(
                activeConstraintsForConflict.map((c) => [c.id, c])
            )
        );

        // 순환 참조 감지 (unused 정책 제외)
        const circularConflicts = detectCircularReferences(
            activeConstraintsForConflict
        );

        const allConflicts = [...samePriorityConflicts, ...circularConflicts];

        // 충돌 정보를 규칙에 반영
        allConflicts.forEach((conflict) => {
            const isCircular = conflict.targetStep === -1; // Circular reference indicator
            const conflictType = isCircular
                ? "circular-reference"
                : "same-priority";

            conflict.conflictingConstraints.forEach((constraint) => {
                const rule = rules.find((r) => r.id === constraint.id);
                if (rule) {
                    rule.hasConflicts = true;
                    rule.conflictType = conflictType;
                    rule.conflictMessage = conflict.reason;

                    const otherRuleIds = conflict.conflictingConstraints
                        .filter((c) => c.id !== constraint.id)
                        .map((c) => rules.find((r) => r.id === c.id)?.ruleId)
                        .filter(Boolean) as string[];
                    rule.conflictsWith.push(...otherRuleIds);
                }
            });
        });

        return rules;
    }, [constraints, steps]);

    // 충돌 통계 계산
    const conflictStats = useMemo(() => {
        const samePriorityCount = policyRules.filter(
            (r) => r.conflictType === "same-priority"
        ).length;
        const circularRefCount = policyRules.filter(
            (r) => r.conflictType === "circular-reference"
        ).length;
        const totalConflicts = policyRules.filter((r) => r.hasConflicts).length;
        const unusedCount = policyRules.filter(
            (r) => r.status === "unused"
        ).length;

        return {
            samePriorityCount,
            circularRefCount,
            totalConflicts,
            unusedCount,
        };
    }, [policyRules]);

    // 필터링된 규칙들
    const filteredRules = useMemo(() => {
        return policyRules
            .filter((rule) => {
                // 검색 필터
                if (searchQuery) {
                    const query = searchQuery.toLowerCase();
                    if (
                        !rule.ruleId.toLowerCase().includes(query) &&
                        !rule.targetStepName.toLowerCase().includes(query) &&
                        !(rule.conditionSummary?.toLowerCase().includes(query))
                    ) {
                        return false;
                    }
                }

                // 상태 필터
                if (statusFilter !== "all" && rule.status !== statusFilter) {
                    return false;
                }

                // 단계 필터
                if (stepFilter !== "all") {
                    if (!rule.targetStepName.includes(stepFilter)) {
                        return false;
                    }
                }

                // 우선순위 필터
                if (
                    priorityFilter.min !== null &&
                    rule.priority < priorityFilter.min
                ) {
                    return false;
                }
                if (
                    priorityFilter.max !== null &&
                    rule.priority > priorityFilter.max
                ) {
                    return false;
                }

                // 충돌 필터
                if (conflictFilter !== "all") {
                    if (conflictFilter === "conflicts" && !rule.hasConflicts)
                        return false;
                    if (conflictFilter === "no-conflicts" && rule.hasConflicts)
                        return false;
                }

                return true;
            })
            .sort((a, b) => b.priority - a.priority); // 우선순위 높은 순으로 정렬
    }, [
        policyRules,
        searchQuery,
        statusFilter,
        stepFilter,
        priorityFilter,
        conflictFilter,
    ]);

    // 사용 가능한 단계들 추출 (필터링용)
    const availableSteps = useMemo(() => {
        // 고유 단계 목록 수집
        const stepNames = new Set<string>();
        policyRules.forEach((rule) => {
            stepNames.add(rule.targetStepName);
        });
        return Array.from(stepNames).sort();
    }, [policyRules]);

    // 이벤트 핸들러들
    const handleRuleSelect = useCallback((ruleId: string) => {
        setSelectedRules((prev) =>
            prev.includes(ruleId)
                ? prev.filter((id) => id !== ruleId)
                : [...prev, ruleId]
        );
    }, []);

    const handleSelectAll = useCallback(() => {
        if (selectedRules.length === filteredRules.length) {
            setSelectedRules([]);
        } else {
            setSelectedRules(filteredRules.map((rule) => rule.id));
        }
    }, [selectedRules, filteredRules]);

    const handlePriorityChange = useCallback(
        (ruleId: string, newPriority: number) => {
            if (newPriority > 0 && newPriority <= 999) {
                onUpdateConstraint(ruleId, { priority: newPriority });
            }
        },
        [onUpdateConstraint]
    );

    const handleStatusToggle = useCallback(
        (ruleId: string) => {
            const rule = policyRules.find((r) => r.id === ruleId);
            if (rule && rule.status !== "unused") {
                onUpdateConstraint(ruleId, {
                    isActive: rule.status !== "active",
                });
            }
        },
        [policyRules, onUpdateConstraint]
    );

    const handleDeleteRule = useCallback(
        (ruleId: string) => {
            if (window.confirm("이 규칙을 삭제하시겠습니까?")) {
                onDeleteConstraint(ruleId);
                // Recalculate priorities after deletion
                setTimeout(() => {
                    const newPriorities = recalculatePriorities(constraints, [
                        ruleId,
                    ]);
                    Object.entries(newPriorities).forEach(
                        ([constraintId, newPriority]) => {
                            const currentConstraint = constraints[
                                constraintId
                            ] as WorkflowConstraint;
                            if (
                                currentConstraint &&
                                currentConstraint.priority !== newPriority
                            ) {
                                onUpdateConstraint(constraintId, {
                                    priority: newPriority,
                                });
                            }
                        }
                    );
                }, 0);
            }
        },
        [constraints, onDeleteConstraint, onUpdateConstraint]
    );

    const handleBulkDelete = useCallback(() => {
        if (
            selectedRules.length > 0 &&
            window.confirm(
                `선택된 ${selectedRules.length}개 규칙을 삭제하시겠습니까?`
            )
        ) {
            selectedRules.forEach((ruleId) => onDeleteConstraint(ruleId));
            setSelectedRules([]);
            // Recalculate priorities after bulk deletion
            setTimeout(() => {
                const newPriorities = recalculatePriorities(
                    constraints,
                    selectedRules
                );
                Object.entries(newPriorities).forEach(
                    ([constraintId, newPriority]) => {
                        const currentConstraint = constraints[
                            constraintId
                        ] as WorkflowConstraint;
                        if (
                            currentConstraint &&
                            currentConstraint.priority !== newPriority
                        ) {
                            onUpdateConstraint(constraintId, {
                                priority: newPriority,
                            });
                        }
                    }
                );
            }, 0);
        }
    }, [selectedRules, constraints, onDeleteConstraint, onUpdateConstraint]);

    const handleBulkStatusChange = useCallback(
        (newStatus: "active" | "inactive") => {
            selectedRules.forEach((ruleId) => {
                const rule = policyRules.find((r) => r.id === ruleId);
                if (rule && rule.status !== "unused") {
                    onUpdateConstraint(ruleId, {
                        isActive: newStatus === "active",
                    });
                }
            });
            setSelectedRules([]);
        },
        [selectedRules, policyRules, onUpdateConstraint]
    );

    // 시뮬레이션 핸들러
    const handleSimulate = useCallback((rule: PolicyRule) => {
        setSimulatorRule(rule);
        setShowSimulator(true);
    }, []);

    const handleCloseSimulator = useCallback(() => {
        setShowSimulator(false);
        setSimulatorRule(null);
    }, []);

    // 편집 핸들러
    const handleEditRule = useCallback(
        (ruleId: string) => {
            const constraint = constraints[ruleId];
            if (constraint) {
                setShowConstraintModal({
                    constraintId: ruleId,
                });
            }
        },
        [constraints]
    );

    return (
        <div className={styles.policyManagerTab}>
            <div className={styles.policyManagerTabContent}>
                {/* Quick Start Guide */}
                {policyRules.length === 0 && (
                    <div className={styles.quickStartGuide}>
                        <h3>🚀 정책 관리 시작하기</h3>
                        <p>정책을 생성하여 워크플로우 옵션들을 제어할 수 있습니다.</p>
                        <div className={styles.quickStartSteps}>
                            <div className={styles.quickStartStep}>
                                <span className={styles.stepNumber}>1</span>
                                <span>상단의 &quot;+ 새 규칙&quot; 버튼을 클릭하세요</span>
                            </div>
                            <div className={styles.quickStartStep}>
                                <span className={styles.stepNumber}>2</span>
                                <span>조건과 대상을 설정하세요</span>
                            </div>
                            <div className={styles.quickStartStep}>
                                <span className={styles.stepNumber}>3</span>
                                <span>테이블 탭에서 정책 효과를 확인하세요</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* 필터 및 검색 */}
                <div className={styles.filtersContainer}>
                    <div className={styles.searchContainer}>
                        <input
                            type="text"
                            placeholder="규칙 검색..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={styles.searchInput}
                        />
                    </div>

                    <div className={styles.filterContainer}>
                        <select
                            value={statusFilter}
                            onChange={(e) =>
                                setStatusFilter(
                                    e.target.value as
                                        | "all"
                                        | "active"
                                        | "inactive"
                                        | "unused"
                                )
                            }
                            className={styles.filterSelect}
                        >
                            <option value="all">모든 상태</option>
                            <option value="active">활성</option>
                            <option value="inactive">비활성</option>
                            <option value="unused">사용 안함</option>
                        </select>
                    </div>

                    <div className={styles.filterContainer}>
                        <select
                            value={stepFilter}
                            onChange={(e) => setStepFilter(e.target.value)}
                            className={styles.filterSelect}
                        >
                            <option value="all">모든 단계</option>
                            {availableSteps.map((stepName) => (
                                <option key={stepName} value={stepName}>
                                    {stepName}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.filterContainer}>
                        <div className={styles.priorityRangeFilter}>
                            <label>우선순위:</label>
                            <input
                                type="number"
                                placeholder="최소"
                                min="1"
                                max="999"
                                value={priorityFilter.min || ""}
                                onChange={(e) =>
                                    setPriorityFilter((prev) => ({
                                        ...prev,
                                        min: e.target.value
                                            ? parseInt(e.target.value)
                                            : null,
                                    }))
                                }
                                className={styles.priorityInput}
                            />
                            <span>~</span>
                            <input
                                type="number"
                                placeholder="최대"
                                min="1"
                                max="999"
                                value={priorityFilter.max || ""}
                                onChange={(e) =>
                                    setPriorityFilter((prev) => ({
                                        ...prev,
                                        max: e.target.value
                                            ? parseInt(e.target.value)
                                            : null,
                                    }))
                                }
                                className={styles.priorityInput}
                            />
                        </div>
                    </div>

                    <div className={styles.filterContainer}>
                        <select
                            value={conflictFilter}
                            onChange={(e) =>
                                setConflictFilter(
                                    e.target.value as
                                        | "all"
                                        | "conflicts"
                                        | "no-conflicts"
                                )
                            }
                            className={styles.filterSelect}
                        >
                            <option value="all">모든 규칙</option>
                            <option value="conflicts">충돌 있음</option>
                            <option value="no-conflicts">충돌 없음</option>
                        </select>
                    </div>

                    <div className={styles.filterContainer}>
                        <button
                            onClick={() => {
                                setSearchQuery("");
                                setStatusFilter("all");
                                setStepFilter("all");
                                setPriorityFilter({ min: null, max: null });
                                setConflictFilter("all");
                            }}
                            className={styles.clearFiltersButton}
                            title="모든 필터 초기화"
                        >
                            🔄 초기화
                        </button>
                        <button
                            onClick={() => setShowConstraintModal({})}
                            className={styles.addButton}
                        >
                            + 새 규칙
                        </button>
                    </div>

                    {selectedRules.length > 0 && (
                        <div className={styles.bulkActions}>
                            <button
                                onClick={() => handleBulkStatusChange("active")}
                                className={styles.bulkButton}
                            >
                                활성화
                            </button>
                            <button
                                onClick={() =>
                                    handleBulkStatusChange("inactive")
                                }
                                className={styles.bulkButton}
                            >
                                비활성화
                            </button>
                            <button
                                onClick={handleBulkDelete}
                                className={styles.bulkButtonDanger}
                            >
                                삭제
                            </button>
                        </div>
                    )}
                </div>

                {/* 오류 메시지 표시 */}
                {conflictStats.totalConflicts > 0 && (
                    <div className={styles.errorMessageBox}>
                        <div className={styles.errorTitle}>
                            ⚠️ 정책 충돌 감지됨
                        </div>
                        <ul className={styles.errorList}>
                            {conflictStats.samePriorityCount > 0 && (
                                <li>
                                    동일 우선순위 충돌:{" "}
                                    {conflictStats.samePriorityCount}개 규칙
                                </li>
                            )}
                            {conflictStats.circularRefCount > 0 && (
                                <li>
                                    순환 참조 감지:{" "}
                                    {conflictStats.circularRefCount}개 규칙
                                </li>
                            )}
                        </ul>
                        <p
                            style={{
                                margin: "8px 0 0 0",
                                fontSize: "12px",
                                color: "#6b7280",
                            }}
                        >
                            충돌이 있는 규칙들이 빨간색으로 표시되어 있습니다.
                            우선순위를 조정하거나 규칙을 수정해 주세요.
                        </p>
                    </div>
                )}

                {/* 통계 */}
                <div className={styles.statsContainer}>
                    <div className={styles.stat}>
                        <span className={styles.statLabel}>전체:</span>
                        <span className={styles.statValue}>
                            {policyRules.length}
                        </span>
                    </div>
                    <div className={styles.stat}>
                        <span className={styles.statLabel}>활성:</span>
                        <span className={styles.statValue}>
                            {
                                policyRules.filter((r) => r.status === "active")
                                    .length
                            }
                        </span>
                    </div>
                    <div className={styles.stat}>
                        <span className={styles.statLabel}>비활성:</span>
                        <span className={styles.statValue}>
                            {
                                policyRules.filter(
                                    (r) => r.status === "inactive"
                                ).length
                            }
                        </span>
                    </div>
                    <div className={styles.stat}>
                        <span className={styles.statLabel}>사용 안함:</span>
                        <span className={styles.statValue}>
                            {conflictStats.unusedCount}
                        </span>
                    </div>
                    <div className={styles.stat}>
                        <span className={styles.statLabel}>충돌:</span>
                        <span className={styles.statValue}>
                            {policyRules.filter((r) => r.hasConflicts).length}
                        </span>
                    </div>
                    {(searchQuery ||
                        statusFilter !== "all" ||
                        stepFilter !== "all" ||
                        priorityFilter.min !== null ||
                        priorityFilter.max !== null ||
                        conflictFilter !== "all") && (
                        <div className={styles.stat}>
                            <span className={styles.statLabel}>
                                필터링된 결과:
                            </span>
                            <span className={styles.statValue}>
                                {filteredRules.length}
                            </span>
                        </div>
                    )}
                </div>

                {/* 테이블 */}
                <div className={styles.tableContainer}>
                    <table className={styles.policyTable}>
                        <thead>
                            <tr>
                                <th>
                                    <input
                                        type="checkbox"
                                        checked={
                                            selectedRules.length ===
                                                filteredRules.length &&
                                            filteredRules.length > 0
                                        }
                                        onChange={handleSelectAll}
                                    />
                                </th>
                                <th>규칙 ID</th>
                                <th>조건</th>
                                <th>대상 단계</th>
                                <th>대상 옵션들</th>
                                <th>상태</th>
                                <th>우선순위</th>
                                <th>작업</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRules.map((rule) => (
                                <tr
                                    key={rule.id}
                                    className={`
                    ${styles.tableRow} 
                    ${selectedRules.includes(rule.id) ? styles.selected : ""} 
                    ${rule.hasConflicts ? styles.hasConflicts : ""}
                    ${
                        rule.conflictType === "circular-reference"
                            ? styles.hasCircularConflicts
                            : ""
                    }
                    ${rule.status === "unused" ? styles.unusedPolicy : ""}
                  `}
                                    title={
                                        rule.status === "unused"
                                            ? `사용 안함: ${rule.missingReason}`
                                            : rule.hasConflicts
                                            ? `충돌: ${
                                                  rule.conflictMessage ||
                                                  `충돌 규칙: ${rule.conflictsWith.join(
                                                      ", "
                                                  )}`
                                              }`
                                            : undefined
                                    }
                                >
                                    <td>
                                        <input
                                            type="checkbox"
                                            checked={selectedRules.includes(
                                                rule.id
                                            )}
                                            onChange={() =>
                                                handleRuleSelect(rule.id)
                                            }
                                        />
                                    </td>
                                    <td className={styles.ruleIdCell}>
                                        <span className={styles.ruleId}>
                                            {rule.ruleId}
                                        </span>
                                        {rule.hasConflicts && (
                                            <>
                                                {rule.conflictType ===
                                                "circular-reference" ? (
                                                    <span
                                                        className={
                                                            styles.circularRefBadge
                                                        }
                                                        title={
                                                            rule.conflictMessage
                                                        }
                                                    >
                                                        순환 참조
                                                    </span>
                                                ) : (
                                                    <span
                                                        className={
                                                            styles.conflictBadge
                                                        }
                                                        title={
                                                            rule.conflictMessage
                                                        }
                                                    >
                                                        충돌
                                                    </span>
                                                )}
                                            </>
                                        )}
                                    </td>
                                    <td className={styles.conditionCell}>
                                        <span title={rule.conditionSummary || "조건 없음"}>
                                            {rule.conditionSummary || "항상 적용"}
                                        </span>
                                    </td>
                                    <td>{rule.targetStepName}</td>
                                    <td>
                                        <div className={styles.optionsList}>
                                            {rule.targetOptionNames.map(
                                                (option, index) => (
                                                    <span
                                                        key={index}
                                                        className={
                                                            option === "대상 없음" 
                                                                ? styles.noOptionsText
                                                                : styles.optionTag
                                                        }
                                                    >
                                                        {option}
                                                    </span>
                                                )
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <button
                                            onClick={() =>
                                                handleStatusToggle(rule.id)
                                            }
                                            className={`${styles.statusBadge} ${
                                                styles[rule.status]
                                            }`}
                                            disabled={rule.status === "unused"}
                                            title={
                                                rule.status === "unused"
                                                    ? rule.missingReason
                                                    : undefined
                                            }
                                        >
                                            {rule.status === "active"
                                                ? "활성"
                                                : rule.status === "inactive"
                                                ? "비활성"
                                                : "사용 안함"}
                                        </button>
                                    </td>
                                    <td>
                                        {editingPriority === rule.id ? (
                                            <input
                                                type="number"
                                                min="1"
                                                max="100"
                                                value={rule.priority}
                                                onChange={(e) => {
                                                    const newPriority =
                                                        parseInt(
                                                            e.target.value
                                                        );
                                                    if (!isNaN(newPriority)) {
                                                        // Enforce 1-100 range
                                                        const clampedValue = Math.min(100, Math.max(1, newPriority));
                                                        handlePriorityChange(
                                                            rule.id,
                                                            clampedValue
                                                        );
                                                    }
                                                }}
                                                onBlur={() =>
                                                    setEditingPriority(null)
                                                }
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") {
                                                        setEditingPriority(
                                                            null
                                                        );
                                                    }
                                                }}
                                                className={styles.priorityInput}
                                                autoFocus
                                            />
                                        ) : (
                                            <span
                                                className={styles.priority}
                                                onClick={() =>
                                                    setEditingPriority(rule.id)
                                                }
                                                title="클릭하여 편집"
                                            >
                                                {rule.priority}
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        <div className={styles.actionButtons}>
                                            <button
                                                onClick={() =>
                                                    handleSimulate(rule)
                                                }
                                                className={styles.actionButton}
                                                title="시뮬레이션"
                                            >
                                                🎯
                                            </button>
                                            <button
                                                onClick={() =>
                                                    handleEditRule(rule.id)
                                                }
                                                className={styles.actionButton}
                                                title="편집"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                onClick={() =>
                                                    handleDeleteRule(rule.id)
                                                }
                                                className={
                                                    styles.actionButtonDanger
                                                }
                                                title="삭제"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {filteredRules.length === 0 && (
                        <div className={styles.emptyState}>
                            <p>표시할 규칙이 없습니다.</p>
                        </div>
                    )}
                </div>

                {/* 시뮬레이션 모달 */}
                {showSimulator && simulatorRule && (
                    <div className={styles.simulatorOverlay}>
                        <div className={styles.simulatorModal}>
                            <div className={styles.simulatorHeader}>
                                <h3>정책 시뮬레이션: {simulatorRule.ruleId}</h3>
                                <button
                                    onClick={handleCloseSimulator}
                                    className={styles.closeButton}
                                >
                                    ✕
                                </button>
                            </div>
                            <div className={styles.simulatorContent}>
                                <div className={styles.simulatorSection}>
                                    <h4>규칙 정보</h4>
                                    <p>
                                        <strong>대상:</strong>{" "}
                                        {simulatorRule.targetStepName} →{" "}
                                        {simulatorRule.targetOptionNames.join(
                                            ", "
                                        )}
                                    </p>
                                    <p>
                                        <strong>우선순위:</strong>{" "}
                                        {simulatorRule.priority}
                                    </p>
                                    <p>
                                        <strong>상태:</strong>{" "}
                                        {simulatorRule.status === "active"
                                            ? "활성"
                                            : simulatorRule.status ===
                                              "inactive"
                                            ? "비활성"
                                            : "사용 안함"}
                                    </p>
                                </div>
                                <div className={styles.simulatorSection}>
                                    <h4>시뮬레이션 결과</h4>
                                    {simulatorRule.status === "unused" ? (
                                        <div
                                            className={styles.simulatorWarning}
                                        >
                                            <p>
                                                <strong>
                                                    ⚠️ 이 정책은 현재 사용할 수
                                                    없습니다.
                                                </strong>
                                            </p>
                                            <p>
                                                <strong>이유:</strong>{" "}
                                                {simulatorRule.missingReason}
                                            </p>
                                            <p>
                                                이 정책을 적용하려면 누락된
                                                단계/옵션을 다시 추가하고 정책을
                                                수동으로 다시 매핑해야 합니다.
                                            </p>
                                        </div>
                                    ) : simulatorRule.status === "inactive" ? (
                                        <div className={styles.simulatorInfo}>
                                            <p>
                                                <strong>
                                                    ℹ️ 이 정책은 현재 비활성
                                                    상태입니다.
                                                </strong>
                                            </p>
                                            <p>
                                                이 정책을 적용하려면 먼저
                                                활성화해야 합니다.
                                            </p>
                                        </div>
                                    ) : simulatorRule.hasConflicts ? (
                                        <div className={styles.simulatorError}>
                                            <p>
                                                <strong>
                                                    ❌ 이 정책은 다른 정책과
                                                    충돌합니다.
                                                </strong>
                                            </p>
                                            <p>
                                                <strong>충돌 이유:</strong>{" "}
                                                {simulatorRule.conflictMessage}
                                            </p>
                                            <p>
                                                <strong>충돌 정책:</strong>{" "}
                                                {simulatorRule.conflictsWith.join(
                                                    ", "
                                                )}
                                            </p>
                                            <p>
                                                이 정책이 적용되려면 충돌을
                                                해결해야 합니다.
                                            </p>
                                        </div>
                                    ) : (
                                        <div
                                            className={styles.simulatorSuccess}
                                        >
                                            <p>
                                                <strong>
                                                    ✅ 이 정책은 정상적으로
                                                    적용됩니다.
                                                </strong>
                                            </p>
                                            {simulatorRule.conditionSummary && (
                                                <p>
                                                    조건: {simulatorRule.conditionSummary}
                                                </p>
                                            )}
                                            <p>적용되는 효과:</p>
                                            <ul>
                                                {simulatorRule.targetOptionNames.map(
                                                    (option, index) => (
                                                        <li key={index}>
                                                            &quot;
                                                            {
                                                                simulatorRule.targetStepName
                                                            }
                                                            &quot; 단계의 &quot;
                                                            {option}&quot;
                                                            옵션이 영향을
                                                            받습니다.
                                                        </li>
                                                    )
                                                )}
                                            </ul>
                                            <p>
                                                우선순위:{" "}
                                                {simulatorRule.priority}{" "}
                                                (낮을수록 먼저 적용됨)
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className={styles.simulatorFooter}>
                                <button
                                    onClick={handleCloseSimulator}
                                    className={styles.primaryButton}
                                >
                                    닫기
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 편집 모달 */}
                {showConstraintModal && (
                    <ConstraintModal
                        steps={steps}
                        constraints={Object.values(constraints)}
                        selectedPath={{}}
                        constraintId={showConstraintModal.constraintId}
                        onClose={() => setShowConstraintModal(null)}
                        onAddConstraint={(constraint) => {
                            onAddConstraint(constraint);
                            setTimeout(() => normalizePriorities(), 0);
                            setShowConstraintModal(null);
                        }}
                        onUpdateConstraint={(constraintId, updates) => {
                            onUpdateConstraint(constraintId, updates);
                            setTimeout(() => normalizePriorities(), 0);
                            setShowConstraintModal(null);
                        }}
                        onDeleteConstraint={(constraintId) => {
                            onDeleteConstraint(constraintId);
                            setShowConstraintModal(null);
                        }}
                    />
                )}
            </div>
        </div>
    );
};

export default PolicyManagerTab;
