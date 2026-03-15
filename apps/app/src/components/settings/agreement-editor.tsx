import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  AlignCenterIcon,
  AlignLeftIcon,
  AlignRightIcon,
  BoldIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  ItalicIcon,
  ListIcon,
  ListOrderedIcon,
  UnderlineIcon,
} from 'lucide-react';
import { useEffect } from 'react';
import { Button, Tooltip, TooltipContent, TooltipTrigger, cn } from '@workspace/ui';
import type { Editor } from '@tiptap/react';

interface AgreementEditorProps {
  content?: object | null;
  onChange?: (json: object) => void;
  placeholder?: string;
  className?: string;
  editable?: boolean;
}

export function AgreementEditor({
  content,
  onChange,
  placeholder = 'Write your agreement content here...',
  className,
  editable = true,
}: AgreementEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder }),
    ],
    content: content ?? '',
    editable,
    onUpdate: ({ editor: tiptapEditor }) => {
      onChange?.(tiptapEditor.getJSON());
    },
  });

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!editor) return;
    if (content && JSON.stringify(editor.getJSON()) !== JSON.stringify(content)) {
      editor.commands.setContent(content);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  return (
    <div className={cn('flex flex-col border border-border rounded-md overflow-hidden', className)}>
      {/* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition */}
      {editable && editor && <Toolbar editor={editor} />}
      <EditorContent
          editor={editor}
          className={cn(
          'prose prose-sm dark:prose-invert max-w-none flex-1 [&_.tiptap]:min-h-48 [&_.tiptap]:p-3 [&_.tiptap]:outline-none',
          '[&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.tiptap_p.is-editor-empty:first-child::before]:text-muted-foreground [&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none [&_.tiptap_p.is-editor-empty:first-child::before]:float-left [&_.tiptap_p.is-editor-empty:first-child::before]:h-0',
        )}
      />
    </div>
  );
}

function ToolbarButton({
  onClick,
  isActive,
  tooltip,
  children,
  disabled,
}: {
  onClick: () => void;
  isActive?: boolean;
  tooltip: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
            variant="ghost"
            size="icon"
            className={cn('size-7', isActive && 'bg-accent text-accent-foreground')}
            onClick={onClick}
            disabled={disabled}
            type="button"
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{tooltip}</TooltipContent>
    </Tooltip>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/30 px-2 py-1.5">
      <ToolbarButton
          tooltip="Bold"
          isActive={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <BoldIcon className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
          tooltip="Italic"
          isActive={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <ItalicIcon className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
          tooltip="Underline"
          isActive={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <UnderlineIcon className="size-3.5" />
      </ToolbarButton>

      <div className="h-4 w-px bg-border mx-0.5" />

      <ToolbarButton
          tooltip="Heading 1"
          isActive={editor.isActive('heading', { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        <Heading1Icon className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
          tooltip="Heading 2"
          isActive={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2Icon className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
          tooltip="Heading 3"
          isActive={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <Heading3Icon className="size-3.5" />
      </ToolbarButton>

      <div className="h-4 w-px bg-border mx-0.5" />

      <ToolbarButton
          tooltip="Bullet List"
          isActive={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <ListIcon className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
          tooltip="Ordered List"
          isActive={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrderedIcon className="size-3.5" />
      </ToolbarButton>

      <div className="h-4 w-px bg-border mx-0.5" />

      <ToolbarButton
          tooltip="Align Left"
          isActive={editor.isActive({ textAlign: 'left' })}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
      >
        <AlignLeftIcon className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
          tooltip="Align Center"
          isActive={editor.isActive({ textAlign: 'center' })}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
      >
        <AlignCenterIcon className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
          tooltip="Align Right"
          isActive={editor.isActive({ textAlign: 'right' })}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
      >
        <AlignRightIcon className="size-3.5" />
      </ToolbarButton>
    </div>
  );
}
