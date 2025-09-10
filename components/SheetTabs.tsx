import React, { useState, useRef } from "react";
import { WorkflowSheet } from "../lib/types";
import styles from "./SheetTabs.module.css";
import * as XLSX from "xlsx";

interface SheetTabsProps {
    sheets: WorkflowSheet[];
    activeSheetId: string;
    onCreateSheet: (name?: string) => void;
    // Called with parsed sheets from an Excel file. Each parsed sheet contains name and steps; steps have name and array of option names.
    onCreateSheetsFromExcel?: (sheets: Array<{
        name: string;
        steps: Array<{ name: string; options: string[] }>;
    }>) => void;
    onRenameSheet: (sheetId: string, name: string) => void;
    onCopySheet: (sheetId: string, name?: string) => void;
    onDeleteSheet: (sheetId: string) => void;
    onSwitchSheet: (sheetId: string) => void;
}

const SheetTabs: React.FC<SheetTabsProps> = ({
    sheets,
    activeSheetId,
    onCreateSheet,
    onRenameSheet,
    onCopySheet,
    onDeleteSheet,
    onSwitchSheet,
    onCreateSheetsFromExcel,
}) => {
    const [editingSheetId, setEditingSheetId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState("");
    const [contextMenu, setContextMenu] = useState<{
        sheetId: string;
        x: number;
        y: number;
    } | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleTabClick = (sheetId: string) => {
        if (editingSheetId === sheetId) return;
        onSwitchSheet(sheetId);
    };

    const handleTabDoubleClick = (sheetId: string, currentName: string) => {
        setEditingSheetId(sheetId);
        setEditingName(currentName);
        setTimeout(() => inputRef.current?.focus(), 0);
    };

    const handleRenameSubmit = () => {
        if (editingSheetId && editingName.trim()) {
            onRenameSheet(editingSheetId, editingName.trim());
        }
        setEditingSheetId(null);
        setEditingName("");
    };

    const handleRenameCancel = () => {
        setEditingSheetId(null);
        setEditingName("");
    };

    const handleContextMenu = (e: React.MouseEvent, sheetId: string) => {
        e.preventDefault();
        setContextMenu({
            sheetId,
            x: e.clientX,
            y: e.clientY,
        });
    };

    const handleContextMenuAction = (action: string) => {
        if (!contextMenu) return;

        switch (action) {
            case "rename":
                const sheet = sheets.find((s) => s.id === contextMenu.sheetId);
                if (sheet) {
                    handleTabDoubleClick(contextMenu.sheetId, sheet.name);
                }
                break;
            case "copy":
                onCopySheet(contextMenu.sheetId);
                break;
            case "delete":
                if (sheets.length > 1) {
                    const sheet = sheets.find(
                        (s) => s.id === contextMenu.sheetId
                    );
                    if (sheet) {
                        if (
                            window.confirm(
                                `"${sheet.name}" 시트를 정말 삭제하시겠습니까?`
                            )
                        ) {
                            onDeleteSheet(contextMenu.sheetId);
                        }
                    }
                }
                break;
        }

        setContextMenu(null);
    };

    React.useEffect(() => {
        const handleClick = () => setContextMenu(null);
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                handleRenameCancel();
                setContextMenu(null);
            }
        };

        document.addEventListener("click", handleClick);
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("click", handleClick);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, []);

    return (
        <div className={styles.sheetTabsContainer}>
            <div className={styles.sheetTabs}>
                {sheets.map((sheet) => (
                    <div
                        key={sheet.id}
                        className={`sheet-tab ${
                            activeSheetId === sheet.id ? "active" : ""
                        }`}
                        onClick={() => handleTabClick(sheet.id)}
                        onDoubleClick={() =>
                            handleTabDoubleClick(sheet.id, sheet.name)
                        }
                        onContextMenu={(e) => handleContextMenu(e, sheet.id)}
                    >
                        {editingSheetId === sheet.id ? (
                            <input
                                ref={inputRef}
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                onBlur={handleRenameSubmit}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        handleRenameSubmit();
                                    } else if (e.key === "Escape") {
                                        handleRenameCancel();
                                    }
                                }}
                                className={styles.sheetTabInput}
                                onClick={(e) => e.stopPropagation()}
                            />
                        ) : (
                            <span className={styles.sheetTabName}>
                                {sheet.name}
                            </span>
                        )}
                    </div>
                ))}

                <>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        style={{ display: "none" }}
                        onClick={(e) => {
                            // reset input so same file can be selected repeatedly
                            (e.target as HTMLInputElement).value = "";
                        }}
                        onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            try {
                                const arrayBuffer = await file.arrayBuffer();
                                const workbook = XLSX.read(arrayBuffer, {
                                    type: "array",
                                });

                                const parsedSheets: Array<{
                                    name: string;
                                    steps: Array<{ name: string; options: string[] }>;
                                }> = [];

                                workbook.SheetNames.forEach((sheetName) => {
                                    const ws = workbook.Sheets[sheetName];
                                    // rows as arrays
                                    const rows: (string | number | undefined)[][] = XLSX.utils.sheet_to_json(ws, {
                                        header: 1,
                                        blankrows: false,
                                    });

                                    if (!rows || rows.length === 0) return;

                                    // Determine number of columns
                                    const colCount = Math.max(...rows.map((r) => r.length));

                                    const steps = [] as Array<{ name: string; options: string[] }>;

                                    for (let c = 0; c < colCount; c++) {
                                        const header = (rows[0] && rows[0][c]) || undefined;
                                        const stepName =
                                            typeof header === "string" && header.trim()
                                                ? header.trim()
                                                : `${c + 1}단계`;

                                        const optionsSet = new Set<string>();
                                        for (let r = 1; r < rows.length; r++) {
                                            const cell = rows[r][c];
                                            if (
                                                cell !== undefined &&
                                                cell !== null &&
                                                String(cell).trim() !== ""
                                            ) {
                                                optionsSet.add(String(cell).trim());
                                            }
                                        }

                                        const options = Array.from(optionsSet);

                                        // Only add step if it has at least one option
                                        if (options.length > 0) {
                                            steps.push({ name: stepName, options });
                                        }
                                    }

                                    if (steps.length > 0) {
                                        parsedSheets.push({ name: sheetName, steps });
                                    }
                                });

                                if (parsedSheets.length > 0) {
                                    if (onCreateSheetsFromExcel) {
                                        onCreateSheetsFromExcel(parsedSheets);
                                    } else {
                                        // Fallback: create a single sheet that mirrors first parsed sheet
                                        const first = parsedSheets[0];
                                        onCreateSheet(first.name);
                                    }
                                } else {
                                    window.alert("선택한 엑셀에서 읽을 수 있는 데이터가 없습니다.");
                                }
                            } catch (err) {
                                console.error("엑셀 파싱 중 오류:", err);
                                window.alert("엑셀 파일을 처리하는 중 오류가 발생했습니다.");
                            }
                        }}
                    />

                    <button
                        className={styles.sheetTabAdd}
                        onClick={() => onCreateSheet()}
                        title="새 시트 추가"
                    >
                        +
                    </button>

                    <button
                        className={styles.sheetTabAdd}
                        onClick={() => fileInputRef.current?.click()}
                        title="엑셀로 시트 추가"
                        style={{ marginLeft: 8 }}
                    >
                        ⬆️
                    </button>
                </>
            </div>

            {contextMenu && (
                <div
                    className={styles.contextMenu}
                    style={{
                        position: "fixed",
                        left: contextMenu.x,
                        top: contextMenu.y,
                        zIndex: 1000,
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div
                        className={styles.contextMenuItem}
                        onClick={() => handleContextMenuAction("rename")}
                    >
                        이름 바꾸기
                    </div>
                    <div
                        className={styles.contextMenuItem}
                        onClick={() => handleContextMenuAction("copy")}
                    >
                        시트 복사
                    </div>
                    {sheets.length > 1 && (
                        <div
                            className="context-menu-item danger"
                            onClick={() => handleContextMenuAction("delete")}
                        >
                            시트 삭제
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SheetTabs;
