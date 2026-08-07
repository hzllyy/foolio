"use client";

import { useCallback } from "react";
import type { ChangeEvent, CSSProperties } from "react";
import { TextField } from "@/components/design-system";
import { resolveElementStyle } from "@/document/geometry";
import type { ElementStyle } from "@/document/schema";
import { useDocumentState, useEditorStores, useSessionState } from "./EditorShell";
import styles from "./Inspector.module.css";

type StyleField = keyof Pick<
  ElementStyle,
  "x" | "y" | "width" | "height" | "rotationDeg" | "opacity"
>;

/** Contextual property panel: transform + typography for the current selection, or page settings when nothing is selected. */
export function Inspector() {
  const { documentStore, sessionStore } = useEditorStores();
  const activeDocument = useDocumentState((state) => state.document);
  const activePageId = useSessionState((state) => state.activePageId);
  const viewport = useSessionState((state) => state.viewport);
  const zoomPercent = useSessionState((state) => state.zoomPercent);
  const selectedElementIds = useSessionState((state) => state.selectedElementIds);

  const page = activeDocument.pages[activePageId];
  const singleElementId = selectedElementIds.length === 1 ? selectedElementIds[0] : undefined;
  const element = singleElementId ? activeDocument.elements[singleElementId] : undefined;

  const patchStyleField = useCallback(
    (field: StyleField, value: number) => {
      if (!singleElementId) return;
      const gestureId = `inspector-${singleElementId}-${field}`;
      const fields = { [field]: value };
      documentStore.getState().dispatch(
        {
          type: "element.patch",
          payload: {
            elementId: singleElementId,
            ...(viewport === "mobile" ? { mobileOverride: fields } : { base: fields }),
          },
        },
        { gestureId },
      );
    },
    [documentStore, singleElementId, viewport],
  );

  const handleNumberChange = (field: StyleField) => (event: ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value);
    if (Number.isFinite(value)) patchStyleField(field, value);
  };

  const handleFieldBlur = useCallback(() => {
    documentStore.getState().endGesture();
  }, [documentStore]);

  if (!page) return <aside className={styles.inspector} />;

  if (!element) {
    const activeViewport = page.viewports[viewport];
    const viewportSwitchStyle = {
      "--viewport-offset": viewport === "desktop" ? "0%" : "100%",
    } as CSSProperties;
    const zoomFillPercent = ((zoomPercent - 25) / (200 - 25)) * 100;
    const zoomSliderStyle = {
      "--zoom-fill": `${zoomFillPercent}%`,
    } as CSSProperties;
    return (
      <aside className={styles.inspector} aria-label="Page settings">
        <section className={styles.canvasSection} aria-label="Canvas settings">
          <h2 className={styles.heading}>canvas</h2>

          <div className={styles.viewportSwitcher} role="group" aria-label="Viewport selector">
            <span className={styles.viewportTrack} style={viewportSwitchStyle} aria-hidden="true" />
            <button
              type="button"
              className={styles.viewportOption}
              aria-pressed={viewport === "desktop"}
              onClick={() => sessionStore.getState().setViewport("desktop")}
            >
              <span className={[styles.viewportIcon, styles.desktopIcon].join(" ")} aria-hidden="true" />
            </button>
            <button
              type="button"
              className={styles.viewportOption}
              aria-pressed={viewport === "mobile"}
              onClick={() => sessionStore.getState().setViewport("mobile")}
            >
              <span className={[styles.viewportIcon, styles.mobileIcon].join(" ")} aria-hidden="true" />
            </button>
          </div>

          <label className={styles.zoomBar}>
            <span className={styles.zoomLabel}>page zoom:</span>
            <input
              className={styles.zoomRange}
              style={zoomSliderStyle}
              type="range"
              min={25}
              max={200}
              step={5}
              value={zoomPercent}
              onChange={(event) => sessionStore.getState().setZoomPercent(Number(event.target.value))}
              aria-label="Zoom"
            />
          </label>

          <label className={styles.pageHeightCard}>
            <span className={styles.pageHeightLabel}>page height:</span>
            <span className={styles.pageHeightValueWrap}>
              <input
                className={styles.pageHeightValue}
                type="number"
                value={activeViewport.scrollLengthPx}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  if (!Number.isFinite(value)) return;
                  documentStore.getState().dispatch({
                    type: "page.resize",
                    payload: { pageId: page.id, viewport, scrollLengthPx: value },
                  });
                }}
              />
              <span className={styles.pageHeightUnit}>px</span>
            </span>
          </label>

        </section>
      </aside>
    );
  }

  const resolved = resolveElementStyle(element, viewport);
  const opacityPercent = Math.round(resolved.opacity * 100);
  const opacitySliderStyle = {
    "--opacity-fill": `${opacityPercent}%`,
  } as CSSProperties;

  return (
    <aside className={styles.inspector} aria-label="Element properties">
      <h2 className={styles.heading}>{element.name}</h2>
      <section className={styles.elementProps} aria-label="Transform controls">
        <div className={styles.pairLabelRow}>
          <span className={styles.propertyLabel}>position</span>
          <span className={styles.propertyLabel}></span>
        </div>
        <div className={styles.pairRow}>
          <label className={styles.pillField} htmlFor="element-x">
            <span className={styles.pillPrefix}>X</span>
            <input
              id="element-x"
              className={styles.pillInput}
              type="number"
              value={resolved.x}
              onChange={handleNumberChange("x")}
              onBlur={handleFieldBlur}
              disabled={element.locked}
            />
          </label>
          <label className={styles.pillField} htmlFor="element-y">
            <span className={styles.pillPrefix}>Y</span>
            <input
              id="element-y"
              className={styles.pillInput}
              type="number"
              value={resolved.y}
              onChange={handleNumberChange("y")}
              onBlur={handleFieldBlur}
              disabled={element.locked}
            />
          </label>
        </div>

        <div className={styles.pairLabelRow}>
          <span className={styles.propertyLabel}>rotation</span>
          <span className={styles.propertyLabel}>scale</span>
        </div>
        <div className={styles.pairRow}>
          <label className={styles.pillField} htmlFor="element-rotation">
            <span
              className={[styles.iconPrefix, styles.rotationIcon].join(" ")}
              aria-hidden="true"
            />
            <input
              id="element-rotation"
              className={styles.pillInput}
              type="number"
              value={resolved.rotationDeg}
              onChange={handleNumberChange("rotationDeg")}
              onBlur={handleFieldBlur}
              disabled={element.locked}
            />
          </label>
          <label className={styles.pillField} htmlFor="element-width">
            <span className={[styles.iconPrefix, styles.scaleIcon].join(" ")} aria-hidden="true" />
            <input
              id="element-width"
              className={styles.pillInput}
              type="number"
              value={resolved.width}
              onChange={handleNumberChange("width")}
              onBlur={handleFieldBlur}
              disabled={element.locked}
            />
          </label>
        </div>

        <div className={styles.pairLabelRow}>
          <span className={styles.propertyLabel}>height</span>
          <span className={styles.propertyLabel}>width</span>
        </div>
        <div className={styles.pairRow}>
          <label className={styles.pillField} htmlFor="element-height">
            <span className={styles.pillPrefix}>H</span>
            <input
              id="element-height"
              className={styles.pillInput}
              type="number"
              value={resolved.height}
              onChange={handleNumberChange("height")}
              onBlur={handleFieldBlur}
              disabled={element.locked}
            />
          </label>
          <label className={styles.pillField} htmlFor="element-width">
            <span className={styles.pillPrefix}>W</span>
            <input
              id="element-width"
              className={styles.pillInput}
              type="number"
              value={resolved.width}
              onChange={handleNumberChange("width")}
              onBlur={handleFieldBlur}
              disabled={element.locked}
            />
          </label>
        </div>

        <div className={styles.pairLabelRow}>
          <span className={styles.propertyLabel}>opacity</span>
          <span className={styles.propertyLabel}></span>
        </div>
        <div className={styles.opacityCard}>
            <div className={styles.opacityReadout}>
              <span
                className={[styles.iconPrefix, styles.opacityIcon].join(" ")}
                aria-hidden="true"
              />
              <span>{opacityPercent}%</span>
            </div>
            <input
              className={styles.opacitySlider}
              style={opacitySliderStyle}
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={resolved.opacity}
              onChange={handleNumberChange("opacity")}
              onBlur={handleFieldBlur}
              disabled={element.locked}
              aria-label="Opacity"
            />
          </div>
      </section>

      {element.content.kind === "text" && (
        <fieldset className={styles.group}>
          <legend>Typography</legend>
          <TextField
            label="Text"
            value={element.content.text}
            onChange={(event) => {
              if (!singleElementId) return;
              documentStore.getState().dispatch({
                type: "element.patch",
                payload: {
                  elementId: singleElementId,
                  content: {
                    ...element.content,
                    text: event.target.value,
                  } as typeof element.content,
                },
              });
            }}
          />
          <TextField
            label="Font size (px)"
            type="number"
            value={element.content.typography.fontSizePx}
            onChange={(event) => {
              if (!singleElementId) return;
              const value = Number(event.target.value);
              if (!Number.isFinite(value)) return;
              const content = element.content as Extract<typeof element.content, { kind: "text" }>;
              documentStore.getState().dispatch({
                type: "element.patch",
                payload: {
                  elementId: singleElementId,
                  content: { ...content, typography: { ...content.typography, fontSizePx: value } },
                },
              });
            }}
          />
        </fieldset>
      )}
    </aside>
  );
}
