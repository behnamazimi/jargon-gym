"use client";

import { useEffect, useState, type RefObject } from "react";

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  inputRef: RefObject<HTMLInputElement | null>;
};

export function SearchBar({ value, onChange, onClear, inputRef }: SearchBarProps) {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  return (
    <div className="mb-3">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={
            isTouch
              ? "Search terms or definitions…"
              : "Search terms or definitions…  (press / to focus)"
          }
          className="w-full rounded-xl border border-border bg-surface px-3.5 py-[11px] pr-10 text-sm text-foreground outline-none focus:border-accent"
        />
        {value && (
          <button
            type="button"
            className="absolute top-1/2 right-1.5 flex h-[26px] w-[26px] -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg border-none bg-transparent text-[17px] leading-none text-muted hover:bg-chip hover:text-foreground"
            onClick={onClear}
            title="Clear search"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
