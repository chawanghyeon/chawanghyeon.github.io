import React, { useState, useEffect, useRef } from "react";

interface TextDetailTooltipProps {
    text: string;
    children: React.ReactNode;
    maxWidth?: number;
}

const TextDetailTooltip: React.FC<TextDetailTooltipProps> = ({
    text,
    children,
    maxWidth = 250,
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isTextTruncated, setIsTextTruncated] = useState(false);
    const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
    const elementRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const element = elementRef.current;
        if (element) {
            // Check if text is truncated
            const isOverflowing =
                element.scrollWidth > element.clientWidth ||
                element.scrollHeight > element.clientHeight;
            setIsTextTruncated(isOverflowing);
        }
    }, [text]);

    const handleMouseEnter = (e: React.MouseEvent) => {
        if (!isTextTruncated) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const scrollX =
            window.pageXOffset || document.documentElement.scrollLeft;
        const scrollY =
            window.pageYOffset || document.documentElement.scrollTop;

        let x = rect.left + scrollX;
        let y = rect.bottom + scrollY + 5;

        // Adjust position if tooltip would go off screen
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        if (x + maxWidth > viewportWidth) {
            x = viewportWidth - maxWidth - 10;
        }

        if (y + 100 > viewportHeight + scrollY) {
            y = rect.top + scrollY - 100 - 5;
        }

        setTooltipPosition({ x, y });
        setIsVisible(true);
    };

    const handleMouseLeave = () => {
        setIsVisible(false);
    };

    return (
        <>
            <div
                ref={elementRef}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                style={{
                    cursor: isTextTruncated ? "help" : "default",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                }}
            >
                {children}
            </div>

            {isVisible && isTextTruncated && (
                <div
                    ref={tooltipRef}
                    style={{
                        position: "absolute",
                        left: tooltipPosition.x,
                        top: tooltipPosition.y,
                        maxWidth: maxWidth,
                        backgroundColor: "rgba(0, 0, 0, 0.9)",
                        color: "white",
                        padding: "8px 12px",
                        borderRadius: "6px",
                        fontSize: "0.875rem",
                        lineHeight: "1.4",
                        zIndex: 1000,
                        wordWrap: "break-word",
                        whiteSpace: "normal",
                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                    }}
                >
                    {text}
                </div>
            )}
        </>
    );
};

export default TextDetailTooltip;
