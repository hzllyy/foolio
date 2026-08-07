import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import type { EditorShellProps } from "@/components/builder-shell";
import { createEmptyProject } from "@/document/schema";
import { createGuestPersistence } from "@/persistence/guest";

const routerReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: routerReplace }),
}));

let capturedShellProps: EditorShellProps | null = null;
vi.mock("@/components/builder-shell", () => ({
  EditorShell: (props: EditorShellProps) => {
    capturedShellProps = props;
    return <div data-testid="editor-shell-stub">{props.initialDocument.name}</div>;
  },
}));

// Imported after the mocks above so the mocked modules are in effect.
const { ProjectEditorPage } = await import("./ProjectEditorPage");

describe("ProjectEditorPage", () => {
  beforeEach(() => {
    routerReplace.mockClear();
    capturedShellProps = null;
  });

  it("seeds a blank project, persists the initial snapshot, and strips ?new=1", async () => {
    const projectId = "p-new-1";
    render(<ProjectEditorPage projectId={projectId} isNew />);

    await waitFor(() => expect(routerReplace).toHaveBeenCalledWith(`/projects/${projectId}`));

    const persistence = createGuestPersistence();
    const loaded = await persistence.loadProject(projectId);
    expect(loaded).toBeDefined();
    expect(loaded!.pageOrder).toHaveLength(1);
  });

  it("loads an existing project from persistence instead of seeding a blank one", async () => {
    const projectId = "p-existing-1";
    const persistence = createGuestPersistence();
    const existing = { ...createEmptyProject(projectId, "Existing project") };
    await persistence.saveSnapshot(projectId, existing);

    render(<ProjectEditorPage projectId={projectId} isNew={false} />);

    await waitFor(() => expect(screen.getByTestId("editor-shell-stub")).toBeInTheDocument());
    expect(capturedShellProps?.initialDocument.name).toBe("Existing project");
    expect(routerReplace).not.toHaveBeenCalled();
  });

  it("falls back to a fresh empty project when none was ever saved", async () => {
    render(<ProjectEditorPage projectId="p-missing-1" isNew={false} />);

    await waitFor(() => expect(screen.getByTestId("editor-shell-stub")).toBeInTheDocument());
    expect(capturedShellProps?.initialDocument.name).toBe("Untitled project");
  });

  it("compacts a debounced snapshot after onDocumentPatches fires", async () => {
    const projectId = "p-patches-1";
    render(<ProjectEditorPage projectId={projectId} isNew />);

    await waitFor(() => expect(capturedShellProps).not.toBeNull());

    const updatedDocument = createEmptyProject(projectId, "Renamed via patch");
    act(() => {
      capturedShellProps!.onDocumentPatches?.([], updatedDocument);
    });

    const persistence = createGuestPersistence();
    await waitFor(
      async () => {
        const loaded = await persistence.loadProject(projectId);
        expect(loaded!.name).toBe("Renamed via patch");
      },
      { timeout: 2000 },
    );
  });
});
