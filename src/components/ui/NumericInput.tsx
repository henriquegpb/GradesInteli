"use client";
import { useState, useEffect, useCallback, useRef } from "react";

interface Props {
  value: number;
  onChange: (v: number) => void;
  className?: string;
  style?: React.CSSProperties;
}

export default function NumericInput({ value, onChange, className, style }: Props) {
  const [raw, setRaw] = useState(String(value));
  const focused = useRef(false);

  useEffect(() => {
    if (focused.current) return;
    const parsed = parseFloat(raw);
    if (isNaN(parsed) || parsed !== value) {
      setRaw(String(value));
    }
  }, [value]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const s = e.target.value;
      if (s === "" || s === "-" || /^-?\d*\.?\d*$/.test(s)) {
        setRaw(s);
        const n = parseFloat(s);
        if (!isNaN(n)) onChange(n);
      }
    },
    [onChange]
  );

  const handleFocus = useCallback(() => {
    focused.current = true;
  }, []);

  const handleBlur = useCallback(() => {
    focused.current = false;
    const n = parseFloat(raw);
    if (isNaN(n) || raw === "" || raw === "-") {
      onChange(0);
      setRaw("0");
    } else {
      setRaw(String(n));
    }
  }, [raw, onChange]);

  return (
    <input
      type="text"
      inputMode="decimal"
      className={className}
      style={style}
      value={raw}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
    />
  );
}
