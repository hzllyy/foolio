import { describe, expect, it } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { createDocumentStore } from "@/editor/store/documentStore";
import { createSessionStore } from "@/editor/store/sessionStore";
import { fixtureProjectDocument } from "@/document/schema/fixtures";
import { EditorStoresProvider } from "./EditorShell";
import { Pages } from "./Pages";

function renderPages() {
  const documentStore = createDocumentStore(fixtureProjectDocument);
  const sessionStore = createSessionStore({ activePageId: "page-1" });
  const utils = render(
    <EditorStoresProvider value={{ documentStore, sessionStore, assetUrls: new Map() }}>
      <Pages />
    </EditorStoresProvider>,
  );
  return { ...utils, documentStore, sessionStore };
}

describe("Pages", () => {
  it("lists every page in pageOrder", () => {
    renderPages();
    expect(screen.getByTestId("page-row-page-1")).toBeInTheDocument();
    expect(screen.getByText("Home")).toBeInTheDocument();
  });

  it("clicking a page sets it active in the session store", () => {
    const { documentStore, sessionStore } = renderPages();
    act(() => {
      documentStore.getState().dispatch({
        type: "page.create",
        payload: { id: "page-2", name: "About", slug: "about" },
      });
    });

    fireEvent.click(screen.getByText("About"));
    expect(sessionStore.getState().activePageId).toBe("page-2");
  });

  it("Add page appends a new page and selects it", () => {
    const { documentStore, sessionStore } = renderPages();

    fireEvent.click(screen.getByText("+ Add page"));

    const document = documentStore.getState().document;
    expect(document.pageOrder).toHaveLength(2);
    const newPageId = document.pageOrder[1]!;
    expect(document.pages[newPageId]!.name).toBe("New page");
    expect(sessionStore.getState().activePageId).toBe(newPageId);
  });

  it("Delete is disabled when there is only one page", () => {
    renderPages();
    expect(screen.getByRole("button", { name: "Delete Home" })).toBeDisabled();
  });

  it("Duplicate clones the page and its elements", () => {
    const { documentStore, sessionStore } = renderPages();

    fireEvent.click(screen.getByRole("button", { name: "Duplicate Home" }));

    const document = documentStore.getState().document;
    expect(document.pageOrder).toHaveLength(2);
    const newPageId = document.pageOrder[1]!;
    expect(document.pages[newPageId]!.name).toBe("Home copy");
    expect(document.pages[newPageId]!.rootElementIds).toHaveLength(
      document.pages["page-1"]!.rootElementIds.length,
    );
    expect(sessionStore.getState().activePageId).toBe(newPageId);
  });

  it("Move Up/Down reorders pages", () => {
    const { documentStore } = renderPages();
    act(() => {
      documentStore.getState().dispatch({
        type: "page.create",
        payload: { id: "page-2", name: "About", slug: "about" },
      });
    });

    fireEvent.click(screen.getByRole("button", { name: "Move About up" }));
    expect(documentStore.getState().document.pageOrder).toEqual(["page-2", "page-1"]);
  });

  it("renaming a page commits on blur", () => {
    const { documentStore } = renderPages();

    fireEvent.doubleClick(screen.getByText("Home"));
    const input = screen.getByDisplayValue("Home");
    fireEvent.change(input, { target: { value: "Landing" } });
    fireEvent.blur(input);

    expect(documentStore.getState().document.pages["page-1"]!.name).toBe("Landing");
  });

  it("Delete removes a page and falls back to the remaining page when it was active", () => {
    const { documentStore, sessionStore } = renderPages();
    act(() => {
      documentStore.getState().dispatch({
        type: "page.create",
        payload: { id: "page-2", name: "About", slug: "about" },
      });
    });

    fireEvent.click(screen.getByRole("button", { name: "Delete Home" }));

    expect(documentStore.getState().document.pageOrder).toEqual(["page-2"]);
    expect(sessionStore.getState().activePageId).toBe("page-2");
  });
});
