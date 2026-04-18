"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";

export type SearchableSelectOption = {
  id: number;
  label: string;
  description?: string;
  searchText?: string;
  disabled?: boolean;
};

type Props = {
  value: number | null;
  onChange: (value: number) => void;
  options: SearchableSelectOption[];
  placeholder: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
};

export default function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder = "Search...",
  emptyMessage = "No matches found.",
  disabled = false,
  loading = false,
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [menuStyle, setMenuStyle] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
    placement: "top" | "bottom";
  } | null>(null);

  const selectedOption = useMemo(
    () => options.find((option) => option.id === value) ?? null,
    [options, value],
  );

  const filteredOptions = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return options;

    return options.filter((option) => {
      const searchable = [option.label, option.description, option.searchText]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return searchable.includes(search);
    });
  }, [options, query]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  useEffect(() => {
    if (!open) {
      setMenuStyle(null);
      return;
    }

    const updatePosition = () => {
      const trigger = rootRef.current?.querySelector("button");
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom - 8;
      const spaceAbove = rect.top - 8;
      const estimatedHeight = 320;
      const placement = spaceBelow >= 240 || spaceBelow >= spaceAbove ? "bottom" : "top";
      const maxHeight = placement === "bottom"
        ? Math.max(180, Math.min(estimatedHeight, spaceBelow))
        : Math.max(180, Math.min(estimatedHeight, spaceAbove));

      setMenuStyle({
        top: placement === "bottom" ? rect.bottom + 8 : Math.max(8, rect.top - 8),
        left: rect.left,
        width: rect.width,
        maxHeight,
        placement,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  const showPlaceholder = !selectedOption;
  const triggerTextClassName = showPlaceholder ? "text-stone-400" : "text-stone-800";
  const triggerIconClassName = disabled ? "text-stone-300" : "text-stone-400";

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        title={selectedOption ? selectedOption.label : placeholder}
        onClick={() => {
          if (disabled) return;
          setOpen((prev) => !prev);
        }}
        className={`flex w-full items-start justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-[13px] transition focus:outline-none focus:ring-2 focus:ring-[#1a5c2e]/20 ${
          disabled
            ? "cursor-not-allowed border-stone-200 bg-stone-100 text-stone-800"
            : "border-stone-200 bg-white text-stone-800 hover:border-stone-300"
        }`}
      >
        <span
          className={`min-w-0 flex-1 whitespace-normal break-words ${triggerTextClassName}`}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={14} className={`mt-0.5 shrink-0 ${triggerIconClassName}`} />
      </button>

      {open && !disabled && menuStyle &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-[9999] overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl"
            style={{
              top: menuStyle.placement === "bottom" ? menuStyle.top : undefined,
              bottom: menuStyle.placement === "top" ? window.innerHeight - menuStyle.top + 8 : undefined,
              left: menuStyle.left,
              width: menuStyle.width,
            }}
          >
            <div className="flex items-center gap-2 border-b border-stone-100 px-3 py-2">
              <Search size={14} className="text-stone-400" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                className="w-full bg-transparent text-[13px] text-stone-800 outline-none placeholder:text-stone-400"
              />
            </div>

            <div className="overflow-y-auto py-1" style={{ maxHeight: menuStyle.maxHeight }}>
              {loading ? (
                <div className="px-3 py-2 text-[13px] text-stone-500">Loading...</div>
              ) : filteredOptions.length === 0 ? (
                <div className="px-3 py-2 text-[13px] text-stone-500">{emptyMessage}</div>
              ) : (
                filteredOptions.map((option) => {
                  const isSelected = option.id === value;
                  return (
                    <button
                      type="button"
                      key={option.id}
                      disabled={option.disabled}
                      title={option.label}
                      onClick={() => {
                        if (option.disabled) return;
                        onChange(option.id);
                        setOpen(false);
                      }}
                      className={`flex w-full items-start justify-between gap-3 px-3 py-2.5 text-left transition ${
                        option.disabled
                          ? "cursor-not-allowed text-stone-300"
                          : isSelected
                            ? "bg-[#eeeffe] text-[#2b2d7e]"
                            : "text-stone-800 hover:bg-stone-50"
                      }`}
                    >
                      <span className="min-w-0 flex-1">
                          <span className="block whitespace-normal break-words text-[13px] font-medium">
                            {option.label}
                          </span>
                        {option.description && (
                          <span className="block whitespace-normal break-words text-[12px] text-stone-500">
                            {option.description}
                          </span>
                        )}
                      </span>
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                        {isSelected && <Check size={14} className="text-[#2b2d7e]" />}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}