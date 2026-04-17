"use client";

import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";

type NumericStepperInputProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  disabled?: boolean;
  minChars?: number;
  className?: string;
};

const normalize = (value: number, min?: number, max?: number, precision?: number) => {
  let next = value;

  if (typeof min === "number") next = Math.max(min, next);
  if (typeof max === "number") next = Math.min(max, next);
  if (typeof precision === "number" && precision >= 0) {
    const factor = 10 ** precision;
    next = Math.round(next * factor) / factor;
  }

  return next;
};

const NumericStepperInput = ({
  value,
  onChange,
  min,
  max,
  step = 1,
  precision,
  disabled = false,
  minChars = 4,
  className = "",
}: NumericStepperInputProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(Number.isFinite(value) ? String(value) : "0");

  useEffect(() => {
    if (!isEditing) {
      setDraft(Number.isFinite(value) ? String(value) : "0");
    }
  }, [isEditing, value]);

  const display = isEditing ? draft : Number.isFinite(value) ? String(value) : "0";
  const widthChars = Math.max(minChars, display.length + 1);

  const changeByStep = (direction: -1 | 1) => {
    const next = normalize(value + direction * step, min, max, precision);
    onChange(next);
  };

  const handleInputChange = (raw: string) => {
    // Allow intermediate decimal typing states such as "12." while editing.
    if (!/^-?\d*\.?\d*$/.test(raw)) return;

    setDraft(raw);

    if (!raw.trim() || raw === "-" || raw === "." || raw === "-.") return;

    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return;

    onChange(normalize(parsed, min, max, precision));
  };

  const handleBlur = () => {
    setIsEditing(false);

    if (!draft.trim() || draft === "-" || draft === "." || draft === "-.") {
      setDraft(Number.isFinite(value) ? String(value) : "0");
      return;
    }

    const parsed = Number(draft);
    if (!Number.isFinite(parsed)) {
      setDraft(Number.isFinite(value) ? String(value) : "0");
      return;
    }

    const next = normalize(parsed, min, max, precision);
    onChange(next);
    setDraft(String(next));
  };

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-stone-50 px-1.5 py-1 ${className}`.trim()}
    >
      <button
        type="button"
        onClick={() => changeByStep(-1)}
        disabled={disabled}
        className="inline-flex h-6 w-6 items-center justify-center rounded border border-stone-200 bg-white text-stone-600 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Decrease value"
      >
        <Minus size={12} />
      </button>

      <input
        type="text"
        inputMode="decimal"
        value={display}
        onChange={(event) => handleInputChange(event.target.value)}
        onFocus={() => setIsEditing(true)}
        onBlur={handleBlur}
        disabled={disabled}
        style={{ width: `${widthChars}ch` }}
        className="border-none bg-transparent px-1 text-right text-[13px] text-stone-700 outline-none"
      />

      <button
        type="button"
        onClick={() => changeByStep(1)}
        disabled={disabled}
        className="inline-flex h-6 w-6 items-center justify-center rounded border border-stone-200 bg-white text-stone-600 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Increase value"
      >
        <Plus size={12} />
      </button>
    </div>
  );
};

export default NumericStepperInput;