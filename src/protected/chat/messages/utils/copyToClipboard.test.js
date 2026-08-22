import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import copyToClipboard from "./copyToClipboard";

const clipboardDescriptor = Object.getOwnPropertyDescriptor(
  Navigator.prototype,
  "clipboard",
);
const execCommandDescriptor = Object.getOwnPropertyDescriptor(
  Document.prototype,
  "execCommand",
);

function setClipboard(clipboard) {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: clipboard,
  });
}

function setExecCommand(execCommand) {
  Object.defineProperty(document, "execCommand", {
    configurable: true,
    value: execCommand,
  });
}

describe("copyToClipboard", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();

    if (clipboardDescriptor) {
      Object.defineProperty(
        Navigator.prototype,
        "clipboard",
        clipboardDescriptor,
      );
      delete navigator.clipboard;
    } else {
      delete navigator.clipboard;
    }

    if (execCommandDescriptor) {
      Object.defineProperty(
        Document.prototype,
        "execCommand",
        execCommandDescriptor,
      );
      delete document.execCommand;
    } else {
      delete document.execCommand;
    }
  });

  test("uses the Clipboard API when it is available", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });

    await copyToClipboard("copied text");

    expect(writeText).toHaveBeenCalledWith("copied text");
  });

  test("falls back to execCommand when Clipboard API access is denied", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    const execCommand = vi.fn().mockReturnValue(true);
    setClipboard({ writeText });
    setExecCommand(execCommand);

    await copyToClipboard("fallback text");

    expect(execCommand).toHaveBeenCalledWith("copy");
    expect(document.querySelector("textarea")).not.toBeInTheDocument();
  });
});
