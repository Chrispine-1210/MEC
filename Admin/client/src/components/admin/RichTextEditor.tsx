import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link,
  Image,
  Quote,
  Code,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo,
  Redo,
} from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
  className?: string;
}

declare global {
  interface Window {
    tinymce: any;
  }
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Start writing...",
  minHeight = 300,
  className,
  ...props
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const [isEditorLoaded, setIsEditorLoaded] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);

  // Load TinyMCE script
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.tinymce) {
      const script = document.createElement('script');
      script.src = 'https://cdn.tiny.cloud/1/no-api-key/tinymce/6/tinymce.min.js';
      script.onload = () => {
        setIsEditorLoaded(true);
      };
      document.head.appendChild(script);
    } else if (window.tinymce) {
      setIsEditorLoaded(true);
    }
  }, []);

  // Initialize TinyMCE
  useEffect(() => {
    if (isEditorLoaded && editorRef.current && typeof window !== 'undefined' && window.tinymce) {
      window.tinymce.init({
        target: editorRef.current,
        height: minHeight,
        menubar: false,
        plugins: [
          'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
          'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
          'insertdatetime', 'media', 'table', 'help', 'wordcount'
        ],
        toolbar: 'undo redo | blocks | ' +
          'bold italic underline strikethrough | alignleft aligncenter ' +
          'alignright alignjustify | bullist numlist outdent indent | ' +
          'removeformat | link image | code | help',
        content_style: 'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Helvetica Neue", sans-serif; font-size: 14px }',
        placeholder: placeholder,
        setup: (editor: any) => {
          editor.on('init', () => {
            editor.setContent(value || '');
          });
          
          editor.on('Change Input KeyUp', () => {
            const content = editor.getContent();
            setCurrentValue(content);
            onChange(content);
          });
        },
      });
    }

    return () => {
      if (typeof window !== 'undefined' && window.tinymce && editorRef.current) {
        window.tinymce.get(editorRef.current.id)?.remove();
      }
    };
  }, [isEditorLoaded, minHeight, placeholder, value, onChange]);

  // Fallback: Simple textarea with toolbar buttons
  const executeCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setCurrentValue(editorRef.current.innerHTML);
      onChange(editorRef.current.innerHTML);
    }
  };

  const insertHTML = (html: string) => {
    if (editorRef.current) {
      document.execCommand('insertHTML', false, html);
      setCurrentValue(editorRef.current.innerHTML);
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setCurrentValue(newValue);
    onChange(newValue);
  };

  const handleContentEditableChange = () => {
    if (editorRef.current) {
      const content = editorRef.current.innerHTML;
      setCurrentValue(content);
      onChange(content);
    }
  };

  // If TinyMCE fails to load, show fallback editor
  if (!isEditorLoaded) {
    return (
      <Card className={className} {...props}>
        <CardContent className="p-0">
          {/* Simple Toolbar */}
          <div className="border-b p-2 flex flex-wrap gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => executeCommand('bold')}
              data-testid="button-bold"
            >
              <Bold className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => executeCommand('italic')}
              data-testid="button-italic"
            >
              <Italic className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => executeCommand('underline')}
              data-testid="button-underline"
            >
              <Underline className="w-4 h-4" />
            </Button>
            
            <div className="w-px h-6 bg-gray-300 mx-1" />
            
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => executeCommand('insertUnorderedList')}
              data-testid="button-bullet-list"
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => executeCommand('insertOrderedList')}
              data-testid="button-numbered-list"
            >
              <ListOrdered className="w-4 h-4" />
            </Button>
            
            <div className="w-px h-6 bg-gray-300 mx-1" />
            
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => executeCommand('justifyLeft')}
              data-testid="button-align-left"
            >
              <AlignLeft className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => executeCommand('justifyCenter')}
              data-testid="button-align-center"
            >
              <AlignCenter className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => executeCommand('justifyRight')}
              data-testid="button-align-right"
            >
              <AlignRight className="w-4 h-4" />
            </Button>
            
            <div className="w-px h-6 bg-gray-300 mx-1" />
            
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => insertHTML('<blockquote>Quote text here...</blockquote>')}
              data-testid="button-quote"
            >
              <Quote className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => insertHTML('<code>code</code>')}
              data-testid="button-code"
            >
              <Code className="w-4 h-4" />
            </Button>
          </div>

          {/* Content Editable Div */}
          <div
            ref={editorRef}
            contentEditable
            className="min-h-[300px] p-4 outline-none"
            style={{ minHeight: minHeight }}
            onInput={handleContentEditableChange}
            dangerouslySetInnerHTML={{ __html: currentValue }}
            data-testid="rich-text-content"
          />
        </CardContent>
      </Card>
    );
  }

  // TinyMCE editor
  return (
    <Card className={className} {...props}>
      <CardContent className="p-0">
        <textarea
          ref={editorRef}
          value={currentValue}
          onChange={handleTextareaChange}
          placeholder={placeholder}
          className="w-full"
          style={{ minHeight }}
          data-testid="rich-text-editor"
        />
      </CardContent>
    </Card>
  );
}