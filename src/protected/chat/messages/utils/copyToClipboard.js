export default async function copyToClipboard(value) {
  const text = String(value ?? "");
  let clipboardError = null;

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch (error) {
      clipboardError = error;
    }
  }

  if (
    typeof document === "undefined" ||
    typeof document.execCommand !== "function"
  ) {
    throw clipboardError || new Error("Clipboard access is unavailable.");
  }

  const textArea = document.createElement("textarea");
  const activeElement = document.activeElement;
  const selection = document.getSelection();
  const selectedRange = selection?.rangeCount ? selection.getRangeAt(0) : null;

  textArea.value = text;
  textArea.readOnly = true;
  textArea.setAttribute("aria-hidden", "true");
  textArea.style.position = "fixed";
  textArea.style.inset = "-9999px auto auto -9999px";
  textArea.style.opacity = "0";

  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  textArea.setSelectionRange(0, text.length);

  try {
    if (!document.execCommand("copy")) {
      throw clipboardError || new Error("The browser rejected the copy request.");
    }
  } finally {
    textArea.remove();

    if (selection && selectedRange) {
      selection.removeAllRanges();
      selection.addRange(selectedRange);
    }

    activeElement?.focus?.();
  }
}
