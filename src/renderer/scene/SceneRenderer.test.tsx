import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SceneRenderer } from "@/renderer/scene/SceneRenderer";
import { ElementRenderer } from "@/renderer/scene/ElementRenderer";
import { AssetResolverProvider } from "@/renderer/scene/AssetResolver";
import { fixtureProjectDocument } from "@/document/schema/fixtures";
import type { ElementNode } from "@/document/schema";

describe("SceneRenderer", () => {
  it("renders every element kind from the fixture document", () => {
    const { container } = render(
      <SceneRenderer
        document={fixtureProjectDocument}
        pageId="page-1"
        viewport="desktop"
        scrollOffsetPx={0}
        mode="editor"
      />,
    );

    expect(screen.getByText("Foolio")).toBeInTheDocument();
    expect(container.querySelectorAll("svg")).toHaveLength(2); // polygon + path
    expect(screen.getAllByRole("img").length).toBeGreaterThan(0); // asset placeholders
  });

  it("resolves image/sprite assets through the AssetResolverProvider", () => {
    render(
      <AssetResolverProvider value={(assetId) => `https://cdn.example.com/${assetId}`}>
        <SceneRenderer
          document={fixtureProjectDocument}
          pageId="page-1"
          viewport="desktop"
          scrollOffsetPx={0}
          mode="editor"
        />
      </AssetResolverProvider>,
    );

    const image = screen.getByAltText("Portfolio hero photo");
    expect(image).toHaveAttribute("src", "https://cdn.example.com/asset-hero");
  });

  it("applies the mobile viewport override instead of the desktop base style", () => {
    const { container: desktop } = render(
      <SceneRenderer
        document={fixtureProjectDocument}
        pageId="page-1"
        viewport="desktop"
        scrollOffsetPx={0}
        mode="editor"
      />,
    );
    const { container: mobile } = render(
      <SceneRenderer
        document={fixtureProjectDocument}
        pageId="page-1"
        viewport="mobile"
        scrollOffsetPx={0}
        mode="editor"
      />,
    );

    const desktopShape = desktop.querySelector('[data-element-id="hero-shape"]') as HTMLElement;
    const mobileShape = mobile.querySelector('[data-element-id="hero-shape"]') as HTMLElement;

    expect(desktopShape.style.left).toBe("0px");
    expect(desktopShape.style.width).toBe("200px");
    expect(mobileShape.style.left).toBe("8px");
    expect(mobileShape.style.width).toBe("160px");
  });

  it("deterministically changes opacity as scrollOffsetPx changes", () => {
    const { container: start } = render(
      <SceneRenderer
        document={fixtureProjectDocument}
        pageId="page-1"
        viewport="desktop"
        scrollOffsetPx={0}
        mode="editor"
      />,
    );
    const { container: mid } = render(
      <SceneRenderer
        document={fixtureProjectDocument}
        pageId="page-1"
        viewport="desktop"
        scrollOffsetPx={100}
        mode="editor"
      />,
    );
    const { container: end } = render(
      <SceneRenderer
        document={fixtureProjectDocument}
        pageId="page-1"
        viewport="desktop"
        scrollOffsetPx={200}
        mode="editor"
      />,
    );

    const group = (container: HTMLElement) =>
      (container.querySelector('[data-element-id="hero-group"]') as HTMLElement).style.opacity;

    expect(group(start)).toBe("0");
    expect(group(mid)).toBe("0.5");
    expect(group(end)).toBe("1");
  });

  it("produces equivalent authored markup across render modes apart from the mode wrapper", () => {
    const { container: editor } = render(
      <SceneRenderer
        document={fixtureProjectDocument}
        pageId="page-1"
        viewport="desktop"
        scrollOffsetPx={0}
        mode="editor"
      />,
    );
    const { container: published } = render(
      <SceneRenderer
        document={fixtureProjectDocument}
        pageId="page-1"
        viewport="desktop"
        scrollOffsetPx={0}
        mode="published"
      />,
    );

    const strip = (html: string) => html.replace(/data-render-mode="[^"]*"/g, "");
    expect(strip(editor.innerHTML)).toBe(strip(published.innerHTML));
  });

  it("isolates a broken element's render failure behind an error boundary", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const broken = {
      ...fixtureProjectDocument.elements["hero-text"]!,
      content: null,
    } as unknown as ElementNode;

    render(
      <ElementRenderer
        document={fixtureProjectDocument}
        element={broken}
        viewport="desktop"
        scrollOffsetPx={0}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(/Unable to render/);
    consoleError.mockRestore();
  });

  it("shows a not-found message for a missing page", () => {
    render(
      <SceneRenderer
        document={fixtureProjectDocument}
        pageId="missing"
        viewport="desktop"
        scrollOffsetPx={0}
        mode="editor"
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Page not found");
  });
});
