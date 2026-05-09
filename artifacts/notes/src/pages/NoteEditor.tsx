import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useParams } from "wouter";
import { useGetNote, useUpdateNote, useDeleteNote, getGetNoteQueryKey } from "@workspace/api-client-react";
import { ArrowLeft, Pin, Trash2, Palette, Loader2, Save, List, SquareCheck, Pencil, Eraser } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const SWATCHES = [
  "#ffffff",
  "#fef3c7",
  "#dcfce7",
  "#e0e7ff",
  "#f3e8ff",
  "#fae8ff",
  "#fce7f3",
  "#ffedd5",
];

const PEN_COLORS = ["#1a1a1a", "#e74c3c", "#3498db", "#27ae60", "#f39c12", "#9b59b6", "#ffffff"];
const PEN_SIZES = [2, 6, 14];

type EditorMode = "text" | "bullets" | "checklist" | "doodle";

interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function detectMode(content: string): EditorMode {
  if (content.startsWith("data:image/")) return "doodle";
  const lines = content.trim().split("\n").filter(Boolean);
  if (lines.length > 0 && lines.every(l => /^\[[ x]\] /.test(l))) return "checklist";
  if (lines.length > 0 && lines.every(l => l.startsWith("• "))) return "bullets";
  return "text";
}

function parseChecklistFromContent(content: string): ChecklistItem[] {
  if (!content.trim() || content.startsWith("data:image/")) {
    return [{ id: uid(), text: "", checked: false }];
  }
  const lines = content.split("\n");
  if (lines.every(l => /^\[[ x]\] /.test(l))) {
    return lines.map(line => ({
      id: uid(),
      text: line.replace(/^\[[ x]\] /, ""),
      checked: line.startsWith("[x]"),
    }));
  }
  return lines.map(l => ({
    id: uid(),
    text: l.replace(/^• /, "").trim(),
    checked: false,
  })).filter(i => i.text);
}

function serializeChecklist(items: ChecklistItem[]): string {
  return items.map(item => `[${item.checked ? "x" : " "}] ${item.text}`).join("\n");
}

// ─── ChecklistEditor ──────────────────────────────────────────────────────────

function ChecklistEditor({
  items,
  onChange,
}: {
  items: ChecklistItem[];
  onChange: (items: ChecklistItem[]) => void;
}) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const update = (index: number, patch: Partial<ChecklistItem>) => {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const addBelow = (index: number) => {
    const next = [...items];
    next.splice(index + 1, 0, { id: uid(), text: "", checked: false });
    onChange(next);
    setTimeout(() => inputRefs.current[index + 1]?.focus(), 0);
  };

  const remove = (index: number) => {
    if (items.length <= 1) {
      update(0, { text: "" });
      setTimeout(() => inputRefs.current[0]?.focus(), 0);
      return;
    }
    const next = items.filter((_, i) => i !== index);
    onChange(next);
    setTimeout(() => inputRefs.current[Math.max(0, index - 1)]?.focus(), 0);
  };

  return (
    <div className="flex-1 flex flex-col gap-2 pb-12 overflow-y-auto">
      {items.map((item, index) => (
        <div key={item.id} className="flex items-center gap-3 group py-0.5">
          <button
            onClick={() => update(index, { checked: !item.checked })}
            className={`w-5 h-5 rounded flex-shrink-0 border-2 transition-all flex items-center justify-center ${
              item.checked
                ? "bg-foreground border-foreground text-background"
                : "border-foreground/30 hover:border-foreground/60"
            }`}
          >
            {item.checked && (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
              </svg>
            )}
          </button>
          <input
            ref={el => { inputRefs.current[index] = el; }}
            type="text"
            value={item.text}
            placeholder={index === 0 && items.length === 1 ? "Add an item..." : ""}
            onChange={e => update(index, { text: e.target.value })}
            onKeyDown={e => {
              if (e.key === "Enter") {
                e.preventDefault();
                addBelow(index);
              } else if (e.key === "Backspace" && item.text === "") {
                e.preventDefault();
                remove(index);
              }
            }}
            className={`flex-1 bg-transparent text-lg leading-relaxed outline-none transition-all ${
              item.checked
                ? "line-through text-foreground/35"
                : "text-foreground/80"
            }`}
          />
        </div>
      ))}
      <button
        onClick={() => addBelow(items.length - 1)}
        className="flex items-center gap-3 text-foreground/25 hover:text-foreground/45 transition-colors text-base mt-2 w-fit"
      >
        <span className="w-5 h-5 rounded border-2 border-dashed border-current flex items-center justify-center flex-shrink-0">
          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 10 10" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" d="M5 2v6M2 5h6" />
          </svg>
        </span>
        <span>Add item</span>
      </button>
    </div>
  );
}

