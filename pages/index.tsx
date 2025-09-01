import React, { useEffect } from 'react'
import Head from 'next/head'
import { useSheetManager } from '../hooks/useSheetManager'
import AppHeader from '../components/AppHeader'
import SheetTabs from '../components/SheetTabs'
import WorkflowDesignTab from '../components/WorkflowDesignTab'
import TableVisualizationTab from '../components/TableVisualizationTab'
import EnhancedDataTab from '../components/EnhancedDataTab'

const HomePage: React.FC = () => {
  const {
    steps,
    optionActivations,
    pathActivations,
    currentTab,
    sheets,
    activeSheetId,
    createSheet,
    renameSheet,
    copySheet,
    deleteSheet,
    switchToSheet,
    addRootStep,
    updateStepName,
    updateOptionName,
    deleteStep,
    addOption,
    deleteOption,
    toggleOptionActive,
    toggleOptionNextStepActive,
    setCurrentTab: switchTab,
    addStepAtIndex,
    saveError,
    clearSaveError
  } = useSheetManager()

  const activeSheet = sheets.find(sheet => sheet.id === activeSheetId)

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
            pathActivations={pathActivations}
          />
        )
      case 'data':
        return (
          <EnhancedDataTab
            currentSheet={activeSheet}
            allSheets={sheets}
            saveError={saveError}
            onClearSaveError={clearSaveError}
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
        
        <SheetTabs
          sheets={sheets}
          activeSheetId={activeSheetId}
          onCreateSheet={createSheet}
          onRenameSheet={renameSheet}
          onCopySheet={copySheet}
          onDeleteSheet={deleteSheet}
          onSwitchSheet={switchToSheet}
        />
        
        <div className={`tab-content active`}>
          {renderTabContent()}
        </div>
      </div>
    </>
  )
}

export default HomePage
