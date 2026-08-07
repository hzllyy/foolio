import { useId } from "react";
import type { InputHTMLAttributes } from "react";
import styles from "./TextField.module.css";

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  label: string;
  /** Visually hides the label for cases matching the Figma mock's placeholder-only look, while keeping it in the accessibility tree. */
  hideLabel?: boolean;
};

/** Figma component sheet node 107:61 (Text field). */
export function TextField({ label, hideLabel = false, className, ...rest }: TextFieldProps) {
  const id = useId();

  return (
    <div className={[styles.field, className].filter(Boolean).join(" ")}>
      <label htmlFor={id} className={hideLabel ? styles.visuallyHiddenLabel : styles.label}>
        {label}
      </label>
      <input id={id} className={styles.input} {...rest} />
    </div>
  );
}
