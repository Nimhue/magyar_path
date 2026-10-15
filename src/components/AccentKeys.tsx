import type { RefObject } from "react";

const KEYS = ["á", "é", "í", "ó", "ö", "ő", "ú", "ü", "ű"];

/** A row of Hungarian vowel buttons that type into the given input. */
export function AccentKeys({
  inputRef,
  value,
  onChange,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  value: string;
  onChange: (v: string) => void;
}) {
  const insert = (ch: string) => {
    const el = inputRef.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const next = value.slice(0, start) + ch + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      el.setSelectionRange(start + 1, start + 1);
    });
  };
  return (
    <div className="accent-keys" role="group" aria-label="Hungarian letters">
      {KEYS.map((k) => (
        <button
          type="button"
          key={k}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => insert(k)}
          aria-label={`Type ${k}`}
        >
          {k}
        </button>
      ))}
    </div>
  );
}
