import React from 'react'
import { TabType } from '../hooks/useStepManager'

interface AppHeaderProps {
  currentTab: TabType
  onTabChange: (tab: TabType) => void
}

const AppHeader: React.FC<AppHeaderProps> = ({ currentTab, onTabChange }) => {
  const tabs = [
    { id: 'design' as TabType, label: '📋 워크플로우 설계' },
    { id: 'table' as TabType, label: '📊 표 시각화' },
    { id: 'data' as TabType, label: '💾 데이터 관리' }
  ]

  return (
    <header className="app-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <h1>🌳 워크플로우 관리 by Kay</h1>
      </div>
      <div className="tab-navigation">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${currentTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </header>
  )
}

export default AppHeader
