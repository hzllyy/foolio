import { enablePatches, produceWithPatches, type Patch } from "immer";
import type { ProjectDocument } from "@/document/schema";
import type { EditorCommand } from "./types";
import { InvalidCommandError } from "./types";
import {
  applyCreateElement,
  applyCreatePage,
  applyDeleteKeyframe,
  applyDeleteElement,
  applyDeletePage,
  applyDuplicatePage,
  applyPatchElement,
  applyRenamePage,
  applyReorderPage,
  applyReparentElement,
  applyResizePage,
  applyUpsertKeyframe,
} from "./reducers";

export type ApplyCommandResult = {
  document: ProjectDocument;
  patches: Patch[];
  inversePatches: Patch[];
};

enablePatches();

/** Applies one validated command to a document, producing forward and inverse Immer patches. */
export function applyCommand(
  document: ProjectDocument,
  command: EditorCommand,
): ApplyCommandResult {
  const [nextDocument, patches, inversePatches] = produceWithPatches(document, (draft) => {
    switch (command.type) {
      case "element.create":
        applyCreateElement(draft, command.payload);
        return;
      case "element.patch":
        applyPatchElement(draft, command.payload);
        return;
      case "element.delete":
        applyDeleteElement(draft, command.payload);
        return;
      case "element.reparent":
        applyReparentElement(draft, command.payload);
        return;
      case "page.resize":
        applyResizePage(draft, command.payload);
        return;
      case "page.create":
        applyCreatePage(draft, command.payload);
        return;
      case "page.rename":
        applyRenamePage(draft, command.payload);
        return;
      case "page.delete":
        applyDeletePage(draft, command.payload);
        return;
      case "page.reorder":
        applyReorderPage(draft, command.payload);
        return;
      case "page.duplicate":
        applyDuplicatePage(draft, command.payload);
        return;
      case "keyframe.upsert":
        applyUpsertKeyframe(draft, command.payload);
        return;
      case "keyframe.delete":
        applyDeleteKeyframe(draft, command.payload);
        return;
      default: {
        const exhaustive: never = command;
        throw new InvalidCommandError(`Unknown command type: ${JSON.stringify(exhaustive)}`);
      }
    }
  });

  return { document: nextDocument, patches, inversePatches };
}
