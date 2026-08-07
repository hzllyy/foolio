import styles from "./SegmentedControl.module.css";

export type EditorMode = "edit" | "animate";

type SegmentedControlProps = {
  value: EditorMode;
  onChange: (mode: EditorMode) => void;
  className?: string;
};

const OPTIONS: { value: EditorMode; label: string }[] = [
  { value: "edit", label: "edit mode" },
  { value: "animate", label: "animate mode" },
];

/** Figma component sheet node 107:396 (edit/animate segmented control). */
export function SegmentedControl({ value, onChange, className }: SegmentedControlProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Editor mode"
      className={[styles.track, className].filter(Boolean).join(" ")}
    >
      {OPTIONS.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            className={selected ? `${styles.option} ${styles.selected}` : styles.option}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
