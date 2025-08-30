import React, { useEffect } from 'react'
import Head from 'next/head'
import { useStepManager } from '../hooks/useStepManager'
import AppHeader from '../components/AppHeader'
import WorkflowDesignTab from '../components/WorkflowDesignTab'
import TableVisualizationTab from '../components/TableVisualizationTab'
import DataManagementTab from '../components/DataTab'

const HomePage: React.FC = () => {
  const {
    steps,
    optionActivations,
    pathActivations,
    currentTab,
    addRootStep,
    updateStepName,
    updateOptionName,
    deleteStep,
    addOption,
    deleteOption,
    toggleOptionActive,
    toggleOptionNextStepActive,
    setCurrentTab: switchTab,
    addStepAtIndex
  } = useStepManager()

  // Add keyboard shortcut for adding root step
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && e.ctrlKey) {
        addRootStep()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [addRootStep])

  const renderTabContent = () => {
    switch (currentTab) {
      case 'design':
        return (
          <WorkflowDesignTab
            steps={steps}
            optionActivations={optionActivations}
            pathActivations={pathActivations}
            onAddRootStep={addRootStep}
            onUpdateStepName={updateStepName}
            onUpdateOptionName={updateOptionName}
            onDeleteStep={deleteStep}
            onAddOption={addOption}
            onDeleteOption={deleteOption}
            onToggleOptionActive={toggleOptionActive}
            onToggleOptionNextStepActive={toggleOptionNextStepActive}
            onAddStepAtIndex={addStepAtIndex}
          />
        )
      case 'table':
        return (
          <TableVisualizationTab
            steps={steps}
          />
        )
      case 'data':
        return (
          <DataManagementTab
            steps={steps}
          />
        )
      default:
        return null
    }
  }

  return (
    <>
      <Head>
        <title>워크플로우 관리 시스템</title>
        <meta name="description" content="워크플로우를 설계하고 관리하는 시스템" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="app-container">
        <AppHeader currentTab={currentTab} onTabChange={switchTab} />
        
        <div className={`tab-content active`}>
          {renderTabContent()}
        </div>
      </div>
    </>
  )
}

export default HomePage