// ─── BulletEditor ─────────────────────────────────────────────────────────────

function BulletEditor({
  content,
  onChange,
}: {
  content: string;
  onChange: (v: string) => void;
}) {
  const taRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const ta = e.currentTarget;
    const val = ta.value;
    const sel = ta.selectionStart;
    const lineStart = val.lastIndexOf("\n", sel - 1) + 1;
    const currentLine = val.slice(lineStart, sel);

    if (e.key === "Enter") {
      e.preventDefault();
      if (currentLine === "• ") {
        const newVal = val.slice(0, lineStart) + val.slice(lineStart + 2);
        onChange(newVal);
        setTimeout(() => { ta.selectionStart = ta.selectionEnd = lineStart; }, 0);
      } else if (currentLine.startsWith("• ")) {
        const ins = "\n• ";
        const newVal = val.slice(0, sel) + ins + val.slice(sel);
        onChange(newVal);
        setTimeout(() => { ta.selectionStart = ta.selectionEnd = sel + ins.length; }, 0);
      } else {
        const ins = "\n";
        const newVal = val.slice(0, sel) + ins + val.slice(sel);
        onChange(newVal);
        setTimeout(() => { ta.selectionStart = ta.selectionEnd = sel + ins.length; }, 0);
      }
    } else if (e.key === "Backspace" && currentLine === "• ") {
      e.preventDefault();
      const newVal = val.slice(0, lineStart) + val.slice(lineStart + 2);
      onChange(newVal);
      setTimeout(() => { ta.selectionStart = ta.selectionEnd = lineStart; }, 0);
    }
  };

  return (
    <textarea
      ref={taRef}
      placeholder="• Start typing..."
      value={content}
      onChange={e => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
      className="flex-1 w-full bg-transparent text-lg md:text-xl leading-relaxed outline-none resize-none placeholder:text-foreground/30 text-foreground/80 font-sans pb-12"
      autoFocus
    />
  );
}

// ─── DoodleCanvas ─────────────────────────────────────────────────────────────

