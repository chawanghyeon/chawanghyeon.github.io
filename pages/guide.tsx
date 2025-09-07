import React from "react";
import Head from "next/head";
import Image from "next/image";
import styles from "../styles/Guide.module.css";

const GuidePage: React.FC = () => {
    return (
        <>
            <Head>
                <title>사용자 가이드 - Workflow Management System</title>
                <meta name="description" content="Workflow Management System 사용자 가이드" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
            </Head>

            <div className={styles.container}>
                <header className={styles.header}>
                    <h1>Workflow Management System</h1>
                    <h2>사용자 가이드</h2>
                </header>

                <nav className={styles.tableOfContents}>
                    <h3>목차</h3>
                    <ul>
                        <li><a href="#getting-started">시작하기</a></li>
                        <li><a href="#basic-features">기본 기능</a></li>
                        <li><a href="#workflow-creation">워크플로우 생성</a></li>
                        <li><a href="#policy-management">정책 관리</a></li>
                        <li><a href="#table-visualization">표 시각화</a></li>
                        <li><a href="#data-management">데이터 관리</a></li>
                        <li><a href="#troubleshooting">문제 해결</a></li>
                        <li><a href="#faq">자주 묻는 질문</a></li>
                    </ul>
                </nav>

                <main className={styles.content}>
                    <section id="getting-started" className={styles.section}>
                        <h2>📝 시작하기</h2>
                        <p>워크플로우 관리 시스템에 오신 것을 환영합니다! 이 시스템은 복잡한 워크플로우를 단계별로 설계하고, 각 단계의 선택지를 관리하며, 정책을 통해 자동화된 워크플로우 제어를 가능하게 합니다.</p>
                        
                        <h3>시스템 개요</h3>
                        <p>이 시스템의 핵심 구성 요소:</p>
                        <ul>
                            <li><strong>워크플로우 탭</strong>: 단계와 옵션을 생성하고 편집</li>
                            <li><strong>정책 관리 탭</strong>: 조건부 규칙을 생성하여 워크플로우 자동 제어</li>
                            <li><strong>표 시각화 탭</strong>: 모든 경로 조합을 테이블로 확인하고 정책 효과 시각화</li>
                            <li><strong>데이터 관리 탭</strong>: 데이터 가져오기/내보내기 및 통계 확인</li>
                        </ul>
                        
                        <div className={styles.imageContainer}>
                            <Image src="/images/guide/overview.png" alt="시스템 메인 화면" width={800} height={450} className={styles.guideImage} />
                            <p className={styles.caption}>메인 인터페이스 - 4개의 주요 탭으로 구성</p>
                        </div>

                        <h3>첫 시작</h3>
                        <ol>
                            <li>브라우저에서 시스템에 접속하면 자동으로 기본 시트가 생성됩니다</li>
                            <li>상단의 탭을 클릭하여 각 기능에 접근할 수 있습니다</li>
                            <li>오른쪽 상단의 &ldquo;📖 사용자 가이드&rdquo; 버튼으로 언제든 이 가이드에 접근 가능합니다</li>
                            <li>모든 데이터는 브라우저에 자동 저장됩니다</li>
                        </ol>
                    </section>

                    <section id="basic-features" className={styles.section}>
                        <h2>🔧 기본 기능</h2>
                        
                        <h3>시트 관리 (멀티 워크플로우 지원)</h3>
                        <p>여러 개의 독립적인 워크플로우를 시트로 관리할 수 있습니다:</p>
                        
                        <div className={styles.imageContainer}>
                            <Image src="/images/guide/sheet-tabs.png" alt="시트 탭 인터페이스" width={800} height={450} className={styles.guideImage} />
                            <p className={styles.caption}>상단의 시트 탭으로 여러 워크플로우 관리</p>
                        </div>

                        <ul>
                            <li><strong>새 시트 생성</strong>: 상단의 &ldquo;+&rdquo; 버튼 클릭</li>
                            <li><strong>시트 이름 변경</strong>: 시트 탭을 더블클릭하거나 우클릭 후 &ldquo;이름 바꾸기&rdquo;</li>
                            <li><strong>시트 복사</strong>: 시트 탭을 우클릭 후 &ldquo;시트 복사&rdquo;</li>
                            <li><strong>시트 삭제</strong>: 시트 탭을 우클릭 후 &ldquo;시트 삭제&rdquo; (최소 1개는 유지)</li>
                            <li><strong>시트 전환</strong>: 시트 탭을 클릭하여 다른 시트로 이동</li>
                        </ul>

                        <h3>상단 탭 네비게이션</h3>
                        <div className={styles.imageContainer}>
                            <Image src="/images/guide/header-tabs.png" alt="상단 탭 네비게이션" width={800} height={450} className={styles.guideImage} />
                            <p className={styles.caption}>상단의 4개 주요 기능 탭</p>
                        </div>
                        
                        <ul>
                            <li><strong>🔘 워크플로우</strong>: 워크플로우 단계와 옵션 생성/편집</li>
                            <li><strong>🛡️ 정책 관리</strong>: 조건부 규칙 생성 및 관리</li>
                            <li><strong>📊 표 시각화</strong>: 모든 경로 조합을 테이블로 시각화</li>
                            <li><strong>💾 데이터 관리</strong>: 데이터 가져오기/내보내기 및 통계</li>
                        </ul>
                    </section>

                    <section id="workflow-creation" className={styles.section}>
                        <h2>⚡ 워크플로우 생성</h2>
                        
                        <h3>첫 번째 단계 만들기</h3>
                        <ol>
                            <li>&ldquo;🔘 워크플로우&rdquo; 탭으로 이동</li>
                            <li>빈 워크플로우에서 &ldquo;+ 첫 단계 추가&rdquo; 버튼 클릭</li>
                            <li>단계 이름 입력 (예: &ldquo;제품 선택&rdquo;)</li>
                            <li>Enter 키로 저장하거나 ✓ 버튼 클릭</li>
                        </ol>

                        <div className={styles.imageContainer}>
                            <Image src="/images/guide/first-step.png" alt="첫 번째 단계 생성" width={800} height={450} className={styles.guideImage} />
                            <p className={styles.caption}>첫 번째 단계 생성 과정</p>
                        </div>

                        <h3>옵션 추가하기</h3>
                        <p>각 단계에는 여러 선택지(옵션)를 추가할 수 있습니다:</p>
                        <ol>
                            <li>단계 카드 하단의 &ldquo;+ 옵션 추가&rdquo; 버튼 클릭</li>
                            <li>옵션 이름 입력 (예: &ldquo;기본형&rdquo;, &ldquo;프리미엄&rdquo;)</li>
                            <li>Enter 키로 저장</li>
                            <li>필요한 만큼 옵션을 계속 추가</li>
                        </ol>

                        <div className={styles.videoContainer}>
                            <video controls className={styles.guideVideo}>
                                <source src="/videos/guide/add-options.mp4" type="video/mp4" />
                                브라우저가 비디오를 지원하지 않습니다.
                            </video>
                            <p className={styles.caption}>옵션 추가 과정 시연</p>
                        </div>

                        <h3>다음 단계 추가하기</h3>
                        <p>워크플로우를 확장하려면:</p>
                        <ol>
                            <li>단계들 사이의 &ldquo;+ 단계 추가&rdquo; 버튼 클릭</li>
                            <li>또는 마지막 단계 뒤의 &ldquo;+ 단계 추가&rdquo; 버튼 클릭</li>
                            <li>새 단계 이름 입력</li>
                            <li>해당 단계에 옵션들 추가</li>
                        </ol>

                        <h3>단계 및 옵션 편집</h3>
                        <ul>
                            <li><strong>이름 수정</strong>: 단계 제목이나 옵션을 더블클릭하여 편집</li>
                            <li><strong>단계 이동</strong>: 단계 우상단의 ↕️ 버튼으로 순서 변경</li>
                            <li><strong>삭제</strong>: ✏️ 편집 버튼 옆의 🗑️ 삭제 버튼 클릭</li>
                            <li><strong>옵션 선택</strong>: 옵션을 클릭하면 선택되어 경로가 표시됨</li>
                        </ul>

                        <div className={styles.imageContainer}>
                            <Image src="/images/guide/step-editing.png" alt="단계 편집 인터페이스" width={800} height={450} className={styles.guideImage} />
                            <p className={styles.caption}>단계 편집 버튼들 (편집, 이동, 삭제)</p>
                        </div>
                        <div className={styles.videoContainer}>
                            <video controls className={styles.guideVideo}>
                                <source src="/videos/guide/edit-step.mp4" type="video/mp4" />
                                브라우저가 비디오를 지원하지 않습니다.
                            </video>
                            <p className={styles.caption}>단계 편집 과정 시연</p>
                        </div>

                        <h3>경로 선택 및 정책 생성</h3>
                        <p>특정 경로를 선택하여 정책을 생성할 수 있습니다:</p>
                        <ol>
                            <li>각 단계에서 옵션을 클릭하여 경로 선택</li>
                            <li>하단에 &ldquo;선택된 경로&rdquo; 요약이 표시됨</li>
                            <li>&ldquo;📋 정책 생성&rdquo; 버튼을 클릭하여 해당 경로에 대한 정책 생성</li>
                        </ol>

                        <div className={styles.imageContainer}>
                            <Image src="/images/guide/path-selection.png" alt="경로 선택 및 정책 생성" width={800} height={450} className={styles.guideImage} />
                            <p className={styles.caption}>선택된 경로 표시 및 정책 생성 버튼</p>
                        </div>
                    </section>

                    <section id="policy-management" className={styles.section}>
                        <h2>�️ 정책 관리</h2>
                        
                        <h3>정책이란?</h3>
                        <p>정책은 특정 조건이 만족될 때 워크플로우의 옵션들을 자동으로 활성화하거나 비활성화하는 규칙입니다. 예를 들어, &ldquo;기본형을 선택하면 고급 옵션은 자동으로 비활성화&rdquo;와 같은 비즈니스 룰을 구현할 수 있습니다.</p>
                        
                        <div className={styles.imageContainer}>
                            <Image src="/images/guide/policy-overview.png" alt="정책 관리 탭 전체 화면" width={800} height={450} className={styles.guideImage} />
                            <p className={styles.caption}>정책 관리 탭 - 규칙 목록과 필터링 기능</p>
                        </div>

                        <h3>새 정책 생성하기</h3>
                        <ol>
                            <li>&ldquo;🛡️ 정책 관리&rdquo; 탭으로 이동</li>
                            <li>상단의 &ldquo;+ 새 규칙&rdquo; 버튼 클릭</li>
                            <li>정책 생성 모달에서 다음 설정:
                                <ul>
                                    <li><strong>정책 이름</strong>: 선택사항 (비워두면 자동 생성)</li>
                                    <li><strong>조건 설정</strong>: 언제 이 정책이 적용될지</li>
                                    <li><strong>대상 설정</strong>: 어떤 옵션에 영향을 줄지</li>
                                    <li><strong>액션 선택</strong>: 비활성화/활성화/필수</li>
                                </ul>
                            </li>
                            <li>&ldquo;정책 생성&rdquo; 버튼으로 저장</li>
                        </ol>

                        <div className={styles.videoContainer}>
                            <video controls className={styles.guideVideo}>
                                <source src="/videos/guide/policy-creation.mp4" type="video/mp4" />
                                브라우저가 비디오를 지원하지 않습니다.
                            </video>
                            <p className={styles.caption}>정책 생성 과정 전체 시연</p>
                        </div>

                        <h3>조건 설정 모드</h3>
                        <p>정책 생성 시 두 가지 조건 설정 모드를 선택할 수 있습니다:</p>
                        
                        <div className={styles.imageContainer}>
                            <Image src="/images/guide/condition-modes.png" alt="조건 설정 모드" width={800} height={450} className={styles.guideImage} />
                            <p className={styles.caption}>단순 모드와 고급 모드 토글 버튼</p>
                        </div>

                        <h4>단순 모드</h4>
                        <ul>
                            <li>여러 경로를 선택하고 AND/OR 연산자로 조합</li>
                            <li>직관적이고 사용하기 쉬움</li>
                            <li>대부분의 비즈니스 규칙에 적합</li>
                        </ul>

                        <h4>고급 모드</h4>
                        <ul>
                            <li>복잡한 중첩 조건 생성 가능</li>
                            <li>괄호를 사용한 우선순위 설정</li>
                            <li>복합적인 비즈니스 로직 구현</li>
                        </ul>
                        <div className={styles.imageContainer}>
                            <Image src="/images/guide/advanced-conditions.png" alt="고급 조건 설정" width={800} height={450} className={styles.guideImage} />
                            <p className={styles.caption}>고급 모드에서의 복잡한 조건 설정</p>
                        </div>

                        <h3>정책 관리 기능</h3>
                        
                        <div className={styles.imageContainer}>
                            <Image src="/images/guide/policy-table.png" alt="정책 테이블 인터페이스" width={800} height={450} className={styles.guideImage} />
                            <p className={styles.caption}>정책 목록 테이블 - 상태, 우선순위, 충돌 등 표시</p>
                        </div>

                        <h4>필터링 및 검색</h4>
                        <ul>
                            <li><strong>텍스트 검색</strong>: 정책 이름이나 내용으로 검색</li>
                            <li><strong>상태 필터</strong>: 활성/비활성/사용 안함으로 필터링</li>
                            <li><strong>단계 필터</strong>: 특정 단계와 관련된 정책만 표시</li>
                            <li><strong>우선순위 범위</strong>: 우선순위 숫자 범위로 필터링</li>
                            <li><strong>충돌 필터</strong>: 충돌이 있는 정책만 표시</li>
                        </ul>

                        <h4>우선순위 관리</h4>
                        <ul>
                            <li>우선순위 컬럼의 숫자를 클릭하여 직접 편집</li>
                            <li>높은 숫자 = 높은 우선순위</li>
                            <li>동일한 우선순위 시 충돌 경고 표시</li>
                            <li>시스템이 자동으로 우선순위 정규화</li>
                        </ul>

                        <h4>일괄 작업</h4>
                        <ul>
                            <li>여러 정책을 체크박스로 선택</li>
                            <li>&ldquo;활성화&rdquo;, &ldquo;비활성화&rdquo;, &ldquo;삭제&rdquo; 일괄 실행</li>
                            <li>전체 선택/해제 가능</li>
                        </ul>

                        <h3>정책 시뮬레이션</h3>
                        <p>🎯 시뮬레이션 버튼을 클릭하면 해당 정책이 어떻게 작동하는지 미리 확인할 수 있습니다:</p>
                        
                        <div className={styles.imageContainer}>
                            <Image src="/images/guide/policy-simulation.png" alt="정책 시뮬레이션 모달" width={800} height={450} className={styles.guideImage} />
                            <p className={styles.caption}>정책 시뮬레이션 모달 - 규칙 정보와 예상 결과</p>
                        </div>

                        <h3>정책 충돌 관리</h3>
                        <p>여러 정책이 충돌할 때 시스템이 자동으로 감지하고 관리합니다:</p>
                        <ul>
                            <li><strong>동일 우선순위 충돌</strong>: 같은 우선순위의 상충하는 정책</li>
                            <li><strong>순환 참조</strong>: 정책들이 서로를 참조하는 경우</li>
                            <li><strong>대상 겹침</strong>: 같은 옵션에 여러 정책이 적용되는 경우</li>
                        </ul>

                        <div className={styles.imageContainer}>
                            <Image src="/images/guide/policy-conflicts.png" alt="정책 충돌 표시" width={800} height={450} className={styles.guideImage} />
                            <p className={styles.caption}>정책 충돌 감지 및 경고 표시</p>
                        </div>
                        <div className={styles.imageContainer}>
                            <Image src="/images/guide/policy-conflicts-table.png" alt="정책 충돌 표시" width={800} height={450} className={styles.guideImage} />
                            <p className={styles.caption}>표 시각화에서 정책 충돌 감지 및 경고 표시</p>
                        </div>

                        <div className={styles.exampleBox} style={{marginTop: '2rem', padding: '1.5rem', background: '#f8f9fa', borderRadius: '12px', border: '1px solid #e0e0e0'}}>
                            <h3 style={{marginTop: 0}}>정책 예시</h3>
                            <p><strong>예시 상황:</strong> <br />
                            &quot;제품 선택&quot; 단계에서 <b>기본형</b>을 선택하면, &quot;추가 옵션&quot; 단계의 <b>고급 서비스</b> 옵션을 비활성화하고 싶을 때 아래와 같이 정책을 설정할 수 있습니다.</p>
                            <ol>
                                <li>&quot;정책 관리&quot; 탭에서 <b>+ 새 규칙</b>을 클릭</li>
                                <li>정책 이름: <b>기본형 선택 시 고급 서비스 비활성화</b></li>
                                <li>조건 설정: <b>제품 선택 = 기본형</b></li>
                                <li>대상 설정: <b>추가 옵션 &gt; 고급 서비스</b></li>
                                <li>액션 선택: <b>비활성화</b></li>
                                <li>저장</li>
                            </ol>
                            <p>이렇게 하면 사용자가 &quot;기본형&quot;을 선택할 때 &quot;고급 서비스&quot; 옵션이 자동으로 비활성화됩니다.<br />
                            실제 업무 규칙에 맞게 다양한 조건과 대상을 조합해 정책을 만들어보세요!</p>
                        </div>
                    </section>

                    <section id="table-visualization" className={styles.section}>
                        <h2>📊 표 시각화</h2>
                        
                        <h3>표 시각화란?</h3>
                        <p>표 시각화 탭은 워크플로우의 모든 가능한 경로 조합을 Excel과 같은 테이블 형태로 표시합니다. 각 행은 하나의 완전한 경로를 나타내며, 정책의 효과를 실시간으로 확인할 수 있습니다.</p>
                        
                        <div className={styles.imageContainer}>
                            <Image src="/images/guide/table-full.png" alt="표 시각화 전체 화면" width={800} height={450} className={styles.guideImage} />
                            <p className={styles.caption}>표 시각화 탭 - 모든 경로 조합과 통계 정보</p>
                        </div>

                        <h3>화면 구성 요소</h3>
                        
                        <h4>상단 통계 패널</h4>
                        <ul>
                            <li><strong>총계</strong>: 전체 가능한 조합 수</li>
                            <li><strong>중복 제거됨</strong>: 실제 표시되는 조합 수</li>
                            <li><strong>활성화/비활성화</strong>: 현재 활성 상태인 조합 수</li>
                            <li><strong>활성화율</strong>: 전체 대비 활성화된 조합의 비율</li>
                            <li><strong>정책 적용 상태</strong>: 활성 정책 개수</li>
                        </ul>

                        <h4>정책 효과 범례</h4>
                        <p>정책이 적용된 경우 색상으로 구분됩니다:</p>
                        
                        <div className={styles.imageContainer}>
                            <Image src="/images/guide/policy-legend.png" alt="정책 효과 범례" width={800} height={450} className={styles.guideImage} />
                            <p className={styles.caption}>색상별 정책 효과 범례</p>
                        </div>

                        <ul>
                            <li><strong>빨간색 배경</strong>: 정책에 의해 비활성화</li>
                            <li><strong>초록색 배경</strong>: 정책에 의해 필수</li>
                            <li><strong>파란색 배경</strong>: 정책에 의해 활성화</li>
                            <li><strong>노란색 테두리</strong>: 정책 충돌</li>
                            <li><strong>흰색 배경</strong>: 기본 상태</li>
                        </ul>

                        <h4>필터링 기능</h4>
                        <p>각 단계별로 특정 옵션만 표시하도록 필터링할 수 있습니다:</p>
                        
                        <div className={styles.imageContainer}>
                            <Image src="/images/guide/table-filters.png" alt="테이블 필터링" width={800} height={450} className={styles.guideImage} />
                            <p className={styles.caption}>단계별 옵션 필터링 드롭다운</p>
                        </div>

                        <h3>데이터 복사</h3>
                        <p>&ldquo;복사하기&rdquo; 버튼을 클릭하면 현재 표시된 테이블 데이터를 클립보드로 복사하여 Excel이나 다른 프로그램에 붙여넣을 수 있습니다.</p>

                        <div className={styles.videoContainer}>
                            <video controls className={styles.guideVideo}>
                                <source src="/videos/guide/table-interaction.mp4" type="video/mp4" />
                                브라우저가 비디오를 지원하지 않습니다.
                            </video>
                            <p className={styles.caption}>표 시각화 상호작용 및 필터링 시연</p>
                        </div>
                    </section>

                    <section id="data-management" className={styles.section}>
                        <h2>💾 데이터 관리</h2>
                        
                        <h3>시트 정보 및 통계</h3>
                        <p>데이터 관리 탭에서는 현재 시트와 전체 시스템의 상세한 통계를 확인할 수 있습니다:</p>
                        
                        <div className={styles.imageContainer}>
                            <Image src="/images/guide/data-stats.png" alt="데이터 통계 화면" width={800} height={450} className={styles.guideImage} />
                            <p className={styles.caption}>현재 시트 통계 및 전체 시스템 통계</p>
                        </div>

                        <h4>현재 시트 통계</h4>
                        <ul>
                            <li>시트 이름, 생성/수정 일시</li>
                            <li>단계 수, 옵션 수, 정책 수</li>
                            <li>전체 조합 수 (수학적 계산)</li>
                            <li>시트별 상세 메타데이터</li>
                        </ul>

                        <h4>전체 시스템 통계</h4>
                        <ul>
                            <li>총 시트 수</li>
                            <li>전체 단계 수, 옵션 수, 정책 수</li>
                            <li>시스템 전반의 사용 현황</li>
                        </ul>

                        <h3>데이터 가져오기/내보내기</h3>
                        
                        <div className={styles.imageContainer}>
                            <Image src="/images/guide/data-export-import.png" alt="데이터 가져오기 내보내기" width={800} height={450} className={styles.guideImage} />
                            <p className={styles.caption}>JSON 형태로 데이터 백업 및 복원</p>
                        </div>

                        <h4>JSON으로 내보내기</h4>
                        <ol>
                            <li>&ldquo;📁 JSON으로 내보내기&rdquo; 버튼 클릭</li>
                            <li>전체 워크플로우 데이터가 JSON 파일로 다운로드</li>
                            <li>모든 시트, 단계, 옵션, 정책이 포함됨</li>
                            <li>백업이나 다른 시스템으로 이전 시 사용</li>
                        </ol>

                        <h4>JSON 파일 가져오기</h4>
                        <ol>
                            <li>&ldquo;📂 JSON 파일 가져오기&rdquo; 버튼 클릭</li>
                            <li>이전에 내보낸 JSON 파일 선택</li>
                            <li>현재 데이터를 완전히 대체</li>
                            <li>가져오기 전 확인 메시지 표시</li>
                        </ol>

                        <h3>시트 관리</h3>
                        <p>모든 시트의 목록을 확인하고 상세 정보를 볼 수 있습니다:</p>
                        <ul>
                            <li>각 시트의 이름과 메타데이터</li>
                            <li>시트별 통계 정보</li>
                            <li>현재 활성 시트 표시</li>
                            <li>시트 전환 기능</li>
                        </ul>

                        <h3>데이터 초기화</h3>
                        <p>시스템을 처음 상태로 되돌리고 싶다면:</p>
                        <ol>
                            <li>&ldquo;모든 데이터 삭제&rdquo; 버튼 클릭</li>
                            <li>확인 대화상자에서 승인</li>
                            <li>모든 시트와 데이터가 삭제됨</li>
                            <li>기본 빈 시트 하나만 남음</li>
                        </ol>

                        <div className={styles.imageContainer}>
                            <Image src="/images/guide/data-deletion.png" alt="데이터 삭제 확인" width={800} height={450} className={styles.guideImage} />
                            <p className={styles.caption}>데이터 삭제 확인 대화상자</p>
                        </div>
                    </section>

                    <section id="troubleshooting" className={styles.section}>
                        <h2>🔧 문제 해결</h2>
                        
                        <div className={styles.troubleItem}>
                            <h4>정책이 적용되지 않을 때</h4>
                            <ul>
                                <li>정책 상태가 &ldquo;활성&rdquo;인지 확인</li>
                                <li>조건 설정이 올바른지 점검</li>
                                <li>대상 단계/옵션이 존재하는지 확인</li>
                                <li>다른 높은 우선순위 정책과 충돌하는지 확인</li>
                                <li>표 시각화 탭에서 실제 효과 확인</li>
                            </ul>
                        </div>

                        <div className={styles.troubleItem}>
                            <h4>데이터가 저장되지 않을 때</h4>
                            <ul>
                                <li>브라우저의 로컬 스토리지 용량 확인</li>
                                <li>시크릿/프라이빗 모드에서는 저장 제한</li>
                                <li>브라우저 설정에서 쿠키/데이터 허용 확인</li>
                                <li>다른 브라우저나 디바이스에서 테스트</li>
                                <li>JSON 내보내기로 백업 생성</li>
                            </ul>
                        </div>

                        <div className={styles.troubleItem}>
                            <h4>표 시각화가 느릴 때</h4>
                            <ul>
                                <li>필터를 사용하여 표시되는 행 수 줄이기</li>
                                <li>브라우저 탭 개수 줄이기</li>
                                <li>브라우저 확장 프로그램 비활성화</li>
                                <li>컴퓨터 메모리 용량 확인</li>
                                <li>워크플로우 복잡도 줄이기</li>
                            </ul>
                        </div>

                        <div className={styles.troubleItem}>
                            <h4>정책 충돌이 발생할 때</h4>
                            <ul>
                                <li>정책 관리 탭에서 충돌 내용 확인</li>
                                <li>우선순위를 다르게 설정</li>
                                <li>충돌하는 정책 중 하나 비활성화</li>
                                <li>조건이나 대상을 더 구체적으로 설정</li>
                                <li>시뮬레이션 기능으로 예상 결과 확인</li>
                            </ul>
                        </div>

                        <div className={styles.troubleItem}>
                            <h4>JSON 가져오기가 실패할 때</h4>
                            <ul>
                                <li>JSON 파일 형식이 올바른지 확인</li>
                                <li>파일이 손상되지 않았는지 점검</li>
                                <li>이 시스템에서 내보낸 파일인지 확인</li>
                                <li>브라우저 콘솔에서 오류 메시지 확인</li>
                                <li>작은 크기의 테스트 파일로 시도</li>
                            </ul>
                        </div>
                    </section>

                    <section id="faq" className={styles.section}>
                        <h2>❓ 자주 묻는 질문</h2>
                        
                        <div className={styles.faqItem}>
                            <h4>Q: 몇 개의 단계와 옵션까지 만들 수 있나요?</h4>
                            <p>A: 기술적으로는 제한이 없지만, 브라우저 성능을 고려하여 단계당 10-20개 옵션, 전체 10-15단계 정도가 권장됩니다. 더 많은 조합이 필요하다면 필터 기능을 적극 활용하세요.</p>
                        </div>

                        <div className={styles.faqItem}>
                            <h4>Q: 여러 명이 동시에 같은 워크플로우를 편집할 수 있나요?</h4>
                            <p>A: 현재 버전은 로컬 스토리지 기반이므로 개별 브라우저에서만 작업됩니다. 협업이 필요하다면 JSON 내보내기/가져오기 기능을 사용하여 데이터를 공유하세요.</p>
                        </div>

                        <div className={styles.faqItem}>
                            <h4>Q: 정책의 우선순위는 어떻게 결정되나요?</h4>
                            <p>A: 숫자가 높을수록 우선순위가 높습니다. 동일한 우선순위의 충돌하는 정책이 있으면 시스템이 경고를 표시하고, 자동으로 우선순위를 재조정할 수 있습니다.</p>
                        </div>

                        <div className={styles.faqItem}>
                            <h4>Q: 모바일에서도 사용할 수 있나요?</h4>
                            <p>A: 반응형 디자인으로 제작되어 모바일에서도 기본 기능은 사용 가능하지만, 복잡한 워크플로우 편집은 데스크톱 환경에서 권장됩니다.</p>
                        </div>

                        <div className={styles.faqItem}>
                            <h4>Q: 데이터는 안전하게 보관되나요?</h4>
                            <p>A: 모든 데이터는 브라우저의 로컬 스토리지에만 저장되며, 외부 서버로 전송되지 않습니다. 정기적으로 JSON 내보내기로 백업을 만드는 것을 권장합니다.</p>
                        </div>

                        <div className={styles.faqItem}>
                            <h4>Q: 실수로 데이터를 삭제했을 때 복구할 수 있나요?</h4>
                            <p>A: 브라우저 로컬 스토리지에서 삭제된 데이터는 복구할 수 없습니다. 중요한 작업 전에는 반드시 JSON 내보내기로 백업을 만들어 두세요.</p>
                        </div>

                        <div className={styles.faqItem}>
                            <h4>Q: 다른 형식으로 데이터를 내보낼 수 있나요?</h4>
                            <p>A: 현재는 JSON 형식만 지원합니다. 표 시각화 탭에서 &ldquo;복사하기&rdquo; 기능을 사용하면 테이블 데이터를 Excel에 붙여넣을 수 있습니다.</p>
                        </div>

                        <div className={styles.faqItem}>
                            <h4>Q: 시스템이 느려질 때는 어떻게 해야 하나요?</h4>
                            <p>A: 워크플로우 복잡도를 줄이거나, 필터 기능을 사용하거나, 불필요한 정책을 비활성화해 보세요. 또한 브라우저의 다른 탭을 닫는 것도 도움이 됩니다.</p>
                        </div>
                    </section>
                </main>

                <footer className={styles.footer}>
                    <p>문제가 해결되지 않으시나요? <span onClick={() => window.location.href = '/'} style={{ color: '#3498db', cursor: 'pointer', textDecoration: 'underline' }}>메인 페이지로 돌아가기</span></p>
                    <p>마지막 업데이트: {new Date().toLocaleDateString('ko-KR')}</p>
                </footer>
            </div>
        </>
    );
};

export default GuidePage;
