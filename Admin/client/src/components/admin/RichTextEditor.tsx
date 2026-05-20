import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Eraser,
  Image,
  Italic,
  Link,
  List,
  ListOrdered,
  Quote,
  Redo,
  Strikethrough,
  Underline,
  Undo,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  value?: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
  className?: string;
  disabled?: boolean;
}

type ToolbarAction = {
  label: string;
  icon: LucideIcon;
  command: string;
  value?: string;
};

const toolbarActions: ToolbarAction[] = [
  { label: "Bold", icon: Bold, command: "bold" },
  { label: "Italic", icon: Italic, command: "italic" },
  { label: "Underline", icon: Underline, command: "underline" },
  { label: "Strikethrough", icon: Strikethrough, command: "strikeThrough" },
  { label: "Bulleted list", icon: List, command: "insertUnorderedList" },
  { label: "Numbered list", icon: ListOrdered, command: "insertOrderedList" },
  { label: "Align left", icon: AlignLeft, command: "justifyLeft" },
  { label: "Align center", icon: AlignCenter, command: "justifyCenter" },
  { label: "Align right", icon: AlignRight, command: "justifyRight" },
  { label: "Quote", icon: Quote, command: "formatBlock", value: "blockquote" },
  { label: "Undo", icon: Undo, command: "undo" },
  { label: "Redo", icon: Redo, command: "redo" },
];

const containsHtml = (value: string) => /<\/?[a-z][\s\S]*>/i.test(value);

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const plainTextToHtml = (value: string) =>
  value
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("");

