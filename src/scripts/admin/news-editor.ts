import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { marked } from "marked";
import TurndownService from "turndown";

export interface NewsEditorOptions {
  element: HTMLElement;
  toolbar: HTMLElement;
  initialMarkdown?: string;
}

const turndown = new TurndownService({
  headingStyle: "atx",
  bulletListMarker: "-",
  emDelimiter: "*",
});

marked.setOptions({ gfm: true, breaks: true });

function markdownToHtml(markdown: string): string {
  const parsed = marked.parse(markdown || "");
  return typeof parsed === "string" ? parsed : "";
}

function htmlToMarkdown(html: string): string {
  return turndown.turndown(html || "").trimEnd();
}

function makeToolbarButton(label: string, action: () => void): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "admin-editor-btn";
  button.textContent = label;
  button.addEventListener("click", action);
  return button;
}

export function createNewsEditor(options: NewsEditorOptions): Editor {
  const editorHost = document.createElement("div");
  editorHost.className = "admin-editor-content";
  options.element.append(editorHost);

  const editor = new Editor({
    element: editorHost,
    extensions: [StarterKit],
    content: markdownToHtml(options.initialMarkdown ?? ""),
    editorProps: {
      attributes: {
        class: "admin-editor-prose",
      },
    },
  });

  const run = (command: () => boolean) => {
    command();
    editor.commands.focus();
  };

  const buttons: Array<[string, () => void]> = [
    ["B", () => run(() => editor.chain().focus().toggleBold().run())],
    ["I", () => run(() => editor.chain().focus().toggleItalic().run())],
    ["H2", () => run(() => editor.chain().focus().toggleHeading({ level: 2 }).run())],
    ["•", () => run(() => editor.chain().focus().toggleBulletList().run())],
    ["1.", () => run(() => editor.chain().focus().toggleOrderedList().run())],
    ["\"", () => run(() => editor.chain().focus().toggleBlockquote().run())],
  ];

  for (const [label, action] of buttons) {
    options.toolbar.append(makeToolbarButton(label, action));
  }

  return editor;
}

export function getEditorMarkdown(editor: Editor): string {
  return htmlToMarkdown(editor.getHTML());
}

export function setEditorMarkdown(editor: Editor, markdown: string): void {
  editor.commands.setContent(markdownToHtml(markdown));
}