function DoodleCanvas({
  initialDataUrl,
  onSave,
}: {
  initialDataUrl?: string;
  onSave: (dataUrl: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const [penColorIdx, setPenColorIdx] = useState(0);
  const [penSizeIdx, setPenSizeIdx] = useState(1);
  const [isEraser, setIsEraser] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const w = container.clientWidth;
    const h = container.clientHeight;
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);

    if (initialDataUrl && initialDataUrl.startsWith("data:image/")) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, w, h);
      img.src = initialDataUrl;
    }
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      const t = e.touches[0];
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const scheduleSave = () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const canvas = canvasRef.current;
      if (canvas) onSaveRef.current(canvas.toDataURL("image/jpeg", 0.85));
    }, 600);
  };

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    e.preventDefault();
    isDrawingRef.current = true;
    const pos = getPos(e, canvas);
    lastPosRef.current = pos;
    const ctx = canvas.getContext("2d")!;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, PEN_SIZES[penSizeIdx] / 2, 0, Math.PI * 2);
    ctx.fillStyle = isEraser ? "#ffffff" : PEN_COLORS[penColorIdx];
    ctx.fill();
  }, [penColorIdx, penSizeIdx, isEraser]);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    e.preventDefault();
    const ctx = canvas.getContext("2d")!;
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = isEraser ? "#ffffff" : PEN_COLORS[penColorIdx];
    ctx.lineWidth = PEN_SIZES[penSizeIdx];
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    lastPosRef.current = pos;
  }, [penColorIdx, penSizeIdx, isEraser]);

  const stopDraw = useCallback(() => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    scheduleSave();
  }, []);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    scheduleSave();
  };

  const currentColor = PEN_COLORS[penColorIdx];
  const currentSize = PEN_SIZES[penSizeIdx];

  return (
    <div className="flex-1 flex flex-col min-h-0 gap-3">
      <div className="flex items-center gap-2 flex-wrap py-1">
        <div className="flex items-center gap-1.5">
          {PEN_COLORS.map((c, i) => (
            <button
              key={c}
              onClick={() => { setPenColorIdx(i); setIsEraser(false); }}
              className={`w-6 h-6 rounded-full border transition-transform hover:scale-110 ${
                penColorIdx === i && !isEraser
                  ? "ring-2 ring-offset-1 ring-foreground/50 scale-110"
                  : "border-black/15"
              }`}
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}
        </div>

        <div className="w-px h-5 bg-foreground/10 mx-1" />

        <div className="flex items-center gap-1">
          {PEN_SIZES.map((sz, i) => (
            <button
              key={sz}
              onClick={() => { setPenSizeIdx(i); setIsEraser(false); }}
              className={`w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/5 transition-colors ${
                penSizeIdx === i && !isEraser ? "bg-black/10" : ""
              }`}
              title={`Size ${sz}px`}
            >
              <div
                className="rounded-full bg-foreground/60"
                style={{ width: sz + 2, height: sz + 2 }}
              />
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-foreground/10 mx-1" />

        <button
          onClick={() => setIsEraser(!isEraser)}
          className={`flex items-center gap-1.5 px-3 h-8 rounded-full text-sm font-medium transition-colors ${
            isEraser ? "bg-black/10 text-foreground" : "hover:bg-black/5 text-foreground/60"
          }`}
        >
          <Eraser className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Eraser</span>
        </button>

        <button
          onClick={clearCanvas}
          className="flex items-center gap-1.5 px-3 h-8 rounded-full text-sm font-medium text-rose-500/70 hover:bg-rose-50 hover:text-rose-500 transition-colors ml-auto"
        >
          Clear all
        </button>
      </div>

      <div
        ref={containerRef}
        className="flex-1 rounded-2xl overflow-hidden border border-black/8 bg-white shadow-inner touch-none select-none"
        style={{ cursor: isEraser ? "cell" : "crosshair" }}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full block"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
        />
      </div>
    </div>
  );
}

// ─── NoteEditor (main) ────────────────────────────────────────────────────────

export default function NoteEditor() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: note, isLoading, isError } = useGetNote(id!, {
    query: { enabled: !!id, queryKey: getGetNoteQueryKey(id!) },
  });
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [mode, setMode] = useState<EditorMode>("text");
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [color, setColor] = useState("#ffffff");
  const [pinned, setPinned] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const initializedForId = useRef<string | null>(null);
  const lastSaved = useRef({ title: "", content: "", color: "#ffffff", pinned: false });
  const updateFnRef = useRef(updateNote.mutate);
  updateFnRef.current = updateNote.mutate;

  const titleRef = useRef(title);
  const colorRef = useRef(color);
  const pinnedRef = useRef(pinned);
  titleRef.current = title;
  colorRef.current = color;
  pinnedRef.current = pinned;

  useEffect(() => {
    if (note && initializedForId.current !== id) {
      initializedForId.current = id;
      const detectedMode = detectMode(note.content);
      setTitle(note.title);
      setContent(note.content);
      setMode(detectedMode);
      if (detectedMode === "checklist") {
        setChecklistItems(parseChecklistFromContent(note.content));
      } else if (detectedMode === "bullets" && !note.content.trim()) {
        setContent("• ");
      }
      setColor(note.color || "#ffffff");
      setPinned(note.pinned);
      lastSaved.current = {
        title: note.title,
        content: note.content,
        color: note.color || "#ffffff",
        pinned: note.pinned,
      };
    }
  }, [note, id]);

  const saveNote = useCallback(
    (data: { title: string; content: string; color: string; pinned: boolean }) => {
      if (!id) return;
      setIsSaving(true);
      updateFnRef.current(
        { id, data },
        {
          onSuccess: (updatedNote) => {
            setIsSaving(false);
            queryClient.setQueryData(getGetNoteQueryKey(id), updatedNote);
          },
          onError: () => {
            setIsSaving(false);
            toast({ title: "Failed to save", variant: "destructive" });
          },
        }
      );
    },
    [id, queryClient, toast]
  );

  useEffect(() => {
    if (initializedForId.current !== id) return;
    if (mode === "doodle") return;

    const effectiveContent = mode === "checklist" ? serializeChecklist(checklistItems) : content;

    const hasChanged =
      title !== lastSaved.current.title ||
      effectiveContent !== lastSaved.current.content ||
      color !== lastSaved.current.color ||
      pinned !== lastSaved.current.pinned;

    if (!hasChanged) return;

    const t = setTimeout(() => {
      saveNote({ title, content: effectiveContent, color, pinned });
      lastSaved.current = { title, content: effectiveContent, color, pinned };
    }, 800);

    return () => clearTimeout(t);
  }, [title, content, checklistItems, color, pinned, id, saveNote, mode]);

  const switchMode = (next: EditorMode) => {
    const newMode = next === mode ? "text" : next;

    let stripped = content;
    if (mode === "checklist") {
      stripped = checklistItems.map(i => i.text).filter(Boolean).join("\n");
    } else if (mode === "bullets") {
      stripped = content.split("\n").map(l => l.replace(/^• /, "")).join("\n");
    } else if (mode === "doodle") {
      stripped = "";
    }

    if (newMode === "bullets") {
      const lines = stripped.split("\n");
      const bulleted = lines.map(l => (l.trim() ? `• ${l.trim()}` : "")).filter(Boolean);
      const newContent = bulleted.length ? bulleted.join("\n") : "• ";
      setContent(newContent);
    } else if (newMode === "checklist") {
      const items = stripped
        ? stripped.split("\n").filter(Boolean).map(l => ({ id: uid(), text: l, checked: false }))
        : [{ id: uid(), text: "", checked: false }];
      setChecklistItems(items);
      setContent(serializeChecklist(items));
    } else if (newMode === "text") {
      setContent(stripped);
    } else if (newMode === "doodle") {
      // keep content as-is (may be existing drawing)
    }

    setMode(newMode);
  };

  const handleDoodleSave = useCallback(
    (dataUrl: string) => {
      setContent(dataUrl);
      lastSaved.current = {
        title: titleRef.current,
        content: dataUrl,
        color: colorRef.current,
        pinned: pinnedRef.current,
      };
      saveNote({
        title: titleRef.current,
        content: dataUrl,
        color: colorRef.current,
        pinned: pinnedRef.current,
      });
    },
    [saveNote]
  );

  const handleDelete = () => {
    if (confirm("Delete this note permanently?")) {
      deleteNote.mutate(
        { id: id! },
        {
          onSuccess: () => {
            toast({ title: "Note deleted" });
            setLocation("/");
          },
        }
      );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !note) {
    return (
      <div className="min-h-screen flex items-center justify-center">Note not found.</div>
    );
  }

  const bgStyle = color === "#ffffff" ? "var(--color-background)" : color;

  return (
    <div className="min-h-[100dvh] transition-colors duration-500" style={{ backgroundColor: bgStyle }}>
      <div className="max-w-3xl mx-auto px-4 py-6 md:px-8 md:py-8 flex flex-col h-[100dvh]">
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/")}
              className="rounded-full hover:bg-black/5"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <span
              className={`text-xs font-medium text-foreground/40 flex items-center gap-1.5 transition-opacity duration-300 ${
                isSaving ? "opacity-100" : "opacity-0"
              }`}
            >
              <Save className="w-3 h-3" /> Saving…
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => switchMode("bullets")}
              title="Bullet list"
              className={`rounded-full hover:bg-black/5 ${mode === "bullets" ? "text-primary bg-primary/10" : ""}`}
            >
              <List className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => switchMode("checklist")}
              title="Checklist"
              className={`rounded-full hover:bg-black/5 ${mode === "checklist" ? "text-primary bg-primary/10" : ""}`}
            >
              <SquareCheck className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => switchMode("doodle")}
              title="Draw / Doodle"
              className={`rounded-full hover:bg-black/5 ${mode === "doodle" ? "text-primary bg-primary/10" : ""}`}
            >
              <Pencil className="w-5 h-5" />
            </Button>

            {mode !== "doodle" && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full hover:bg-black/5">
                    <Palette className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-48 p-3 rounded-2xl bg-card/90 backdrop-blur-xl border-white/20 shadow-xl"
                >
                  <div className="grid grid-cols-4 gap-2">
                    {SWATCHES.map(swatch => (
                      <button
                        key={swatch}
                        className={`w-8 h-8 rounded-full border border-black/5 transition-transform hover:scale-110 ${
                          color === swatch ? "ring-2 ring-primary ring-offset-2 ring-offset-card" : ""
                        }`}
                        style={{ backgroundColor: swatch }}
                        onClick={() => setColor(swatch)}
                      />
                    ))}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPinned(!pinned)}
              className={`rounded-full hover:bg-black/5 ${pinned ? "text-primary" : ""}`}
            >
              <Pin className={`w-5 h-5 ${pinned ? "fill-current" : ""}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              className="rounded-full hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="w-5 h-5" />
            </Button>
          </div>
        </header>

        <div className="flex-1 flex flex-col min-h-0 gap-4">
          {mode !== "doodle" && (
            <input
              type="text"
              placeholder="Note Title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-transparent text-4xl md:text-5xl font-serif font-semibold outline-none placeholder:text-foreground/20 text-foreground"
            />
          )}

          {mode === "text" && (
            <textarea
              placeholder="Start typing…"
              value={content}
              onChange={e => setContent(e.target.value)}
              className="flex-1 w-full bg-transparent text-lg md:text-xl leading-relaxed outline-none resize-none placeholder:text-foreground/30 text-foreground/80 font-sans pb-12"
              autoFocus
            />
          )}

          {mode === "bullets" && (
            <BulletEditor content={content} onChange={setContent} />
          )}

          {mode === "checklist" && (
            <ChecklistEditor
              items={checklistItems}
              onChange={items => {
                setChecklistItems(items);
                setContent(serializeChecklist(items));
              }}
            />
          )}

          {mode === "doodle" && (
            <DoodleCanvas
              initialDataUrl={content.startsWith("data:image/") ? content : undefined}
              onSave={handleDoodleSave}
            />
          )}
        </div>
      </div>
    </div>
  );
}
