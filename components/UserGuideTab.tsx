import React, { useState } from 'react'

const UserGuideTab: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>('overview')

  const sections = [
    { id: 'overview', title: '🏠 시스템 개요', icon: '🏠' },
    { id: 'constraints', title: '⚙️ 제약사항 상세', icon: '⚙️' },
    { id: 'testing', title: '🧪 기능 테스트', icon: '🧪' }
  ]

  const runTests = () => {
    console.log('🧪 사용자 가이드 기능 테스트 실행...')
    
    // 간단한 제약사항 테스트 실행
    try {
      // 동적으로 테스트 모듈 import
      import('../lib/test-user-guide').then(testModule => {
        testModule.default.runUserGuideTests()
        testModule.default.runRealWorldScenarioTests()
        console.log('✅ 모든 테스트가 완료되었습니다! 브라우저 콘솔을 확인하세요.')
      }).catch(error => {
        console.error('❌ 테스트 모듈 로드 실패:', error)
      })
    } catch (error) {
      console.error('❌ 테스트 실행 중 오류:', error)
    }
  }

  const renderOverview = () => (
    <div className="guide-section">
      <h2>🏠 워크플로우 관리 시스템 개요</h2>
      
      <div className="guide-card">
        <h3>🎯 시스템 목적</h3>
        <p>이 시스템은 복잡한 워크플로우를 설계하고 관리하기 위한 도구입니다. 각 단계별로 선택 가능한 옵션들을 정의하고, 이들 간의 제약사항을 설정하여 논리적이고 일관성 있는 워크플로우를 구축할 수 있습니다.</p>
      </div>

      <div className="guide-card">
        <h3>🔧 핵심 기능</h3>
        <ul>
          <li><strong>단계별 옵션 관리:</strong> 워크플로우의 각 단계에서 선택 가능한 옵션들을 정의</li>
          <li><strong>제약사항 시스템:</strong> 옵션 선택에 따른 복합적인 제약조건 설정</li>
          <li><strong>시각화:</strong> 가능한 모든 경로를 표 형태로 시각화</li>
          <li><strong>데이터 관리:</strong> 여러 시트로 다양한 워크플로우 관리</li>
          <li><strong>실시간 검증:</strong> 제약사항에 따른 실시간 옵션 활성화/비활성화</li>
        </ul>
      </div>

      <div className="guide-card">
        <h3>🌳 시스템 구조</h3>
        <div className="structure-diagram">
          <div>워크플로우 시트</div>
          <div>└── 단계 (Step)</div>
          <div>&nbsp;&nbsp;&nbsp;&nbsp;└── 옵션 (Option)</div>
          <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└── 제약사항 (Constraints)</div>
        </div>
      </div>
    </div>
  )

  const renderConstraints = () => (
    <div className="guide-section">
      <h2>⚙️ 제약사항 시스템 상세 가이드</h2>
      
      <div className="guide-card">
        <h3>🔗 제약사항이란?</h3>
        <p>제약사항은 워크플로우에서 특정 옵션이 선택되었을 때 다른 옵션들의 활성화 상태를 제어하는 규칙입니다. 이를 통해 비즈니스 로직이나 절차적 요구사항을 워크플로우에 반영할 수 있습니다.</p>
      </div>

      <div className="guide-card">
        <h3>📋 제약사항 유형</h3>
        
        <h4>1. 다음 단계 제약 (Next-Step)</h4>
        <p><strong>용도:</strong> 현재 단계의 선택이 다음 단계의 옵션에 영향을 주는 경우</p>
        <p><strong>예시:</strong> 무료 플랜을 선택하면 다음 단계의 프리미엄 기능 옵션이 비활성화</p>
        
        <h4>2. 이전 단계 제약 (Previous-Step)</h4>
        <p><strong>용도:</strong> 특정 옵션을 선택하기 위해 이전 단계에서 필요한 전제조건</p>
        <p><strong>예시:</strong> 고급 설정을 선택하려면 이전 단계에서 전문가 모드가 선택되어야 함</p>
        
        <h4>3. 범위 건너뛰기 제약 (Range-Skip)</h4>
        <p><strong>용도:</strong> 특정 선택이 여러 단계에 걸쳐 영향을 주는 경우</p>
        <p><strong>예시:</strong> 빠른 설치를 선택하면 2~4단계의 모든 상세 설정 옵션들이 비활성화</p>
        
        <h4>4. 조건부 제약 (Conditional)</h4>
        <p><strong>용도:</strong> 외부 조건(재고, 사용자 레벨, 시간 등)에 따른 동적 제약</p>
        <p><strong>예시:</strong> 사용자 레벨이 5 이상일 때만 관리자 기능 활성화</p>
      </div>

      <div className="guide-card">
        <h3>🚀 제약사항 액션</h3>
        
        <h4>비활성화 (Disable)</h4>
        <p>대상 옵션을 선택할 수 없게 만듭니다. 빨간색으로 표시됩니다.</p>
        
        <h4>활성화 (Enable)</h4>
        <p>다른 제약사항에 의해 비활성화된 옵션을 다시 활성화합니다.</p>
        
        <h4>필수 선택 (Require)</h4>
        <p>해당 옵션을 반드시 선택해야 함을 의미합니다. 파란색으로 표시됩니다.</p>
      </div>

      <div className="guide-card">
        <h3>🔧 제약사항 생성 단계별 가이드</h3>
        <ol>
          <li><strong>제약사항 추가:</strong> 제약사항 추가 버튼 클릭</li>
          <li><strong>유형 선택:</strong> 원하는 제약사항 유형 선택</li>
          <li><strong>소스 설정:</strong> 제약을 발생시킬 단계와 옵션 선택</li>
          <li><strong>대상 설정:</strong> 영향을 받을 단계와 옵션 선택</li>
          <li><strong>액션 선택:</strong> 비활성화/활성화/필수 선택 중 선택</li>
          <li><strong>조건 설정:</strong> 필요시 경로 조건이나 외부 조건 추가</li>
          <li><strong>저장:</strong> 설정 완료 후 저장</li>
        </ol>
      </div>

      <div className="guide-card">
        <h3>⚠️ 제약사항 설계 시 주의사항</h3>
        <ul>
          <li><strong>순환 참조 방지:</strong> A가 B를 제약하고 B가 A를 제약하는 상황 피하기</li>
          <li><strong>논리적 일관성:</strong> 서로 모순되는 제약사항 설정 피하기</li>
          <li><strong>우선순위 고려:</strong> 복잡한 제약사항의 경우 우선순위 명시적으로 설정</li>
          <li><strong>테스트:</strong> 설정 후 다양한 시나리오로 동작 확인</li>
        </ul>
      </div>
    </div>
  )

  const renderTesting = () => (
    <div className="guide-section">
      <h2>🧪 기능 테스트</h2>
      
      <div className="guide-card">
        <h3>🔬 테스트 실행</h3>
        <p>아래 버튼을 클릭하여 사용자 가이드에서 설명한 모든 기능이 올바르게 작동하는지 테스트할 수 있습니다. 결과는 브라우저의 개발자 도구 콘솔에 표시됩니다.</p>
        
        <button 
          onClick={runTests}
          style={{
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
            marginTop: '15px'
          }}
        >
          🧪 제약사항 기능 테스트 실행
        </button>
      </div>

      <div className="guide-card">
        <h3>📋 테스트 내용</h3>
        <p>다음과 같은 기능들이 테스트됩니다:</p>
        <ul>
          <li><strong>Next-Step 제약:</strong> 다음 단계 옵션 제어</li>
          <li><strong>Range-Skip 제약:</strong> 여러 단계에 걸친 제약</li>
          <li><strong>Previous-Step 제약:</strong> 이전 단계 요구사항</li>
          <li><strong>조건부 제약:</strong> 외부 조건에 따른 동적 제약</li>
          <li><strong>우선순위 시스템:</strong> 제약사항 충돌 해결</li>
          <li><strong>경로 생성:</strong> 모든 가능한 경로 계산</li>
        </ul>
      </div>

      <div className="guide-card">
        <h3>🔍 테스트 결과 확인</h3>
        <p>테스트 실행 후 다음 단계를 따라하세요:</p>
        <ol>
          <li>브라우저에서 F12를 눌러 개발자 도구를 엽니다</li>
          <li>Console 탭을 클릭합니다</li>
          <li>테스트 결과와 상세 로그를 확인합니다</li>
          <li>모든 테스트가 ✅ 표시로 통과하는지 확인합니다</li>
        </ol>
      </div>

      <div className="guide-card">
        <h3>⚠️ 문제 해결</h3>
        <p>테스트에서 오류가 발생하는 경우:</p>
        <ul>
          <li><strong>브라우저 호환성:</strong> 최신 브라우저 사용 권장</li>
          <li><strong>JavaScript 활성화:</strong> 브라우저에서 JavaScript가 활성화되어 있는지 확인</li>
          <li><strong>개발자 도구:</strong> 콘솔에서 상세한 오류 메시지 확인</li>
        </ul>
      </div>
    </div>
  )

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'overview': return renderOverview()
      case 'constraints': return renderConstraints()
      case 'testing': return renderTesting()
      default: return renderOverview()
    }
  }

  return (
    <div className="user-guide-container">
      <div className="guide-layout">
        <aside className="guide-sidebar">
          <h2>📚 사용자 가이드</h2>
          <nav className="guide-nav">
            {sections.map(section => (
              <button
                key={section.id}
                className={`guide-nav-item ${activeSection === section.id ? 'active' : ''}`}
                onClick={() => setActiveSection(section.id)}
              >
                <span className="nav-icon">{section.icon}</span>
                <span className="nav-title">{section.title}</span>
              </button>
            ))}
          </nav>
        </aside>
        
        <main className="guide-content">
          {renderSectionContent()}
        </main>
      </div>
      
      <style jsx>{`
        .user-guide-container {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        
        .guide-layout {
          display: flex;
          flex: 1;
          gap: 20px;
          padding: 20px;
          max-height: calc(100vh - 200px);
        }
        
        .guide-sidebar {
          width: 280px;
          background: #f8f9fa;
          border-radius: 8px;
          padding: 20px;
          overflow-y: auto;
        }
        
        .guide-sidebar h2 {
          margin: 0 0 20px 0;
          color: #2c3e50;
          font-size: 1.3em;
        }
        
        .guide-nav {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .guide-nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border: none;
          background: white;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
          font-size: 0.95em;
        }
        
        .guide-nav-item:hover {
          background: #e9ecef;
          transform: translateX(4px);
        }
        
        .guide-nav-item.active {
          background: #007bff;
          color: white;
          box-shadow: 0 2px 8px rgba(0, 123, 255, 0.3);
        }
        
        .nav-icon {
          font-size: 1.2em;
          min-width: 20px;
        }
        
        .nav-title {
          font-weight: 500;
        }
        
        .guide-content {
          flex: 1;
          background: white;
          border-radius: 8px;
          padding: 30px;
          overflow-y: auto;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        
        .guide-section h2 {
          color: #2c3e50;
          margin-bottom: 25px;
          font-size: 1.8em;
          border-bottom: 3px solid #007bff;
          padding-bottom: 10px;
        }
        
        .guide-card {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
          border-left: 4px solid #007bff;
        }
        
        .guide-card h3 {
          color: #495057;
          margin-bottom: 15px;
          font-size: 1.3em;
        }
        
        .guide-card h4 {
          color: #6c757d;
          margin: 15px 0 10px 0;
          font-size: 1.1em;
        }
        
        .guide-card p {
          line-height: 1.6;
          margin-bottom: 15px;
          color: #495057;
        }
        
        .guide-card ul, .guide-card ol {
          padding-left: 20px;
          line-height: 1.6;
          color: #495057;
        }
        
        .guide-card li {
          margin-bottom: 8px;
        }
        
        .structure-diagram {
          background: white;
          padding: 15px;
          border-radius: 4px;
          font-family: 'Courier New', monospace;
          font-size: 0.9em;
          line-height: 1.6;
          border: 1px solid #dee2e6;
        }
        
        .structure-diagram div {
          margin: 2px 0;
        }
        
        strong {
          color: #2c3e50;
          font-weight: 600;
        }
        
        @media (max-width: 768px) {
          .guide-layout {
            flex-direction: column;
            gap: 15px;
          }
          
          .guide-sidebar {
            width: 100%;
            max-height: 200px;
          }
          
          .guide-nav {
            flex-direction: row;
            overflow-x: auto;
            gap: 12px;
          }
          
          .guide-nav-item {
            min-width: 200px;
            flex-shrink: 0;
          }
          
          .guide-content {
            padding: 20px;
          }
        }
      `}</style>
    </div>
  )
}

export default UserGuideTab
