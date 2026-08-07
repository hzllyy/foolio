"use client";

import { useState } from "react";
import type { KeyboardEvent } from "react";
import type { ElementNode, ProjectDocument } from "@/document/schema";
import { traversePage } from "@/document/schema";
import { useDocumentState, useEditorStores, useSessionState } from "./EditorShell";
import styles from "./Layers.module.css";

const INDENT_PX = 16;

type Row = { element: ElementNode; depth: number };

function elementBaseLabel(element: ElementNode): string {
  switch (element.content.kind) {
    case "shape":
      return element.content.shape === "ellipse" ? "Ellipse" : "Rectangle";
    case "polygon":
      return "Polygon";
    case "image":
      return "Image";
    case "path":
      return "Vector";
    case "sprite":
      return "Sprite";
    case "group":
      return "Group";
    case "text":
      return "Text";
    default:
      return "Layer";
  }
}

function buildLayerDisplayNames(rows: Row[]): Map<string, string> {
  const names = new Map<string, string>();
  const countsByBaseLabel = new Map<string, number>();

  for (const { element } of rows) {
    if (element.content.kind === "text") {
      const textLabel = element.content.text.trim();
      if (textLabel.length > 0) {
        names.set(element.id, textLabel);
        continue;
      }
    }

    const baseLabel = elementBaseLabel(element);
    const nextCount = (countsByBaseLabel.get(baseLabel) ?? 0) + 1;
    countsByBaseLabel.set(baseLabel, nextCount);
    names.set(element.id, `${baseLabel} ${nextCount}`);
  }

  return names;
}

/** Flattens the active page's element tree into paint-order rows, skipping the subtrees of collapsed groups. */
function buildRows(document: ProjectDocument, pageId: string, collapsedIds: Set<string>): Row[] {
  const rows: Row[] = [];
  let hiddenBelowDepth: number | null = null;

  traversePage(document, pageId, (element, depth) => {
    if (hiddenBelowDepth !== null) {
      if (depth > hiddenBelowDepth) return;
      hiddenBelowDepth = null;
    }
    rows.push({ element, depth });
    if (collapsedIds.has(element.id) && element.childIds.length > 0) {
      hiddenBelowDepth = depth;
    }
  });

  return rows;
}

