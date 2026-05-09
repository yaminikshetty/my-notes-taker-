import React, { useState, useMemo } from "react";
import { useLocation, Link } from "wouter";
import { useListNotes, useCreateNote, useGetNoteStats } from "@workspace/api-client-react";
import { Plus, Search, Pin, Calendar, Loader2, Pencil, List, SquareCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

export default function Home() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: notes, isLoading } = useListNotes({ q: searchQuery || undefined });
  const { data: stats } = useGetNoteStats();
  const createNote = useCreateNote();

  const handleCreate = () => {
    createNote.mutate(
      { data: { title: "", content: "", color: "#ffffff", pinned: false } },
      {
        onSuccess: (note) => {
          setLocation(`/note/${note.id}`);
        },
      }
    );
  };

  const pinnedNotes = useMemo(() => notes?.filter(n => n.pinned) || [], [notes]);
  const regularNotes = useMemo(() => notes?.filter(n => !n.pinned) || [], [notes]);

  return (
    <div className="min-h-[100dvh] max-w-5xl mx-auto px-4 py-8 md:px-8 md:py-12 flex flex-col space-y-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-serif font-semibold">Notes</h1>
          {stats && (
            <p className="text-muted-foreground text-sm flex items-center gap-4">
              <span>{stats.totalNotes} notes</span>
              <span>{stats.updatedToday} updated today</span>
            </p>
          )}
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search notes..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-card border-card-border focus-visible:ring-primary/50"
            />
          </div>
          <Button 
            onClick={handleCreate}
            disabled={createNote.isPending}
            className="shrink-0 rounded-full h-10 w-10 p-0 md:h-10 md:w-auto md:px-4 md:rounded-md bg-foreground hover:bg-foreground/90 text-background"
          >
            {createNote.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
            <span className="hidden md:inline md:ml-2">New Note</span>
          </Button>
        </div>
      </header>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 w-full rounded-2xl" />)}
        </div>
      ) : notes?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-4">
            <Search className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-serif font-medium">No notes found</h3>
          <p className="text-muted-foreground">
            {searchQuery ? "Try a different search term" : "Your notebook is empty. Start writing!"}
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {pinnedNotes.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Pin className="w-4 h-4" /> Pinned
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {pinnedNotes.map((note, i) => (
                  <NoteCard key={note.id} note={note} index={i} />
                ))}
              </div>
            </div>
          )}

          {regularNotes.length > 0 && (
            <div className="space-y-4">
              {pinnedNotes.length > 0 && (
                <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
                  Everything Else
                </h2>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {regularNotes.map((note, i) => (
                  <NoteCard key={note.id} note={note} index={i} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getNoteType(content: string): "doodle" | "checklist" | "bullets" | "text" {
  if (content?.startsWith("data:image/")) return "doodle";
  const lines = content?.trim().split("\n").filter(Boolean) ?? [];
  if (lines.length > 0 && lines.every((l: string) => /^\[[ x]\] /.test(l))) return "checklist";
  if (lines.length > 0 && lines.every((l: string) => l.startsWith("• "))) return "bullets";
  return "text";
}

function NoteCard({ note, index }: { note: any, index: number }) {
  const bgColor = note.color === "#ffffff" || !note.color ? "var(--color-card)" : note.color;
  const noteType = getNoteType(note.content);

  return (
    <Link
      href={`/note/${note.id}`}
      className="block group animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div
        className="h-56 rounded-2xl border shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1 flex flex-col overflow-hidden"
        style={{ backgroundColor: bgColor, borderColor: "rgba(0,0,0,0.05)" }}
      >
        {noteType === "doodle" ? (
          <>
            <div className="flex-1 overflow-hidden relative">
              <img
                src={note.content}
                alt="Doodle"
                className="w-full h-full object-cover object-top"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
            </div>
            <div className="px-5 py-3 flex items-center justify-between border-t border-black/5">
              <div className="flex items-center gap-2 min-w-0">
                <Pencil className="w-3.5 h-3.5 text-foreground/40 flex-shrink-0" />
                <span className="font-serif text-sm font-medium text-foreground/70 truncate">
                  {note.title || "Untitled Doodle"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-foreground/40 flex-shrink-0 ml-2">
                <Calendar className="w-3 h-3" />
                <span>{formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}</span>
                {note.pinned && <Pin className="w-3 h-3 fill-current" />}
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col h-full p-6 justify-between">
            <div className="space-y-3 overflow-hidden flex-1">
              <div className="flex items-center gap-2">
                {noteType === "checklist" && <SquareCheck className="w-3.5 h-3.5 text-foreground/30 flex-shrink-0" />}
                {noteType === "bullets" && <List className="w-3.5 h-3.5 text-foreground/30 flex-shrink-0" />}
                <h3 className="font-serif text-lg font-medium leading-tight line-clamp-2 text-foreground/90">
                  {note.title || "Untitled Note"}
                </h3>
              </div>
              <p className="text-sm text-foreground/60 line-clamp-4 leading-relaxed font-sans">
                {note.content
                  ? note.content.replace(/^\[[ x]\] /gm, "").replace(/^• /gm, "")
                  : "No content…"}
              </p>
            </div>
            <div className="flex items-center justify-between text-xs text-foreground/50 mt-4 pt-4 border-t border-black/5">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}
              </span>
              {note.pinned && <Pin className="w-3 h-3 fill-current" />}
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
