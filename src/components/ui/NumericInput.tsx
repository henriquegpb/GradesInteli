"use client";
import { useState, useEffect, useCallback, useRef } from "react";

interface Props {
  value: number | null;
  onChange: (v: number | null) => void;
  className?: string;
  style?: React.CSSProperties;
  allowNull?: boolean;
}

export default function NumericInput({ value, onChange, className, style, allowNull }: Props) {
  const [raw, setRaw] = useState(value === null ? "—" : String(value));
  const focused = useRef(false);

  useEffect(() => {
    if (focused.current) return;
    if (value === null) {
      setRaw("—");
    } else {
      const parsed = parseFloat(raw);
      if (isNaN(parsed) || parsed !== value) {
        setRaw(String(value));
      }
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
    if (raw === "—") setRaw("");
  }, [raw]);

  const handleBlur = useCallback(() => {
    focused.current = false;
    const n = parseFloat(raw);
    if (isNaN(n) || raw === "" || raw === "-") {
      if (allowNull) {
        onChange(null);
        setRaw("—");
      } else {
        onChange(0);
        setRaw("0");
      }
    } else {
      setRaw(String(n));
    }
  }, [raw, onChange, allowNull]);

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
