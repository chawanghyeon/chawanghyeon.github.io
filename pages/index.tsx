import React from "react";
import Head from "next/head";
import { useSheetManager } from "../hooks/useSheetManager";
import AppHeader from "../components/AppHeader";
import SheetTabs from "../components/SheetTabs";
import WorkflowButtonTab from "../components/WorkflowButtonTab";
import TableVisualizationTab from "../components/TableVisualizationTab";
import PolicyManagerTab from "../components/PolicyManagerTab";
import EnhancedDataTab from "../components/EnhancedDataTab";

const HomePage: React.FC = () => {
    const {
        steps,
        pathActivations,
        constraints,
        currentTab,
        sheets,
        activeSheetId,
        createSheet,
    createSheetsFromExcel,
        renameSheet,
        copySheet,
        deleteSheet,
        switchToSheet,
        addStepAtIndex,
        updateStepName,
        deleteStep,
        moveStep,
        addOption,
        updateOptionName,
        deleteOption,
        toggleOptionActive,
        setCurrentTab: switchTab,
        addConstraint,
        updateConstraint,
        deleteConstraint,
        saveError,
        clearSaveError,
    } = useSheetManager();
    

    const activeSheet = sheets.find((sheet) => sheet.id === activeSheetId);

    const renderTabContent = () => {
        switch (currentTab) {
            case "button":
                return (
                    <WorkflowButtonTab
                        steps={steps}
                        constraints={constraints}
                        onAddStepAtIndex={addStepAtIndex}
                        onUpdateStepName={updateStepName}
                        onDeleteStep={deleteStep}
                        onMoveStep={moveStep}
                        onAddOption={addOption}
                        onUpdateOptionName={updateOptionName}
                        onDeleteOption={deleteOption}
                        onAddConstraint={addConstraint}
                        onUpdateConstraint={updateConstraint}
                        onDeleteConstraint={deleteConstraint}
                    />
                );
            case "table":
                return (
                    <TableVisualizationTab
                        steps={steps}
                        constraints={constraints}
                        pathActivations={pathActivations}
                        onToggleOptionActive={toggleOptionActive}
                    />
                );
            case "policy":
                return (
                    <PolicyManagerTab
                        steps={steps}
                        constraints={constraints}
                        onAddConstraint={addConstraint}
                        onUpdateConstraint={updateConstraint}
                        onDeleteConstraint={deleteConstraint}
                    />
                );
            case "data":
                return (
                    <EnhancedDataTab
                        currentSheet={activeSheet}
                        allSheets={sheets}
                        saveError={saveError}
                        onClearSaveError={clearSaveError}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <>
            <Head>
                <title>워크플로우 관리 시스템</title>
                <meta
                    name="description"
                    content="워크플로우를 설계하고 관리하는 시스템"
                />
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1"
                />
                <link rel="icon" href="/favicon.ico" />
            </Head>

            <div className="app-container">
                <AppHeader currentTab={currentTab} onTabChange={switchTab} />

                <SheetTabs
                    sheets={sheets}
                    activeSheetId={activeSheetId}
                    onCreateSheet={createSheet}
                    onCreateSheetsFromExcel={createSheetsFromExcel}
                    onRenameSheet={renameSheet}
                    onCopySheet={copySheet}
                    onDeleteSheet={deleteSheet}
                    onSwitchSheet={switchToSheet}
                />

                <div className={`tab-content active`}>{renderTabContent()}</div>
            </div>
        </>
    );
};

export default HomePage;
