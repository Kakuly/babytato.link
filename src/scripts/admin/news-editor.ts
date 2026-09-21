import { Editor } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import StarterKit from "@tiptap/starter-kit";
import { marked } from "marked";
import TurndownService from "turndown";

export interface NewsEditorOptions {
  element: HTMLElement;
  toolbar: HTMLElement;
  initialMarkdown?: string;
  uploadImage: (file: File) => Promise<string>;
  onNotice?: (message: string, kind: "success" | "error") => void;
}

const MAX_NEWS_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const turndown = new TurndownService({
  headingStyle: "atx",
  bulletListMarker: "-",
  emDelimiter: "*",
});

turndown.addRule("newsImages", {
  filter: "img",
  replacement(_content, node) {
    const el = node as HTMLImageElement;
    const src = el.getAttribute("src")?.trim() ?? "";
    if (!src) return "";
    const alt = el.getAttribute("alt") ?? "";
    const title = el.getAttribute("title");
    const titlePart = title ? ` "${title.replace(/"/g, '\\"')}"` : "";
    return `![${alt}](${src}${titlePart})`;
  },
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

function isAllowedImageFile(file: File): boolean {
  if (ALLOWED_IMAGE_TYPES.has(file.type)) return true;
  return /\.(jpe?g|png|webp|gif)$/i.test(file.name);
}

function imageFilesFromList(list: FileList | File[] | null | undefined): File[] {
  if (!list) return [];
  return [...list].filter(isAllowedImageFile);
}

function imageFilesFromDataTransfer(data: DataTransfer | null | undefined): File[] {
  if (!data) return [];
  const fromFiles = imageFilesFromList(data.files);
  if (fromFiles.length) return fromFiles;
  const fromItems: File[] = [];
  for (const item of data.items) {
    if (item.kind !== "file") continue;
    const file = item.getAsFile();
    if (file && isAllowedImageFile(file)) fromItems.push(file);
  }
  return fromItems;
}

function isFileDrag(event: DragEvent): boolean {
  return Array.from(event.dataTransfer?.types ?? []).includes("Files");
}

function altFromFile(file: File): string {
  return file.name.replace(/\.[^.]+$/, "").trim();
}

export function createNewsEditor(options: NewsEditorOptions): Editor {
  const editorHost = document.createElement("div");
  editorHost.className = "admin-editor-content";
  options.element.append(editorHost);

  const shell = options.element.closest(".admin-editor") ?? options.element;

  const editor = new Editor({
    element: editorHost,
    extensions: [
      StarterKit,
      Image.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: {
          class: "admin-editor-image",
        },
      }),
    ],
    content: markdownToHtml(options.initialMarkdown ?? ""),
    editorProps: {
      attributes: {
        class: "admin-editor-prose",
      },
      handlePaste(_view, event) {
        const files = imageFilesFromDataTransfer(event.clipboardData);
        if (!files.length) return false;
        event.preventDefault();
        void insertImages(files);
        return true;
      },
      handleDrop(_view, event, _slice, moved) {
        if (moved) return false;
        const files = imageFilesFromDataTransfer(event.dataTransfer);
        if (!files.length) return false;
        event.preventDefault();
        void insertImages(files);
        return true;
      },
    },
  });

  const run = (command: () => boolean) => {
    command();
    editor.commands.focus();
  };

  async function insertImages(files: File[]): Promise<void> {
    for (const file of files) {
      if (!isAllowedImageFile(file)) {
        options.onNotice?.("画像は JPEG / PNG / WebP / GIF のみです。", "error");
        continue;
      }
      if (file.size > MAX_NEWS_IMAGE_BYTES) {
        options.onNotice?.("画像は 10MB 以下にしてください。", "error");
        continue;
      }

      options.onNotice?.("画像をアップロード中…", "success");
      try {
        const src = await options.uploadImage(file);
        editor
          .chain()
          .focus()
          .setImage({ src, alt: altFromFile(file) })
          .run();
        options.onNotice?.("画像を挿入しました。", "success");
      } catch (error) {
        const message = error instanceof Error ? error.message : "画像のアップロードに失敗しました。";
        options.onNotice?.(message, "error");
      }
    }
  }

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif";
  fileInput.multiple = true;
  fileInput.hidden = true;
  fileInput.addEventListener("change", () => {
    const files = imageFilesFromList(fileInput.files);
    fileInput.value = "";
    if (files.length) void insertImages(files);
  });
  options.toolbar.append(fileInput);

  const buttons: Array<[string, () => void]> = [
    ["B", () => run(() => editor.chain().focus().toggleBold().run())],
    ["I", () => run(() => editor.chain().focus().toggleItalic().run())],
    ["H2", () => run(() => editor.chain().focus().toggleHeading({ level: 2 }).run())],
    ["•", () => run(() => editor.chain().focus().toggleBulletList().run())],
    ["1.", () => run(() => editor.chain().focus().toggleOrderedList().run())],
    ['"', () => run(() => editor.chain().focus().toggleBlockquote().run())],
    ["img", () => fileInput.click()],
  ];

  for (const [label, action] of buttons) {
    options.toolbar.append(makeToolbarButton(label, action));
  }

  const setDragover = (on: boolean) => {
    shell.classList.toggle("is-dragover", on);
  };

  shell.addEventListener("dragenter", (event) => {
    if (!isFileDrag(event as DragEvent)) return;
    event.preventDefault();
    setDragover(true);
  });
  shell.addEventListener("dragover", (event) => {
    if (!isFileDrag(event as DragEvent)) return;
    event.preventDefault();
    const dragEvent = event as DragEvent;
    if (dragEvent.dataTransfer) dragEvent.dataTransfer.dropEffect = "copy";
    setDragover(true);
  });
  shell.addEventListener("dragleave", (event) => {
    const next = (event as DragEvent).relatedTarget as Node | null;
    if (next && shell.contains(next)) return;
    setDragover(false);
  });
  shell.addEventListener("drop", (event) => {
    setDragover(false);
    const dragEvent = event as DragEvent;
    const target = dragEvent.target as Node | null;
    if (target && options.element.contains(target)) return;
    const files = imageFilesFromDataTransfer(dragEvent.dataTransfer);
    if (!files.length) return;
    dragEvent.preventDefault();
    dragEvent.stopPropagation();
    void insertImages(files);
  });

  return editor;
}

export function getEditorMarkdown(editor: Editor): string {
  return htmlToMarkdown(editor.getHTML());
}

export function setEditorMarkdown(editor: Editor, markdown: string): void {
  editor.commands.setContent(markdownToHtml(markdown));
}