const sanitizeUrl = (value: string | null) => {
  if (!value) return "";
  const trimmed = value.trim();
  if (trimmed.startsWith("//")) return "";
  if (/^(https?:|mailto:|tel:|\/|#)/i.test(trimmed)) return trimmed;
  return "";
};

const sanitizeStyle = (value: string | null) => {
  if (!value) return "";
  const allowed: string[] = [];
  value.split(";").forEach((rule) => {
    const [rawProperty, rawValue] = rule.split(":");
    const property = rawProperty?.trim().toLowerCase();
    const ruleValue = rawValue?.trim().toLowerCase();
    if (property === "text-align" && /^(left|right|center|justify)$/.test(ruleValue || "")) {
      allowed.push(`${property}: ${ruleValue}`);
    }
  });
  return allowed.join("; ");
};

const sanitizeEditorHtml = (value: string) => {
  if (!value.trim()) return "";
  const html = containsHtml(value) ? value : plainTextToHtml(value);

  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return html;
  }

  const allowedTags = new Set([
    "A",
    "B",
    "BLOCKQUOTE",
    "BR",
    "CODE",
    "DIV",
    "EM",
    "FIGCAPTION",
    "FIGURE",
    "H2",
    "H3",
    "H4",
    "HR",
    "I",
    "IMG",
    "LI",
    "OL",
    "P",
    "PRE",
    "S",
    "SPAN",
    "STRIKE",
    "STRONG",
    "TABLE",
    "TBODY",
    "TD",
    "TH",
    "THEAD",
    "TR",
    "U",
    "UL",
  ]);

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const cleanNode = (node: Node) => {
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType === Node.COMMENT_NODE) {
        child.remove();
        return;
      }

      if (child.nodeType !== Node.ELEMENT_NODE) {
        return;
      }

      const element = child as HTMLElement;
      if (!allowedTags.has(element.tagName)) {
        cleanNode(element);
        element.replaceWith(...Array.from(element.childNodes));
        return;
      }

      Array.from(element.attributes).forEach((attribute) => {
        const name = attribute.name.toLowerCase();
        const value = attribute.value;

        if (name.startsWith("on")) {
          element.removeAttribute(attribute.name);
          return;
        }

        if (name === "href" && element.tagName === "A") {
          const safeUrl = sanitizeUrl(value);
          if (!safeUrl) {
            element.removeAttribute(attribute.name);
            return;
          }
          element.setAttribute("href", safeUrl);
          element.setAttribute("rel", "noopener noreferrer");
          if (!safeUrl.startsWith("#") && !safeUrl.startsWith("/")) {
            element.setAttribute("target", "_blank");
          }
          return;
        }

        if (name === "src" && element.tagName === "IMG") {
          const safeUrl = sanitizeUrl(value);
          if (!safeUrl) {
            element.removeAttribute(attribute.name);
            return;
          }
          element.setAttribute("src", safeUrl);
          return;
        }

        if (name === "style") {
          const safeStyle = sanitizeStyle(value);
          if (safeStyle) element.setAttribute("style", safeStyle);
          else element.removeAttribute(attribute.name);
          return;
        }

        if (
          ![
            "alt",
            "colspan",
            "height",
            "id",
            "rowspan",
            "target",
            "title",
            "width",
          ].includes(name)
        ) {
          element.removeAttribute(attribute.name);
        }
      });

      cleanNode(element);
    });
  };

  cleanNode(doc.body);
  return doc.body.innerHTML;
};

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Start writing...",
  minHeight = 320,
  className,
  disabled = false,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const lastHtmlRef = useRef("");
  const [currentValue, setCurrentValue] = useState(() => sanitizeEditorHtml(value || ""));
  const [editorEmpty, setEditorEmpty] = useState(() => !sanitizeEditorHtml(value || "").replace(/<[^>]*>/g, "").trim());
  const [isFocused, setIsFocused] = useState(false);
  const [sourceMode, setSourceMode] = useState(false);

  const normalizedValue = useMemo(() => sanitizeEditorHtml(value || ""), [value]);
  const isEmpty = sourceMode ? !currentValue.replace(/<[^>]*>/g, "").trim() : editorEmpty;

  useEffect(() => {
    if (sourceMode) return;

    if (!editorRef.current || normalizedValue === lastHtmlRef.current || isFocused) return;
    editorRef.current.innerHTML = normalizedValue;
    lastHtmlRef.current = normalizedValue;
    setCurrentValue(normalizedValue);
    setEditorEmpty(!normalizedValue.replace(/<[^>]*>/g, "").trim());
  }, [isFocused, normalizedValue, sourceMode]);

  const syncFromEditor = useCallback((updateState = false) => {
    if (!editorRef.current) return;
    const html = sanitizeEditorHtml(editorRef.current.innerHTML);
    lastHtmlRef.current = html;
    setEditorEmpty(!html.replace(/<[^>]*>/g, "").trim());
    if (updateState) {
      setCurrentValue(html);
    }
    onChange(html);
  }, [onChange]);

  const focusEditor = useCallback(() => {
    editorRef.current?.focus();
  }, []);

  const runCommand = useCallback(
    (command: string, commandValue?: string) => {
      if (disabled || sourceMode) return;
      focusEditor();
      document.execCommand(command, false, commandValue);
      syncFromEditor(true);
    },
    [disabled, focusEditor, sourceMode, syncFromEditor],
  );

  const insertHtml = useCallback(
    (html: string) => {
      if (disabled || sourceMode) return;
      focusEditor();
      document.execCommand("insertHTML", false, sanitizeEditorHtml(html));
      syncFromEditor(true);
    },
    [disabled, focusEditor, sourceMode, syncFromEditor],
  );

  const addLink = () => {
    const url = sanitizeUrl(window.prompt("Paste the link URL") || "");
    if (!url) return;
    runCommand("createLink", url);
  };

  const addImage = () => {
    const url = sanitizeUrl(window.prompt("Paste the image URL") || "");
    if (!url) return;
    const alt = escapeHtml(window.prompt("Image description") || "");
    insertHtml(`<figure><img src="${escapeHtml(url)}" alt="${alt}"><figcaption>${alt}</figcaption></figure>`);
  };

  const handleFormatChange = (format: string) => {
    if (!format) return;
    runCommand("formatBlock", format);
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const pastedHtml = event.clipboardData.getData("text/html");
    const pastedText = event.clipboardData.getData("text/plain");
    insertHtml(pastedHtml || plainTextToHtml(pastedText));
  };

  const handleSourceChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextValue = event.target.value;
    setEditorEmpty(!nextValue.replace(/<[^>]*>/g, "").trim());
    setCurrentValue(nextValue);
    onChange(nextValue);
  };

  const commitSourceValue = useCallback(() => {
    const html = sanitizeEditorHtml(currentValue);
    lastHtmlRef.current = html;
    setEditorEmpty(!html.replace(/<[^>]*>/g, "").trim());
    setCurrentValue(html);
    onChange(html);
    if (editorRef.current) {
      editorRef.current.innerHTML = html;
    }
  }, [currentValue, onChange]);

  const toggleSourceMode = () => {
    if (sourceMode) {
      commitSourceValue();
      setSourceMode(false);
      return;
    }

    setCurrentValue(lastHtmlRef.current || normalizedValue);
    setSourceMode(true);
  };

  return (
    <Card className={cn("overflow-hidden border-border/70 shadow-sm", className)}>
      <CardContent className="p-0">
        <div className="flex flex-wrap items-center gap-1 border-b bg-muted/35 p-2">
          <select
            className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            onChange={(event) => handleFormatChange(event.target.value)}
            disabled={disabled || sourceMode}
            defaultValue=""
            aria-label="Text style"
          >
            <option value="" disabled>
              Style
            </option>
            <option value="p">Paragraph</option>
            <option value="h2">Heading 2</option>
            <option value="h3">Heading 3</option>
            <option value="h4">Heading 4</option>
          </select>

          <div className="mx-1 h-6 w-px bg-border" />

          {toolbarActions.map(({ label, icon: Icon, command, value: commandValue }) => (
            <Button
              key={label}
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0"
              onClick={() => runCommand(command, commandValue)}
              disabled={disabled || sourceMode}
              title={label}
              aria-label={label}
            >
              <Icon className="h-4 w-4" />
            </Button>
          ))}

          <div className="mx-1 h-6 w-px bg-border" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0"
            onClick={addLink}
            disabled={disabled || sourceMode}
            title="Add link"
            aria-label="Add link"
          >
            <Link className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0"
            onClick={addImage}
            disabled={disabled || sourceMode}
            title="Add image"
            aria-label="Add image"
          >
            <Image className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0"
            onClick={() => runCommand("removeFormat")}
            disabled={disabled || sourceMode}
            title="Clear formatting"
            aria-label="Clear formatting"
          >
            <Eraser className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={sourceMode ? "secondary" : "ghost"}
            size="sm"
            className="ml-auto h-9 px-3"
            onClick={toggleSourceMode}
            disabled={disabled}
            title="Toggle HTML source"
            aria-label="Toggle HTML source"
          >
            <Code className="mr-2 h-4 w-4" />
            HTML
          </Button>
        </div>

        {sourceMode ? (
          <textarea
            value={currentValue}
            onChange={handleSourceChange}
            onBlur={commitSourceValue}
            disabled={disabled}
            className="w-full resize-y bg-background p-4 font-mono text-sm leading-6 text-foreground outline-none focus:ring-2 focus:ring-inset focus:ring-ring"
            style={{ minHeight }}
            data-testid="rich-text-source"
          />
        ) : (
          <div className="relative bg-background">
            {isEmpty && !isFocused && (
              <div className="pointer-events-none absolute left-4 top-4 text-sm text-muted-foreground">
                {placeholder}
              </div>
            )}
            <div
              ref={editorRef}
              contentEditable={!disabled}
              suppressContentEditableWarning
              className="rich-text-editor min-h-[260px] w-full max-w-none p-4 text-sm leading-7 text-foreground outline-none focus:ring-2 focus:ring-inset focus:ring-ring [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-primary/40 [&_blockquote]:pl-4 [&_blockquote]:italic [&_figure]:my-4 [&_figcaption]:mt-2 [&_figcaption]:text-xs [&_figcaption]:text-muted-foreground [&_h2]:mb-3 [&_h2]:mt-5 [&_h2]:text-2xl [&_h2]:font-bold [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-xl [&_h3]:font-semibold [&_h4]:mb-2 [&_h4]:mt-4 [&_h4]:text-lg [&_h4]:font-semibold [&_img]:max-w-full [&_li]:ml-5 [&_ol]:list-decimal [&_p]:mb-3 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:p-2 [&_th]:border [&_th]:bg-muted [&_th]:p-2 [&_ul]:list-disc"
              style={{ minHeight }}
              onFocus={() => setIsFocused(true)}
              onBlur={() => {
                setIsFocused(false);
                syncFromEditor(true);
              }}
              onInput={() => syncFromEditor(false)}
              onPaste={handlePaste}
              dangerouslySetInnerHTML={{ __html: currentValue }}
              data-testid="rich-text-editor"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
