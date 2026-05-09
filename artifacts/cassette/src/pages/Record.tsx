import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Mic, Square, Save } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateRecording,
  useRequestUploadUrl,
  getListRecordingsQueryKey,
  getGetRecordingStatsQueryKey,
} from "@workspace/api-client-react";
import { Tape } from "@/components/Tape";
import { formatDuration } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

type RecordPhase = "idle" | "recording" | "done" | "labeling" | "saving";

export default function RecordTape() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [phase, setPhase] = useState<RecordPhase>("idle");
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [vuLevels, setVuLevels] = useState<number[]>(Array(12).fill(0));

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const { mutateAsync: requestUploadUrl } = useRequestUploadUrl();
  const { mutateAsync: createRecording } = useCreateRecording();

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // VU meter via AnalyserNode
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      function updateVU() {
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        const levels = Array.from({ length: 12 }, (_, i) => {
          const idx = Math.floor((i / 12) * data.length);
          return data[idx] / 255;
        });
        setVuLevels(levels);
        animFrameRef.current = requestAnimationFrame(updateVU);
      }
      updateVU();

      // Pick the best supported audio format — Safari needs mp4, Chrome/Firefox prefer webm
      const mimeType = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg;codecs=opus",
        "audio/ogg",
      ].find((t) => MediaRecorder.isTypeSupported(t)) ?? "";

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        setVuLevels(Array(12).fill(0));
        audioCtx.close();

        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        setPhase("done");
      };

      recorder.start();
      setPhase("recording");
      setDuration(0);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch (err) {
      toast({ title: "Microphone access denied", description: "Please allow microphone access.", variant: "destructive" });
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  async function saveTape() {
    if (!audioBlob || !title.trim()) return;
    setPhase("saving");

    try {
      const mimeType = audioBlob.type || "audio/webm";
      const name = `recording-${Date.now()}.webm`;

      // Step 1: request presigned URL
      const { uploadURL, objectPath } = await requestUploadUrl({
        data: { name, size: audioBlob.size, contentType: mimeType },
      });

      // Step 2: upload directly to GCS
      await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": mimeType },
        body: audioBlob,
      });

      // Step 3: create recording record
      const recording = await createRecording({
        data: {
          title: title.trim(),
          description: description.trim() || undefined,
          duration,
          audioObjectPath: objectPath,
        },
      });

      queryClient.invalidateQueries({ queryKey: getListRecordingsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetRecordingStatsQueryKey() });

      toast({ title: "Tape saved!", description: "Your recording has been saved to your library." });
      setLocation(`/tape/${recording.id}`);
    } catch (err) {
      toast({ title: "Failed to save tape", description: "Something went wrong. Please try again.", variant: "destructive" });
      setPhase("done");
    }
  }

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

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 py-12 max-w-2xl mx-auto w-full gap-8">

        <AnimatePresence mode="wait">
          {(phase === "idle" || phase === "recording") && (
            <motion.div
              key="recorder"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center gap-8 w-full"
            >
              {/* Cassette with spin animation during recording */}
              <div className="relative">
                <motion.div
                  animate={{ rotate: phase === "recording" ? [-2, 2, -2] : -2 }}
                  transition={{ repeat: phase === "recording" ? Infinity : 0, duration: 2, ease: "easeInOut" }}
                >
                  <Tape
                    title={phase === "recording" ? "RECORDING..." : "NEW TAPE"}
                    duration={duration}
                    date=""
                    isPlaying={phase === "recording"}
                    size="lg"
                  />
                </motion.div>

                {/* Recording indicator dot */}
                {phase === "recording" && (
                  <motion.div
                    className="absolute top-3 right-3 w-4 h-4 rounded-full bg-red-500"
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                  />
                )}
              </div>

              {/* Timer */}
              <div className="font-mono text-5xl text-foreground tracking-widest">
                {formatDuration(duration)}
              </div>

              {/* VU Meter */}
              <div className="flex items-end gap-1 h-12">
                {vuLevels.map((level, i) => (
                  <motion.div
                    key={i}
                    className="w-3 rounded-sm"
                    style={{
                      height: `${Math.max(4, level * 48)}px`,
                      backgroundColor: level > 0.7 ? "hsl(0 84% 60%)" : level > 0.4 ? "hsl(40 80% 50%)" : "hsl(15 82% 46%)",
                    }}
                    animate={{ height: `${Math.max(4, level * 48)}px` }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  />
                ))}
              </div>

              {/* Record/Stop button */}
              {phase === "idle" ? (
                <motion.button
                  onClick={startRecording}
                  className="w-20 h-20 rounded-full bg-primary text-primary-foreground border-4 border-foreground flex items-center justify-center retro-shadow"
                  whileHover={{ x: 2, y: 2, boxShadow: "1px 1px 0px 0px hsl(21 28% 19%)" }}
                  whileTap={{ x: 4, y: 4, boxShadow: "none" }}
                >
                  <Mic className="w-8 h-8" />
                </motion.button>
              ) : (
                <motion.button
                  onClick={stopRecording}
                  className="w-20 h-20 rounded-full bg-destructive text-destructive-foreground border-4 border-foreground flex items-center justify-center retro-shadow"
                  whileHover={{ x: 2, y: 2, boxShadow: "1px 1px 0px 0px hsl(21 28% 19%)" }}
                  whileTap={{ x: 4, y: 4, boxShadow: "none" }}
                >
                  <Square className="w-8 h-8 fill-current" />
                </motion.button>
              )}

              <p className="font-mono text-xs text-muted-foreground">
                {phase === "idle" ? "Press the button to start recording" : "Press to stop recording"}
              </p>
            </motion.div>
          )}

          {(phase === "done" || phase === "labeling" || phase === "saving") && (
            <motion.div
              key="labeling"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center gap-8 w-full max-w-md"
            >
              <motion.div animate={{ rotate: -2 }}>
                <Tape
                  title={title || "UNTITLED TAPE"}
                  duration={duration}
                  date={new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                  size="lg"
                />
              </motion.div>

              {/* Playback preview */}
              {audioUrl && (
                <div className="w-full">
                  <p className="font-mono text-xs text-muted-foreground mb-2 text-center">Preview</p>
                  <audio controls src={audioUrl} className="w-full" style={{ height: 36 }} />
                </div>
              )}

              {/* Label form */}
              <div className="w-full flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-sm font-bold text-foreground">Tape Title *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Give this tape a name..."
                    maxLength={60}
                    className="w-full px-4 py-3 border-2 border-foreground rounded-md bg-card font-label text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-sm font-bold text-foreground">Description (optional)</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What's on this tape?"
                    rows={3}
                    maxLength={200}
                    className="w-full px-4 py-3 border-2 border-foreground rounded-md bg-card font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  />
                </div>

                <motion.button
                  onClick={saveTape}
                  disabled={!title.trim() || phase === "saving"}
                  className="w-full flex items-center justify-center gap-2 font-mono font-bold py-4 bg-primary text-primary-foreground border-2 border-foreground rounded-md retro-shadow disabled:opacity-50 disabled:cursor-not-allowed"
                  whileHover={title.trim() ? { x: 2, y: 2, boxShadow: "1px 1px 0px 0px hsl(21 28% 19%)" } : {}}
                  whileTap={title.trim() ? { x: 3, y: 3, boxShadow: "none" } : {}}
                >
                  {phase === "saving" ? (
                    <motion.div
                      className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                    />
                  ) : (
                    <Save className="w-5 h-5" />
                  )}
                  {phase === "saving" ? "Saving..." : "Save to Library"}
                </motion.button>

                <button
                  onClick={() => { setPhase("idle"); setDuration(0); setAudioBlob(null); setAudioUrl(null); }}
                  className="font-mono text-sm text-muted-foreground hover:text-foreground transition-colors text-center"
                >
                  Discard and record again
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
