import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./Button.module.css";

export type ButtonKind = "primary" | "tertiary";
export type ButtonEmphasis = "outline" | "solid";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  kind?: ButtonKind;
  emphasis?: ButtonEmphasis;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
};

/**
 * Figma component sheet node 107:22 (Button-primary, Button-tertiary).
 * `kind` maps to the Figma frame; `emphasis` normalizes each frame's
 * `Property 1` variants ("Default"/"filled"/"Variant2") into outline vs solid.
 */
export function Button({
  kind = "primary",
  emphasis = "outline",
  leadingIcon,
  trailingIcon,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  const classes = [styles.button, styles[kind], styles[emphasis], className]
    .filter(Boolean)
    .join(" ");

  return (
    <button type={type} className={classes} {...rest}>
      {leadingIcon}
      <span className={styles.label}>{children}</span>
      {trailingIcon}
    </button>
  );
}