/** Sidebar panel listing every element on the active page in paint order with visibility/lock/reorder controls. */
export function Layers() {
  const { documentStore, sessionStore } = useEditorStores();
  const activeDocument = useDocumentState((state) => state.document);
  const activePageId = useSessionState((state) => state.activePageId);
  const selectedElementIds = useSessionState((state) => state.selectedElementIds);
  const hoverElementId = useSessionState((state) => state.hoverElementId);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [canvasCollapsed, setCanvasCollapsed] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const page = activeDocument.pages[activePageId];
  const rows = page ? buildRows(activeDocument, activePageId, collapsedIds) : [];
  const layerDisplayNames = buildLayerDisplayNames(rows);

  function siblingsFor(element: ElementNode): string[] {
    if (!page) return [];
    return element.parentId === null
      ? page.rootElementIds
      : (activeDocument.elements[element.parentId]?.childIds ?? []);
  }

  function toggleCollapsed(elementId: string) {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(elementId)) next.delete(elementId);
      else next.add(elementId);
      return next;
    });
  }

  function selectRow(element: ElementNode, event: { metaKey: boolean; ctrlKey: boolean }) {
    if (event.metaKey || event.ctrlKey) sessionStore.getState().toggleSelect(element.id);
    else sessionStore.getState().selectOnly(element.id);
  }

  function toggleHidden(element: ElementNode) {
    documentStore.getState().dispatch({
      type: "element.patch",
      payload: { elementId: element.id, hidden: !element.hidden },
    });
  }

  function toggleLocked(element: ElementNode) {
    documentStore.getState().dispatch({
      type: "element.patch",
      payload: { elementId: element.id, locked: !element.locked },
    });
  }

  function startRename(element: ElementNode) {
    setRenamingId(element.id);
    setRenameValue(element.name);
  }

  function commitRename(element: ElementNode) {
    const name = renameValue.trim();
    setRenamingId(null);
    if (name && name !== element.name) {
      documentStore.getState().dispatch({
        type: "element.patch",
        payload: { elementId: element.id, name },
      });
    }
  }

  function handleRenameKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") (event.target as HTMLInputElement).blur();
    else if (event.key === "Escape") setRenamingId(null);
  }

  function moveUp(element: ElementNode) {
    const siblings = siblingsFor(element);
    const index = siblings.indexOf(element.id);
    if (index <= 0) return;
    documentStore.getState().dispatch({
      type: "element.reparent",
      payload: { elementId: element.id, newParentId: element.parentId, index: index - 1 },
    });
  }

  function moveDown(element: ElementNode) {
    const siblings = siblingsFor(element);
    const index = siblings.indexOf(element.id);
    if (index === -1 || index >= siblings.length - 1) return;
    documentStore.getState().dispatch({
      type: "element.reparent",
      payload: { elementId: element.id, newParentId: element.parentId, index: index + 1 },
    });
  }

  function indent(element: ElementNode) {
    const siblings = siblingsFor(element);
    const index = siblings.indexOf(element.id);
    if (index <= 0) return;
    const newParentId = siblings[index - 1]!;
    const newParent = activeDocument.elements[newParentId];
    if (!newParent) return;
    documentStore.getState().dispatch({
      type: "element.reparent",
      payload: { elementId: element.id, newParentId, index: newParent.childIds.length },
    });
  }

  function outdent(element: ElementNode) {
    if (!page || element.parentId === null) return;
    const parent = activeDocument.elements[element.parentId];
    if (!parent) return;
    const grandparentId = parent.parentId;
    const grandparentSiblings =
      grandparentId === null
        ? page.rootElementIds
        : (activeDocument.elements[grandparentId]?.childIds ?? []);
    const parentIndex = grandparentSiblings.indexOf(parent.id);
    documentStore.getState().dispatch({
      type: "element.reparent",
      payload: { elementId: element.id, newParentId: grandparentId, index: parentIndex + 1 },
    });
  }

  if (!page) return <section className={styles.layers} aria-label="Layers" />;

  return (
    <section className={styles.layers} aria-label="Layers">
      <h2 className={styles.heading}>layers</h2>
      <button
        type="button"
        className={styles.canvasRow}
        aria-label={canvasCollapsed ? "Expand canvas" : "Collapse canvas"}
        onClick={() => setCanvasCollapsed((collapsed) => !collapsed)}
      >
        <span className={styles.canvasDisclosure} aria-hidden="true">
          {canvasCollapsed ? "▸" : "▾"}
        </span>
        <span className={styles.canvasLabel}>canvas</span>
      </button>
      <ul className={styles.list}>
        {!canvasCollapsed &&
          rows.map(({ element, depth }) => {
          const layerLabel = layerDisplayNames.get(element.id) ?? element.name;
          const siblings = siblingsFor(element);
          const index = siblings.indexOf(element.id);
          const isSelected = selectedElementIds.includes(element.id);
          const isHovered = hoverElementId === element.id;
          const hasChildren = element.childIds.length > 0;
          const isCollapsed = collapsedIds.has(element.id);

          return (
            <li
              key={element.id}
              className={[styles.row, isSelected && styles.selected, isHovered && styles.hovered]
                .filter(Boolean)
                .join(" ")}
              style={{ paddingLeft: depth * INDENT_PX }}
              onClick={(event) => selectRow(element, event)}
              onMouseEnter={() => sessionStore.getState().setHoverElementId(element.id)}
              onMouseLeave={() => sessionStore.getState().setHoverElementId(null)}
              data-testid={`layer-row-${element.id}`}
            >
              <button
                type="button"
                className={styles.disclosure}
                aria-label={isCollapsed ? `Expand ${element.name}` : `Collapse ${element.name}`}
                disabled={!hasChildren}
                onClick={(event) => {
                  event.stopPropagation();
                  toggleCollapsed(element.id);
                }}
              >
                {hasChildren ? (isCollapsed ? "▸" : "▾") : ""}
              </button>

              {renamingId === element.id ? (
                <input
                  className={styles.nameInput}
                  autoFocus
                  value={renameValue}
                  onChange={(event) => setRenameValue(event.target.value)}
                  onBlur={() => commitRename(element)}
                  onKeyDown={(event) => handleRenameKeyDown(event)}
                  onClick={(event) => event.stopPropagation()}
                />
              ) : (
                <span
                  className={styles.name}
                  data-testid={`layer-name-${element.id}`}
                  onDoubleClick={(event) => {
                    event.stopPropagation();
                    startRename(element);
                  }}
                >
                  {layerLabel}
                </span>
              )}

              <div className={styles.actions} onClick={(event) => event.stopPropagation()}>
                <button
                  type="button"
                  className={styles.actionButton}
                  onClick={() => outdent(element)}
                  disabled={element.parentId === null}
                  aria-label={`Outdent ${element.name}`}
                >
                  Outdent
                </button>
                <button
                  type="button"
                  className={styles.actionButton}
                  onClick={() => indent(element)}
                  disabled={index <= 0}
                  aria-label={`Indent ${element.name}`}
                >
                  Indent
                </button>
                <button
                  type="button"
                  className={styles.actionButton}
                  onClick={() => moveUp(element)}
                  disabled={index <= 0}
                  aria-label={`Move ${element.name} up`}
                >
                  Up
                </button>
                <button
                  type="button"
                  className={styles.actionButton}
                  onClick={() => moveDown(element)}
                  disabled={index === -1 || index >= siblings.length - 1}
                  aria-label={`Move ${element.name} down`}
                >
                  Down
                </button>
                <button
                  type="button"
                  className={styles.actionButton}
                  onClick={() => toggleLocked(element)}
                  aria-pressed={element.locked}
                  aria-label={element.locked ? `Unlock ${element.name}` : `Lock ${element.name}`}
                >
                  {element.locked ? "Unlock" : "Lock"}
                </button>
                <button
                  type="button"
                  className={styles.actionButton}
                  onClick={() => toggleHidden(element)}
                  aria-pressed={element.hidden}
                  aria-label={element.hidden ? `Show ${element.name}` : `Hide ${element.name}`}
                >
                  {element.hidden ? "Show" : "Hide"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
