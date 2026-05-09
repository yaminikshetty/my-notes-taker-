import { Link } from "wouter";
import { motion } from "framer-motion";
import { Tape } from "@/components/Tape";

export default function Home() {
  return (
    <div className="min-h-[100dvh] bg-background flex flex-col overflow-hidden relative">
      <div className="noise-overlay opacity-20" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-8 pt-8 pb-4">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="Cassette" className="w-8 h-8" />
          <span className="font-label text-2xl text-foreground tracking-widest">CASSETTE</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/sign-in">
            <button className="font-mono text-sm px-4 py-2 border-2 border-foreground rounded-md retro-shadow hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all bg-background">
              Sign In
            </button>
          </Link>
          <Link href="/sign-up">
            <button className="font-mono text-sm px-4 py-2 border-2 border-foreground rounded-md bg-primary text-primary-foreground retro-shadow hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all font-bold">
              Get Started
            </button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col lg:flex-row items-center justify-center gap-16 px-8 py-12 max-w-6xl mx-auto w-full">
        {/* Left: Text */}
        <motion.div
          className="flex-1 max-w-xl"
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <p className="font-mono text-sm text-primary tracking-[0.3em] uppercase mb-4">Your Personal Tape Library</p>
          <h1 className="font-label text-5xl md:text-7xl text-foreground leading-[1.1] mb-6">
            Voice memos<br />
            <span className="text-primary">worth keeping</span>
          </h1>
          <p className="font-sans text-lg text-muted-foreground mb-10 leading-relaxed">
            Record your thoughts, label them like real cassette tapes, and share with anyone. 
            No more boring voice memo apps — make recording feel personal again.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/sign-up">
              <motion.button
                className="font-mono font-bold px-8 py-4 bg-primary text-primary-foreground border-2 border-foreground rounded-md retro-shadow text-base transition-all"
                whileHover={{ x: 2, y: 2, boxShadow: "1px 1px 0px 0px hsl(21 28% 19%)" }}
                whileTap={{ x: 3, y: 3, boxShadow: "none" }}
              >
                Start Recording Free
              </motion.button>
            </Link>
            <Link href="/sign-in">
              <motion.button
                className="font-mono font-bold px-8 py-4 bg-background text-foreground border-2 border-foreground rounded-md retro-shadow text-base transition-all"
                whileHover={{ x: 2, y: 2, boxShadow: "1px 1px 0px 0px hsl(21 28% 19%)" }}
                whileTap={{ x: 3, y: 3, boxShadow: "none" }}
              >
                Sign In
              </motion.button>
            </Link>
          </div>

          {/* Features */}
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { label: "Record", desc: "Capture voice memos with a beautiful cassette deck UI" },
              { label: "Label", desc: "Name and describe each tape like a real cassette" },
              { label: "Share", desc: "Send a public link — no account needed to listen" },
            ].map((f) => (
              <div key={f.label} className="flex flex-col gap-1">
                <span className="font-label text-primary text-lg tracking-wider">{f.label}</span>
                <span className="font-sans text-sm text-muted-foreground">{f.desc}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Right: Tape visual */}
        <motion.div
          className="flex-1 flex items-center justify-center"
          initial={{ opacity: 0, x: 40, rotate: -5 }}
          animate={{ opacity: 1, x: 0, rotate: -3 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
        >
          <div className="relative">
            <motion.div
              animate={{ rotate: [-3, 1, -3] }}
              transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
              className="drop-shadow-2xl"
            >
              <Tape title="MY FIRST TAPE" duration={142} date="May 2025" size="lg" />
            </motion.div>
            <motion.div
              className="absolute -bottom-8 -right-8 opacity-60"
              animate={{ rotate: [5, 8, 5] }}
              transition={{ repeat: Infinity, duration: 7, ease: "easeInOut" }}
            >
              <Tape title="SUMMER NOTES" duration={87} date="Jun 2025" size="sm" />
            </motion.div>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-6 font-mono text-xs text-muted-foreground">
        Made with warmth — Cassette &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
