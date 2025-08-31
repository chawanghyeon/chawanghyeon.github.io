import React, { useRef, useState, useEffect } from "react";

interface AutoResizeInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  minWidth?: number;
  maxWidth?: number;
  value: string;
}

const AutoResizeInput: React.FC<AutoResizeInputProps> = ({
  minWidth = 40,
  maxWidth = 300,
  value,
  style,
  ...props
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const spanRef = useRef<HTMLSpanElement>(null);
  const [inputWidth, setInputWidth] = useState(minWidth);

  useEffect(() => {
    if (spanRef.current) {
      // Add extra space for caret and padding
      const width = Math.min(
        Math.max(spanRef.current.offsetWidth + 12, minWidth),
        maxWidth
      );
      setInputWidth(width);
    }
  }, [value, minWidth, maxWidth]);

  return (
    <>
      <input
        {...props}
        ref={inputRef}
        value={value}
        title={value || props.placeholder}
        aria-label={props["aria-label"] || value || props.placeholder}
        style={{
          ...style,
          width: inputWidth,
          minWidth,
          maxWidth,
        }}
      />
      {/* Hidden span to measure text width */}
      <span
        ref={spanRef}
        style={{
          position: "absolute",
          visibility: "hidden",
          height: 0,
          overflow: "hidden",
          whiteSpace: "pre",
          fontSize: style?.fontSize || "inherit",
          fontFamily: style?.fontFamily || "inherit",
          fontWeight: style?.fontWeight || "inherit",
          letterSpacing: style?.letterSpacing || "inherit",
          padding: style?.padding || "inherit",
        }}
      >
        {value || props.placeholder || ""}
      </span>
    </>
  );
};

export default AutoResizeInput;
