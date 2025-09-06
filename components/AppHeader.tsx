import React from "react";
import { TabType } from "../lib/types";
import styles from "./AppHeader.module.css";

interface AppHeaderProps {
    currentTab: TabType;
    onTabChange: (tab: TabType) => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({ currentTab, onTabChange }) => {
    const tabs = [
        { id: "button" as TabType, label: "🔘 워크플로우" },
        { id: "policy" as TabType, label: "🛡️ 정책 관리" },
        { id: "table" as TabType, label: "📊 표 시각화" },
        { id: "data" as TabType, label: "💾 데이터 관리" },
    ];

    return (
        <header className={styles.appHeader}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h1>🌳 워크플로우 관리 by Kay</h1>
            </div>
            <div className={styles.tabNavigation}>
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        className={`${styles.tabBtn} ${
                            currentTab === tab.id ? styles.active : ""
                        }`}
                        onClick={() => onTabChange(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
        </header>
    );
};

export default AppHeader;
