import { useState, useRef } from "react";
import { useParams, Link } from "wouter";
import { motion } from "framer-motion";
import { Play, Pause, RotateCcw } from "lucide-react";
import {
  useGetSharedRecording,
  getGetSharedRecordingQueryKey,
} from "@workspace/api-client-react";
import { Tape } from "@/components/Tape";
import { formatDuration, formatDate } from "@/lib/format";

export default function SharedTape() {
  const params = useParams<{ shareToken: string }>();
  const shareToken = params.shareToken ?? "";

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const { data: recording, isLoading } = useGetSharedRecording(shareToken, {
    query: {
      enabled: !!shareToken,
      queryKey: getGetSharedRecordingQueryKey(shareToken),
    },
  });

  function togglePlay() {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  }

  function handleRestart() {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    setCurrentTime(0);
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
        <p className="font-sans text-muted-foreground text-sm">This link may have expired or been removed.</p>
        <Link href="/">
          <button className="font-mono text-sm text-primary underline mt-4">Go to Cassette</button>
        </Link>
      </div>
    );
  }

  const progress = recording.duration > 0 ? (currentTime / recording.duration) * 100 : 0;

  return (
    <div className="min-h-[100dvh] bg-background relative flex flex-col">
      <div className="noise-overlay opacity-10" />

      {/* Header */}
      <header className="relative z-10 border-b-2 border-border px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="Cassette" className="w-7 h-7" />
          <span className="font-label text-xl tracking-widest text-foreground">CASSETTE</span>
        </div>
        <Link href="/sign-up">
          <button className="font-mono text-sm px-4 py-2 border-2 border-foreground rounded-md bg-primary text-primary-foreground retro-shadow hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all font-bold">
            Make Your Own
          </button>
        </Link>
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 py-12 max-w-2xl mx-auto w-full">
        <p className="font-mono text-sm text-muted-foreground tracking-wider uppercase mb-8">Someone shared a tape with you</p>

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
          onError={() => setIsPlaying(false)}
          preload="metadata"
        />

        {/* Progress bar */}
        <div className="w-full max-w-md mb-4 h-2 bg-muted rounded-full overflow-hidden border border-border">
          <motion.div
            className="h-full bg-primary rounded-full"
            style={{ width: `${progress}%` }}
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
        </div>

        <p className="font-mono text-xs text-muted-foreground">
          Recorded {formatDate(recording.createdAt)} &middot; {formatDuration(recording.duration)}
        </p>

        {/* CTA */}
        <div className="mt-12 text-center border-2 border-border rounded-xl p-6 bg-card max-w-sm">
          <p className="font-label text-lg text-foreground mb-2">Make your own tapes</p>
          <p className="font-sans text-sm text-muted-foreground mb-4">Record, label, and share voice memos with a beautiful cassette tape UI.</p>
          <Link href="/sign-up">
            <motion.button
              className="w-full font-mono font-bold py-3 bg-primary text-primary-foreground border-2 border-foreground rounded-md retro-shadow"
              whileHover={{ x: 1, y: 1, boxShadow: "2px 2px 0px 0px hsl(21 28% 19%)" }}
              whileTap={{ x: 3, y: 3, boxShadow: "none" }}
            >
              Start Free
            </motion.button>
          </Link>
        </div>
      </main>
    </div>
  );
}
