import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Trash2, Share2, Play } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListRecordings,
  getListRecordingsQueryKey,
  useGetRecordingStats,
  getGetRecordingStatsQueryKey,
  useDeleteRecording,
} from "@workspace/api-client-react";
import { Tape } from "@/components/Tape";
import { formatDuration, formatDate } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@clerk/react";

export default function Library() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useUser();
  const queryClient = useQueryClient();

  const { data: recordings = [], isLoading } = useListRecordings();
  const { data: stats } = useGetRecordingStats();
  const { mutate: deleteRecording } = useDeleteRecording({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListRecordingsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetRecordingStatsQueryKey() });
        toast({ title: "Tape erased", description: "The recording has been removed." });
      },
    },
  });

  function handleDelete(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (confirm("Erase this tape? This cannot be undone.")) {
      deleteRecording({ id });
    }
  }

  function handleShare(shareToken: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, "")}/shared/${shareToken}`;
    navigator.clipboard.writeText(url).then(() => {
      toast({ title: "Link copied", description: "Share link copied to clipboard." });
    });
  }

  return (
    <div className="min-h-[100dvh] bg-background relative">
      <div className="noise-overlay opacity-10" />

      {/* Header */}
      <header className="relative z-10 border-b-2 border-border px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="Cassette" className="w-7 h-7" />
          <span className="font-label text-xl tracking-widest text-foreground">CASSETTE</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono text-sm text-muted-foreground hidden sm:block">
            {user?.primaryEmailAddress?.emailAddress}
          </span>
          <Link href="/record">
            <motion.button
              className="flex items-center gap-2 font-mono font-bold px-5 py-2.5 bg-primary text-primary-foreground border-2 border-foreground rounded-md retro-shadow text-sm"
              whileHover={{ x: 1, y: 1, boxShadow: "2px 2px 0px 0px hsl(21 28% 19%)" }}
              whileTap={{ x: 3, y: 3, boxShadow: "none" }}
            >
              <Mic className="w-4 h-4" />
              New Tape
            </motion.button>
          </Link>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-8 py-10">
        {/* Stats bar */}
        {stats && (
          <motion.div
            className="flex gap-8 mb-10"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {[
              { label: "Total Tapes", value: stats.totalTapes.toString() },
              { label: "Total Duration", value: formatDuration(stats.totalDurationSeconds) },
              ...(stats.newestTapeDate ? [{ label: "Latest", value: formatDate(stats.newestTapeDate) }] : []),
            ].map((s) => (
              <div key={s.label} className="flex flex-col">
                <span className="font-mono text-xs text-muted-foreground tracking-wider uppercase">{s.label}</span>
                <span className="font-label text-2xl text-foreground">{s.value}</span>
              </div>
            ))}
          </motion.div>
        )}

        <h2 className="font-label text-3xl text-foreground mb-8 tracking-wide">Your Library</h2>

        {isLoading && (
          <div className="flex items-center justify-center py-24">
            <motion.div
              className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            />
          </div>
        )}

        {!isLoading && recordings.length === 0 && (
          <motion.div
            className="flex flex-col items-center justify-center py-24 text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="opacity-40 mb-8">
              <Tape title="EMPTY TAPE" duration={0} size="lg" />
            </div>
            <p className="font-label text-2xl text-foreground mb-3">No tapes yet</p>
            <p className="font-sans text-muted-foreground mb-8 max-w-sm">
              Your library is blank. Hit record and capture something worth keeping.
            </p>
            <Link href="/record">
              <motion.button
                className="flex items-center gap-2 font-mono font-bold px-6 py-3 bg-primary text-primary-foreground border-2 border-foreground rounded-md retro-shadow"
                whileHover={{ x: 1, y: 1, boxShadow: "2px 2px 0px 0px hsl(21 28% 19%)" }}
                whileTap={{ x: 3, y: 3, boxShadow: "none" }}
              >
                <Mic className="w-4 h-4" />
                Record Your First Tape
              </motion.button>
            </Link>
          </motion.div>
        )}

        <AnimatePresence>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
            {recordings.map((rec, i) => (
              <motion.div
                key={rec.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link href={`/tape/${rec.id}`}>
                  <div className="group cursor-pointer">
                    <motion.div
                      whileHover={{ rotate: 1, scale: 1.02 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <Tape
                        title={rec.title}
                        duration={rec.duration}
                        date={formatDate(rec.createdAt)}
                        size="md"
                      />
                    </motion.div>

                    {/* Action buttons */}
                    <div className="flex gap-2 mt-3 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <motion.button
                        onClick={(e) => { e.preventDefault(); setLocation(`/tape/${rec.id}`); }}
                        className="flex items-center gap-1 font-mono text-xs px-3 py-1.5 border-2 border-foreground rounded bg-card retro-shadow"
                        whileHover={{ x: 1, y: 1, boxShadow: "1px 1px 0px 0px hsl(21 28% 19%)" }}
                        whileTap={{ x: 2, y: 2, boxShadow: "none" }}
                      >
                        <Play className="w-3 h-3" />
                        Play
                      </motion.button>
                      <motion.button
                        onClick={(e) => handleShare(rec.shareToken, e)}
                        className="flex items-center gap-1 font-mono text-xs px-3 py-1.5 border-2 border-foreground rounded bg-card retro-shadow"
                        whileHover={{ x: 1, y: 1, boxShadow: "1px 1px 0px 0px hsl(21 28% 19%)" }}
                        whileTap={{ x: 2, y: 2, boxShadow: "none" }}
                      >
                        <Share2 className="w-3 h-3" />
                        Share
                      </motion.button>
                      <motion.button
                        onClick={(e) => handleDelete(rec.id, e)}
                        className="flex items-center gap-1 font-mono text-xs px-3 py-1.5 border-2 border-destructive rounded bg-card text-destructive retro-shadow"
                        whileHover={{ x: 1, y: 1, boxShadow: "1px 1px 0px 0px hsl(0 84% 60%)" }}
                        whileTap={{ x: 2, y: 2, boxShadow: "none" }}
                      >
                        <Trash2 className="w-3 h-3" />
                        Erase
                      </motion.button>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      </main>
    </div>
  );
}
