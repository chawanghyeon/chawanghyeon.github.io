class StepManager {
    constructor() {
        this.steps = new Map();
        this.stepCounter = 0;
        this.rootSteps = [];
        this.nextId = 1;
        this.storageKey = 'stepManager_data';
        this.currentTab = 'design';
        this.init();
    }

    // 스크롤 위치 보존 헬퍼 함수
    preserveScrollPosition(callback) {
        const scrollX = window.scrollX;
        const scrollY = window.scrollY;
        
        callback();
        
        // 스크롤 위치 복원
        requestAnimationFrame(() => {
            window.scrollTo(scrollX, scrollY);
        });
        
        setTimeout(() => {
            window.scrollTo(scrollX, scrollY);
        }, 10);
    }

    init() {
        this.loadData();
        this.initTabs();
        
        const addStepBtn = document.getElementById('addStepBtn');
        if (addStepBtn) {
            addStepBtn.addEventListener('click', () => this.addRootStep());
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                this.addRootStep();
            }
        });

        const importFile = document.getElementById('importFile');
        if (importFile) {
            importFile.addEventListener('change', (e) => this.importFromJSON(e));
        }

        this.renderSteps();
        this.updateVisualization();
        this.updateDataInfo();
    }

    // 탭 초기화
    initTabs() {
        const tabs = document.querySelectorAll('.tab-btn');
        const contents = document.querySelectorAll('.tab-content');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.getAttribute('data-tab');
                this.switchTab(targetTab);
            });
        });
    }

    // 탭 전환
    switchTab(targetTab) {
        this.preserveScrollPosition(() => {
            const tabs = document.querySelectorAll('.tab-btn');
            const contents = document.querySelectorAll('.tab-content');

            tabs.forEach(tab => tab.classList.remove('active'));
            contents.forEach(content => content.classList.remove('active'));

            const activeTab = document.querySelector(`[data-tab="${targetTab}"]`);
            const activeContent = document.getElementById(`${targetTab}-tab`);

            if (activeTab && activeContent) {
                activeTab.classList.add('active');
                activeContent.classList.add('active');
                this.currentTab = targetTab;

                if (targetTab === 'visualization') {
                    this.updateVisualization();
                } else if (targetTab === 'table') {
                    this.updateTableVisualization();
                } else if (targetTab === 'data') {
                    this.updateDataInfo();
                }
            }
        });
    }

    // 고유 ID 생성
    generateStepId() {
        return 'step_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // 루트 단계 추가
    addRootStep(event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        
        this.preserveScrollPosition(() => {
            const stepId = this.generateStepId();
            this.stepCounter++;

            const step = {
                id: stepId,
                name: this.getStepSuggestion(this.stepCounter),
                options: [
                    {
                        id: `${stepId}_option_1`,
                        name: '확인',
                        nextSteps: [],
                        isActive: true,
                        isCollapsed: false
                    }
                ],
                parentStepId: null,
                parentOptionId: null,
                isActive: true,
                isCollapsed: false
            };

            this.steps.set(stepId, step);
            this.rootSteps.push(stepId);
            
            this.renderSteps();
            this.updateVisualization();
            this.saveData();
        });
    }    // 특정 옵션 다음에 단계 추가
    addNextStep(parentStepId, parentOptionId, event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        
        this.preserveScrollPosition(() => {
            const stepId = this.generateStepId();
            const parentStep = this.steps.get(parentStepId);
            const parentOption = parentStep.options.find(opt => opt.id === parentOptionId);
            const stepNumber = this.stepCounter + 1;
            this.stepCounter++;
            
            const step = {
                id: stepId,
                name: this.getStepSuggestion(stepNumber),
                options: [
                    {
                        id: `${stepId}_option_1`,
                        name: '확인',
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

            this.steps.set(stepId, step);
            parentOption.nextSteps.push(stepId);
            
            this.renderSteps();
            this.updateVisualization();
            this.saveData();
        });
    }

    // 단계 이름 업데이트
    updateStepName(stepId, newName) {
        const step = this.steps.get(stepId);
        if (step) {
            step.name = newName.trim() || `단계 ${this.stepCounter}`;
            this.updateVisualization();
            this.saveData();
        }
    }

    // 옵션 이름 업데이트
    updateOptionName(stepId, optionId, newName) {
        const step = this.steps.get(stepId);
        if (step) {
            const option = step.options.find(opt => opt.id === optionId);
            if (option) {
                option.name = newName.trim() || '옵션';
                this.updateVisualization();
                this.saveData();
            }
        }
    }

    // 단계 삭제
    deleteStep(stepId, event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        
        if (!confirm('이 단계와 모든 하위 단계가 삭제됩니다. 계속하시겠습니까?')) {
            return;
        }

        this.preserveScrollPosition(() => {
            const step = this.steps.get(stepId);
            if (!step) return;

            // 하위 단계들 재귀적으로 삭제
            step.options.forEach(option => {
                option.nextSteps.forEach(nextStepId => {
                    this.deleteStep(nextStepId);
                });
            });

            // 부모에서 참조 제거
            if (step.parentStepId && step.parentOptionId) {
                const parentStep = this.steps.get(step.parentStepId);
                if (parentStep) {
                    const parentOption = parentStep.options.find(opt => opt.id === step.parentOptionId);
                    if (parentOption) {
                        const index = parentOption.nextSteps.indexOf(stepId);
                        if (index > -1) {
                            parentOption.nextSteps.splice(index, 1);
                        }
                    }
                }
            } else {
                // 루트 단계인 경우
                const rootIndex = this.rootSteps.indexOf(stepId);
                if (rootIndex > -1) {
                    this.rootSteps.splice(rootIndex, 1);
                }
            }

            this.steps.delete(stepId);
            this.renderSteps();
            this.updateVisualization();
            this.saveData();
        });
    }

    // 옵션 삭제
    deleteOption(stepId, optionId, event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        
        this.preserveScrollPosition(() => {
            const step = this.steps.get(stepId);
            if (step && step.options.length > 1) {
                const optionIndex = step.options.findIndex(opt => opt.id === optionId);
                if (optionIndex > -1) {
                    const option = step.options[optionIndex];
                    
                    // 하위 단계들도 삭제
                    option.nextSteps.forEach(nextStepId => {
                        this.deleteStep(nextStepId);
                    });

                    step.options.splice(optionIndex, 1);
                    this.renderSteps();
                    this.updateVisualization();
                    this.saveData();
                }
            }
        });
    }

    // 옵션 추가
    addOption(stepId, event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        
        this.preserveScrollPosition(() => {
            const step = this.steps.get(stepId);
            if (step) {
                const optionNumber = step.options.length + 1;
                const optionId = `${stepId}_option_${optionNumber}`;
                
                const optionSuggestions = ['예', '아니오', '확인', '취소', '계속', '중단', '동의', '거부'];
                const optionName = optionNumber <= optionSuggestions.length 
                    ? optionSuggestions[optionNumber - 1] 
                    : `옵션 ${optionNumber}`;
                
                step.options.push({
                    id: optionId,
                    name: optionName,
                    nextSteps: [],
                    isActive: true,
                    isCollapsed: false
                });
                
                this.renderSteps();
                this.updateVisualization();
                this.saveData();
            }
        });
    }

    // 단계 활성화/비활성화 토글
    toggleStepActive(stepId, isActive) {
        this.preserveScrollPosition(() => {
            const step = this.steps.get(stepId);
            if (step) {
                step.isActive = isActive;
                this.renderSteps();
                this.updateVisualization();
                this.saveData();
            }
        });
    }

    // 옵션 활성화/비활성화 토글
    toggleOptionActive(stepId, optionId, isActive) {
        this.preserveScrollPosition(() => {
            const step = this.steps.get(stepId);
            if (step) {
                const option = step.options.find(opt => opt.id === optionId);
                if (option) {
                    option.isActive = isActive;
                    this.renderSteps();
                    this.updateVisualization();
                    this.saveData();
                }
            }
        });
    }

    // 단계 접기/펼치기 토글
    toggleStepCollapse(stepId, event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        
        this.preserveScrollPosition(() => {
            const step = this.steps.get(stepId);
            if (step) {
                step.isCollapsed = !step.isCollapsed;
                this.renderSteps();
                this.saveData();
            }
        });
    }

    // 옵션 접기/펼치기 토글
    toggleOptionCollapse(stepId, optionId, event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        
        this.preserveScrollPosition(() => {
            const step = this.steps.get(stepId);
            if (step) {
                const option = step.options.find(opt => opt.id === optionId);
                if (option) {
                    option.isCollapsed = !option.isCollapsed;
                    this.renderSteps();
                    this.saveData();
                }
            }
        });
    }

    // 단계 제안 이름
    getStepSuggestion(stepNumber) {
        const suggestions = [
            '사용자 인증', '메뉴 선택', '정보 입력', '결제 방법 선택', 
            '주문 확인', '배송지 입력', '최종 확인', '처리 완료'
        ];
        return stepNumber <= suggestions.length 
            ? suggestions[stepNumber - 1] 
            : `단계 ${stepNumber}`;
    }

    // 단계 렌더링 - 트리 형식 (왼쪽에서 오른쪽으로)
    renderSteps() {
        const container = document.getElementById('stepsContainer');
        if (!container) return;
        
        container.innerHTML = '';

        if (this.rootSteps.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🎯</div>
                    <h3>워크플로우가 비어있습니다</h3>
                    <p>첫 번째 단계를 추가하여 프로세스를 설계해보세요!</p>
                    <button type="button" onclick="stepManager.addRootStep(event)" class="btn-primary">첫 단계 추가</button>
                </div>
            `;
            return;
        }

        // 트리 컨테이너 생성
        const treeContainer = document.createElement('div');
        treeContainer.className = 'tree-container';

        // 각 루트 단계를 트리 노드로 렌더링
        this.rootSteps.forEach((stepId, index) => {
            const step = this.steps.get(stepId);
            if (step) {
                const treeNode = this.createTreeNode(step, 0);
                treeContainer.appendChild(treeNode);
                
                // 루트 단계들 사이에 구분선 추가
                if (index < this.rootSteps.length - 1) {
                    const divider = document.createElement('div');
                    divider.className = 'tree-divider';
                    treeContainer.appendChild(divider);
                }
            }
        });

        container.appendChild(treeContainer);

        // 새 루트 단계 추가 버튼
        const addRootButton = document.createElement('div');
        addRootButton.className = 'add-root-step';
        addRootButton.innerHTML = `
            <button type="button" onclick="stepManager.addRootStep(event)" class="btn-add-step">
                <span class="add-icon">+</span>
                새 단계 추가
            </button>
        `;
        container.appendChild(addRootButton);
    }

    // 트리 노드 생성 (왼쪽에서 오른쪽으로 확장)
    createTreeNode(step, level) {
        const treeNode = document.createElement('div');
        treeNode.className = `tree-node ${step.isActive ? '' : 'inactive'} level-${level}`;
        treeNode.setAttribute('data-step-id', step.id);

        // 단계 박스
        const stepBox = this.createStepBox(step, level);
        treeNode.appendChild(stepBox);

        // 옵션들과 하위 단계들 (접혀있지 않은 경우만)
        if (step.options.length > 0 && !step.isCollapsed) {
            const optionsContainer = document.createElement('div');
            optionsContainer.className = 'options-container';

            step.options.forEach((option, index) => {
                const optionBranch = this.createOptionBranch(step, option, index, level);
                optionsContainer.appendChild(optionBranch);
            });

            treeNode.appendChild(optionsContainer);
        }

        return treeNode;
    }

    // 단계 박스 생성
    createStepBox(step, level) {
        const stepBox = document.createElement('div');
        stepBox.className = 'step-box';

        const hasOptions = step.options && step.options.length > 0;
        const collapseButton = hasOptions ? `
            <button type="button" class="collapse-btn ${step.isCollapsed ? 'collapsed' : 'expanded'}" 
                    onclick="stepManager.toggleStepCollapse('${step.id}', event)" 
                    title="${step.isCollapsed ? '펼치기' : '접기'}">
                ${step.isCollapsed ? '▶' : '▼'}
            </button>
        ` : '';

        stepBox.innerHTML = `
            <div class="step-header">
                <div class="step-controls">
                    <span class="step-number">${this.getStepDisplayNumber(step.id, level)}</span>
                    ${collapseButton}
                    <label class="checkbox-wrapper">
                        <input type="checkbox" ${step.isActive ? 'checked' : ''} 
                               onchange="stepManager.toggleStepActive('${step.id}', this.checked)"
                               class="step-checkbox">
                        <span class="checkbox-text">활성화</span>
                    </label>
                </div>
                <div class="step-actions">
                    <button type="button" onclick="stepManager.addOption('${step.id}', event)" 
                            class="btn-secondary btn-small" 
                            title="선택지 추가">+ 선택지</button>
                    <button type="button" onclick="stepManager.deleteStep('${step.id}', event)" 
                            class="btn-danger btn-small" 
                            title="단계 삭제">삭제</button>
                </div>
            </div>
            <div class="step-content">
                <input type="text" 
                       class="step-input ${step.isActive ? '' : 'disabled'}" 
                       value="${this.escapeHtml(step.name)}" 
                       onchange="stepManager.updateStepName('${step.id}', this.value)"
                       placeholder="단계 이름을 입력하세요"
                       ${step.isActive ? '' : 'disabled'}>
            </div>
        `;

        return stepBox;
    }

    // 옵션 브랜치 생성
    createOptionBranch(step, option, index, level) {
        const optionBranch = document.createElement('div');
        optionBranch.className = `option-branch ${option.isActive ? '' : 'inactive'}`;

        // 연결선
        const connector = document.createElement('div');
        connector.className = 'tree-connector';
        
        // 옵션 박스
        const optionBox = document.createElement('div');
        optionBox.className = 'option-box';
        
        // 옵션에 하위 단계가 있는지 확인
        const hasNextSteps = option.nextSteps && option.nextSteps.length > 0;
        const collapseButton = hasNextSteps ? `
            <button type="button" class="collapse-btn option-collapse-btn ${option.isCollapsed ? 'collapsed' : 'expanded'}" 
                    onclick="stepManager.toggleOptionCollapse('${step.id}', '${option.id}', event)" 
                    title="${option.isCollapsed ? '펼치기' : '접기'}">
                ${option.isCollapsed ? '▶' : '▼'}
            </button>
        ` : '';
        
        optionBox.innerHTML = `
            <div class="option-header">
                <div class="option-controls">
                    <span class="option-indicator">↳</span>
                    ${collapseButton}
                    <label class="checkbox-wrapper">
                        <input type="checkbox" ${option.isActive ? 'checked' : ''} 
                               onchange="stepManager.toggleOptionActive('${step.id}', '${option.id}', this.checked)"
                               class="option-checkbox">
                        <span class="checkbox-text">활성화</span>
                    </label>
                </div>
                <div class="option-actions">
                    <button type="button" onclick="stepManager.addNextStep('${step.id}', '${option.id}', event)" 
                            class="btn-secondary btn-small" 
                            title="다음 단계 추가">+ 다음단계</button>
                    ${step.options.length > 1 ? `
                        <button type="button" onclick="stepManager.deleteOption('${step.id}', '${option.id}', event)" 
                                class="btn-danger btn-small" 
                                title="선택지 삭제">삭제</button>
                    ` : ''}
                </div>
            </div>
            <div class="option-content">
                <input type="text" 
                       class="option-input ${option.isActive ? '' : 'disabled'}" 
                       value="${this.escapeHtml(option.name)}" 
                       onchange="stepManager.updateOptionName('${step.id}', '${option.id}', this.value)"
                       placeholder="선택지 이름을 입력하세요"
                       ${option.isActive ? '' : 'disabled'}>
            </div>
        `;

        optionBranch.appendChild(connector);
        optionBranch.appendChild(optionBox);

        // 하위 단계들 (옵션이 접혀있지 않은 경우만 표시)
        if (option.nextSteps && option.nextSteps.length > 0 && !option.isCollapsed) {
            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'children-container';

            option.nextSteps.forEach(nextStepId => {
                const nextStep = this.steps.get(nextStepId);
                if (nextStep) {
                    const childNode = this.createTreeNode(nextStep, level + 1);
                    childrenContainer.appendChild(childNode);
                }
            });

            optionBranch.appendChild(childrenContainer);
        }

        return optionBranch;
    }

    // 단계 번호 표시 (트리에서 사용)
    getStepDisplayNumber(stepId, level) {
        if (level === 0) {
            return `${this.rootSteps.indexOf(stepId) + 1}`;
        }
        return '•';
    }

    // 시각화 업데이트
    updateVisualization() {
        this.updateTreeVisualization();
        this.updateTableVisualization();
    }

    // 트리 시각화 업데이트
    updateTreeVisualization() {
        const container = document.getElementById('treeVisualization');
        if (!container) return;

        if (this.rootSteps.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-icon">🌳</div><h3>트리 시각화</h3><p>단계를 추가하면 트리 구조로 표시됩니다.</p></div>';
            return;
        }

        container.innerHTML = '';
        
        this.rootSteps.forEach(stepId => {
            const treeNode = this.createVisualizationTreeNode(stepId, [], true);
            if (treeNode) {
                container.appendChild(treeNode);
            }
        });
    }

    // 시각화용 트리 노드 생성
    createVisualizationTreeNode(stepId, path, isRoot = false) {
        const step = this.steps.get(stepId);
        if (!step) return null;

        const nodeContainer = document.createElement('div');
        nodeContainer.className = 'visualization-tree-row';

        // 질문 노드 - 비활성화 상태 반영
        const questionNode = document.createElement('div');
        questionNode.className = `tree-node ${isRoot ? 'root' : 'child'} ${step.isActive ? '' : 'inactive'}`;
        questionNode.innerHTML = `
            <div class="node-label">
                ${this.escapeHtml(step.name)}
                ${!step.isActive ? '<span class="inactive-label">(비활성화)</span>' : ''}
            </div>
        `;
        nodeContainer.appendChild(questionNode);

        // 옵션들과 하위 노드들
        if (step.options.length > 0) {
            const optionsContainer = document.createElement('div');
            optionsContainer.className = 'visualization-options-container';

            step.options.forEach((option, index) => {
                const optionBranch = document.createElement('div');
                optionBranch.className = `visualization-option-branch ${option.isActive ? '' : 'inactive'}`;

                // 연결선과 옵션 라벨
                const optionConnector = document.createElement('div');
                optionConnector.className = 'visualization-connector';
                optionConnector.innerHTML = `
                    <div class="connector-line"></div>
                    <div class="option-label">
                        ${this.escapeHtml(option.name)}
                        ${!option.isActive ? '<span class="inactive-label">(비활성화)</span>' : ''}
                    </div>
                `;
                optionBranch.appendChild(optionConnector);

                // 하위 단계들
                if (option.nextSteps.length > 0) {
                    const childrenContainer = document.createElement('div');
                    childrenContainer.className = 'visualization-children';
                    
                    option.nextSteps.forEach(nextStepId => {
                        const childPath = [...path, step.id];
                        const childNode = this.createVisualizationTreeNode(nextStepId, childPath, false);
                        if (childNode) {
                            // 부모 옵션이 비활성화되면 자식 노드들도 흐리게 표시
                            if (!option.isActive) {
                                childNode.classList.add('parent-inactive');
                            }
                            childrenContainer.appendChild(childNode);
                        }
                    });
                    
                    optionBranch.appendChild(childrenContainer);
                } else {
                    // 끝점 표시
                    const endPoint = document.createElement('div');
                    endPoint.className = 'tree-endpoint';
                    endPoint.textContent = '완료';
                    optionBranch.appendChild(endPoint);
                }

                optionsContainer.appendChild(optionBranch);
            });

            nodeContainer.appendChild(optionsContainer);
        }

        return nodeContainer;
    }

    // 테이블 시각화 업데이트
    updateTableVisualization() {
        const container = document.getElementById('tableVisualization');
        if (!container) return;
        
        if (this.rootSteps.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-icon">📊</div><h3>표 시각화</h3><p>단계를 추가하면 모든 경로가 표로 표시됩니다.</p></div>';
            return;
        }

        const allPaths = this.getAllWorkflowPaths();
        
        if (allPaths.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><h3>경로 없음</h3><p>완성된 경로가 없습니다. 단계를 연결해보세요.</p></div>';
            return;
        }

        // 모든 단계들을 순서대로 수집 (루트부터 시작)
        const orderedSteps = this.getOrderedStepNames();
        
        // 엑셀 스타일 테이블 생성
        let tableHTML = '<div class="excel-table-container">';
        tableHTML += '<table class="excel-table">';
        
        // 헤더 생성 - 행번호 + 순서대로 정렬된 단계 이름들
        tableHTML += '<thead><tr>';
        tableHTML += '<th class="row-number-header">#</th>';
        
        orderedSteps.forEach(stepName => {
            tableHTML += `<th>${this.escapeHtml(stepName)}</th>`;
        });
        tableHTML += '</tr></thead><tbody>';

        // 각 경로를 행으로 추가
        allPaths.forEach((path, index) => {
            const isActive = this.isPathActive(path);
            const rowClass = isActive ? '' : 'inactive-row';
            tableHTML += `<tr class="${rowClass}">`;
            
            // 행번호
            tableHTML += `<td class="row-number">${index + 1}</td>`;
            
            // 각 단계별 선택된 옵션
            orderedSteps.forEach(stepName => {
                const option = path[stepName] || '-';
                const isInactive = !isActive && option !== '-';
                const cellClass = isInactive ? 'inactive-cell' : '';
                tableHTML += `<td class="${cellClass}">${this.escapeHtml(option)}</td>`;
            });
            tableHTML += '</tr>';
        });

        tableHTML += '</tbody></table></div>';
        container.innerHTML = tableHTML;
    }

    // 모든 워크플로우 경로 생성 (루트 단계들을 하나의 연속된 흐름으로)
    getAllWorkflowPaths() {
        const paths = [];
        
        // 각 루트 단계에서 시작하는 모든 경로 생성
        this.rootSteps.forEach(rootStepId => {
            const rootStep = this.steps.get(rootStepId);
            if (rootStep) {
                this.generateWorkflowPaths(rootStep, {}, paths);
            }
        });
        
        return paths;
    }

    // 워크플로우 경로 생성 (재귀)
    generateWorkflowPaths(step, currentPath, paths) {
        if (!step) return;
        
        const newPath = { ...currentPath, [step.name]: null };
        
        // 단계에 옵션이 없으면 경로 완성
        if (step.options.length === 0) {
            paths.push(newPath);
            return;
        }
        
        // 각 옵션에 대해 경로 생성
        step.options.forEach(option => {
            const pathWithOption = { ...newPath, [step.name]: option.name };
            
            // 다음 단계가 없으면 경로 완성
            if (option.nextSteps.length === 0) {
                paths.push(pathWithOption);
            } else {
                // 다음 단계들로 계속 진행
                option.nextSteps.forEach(nextStepId => {
                    const nextStep = this.steps.get(nextStepId);
                    this.generateWorkflowPaths(nextStep, pathWithOption, paths);
                });
            }
        });
    }

    // 단계 이름들을 순서대로 정렬
    getOrderedStepNames() {
        const orderedNames = [];
        const visited = new Set();
        
        // 루트 단계부터 순서대로 방문
        this.rootSteps.forEach(rootStepId => {
            this.collectStepNamesInOrder(rootStepId, orderedNames, visited);
        });
        
        return orderedNames;
    }

    // 단계 이름을 순서대로 수집 (재귀)
    collectStepNamesInOrder(stepId, orderedNames, visited) {
        if (visited.has(stepId)) return;
        
        const step = this.steps.get(stepId);
        if (!step) return;
        
        visited.add(stepId);
        orderedNames.push(step.name);
        
        // 모든 옵션의 다음 단계들도 순서대로 추가
        step.options.forEach(option => {
            option.nextSteps.forEach(nextStepId => {
                this.collectStepNamesInOrder(nextStepId, orderedNames, visited);
            });
        });
    }

    // 경로가 활성화되어 있는지 확인
    isPathActive(path) {
        for (const [stepName, optionName] of Object.entries(path)) {
            if (optionName === null || optionName === '-') continue;
            
            // 해당 단계 찾기
            const step = Array.from(this.steps.values()).find(s => s.name === stepName);
            if (!step || !step.isActive) return false;
            
            // 해당 옵션 찾기
            const option = step.options.find(opt => opt.name === optionName);
            if (!option || !option.isActive) return false;
        }
        return true;
    }

    // 모든 단계 이름 가져오기
    getAllStepNames() {
        const stepNames = new Set();
        this.steps.forEach(step => {
            stepNames.add(step.name);
        });
        return Array.from(stepNames);
    }

    // 행이 비활성화되었는지 확인
    isRowInactive(combination, allStepNames) {
        return allStepNames.some(stepName => {
            const option = combination[stepName];
            return this.isOptionInactive(stepName, option);
        });
    }

    // 특정 옵션이 비활성화되었는지 확인
    isOptionInactive(stepName, optionName) {
        if (!optionName || optionName === '-') return false;
        
        // 해당 단계 찾기
        for (let step of this.steps.values()) {
            if (step.name === stepName) {
                if (!step.isActive) return true; // 단계 자체가 비활성화
                
                // 해당 옵션 찾기
                const option = step.options.find(opt => opt.name === optionName);
                return option ? !option.isActive : false;
            }
        }
        return false;
    }

    // 데이터 정보 업데이트
    updateDataInfo() {
        const dataInfo = document.getElementById('dataInfo');
        if (!dataInfo) return;
        
        const totalSteps = this.steps.size;
        const activeSteps = Array.from(this.steps.values()).filter(step => step.isActive).length;
        const totalOptions = Array.from(this.steps.values()).reduce((sum, step) => sum + step.options.length, 0);
        const activeOptions = Array.from(this.steps.values()).reduce((sum, step) => 
            sum + step.options.filter(option => option.isActive).length, 0);
        const totalPaths = this.getAllWorkflowPaths().length;
        const activePaths = this.getAllWorkflowPaths().filter(path => this.isPathActive(path)).length;
        
        dataInfo.innerHTML = `
            <div class="data-stats">
                <div class="stat-item">
                    <span class="stat-label">총 단계:</span>
                    <span class="stat-value">${totalSteps}</span>
                    <span class="stat-detail">(활성: ${activeSteps})</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">총 선택지:</span>
                    <span class="stat-value">${totalOptions}</span>
                    <span class="stat-detail">(활성: ${activeOptions})</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">가능한 경로:</span>
                    <span class="stat-value">${totalPaths}</span>
                    <span class="stat-detail">(활성: ${activePaths})</span>
                </div>
            </div>`;
    }

    // 데이터 저장
    saveData() {
        try {
            const data = {
                steps: Array.from(this.steps.entries()),
                stepCounter: this.stepCounter,
                rootSteps: this.rootSteps,
                nextId: this.nextId
            };
            localStorage.setItem(this.storageKey, JSON.stringify(data));
        } catch (error) {
            console.error('데이터 저장 실패:', error);
        }
    }

    // 데이터 불러오기
    loadData() {
        try {
            const savedData = localStorage.getItem(this.storageKey);
            if (savedData) {
                const data = JSON.parse(savedData);
                
                this.steps = new Map(data.steps || []);
                this.stepCounter = data.stepCounter || 0;
                this.rootSteps = data.rootSteps || [];
                this.nextId = data.nextId || 1;
                
                // 기존 데이터에 새로운 속성 추가
                this.migrateData();
            }
        } catch (error) {
            console.error('데이터 불러오기 실패:', error);
            this.steps = new Map();
            this.stepCounter = 0;
            this.rootSteps = [];
            this.nextId = 1;
        }
    }

    // 데이터 마이그레이션 (기존 데이터에 새 속성 추가)
    migrateData() {
        let needsSave = false;
        
        this.steps.forEach(step => {
            // 단계에 새 속성 추가
            if (step.isActive === undefined) {
                step.isActive = true;
                needsSave = true;
            }
            if (step.isCollapsed === undefined) {
                step.isCollapsed = false;
                needsSave = true;
            }
            
            // 옵션에 새 속성 추가
            if (step.options) {
                step.options.forEach(option => {
                    if (option.isActive === undefined) {
                        option.isActive = true;
                        needsSave = true;
                    }
                    if (option.isCollapsed === undefined) {
                        option.isCollapsed = false;
                        needsSave = true;
                    }
                });
            }
        });
        
        // 변경사항이 있으면 저장
        if (needsSave) {
            this.saveData();
        }
    }

    // JSON 내보내기
    exportToJSON() {
        try {
            const data = {
                steps: Array.from(this.steps.entries()),
                stepCounter: this.stepCounter,
                rootSteps: this.rootSteps,
                exportDate: new Date().toISOString()
            };
            
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `workflow_${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('JSON 내보내기 실패:', error);
            alert('파일 내보내기에 실패했습니다.');
        }
    }

    // JSON 가져오기
    importFromJSON(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                if (data.steps && data.rootSteps !== undefined) {
                    if (confirm('기존 데이터를 모두 삭제하고 가져온 데이터로 교체하시겠습니까?')) {
                        this.preserveScrollPosition(() => {
                            this.steps = new Map(data.steps);
                            this.stepCounter = data.stepCounter || 0;
                            this.rootSteps = data.rootSteps || [];
                            
                            this.migrateData();
                            this.renderSteps();
                            this.updateVisualization();
                            this.saveData();
                        });
                        
                        alert('데이터를 성공적으로 가져왔습니다.');
                    }
                } else {
                    throw new Error('유효하지 않은 데이터 형식입니다.');
                }
            } catch (error) {
                console.error('JSON 가져오기 실패:', error);
                alert('파일을 읽는데 실패했습니다. 올바른 JSON 파일인지 확인해주세요.');
            }
        };
        reader.readAsText(file);
        
        // 파일 입력 리셋
        event.target.value = '';
    }

    // 모든 데이터 삭제
    clearAllData() {
        if (confirm('모든 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
            this.preserveScrollPosition(() => {
                localStorage.removeItem(this.storageKey);
                this.steps = new Map();
                this.stepCounter = 0;
                this.rootSteps = [];
                this.nextId = 1;
                this.renderSteps();
                this.updateVisualization();
                this.updateDataInfo();
            });
        }
    }

    // HTML 이스케이프 함수
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// 전역 인스턴스 생성
let stepManager;

// DOM이 로드되면 초기화
document.addEventListener('DOMContentLoaded', () => {
    stepManager = new StepManager();
});
