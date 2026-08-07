"use client";

import { useState } from "react";
import type { KeyboardEvent } from "react";
import { useDocumentState, useEditorStores, useSessionState } from "./EditorShell";
import { slugify, uniqueSlug } from "./pageNaming";
import styles from "./Pages.module.css";

/** Sidebar panel listing every page in the project with add/rename/duplicate/reorder/delete controls. */
export function Pages() {
  const { documentStore, sessionStore } = useEditorStores();
  const activeDocument = useDocumentState((state) => state.document);
  const activePageId = useSessionState((state) => state.activePageId);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const pages = activeDocument.pageOrder.map((id) => activeDocument.pages[id]!);
  const existingSlugs = pages.map((page) => page.slug);

  function selectPage(pageId: string) {
    sessionStore.getState().setActivePageId(pageId);
  }

  function startRename(pageId: string, currentName: string) {
    setRenamingId(pageId);
    setRenameValue(currentName);
  }

  function commitRename(pageId: string, currentName: string) {
    const name = renameValue.trim();
    setRenamingId(null);
    if (name && name !== currentName) {
      documentStore.getState().dispatch({ type: "page.rename", payload: { pageId, name } });
    }
  }

  function handleRenameKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") (event.target as HTMLInputElement).blur();
    else if (event.key === "Escape") setRenamingId(null);
  }

  function moveUp(pageId: string) {
    const index = activeDocument.pageOrder.indexOf(pageId);
    if (index <= 0) return;
    documentStore
      .getState()
      .dispatch({ type: "page.reorder", payload: { pageId, index: index - 1 } });
  }

  function moveDown(pageId: string) {
    const index = activeDocument.pageOrder.indexOf(pageId);
    if (index === -1 || index >= activeDocument.pageOrder.length - 1) return;
    documentStore
      .getState()
      .dispatch({ type: "page.reorder", payload: { pageId, index: index + 1 } });
  }

  function addPage() {
    const id = crypto.randomUUID();
    const name = "New page";
    const slug = uniqueSlug(slugify(name), existingSlugs);
    documentStore.getState().dispatch({ type: "page.create", payload: { id, name, slug } });
    selectPage(id);
  }

  function duplicatePage(pageId: string) {
    const source = activeDocument.pages[pageId];
    if (!source) return;
    const newPageId = crypto.randomUUID();
    const name = `${source.name} copy`;
    const slug = uniqueSlug(slugify(name), existingSlugs);

    const sourceElementIds = Object.values(activeDocument.elements)
      .filter((element) => element.pageId === pageId)
      .map((element) => element.id);
    const elementIdMap = Object.fromEntries(
      sourceElementIds.map((elementId) => [elementId, crypto.randomUUID()]),
    );

    documentStore.getState().dispatch({
      type: "page.duplicate",
      payload: { sourcePageId: pageId, newPageId, name, slug, elementIdMap },
    });
    selectPage(newPageId);
  }

  function deletePage(pageId: string) {
    if (activeDocument.pageOrder.length <= 1) return;
    const index = activeDocument.pageOrder.indexOf(pageId);
    documentStore.getState().dispatch({ type: "page.delete", payload: { pageId } });

    if (activePageId === pageId) {
      const remaining = activeDocument.pageOrder.filter((id) => id !== pageId);
      const fallbackId = remaining[index - 1] ?? remaining[0];
      if (fallbackId) selectPage(fallbackId);
    }
  }

  return (
    <section className={styles.pages} aria-label="Pages">
      <h2 className={styles.heading}>Pages</h2>
      <ul className={styles.list}>
        {pages.map((page, index) => {
          const isActive = page.id === activePageId;
          return (
            <li
              key={page.id}
              className={[styles.row, isActive && styles.active].filter(Boolean).join(" ")}
              onClick={() => selectPage(page.id)}
              data-testid={`page-row-${page.id}`}
            >
              {renamingId === page.id ? (
                <input
                  className={styles.nameInput}
                  autoFocus
                  value={renameValue}
                  onChange={(event) => setRenameValue(event.target.value)}
                  onBlur={() => commitRename(page.id, page.name)}
                  onKeyDown={handleRenameKeyDown}
                  onClick={(event) => event.stopPropagation()}
                />
              ) : (
                <span
                  className={styles.name}
                  onDoubleClick={(event) => {
                    event.stopPropagation();
                    startRename(page.id, page.name);
                  }}
                >
                  {page.name}
                </span>
              )}

              <div className={styles.actions} onClick={(event) => event.stopPropagation()}>
                <button
                  type="button"
                  className={styles.actionButton}
                  onClick={() => moveUp(page.id)}
                  disabled={index === 0}
                  aria-label={`Move ${page.name} up`}
                >
                  Up
                </button>
                <button
                  type="button"
                  className={styles.actionButton}
                  onClick={() => moveDown(page.id)}
                  disabled={index === pages.length - 1}
                  aria-label={`Move ${page.name} down`}
                >
                  Down
                </button>
                <button
                  type="button"
                  className={styles.actionButton}
                  onClick={() => duplicatePage(page.id)}
                  aria-label={`Duplicate ${page.name}`}
                >
                  Duplicate
                </button>
                <button
                  type="button"
                  className={styles.actionButton}
                  onClick={() => deletePage(page.id)}
                  disabled={pages.length <= 1}
                  aria-label={`Delete ${page.name}`}
                >
                  Delete
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <button type="button" className={styles.addButton} onClick={addPage}>
        + Add page
      </button>
    </section>
  );
}
