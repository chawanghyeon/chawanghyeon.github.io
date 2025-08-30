# 워크플로우 관리 시스템

이 프로젝트는 워크플로우를 설계하고 관리할 수 있는 웹 애플리케이션입니다. Next.js와 React를 사용하여 구축되었습니다.

## 주요 기능

- **워크플로우 설계**: 단계와 선택지를 추가하여 복잡한 워크플로우를 시각적으로 설계
- **트리 시각화**: 워크플로우를 트리 구조로 표시하여 전체 흐름 파악
- **데이터 관리**: JSON 형태로 워크플로우 데이터 내보내기/가져오기
- **자동 저장**: 브라우저 로컬 스토리지에 자동으로 데이터 저장
- **반응형 디자인**: 다양한 화면 크기에서 최적화된 사용자 경험

## 기술 스택

- **Framework**: Next.js 14
- **Language**: TypeScript
- **UI Library**: React 18
- **Styling**: CSS (Global Styles)
- **State Management**: React Hooks
- **Local Storage**: Browser localStorage API

## 개발 환경 설정

### 요구 사항

- Node.js 18 이상
- npm 또는 yarn

### 설치 및 실행

1. 의존성 설치:
\`\`\`bash
npm install
\`\`\`

2. 개발 서버 실행:
\`\`\`bash
npm run dev
\`\`\`

3. 브라우저에서 [http://localhost:3000](http://localhost:3000) 접속

### 빌드

프로덕션 빌드:
\`\`\`bash
npm run build
\`\`\`

정적 파일 생성 (GitHub Pages 배포용):
\`\`\`bash
npm run export
\`\`\`

## 배포

이 프로젝트는 GitHub Pages에 자동으로 배포됩니다. main 브랜치에 푸시하면 GitHub Actions를 통해 자동으로 빌드되고 배포됩니다.

## 사용 방법

1. **워크플로우 설계 탭**: 
   - "첫 번째 단계 추가하기" 버튼을 클릭하여 시작
   - 각 단계에 이름을 입력하고 선택지를 추가
   - 선택지에서 "다음단계" 버튼으로 후속 단계 연결

2. **데이터 관리 탭**:
   - JSON으로 내보내기: 현재 워크플로우를 파일로 저장
   - JSON 가져오기: 이전에 저장한 워크플로우 불러오기
   - 모든 데이터 삭제: 현재 워크플로우 완전 초기화

## 키보드 단축키

- `Ctrl + Enter`: 새로운 루트 단계 추가

## 브라우저 지원

- Chrome (권장)
- Firefox
- Safari
- Edge

## 라이선스

MIT License

## 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request
