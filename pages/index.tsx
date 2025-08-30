import React, { useEffect } from 'react'
import Head from 'next/head'
import { useStepManager } from '../hooks/useStepManager'
import AppHeader from '../components/AppHeader'
import WorkflowDesignTab from '../components/WorkflowDesignTab'
import TreeVisualizationTab from '../components/TreeVisualizationTab'
import TableVisualizationTab from '../components/TableVisualizationTab'
import DataManagementTab from '../components/DataTab'

const HomePage: React.FC = () => {
  const {
    steps,
    rootSteps,
    stepCounter,
    currentTab,
    addRootStep,
    addNextStep,
    updateStepName,
    updateOptionName,
    deleteStep,
    addOption,
    deleteOption,
    toggleStepActive,
    toggleOptionActive,
    toggleStepCollapse,
    toggleOptionCollapse,
    exportToJSON,
    importFromJSON,
    clearAllData,
    switchTab
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
            rootSteps={rootSteps}
            onAddRootStep={addRootStep}
            onAddNextStep={addNextStep}
            onUpdateStepName={updateStepName}
            onUpdateOptionName={updateOptionName}
            onDeleteStep={deleteStep}
            onAddOption={addOption}
            onDeleteOption={deleteOption}
            onToggleStepActive={toggleStepActive}
            onToggleOptionActive={toggleOptionActive}
            onToggleStepCollapse={toggleStepCollapse}
            onToggleOptionCollapse={toggleOptionCollapse}
          />
        )
      case 'visualization':
        return (
          <TreeVisualizationTab
            steps={steps}
            rootSteps={rootSteps}
          />
        )
      case 'table':
        return (
          <TableVisualizationTab
            steps={steps}
            rootSteps={rootSteps}
          />
        )
      case 'data':
        return (
          <DataManagementTab
            steps={steps}
            rootSteps={rootSteps}
            onExportToJSON={exportToJSON}
            onImportFromJSON={importFromJSON}
            onClearAllData={clearAllData}
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
