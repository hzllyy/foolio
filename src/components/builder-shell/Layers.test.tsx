import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { createDocumentStore } from "@/editor/store/documentStore";
import { createSessionStore } from "@/editor/store/sessionStore";
import { fixtureProjectDocument } from "@/document/schema/fixtures";
import { EditorStoresProvider } from "./EditorShell";
import { Layers } from "./Layers";

function renderLayers() {
  const documentStore = createDocumentStore(fixtureProjectDocument);
  const sessionStore = createSessionStore({ activePageId: "page-1" });
  const utils = render(
    <EditorStoresProvider value={{ documentStore, sessionStore, assetUrls: new Map() }}>
      <Layers />
    </EditorStoresProvider>,
  );
  return { ...utils, documentStore, sessionStore };
}

describe("Layers", () => {
  it("lists every element on the active page in paint order", () => {
    renderLayers();

    const rows = screen.getAllByTestId(/^layer-row-/);
    expect(rows.map((row) => row.dataset.testid)).toEqual([
      "layer-row-hero-group",
      "layer-row-hero-shape",
      "layer-row-hero-text",
      "layer-row-hero-polygon",
      "layer-row-hero-image",
      "layer-row-hero-path",
      "layer-row-hero-sprite",
    ]);
  });

  it("collapsing a group hides its descendants but keeps it in the list", () => {
    renderLayers();

    fireEvent.click(screen.getByRole("button", { name: "Collapse Hero group" }));

    expect(screen.getByTestId("layer-row-hero-group")).toBeInTheDocument();
    expect(screen.queryByTestId("layer-row-hero-shape")).not.toBeInTheDocument();
    expect(screen.queryByTestId("layer-row-hero-text")).not.toBeInTheDocument();
    expect(screen.getByTestId("layer-row-hero-polygon")).toBeInTheDocument();
  });

  it("clicking a row selects it in the session store", () => {
    const { sessionStore } = renderLayers();

    fireEvent.click(screen.getByTestId("layer-row-hero-polygon"));

    expect(sessionStore.getState().selectedElementIds).toEqual(["hero-polygon"]);
  });

  it("Hide/Show toggles the element's hidden flag", () => {
    const { documentStore } = renderLayers();

    fireEvent.click(screen.getByRole("button", { name: "Hide Hero polygon" }));
    expect(documentStore.getState().document.elements["hero-polygon"]!.hidden).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Show Hero polygon" }));
    expect(documentStore.getState().document.elements["hero-polygon"]!.hidden).toBe(false);
  });

  it("Lock/Unlock toggles the element's locked flag", () => {
    const { documentStore } = renderLayers();

    fireEvent.click(screen.getByRole("button", { name: "Lock Hero polygon" }));
    expect(documentStore.getState().document.elements["hero-polygon"]!.locked).toBe(true);
  });

  it("Move Up/Down reorders siblings", () => {
    const { documentStore } = renderLayers();

    // hero-group, hero-polygon, hero-image, hero-path, hero-sprite is the root order.
    fireEvent.click(screen.getByRole("button", { name: "Move Hero polygon up" }));
    expect(documentStore.getState().document.pages["page-1"]!.rootElementIds[0]).toBe(
      "hero-polygon",
    );

    fireEvent.click(screen.getByRole("button", { name: "Move Hero polygon down" }));
    expect(documentStore.getState().document.pages["page-1"]!.rootElementIds[1]).toBe(
      "hero-polygon",
    );
  });

  it("Indent nests an element under its previous sibling", () => {
    const { documentStore } = renderLayers();

    fireEvent.click(screen.getByRole("button", { name: "Indent Hero polygon" }));

    const document = documentStore.getState().document;
    expect(document.elements["hero-polygon"]!.parentId).toBe("hero-group");
    expect(document.elements["hero-group"]!.childIds).toContain("hero-polygon");
    expect(document.pages["page-1"]!.rootElementIds).not.toContain("hero-polygon");
  });

  it("Outdent lifts an element back out to its parent's parent list", () => {
    const { documentStore } = renderLayers();

    fireEvent.click(screen.getByRole("button", { name: "Outdent Hero shape" }));

    const document = documentStore.getState().document;
    expect(document.elements["hero-shape"]!.parentId).toBeNull();
    expect(document.pages["page-1"]!.rootElementIds).toContain("hero-shape");
  });

  it("renaming a layer commits on blur", () => {
    const { documentStore } = renderLayers();

    fireEvent.doubleClick(screen.getByTestId("layer-name-hero-polygon"));
    const input = screen.getByDisplayValue("Hero polygon");
    fireEvent.change(input, { target: { value: "Renamed polygon" } });
    fireEvent.blur(input);

    expect(documentStore.getState().document.elements["hero-polygon"]!.name).toBe(
      "Renamed polygon",
    );
  });
});
