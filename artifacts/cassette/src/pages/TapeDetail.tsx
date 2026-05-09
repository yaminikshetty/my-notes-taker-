import { useState, useRef } from "react";
import { useParams, Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Share2, Trash2, Play, Pause, RotateCcw, Check } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetRecording,
  getGetRecordingQueryKey,
  getListRecordingsQueryKey,
  getGetRecordingStatsQueryKey,
  useDeleteRecording,
} from "@workspace/api-client-react";
import { Tape } from "@/components/Tape";
import { formatDuration, formatDate } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

export default function TapeDetail() {
  const params = useParams<{ id: string }>();
  const id = params.id ?? "";
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [shareCopied, setShareCopied] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const { data: recording, isLoading } = useGetRecording(id, {
    query: { enabled: !!id, queryKey: getGetRecordingQueryKey(id) },
  });

  const { mutate: deleteRecording } = useDeleteRecording({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListRecordingsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetRecordingStatsQueryKey() });
        setLocation("/library");
        toast({ title: "Tape erased" });
      },
    },
  });

  function togglePlay() {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }

  function handleRestart() {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    setCurrentTime(0);
  }

  function handleShare() {
    if (!recording) return;
    const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
    const url = `${window.location.origin}${basePath}/shared/${recording.shareToken}`;
    navigator.clipboard.writeText(url).then(() => {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
      toast({ title: "Share link copied", description: "Anyone with this link can listen." });
    });
  }

  function handleDelete() {
    if (confirm("Erase this tape? This cannot be undone.")) {
      deleteRecording({ id });
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <motion.div
          className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        />
      </div>
    );
  }

  if (!recording) {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center gap-4">
        <p className="font-label text-2xl text-foreground">Tape not found</p>
        <Link href="/library">
          <button className="font-mono text-sm text-primary underline">Back to library</button>
        </Link>
      </div>
    );
  }

  const progress = recording.duration > 0 ? (currentTime / recording.duration) * 100 : 0;

  return (
    <div className="min-h-[100dvh] bg-background relative flex flex-col">
      <div className="noise-overlay opacity-10" />

      <header className="relative z-10 border-b-2 border-border px-8 py-5 flex items-center gap-4">
        <Link href="/library">
          <button className="p-2 border-2 border-foreground rounded-md bg-card retro-shadow hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all">
            <ArrowLeft className="w-4 h-4" />
          </button>
        </Link>
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="Cassette" className="w-6 h-6" />
          <span className="font-label text-xl tracking-widest text-foreground">CASSETTE</span>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 py-12 max-w-2xl mx-auto w-full">
        {/* Cassette */}
        <motion.div
          initial={{ opacity: 0, y: 20, rotate: -2 }}
          animate={{ opacity: 1, y: 0, rotate: -2 }}
          transition={{ duration: 0.5 }}
          className="mb-10"
        >
          <Tape
            title={recording.title}
            duration={recording.duration}
            date={formatDate(recording.createdAt)}
            isPlaying={isPlaying}
            size="lg"
          />
        </motion.div>

        {/* Description */}
        {recording.description && (
          <p className="font-sans text-muted-foreground text-center max-w-md mb-8 italic">
            "{recording.description}"
          </p>
        )}

        {/* Audio element */}
        <audio
          ref={audioRef}
          src={`/api/storage${recording.audioObjectPath}`}
          onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
          onEnded={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onError={(e) => {
            const err = (e.target as HTMLAudioElement).error;
            toast({ title: "Could not load audio", description: err?.message ?? "Unknown error", variant: "destructive" });
            setIsPlaying(false);
          }}
          preload="metadata"
        />

        {/* Progress bar */}
        <div className="w-full max-w-md mb-4 h-2 bg-muted rounded-full overflow-hidden border border-border">
          <motion.div
            className="h-full bg-primary rounded-full"
            style={{ width: `${progress}%` }}
            transition={{ type: "tween" }}
          />
        </div>
        <div className="flex justify-between w-full max-w-md mb-8 font-mono text-xs text-muted-foreground">
          <span>{formatDuration(currentTime)}</span>
          <span>{formatDuration(recording.duration)}</span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 mb-10">
          <motion.button
            onClick={handleRestart}
            className="p-3 border-2 border-foreground rounded-md bg-card retro-shadow"
            whileHover={{ x: 1, y: 1, boxShadow: "1px 1px 0px 0px hsl(21 28% 19%)" }}
            whileTap={{ x: 2, y: 2, boxShadow: "none" }}
          >
            <RotateCcw className="w-5 h-5" />
          </motion.button>

          <motion.button
            onClick={togglePlay}
            className="p-5 border-2 border-foreground rounded-full bg-primary text-primary-foreground retro-shadow"
            whileHover={{ x: 1, y: 1, boxShadow: "2px 2px 0px 0px hsl(21 28% 19%)" }}
            whileTap={{ x: 3, y: 3, boxShadow: "none" }}
          >
            {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 translate-x-0.5" />}
          </motion.button>

          <motion.button
            onClick={handleShare}
            className="p-3 border-2 border-foreground rounded-md bg-card retro-shadow"
            whileHover={{ x: 1, y: 1, boxShadow: "1px 1px 0px 0px hsl(21 28% 19%)" }}
            whileTap={{ x: 2, y: 2, boxShadow: "none" }}
          >
            {shareCopied ? <Check className="w-5 h-5 text-primary" /> : <Share2 className="w-5 h-5" />}
          </motion.button>
        </div>

        {/* Share + Delete */}
        <div className="flex flex-col items-center gap-4 w-full max-w-md">
          <motion.button
            onClick={handleShare}
            className="w-full flex items-center justify-center gap-2 font-mono font-bold py-3 border-2 border-foreground rounded-md bg-card retro-shadow"
            whileHover={{ x: 1, y: 1, boxShadow: "2px 2px 0px 0px hsl(21 28% 19%)" }}
            whileTap={{ x: 3, y: 3, boxShadow: "none" }}
          >
            {shareCopied ? <Check className="w-4 h-4 text-primary" /> : <Share2 className="w-4 h-4" />}
            {shareCopied ? "Link copied!" : "Copy Share Link"}
          </motion.button>

          <button
            onClick={handleDelete}
            className="flex items-center gap-2 font-mono text-sm text-destructive hover:underline py-2"
          >
            <Trash2 className="w-4 h-4" />
            Erase this tape
          </button>
        </div>

        <p className="font-mono text-xs text-muted-foreground mt-8">
          Recorded {formatDate(recording.createdAt)} &middot; {formatDuration(recording.duration)}
        </p>
      </main>
    </div>
  );
}
