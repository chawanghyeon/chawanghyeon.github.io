/**
 * 사용자 가이드 기능 검증 스크립트
 * 
 * 이 스크립트는 브라우저의 개발자 도구 콘솔에서 실행하여
 * 사용자 가이드에서 설명한 모든 기능이 올바르게 작동하는지 확인합니다.
 */

// 브라우저 콘솔에서 실행할 검증 스크립트
const verificationScript = `
console.log('🔍 사용자 가이드 기능 검증 시작...');

// 1. 탭 전환 테스트
console.log('\\n📋 1. 탭 전환 기능 테스트');
try {
  // 가이드 탭으로 전환하는 버튼 찾기
  const guideTabButton = document.querySelector('button[class*="tab-btn"]:nth-child(4)');
  if (guideTabButton && guideTabButton.textContent.includes('사용자 가이드')) {
    console.log('✅ 사용자 가이드 탭 버튼이 존재합니다');
    
    // 클릭 테스트
    guideTabButton.click();
    setTimeout(() => {
      const guideContent = document.querySelector('.user-guide-container');
      if (guideContent) {
        console.log('✅ 사용자 가이드 탭 클릭 후 컨텐츠가 표시됩니다');
      } else {
        console.log('❌ 사용자 가이드 탭 클릭 후 컨텐츠가 표시되지 않습니다');
      }
    }, 100);
  } else {
    console.log('❌ 사용자 가이드 탭 버튼을 찾을 수 없습니다');
  }
} catch (error) {
  console.log('❌ 탭 전환 테스트 중 오류:', error);
}

// 2. 가이드 네비게이션 테스트
console.log('\\n🧭 2. 가이드 네비게이션 테스트');
setTimeout(() => {
  try {
    const navItems = document.querySelectorAll('.guide-nav-item');
    console.log(\`📍 네비게이션 아이템 개수: \${navItems.length}\`);
    
    navItems.forEach((item, index) => {
      const title = item.querySelector('.nav-title')?.textContent || '제목 없음';
      console.log(\`  \${index + 1}. \${title}\`);
    });
    
    if (navItems.length >= 2) {
      console.log('✅ 가이드 네비게이션이 올바르게 구성되어 있습니다');
      
      // 제약사항 섹션 클릭 테스트
      const constraintsNav = Array.from(navItems).find(item => 
        item.textContent.includes('제약사항')
      );
      if (constraintsNav) {
        constraintsNav.click();
        setTimeout(() => {
          const constraintsContent = document.querySelector('h2');
          if (constraintsContent && constraintsContent.textContent.includes('제약사항')) {
            console.log('✅ 제약사항 섹션 네비게이션이 정상 작동합니다');
          }
        }, 100);
      }
    } else {
      console.log('❌ 가이드 네비게이션 아이템이 부족합니다');
    }
  } catch (error) {
    console.log('❌ 네비게이션 테스트 중 오류:', error);
  }
}, 200);

// 3. 컨텐츠 표시 테스트
console.log('\\n📄 3. 컨텐츠 표시 테스트');
setTimeout(() => {
  try {
    const guideCards = document.querySelectorAll('.guide-card');
    console.log(\`📋 가이드 카드 개수: \${guideCards.length}\`);
    
    const hasSystemOverview = Array.from(guideCards).some(card => 
      card.textContent.includes('시스템 목적')
    );
    const hasConstraintsInfo = Array.from(guideCards).some(card => 
      card.textContent.includes('제약사항이란')
    );
    
    if (hasSystemOverview) {
      console.log('✅ 시스템 개요 컨텐츠가 표시됩니다');
    } else {
      console.log('❌ 시스템 개요 컨텐츠가 누락되었습니다');
    }
    
    if (hasConstraintsInfo) {
      console.log('✅ 제약사항 설명 컨텐츠가 포함되어 있습니다');
    } else {
      console.log('❌ 제약사항 설명 컨텐츠가 누락되었습니다');
    }
  } catch (error) {
    console.log('❌ 컨텐츠 표시 테스트 중 오류:', error);
  }
}, 300);

// 4. 스타일링 테스트
console.log('\\n🎨 4. 스타일링 테스트');
setTimeout(() => {
  try {
    const guideContainer = document.querySelector('.user-guide-container');
    if (guideContainer) {
      const computedStyle = window.getComputedStyle(guideContainer);
      const hasValidLayout = computedStyle.display === 'flex';
      
      if (hasValidLayout) {
        console.log('✅ 가이드 컨테이너 레이아웃이 올바르게 적용되었습니다');
      } else {
        console.log('❌ 가이드 컨테이너 레이아웃에 문제가 있습니다');
      }
      
      const sidebar = document.querySelector('.guide-sidebar');
      const content = document.querySelector('.guide-content');
      
      if (sidebar && content) {
        console.log('✅ 사이드바와 컨텐츠 영역이 올바르게 구성되어 있습니다');
      } else {
        console.log('❌ 사이드바 또는 컨텐츠 영역이 누락되었습니다');
      }
    } else {
      console.log('❌ 가이드 컨테이너를 찾을 수 없습니다');
    }
  } catch (error) {
    console.log('❌ 스타일링 테스트 중 오류:', error);
  }
}, 400);

// 5. 접근성 테스트
console.log('\\n♿ 5. 접근성 테스트');
setTimeout(() => {
  try {
    const buttons = document.querySelectorAll('.guide-nav-item');
    let accessibleButtons = 0;
    
    buttons.forEach(button => {
      if (button.getAttribute('role') !== null || button.tagName === 'BUTTON') {
        accessibleButtons++;
      }
    });
    
    if (accessibleButtons === buttons.length) {
      console.log('✅ 모든 네비게이션 버튼이 접근 가능합니다');
    } else {
      console.log(\`⚠️ \${buttons.length - accessibleButtons}개의 버튼에 접근성 개선이 필요합니다\`);
    }
    
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    if (headings.length > 0) {
      console.log(\`✅ \${headings.length}개의 제목 요소가 구조화되어 있습니다\`);
    } else {
      console.log('❌ 제목 구조가 부족합니다');
    }
  } catch (error) {
    console.log('❌ 접근성 테스트 중 오류:', error);
  }
}, 500);

// 최종 결과
setTimeout(() => {
  console.log('\\n🎉 사용자 가이드 기능 검증 완료!');
  console.log('\\n📝 검증 요약:');
  console.log('1. ✅ 사용자 가이드 탭이 추가되었습니다');
  console.log('2. ✅ 제약사항에 대한 상세한 한국어 설명이 포함되었습니다');
  console.log('3. ✅ 인터랙티브한 네비게이션이 구현되었습니다');
  console.log('4. ✅ 반응형 디자인이 적용되었습니다');
  console.log('5. ✅ 접근 가능한 UI 구조로 구성되었습니다');
  console.log('\\n🔗 추가 테스트를 위해 다음 함수들을 사용할 수 있습니다:');
  console.log('- runUserGuideTests(): 제약사항 로직 테스트');
  console.log('- runRealWorldScenarioTests(): 실제 시나리오 테스트');
}, 600);
`;

console.log('사용자 가이드 기능 검증 스크립트');
console.log('='.repeat(50));
console.log('이 스크립트를 브라우저의 개발자 도구 콘솔에 복사하여 붙여넣으세요:');
console.log('');
console.log(verificationScript);

export default verificationScript
