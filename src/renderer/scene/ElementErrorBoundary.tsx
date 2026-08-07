"use client";

import { Component, type ReactNode } from "react";
import styles from "./scene.module.css";

type Props = { elementId: string; elementName: string; children: ReactNode };
type State = { hasError: boolean };

/**
 * Isolates a single element's render failure so one invalid/corrupt element
 * or missing asset cannot take down the rest of the page (see
 * docs/implementation-plan.md Phase 1 deliverables).
 */
export class ElementErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: unknown) {
    console.error(
      `Failed to render element "${this.props.elementName}" (${this.props.elementId})`,
      error,
    );
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div role="alert" className={styles.elementError} data-element-id={this.props.elementId}>
          Unable to render &quot;{this.props.elementName}&quot;
        </div>
      );
    }
    return this.props.children;
  }
}
