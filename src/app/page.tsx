'use client'

import Link from 'next/link'
import { Rocket, Sparkles, Workflow, ArrowRight, Zap, Activity, Brain, Code, Boxes } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'

const fadeIn = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
}

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans overflow-hidden flex flex-col selection:bg-cyan-500/30">
      
      {/* ─── Background Ambient Glow ─── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-600/10 blur-[120px]" />
        
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px]" />
      </div>

      {/* ─── Navigation ─── */}
      <motion.nav 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-50 border-b border-zinc-800/50 bg-zinc-950/60 backdrop-blur-xl"
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-linear-to-br from-violet-600 to-cyan-500 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(139,92,246,0.3)]">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-zinc-100">
              Open<span className="text-zinc-400 font-light">Workflow</span>
            </span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/login" className="text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors">
              Sign In
            </Link>
            <Link href="/dashboard">
              <Button size="sm" className="bg-zinc-100 hover:bg-white text-zinc-900 font-semibold shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all hover:scale-105 active:scale-95">
                Go to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* ─── Main Content ─── */}
      <main className="flex-1 relative z-10 flex flex-col items-center justify-center px-6 pt-20 pb-32">
        
        <motion.section 
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="relative text-center flex flex-col items-center max-w-5xl mx-auto py-20"
        >
          <motion.div variants={fadeIn} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/80 border border-zinc-800/80 text-zinc-300 font-medium mb-8 backdrop-blur-sm shadow-xl">
            <Sparkles className="h-4 w-4 text-cyan-400" />
            <span className="text-xs sm:text-sm tracking-wide">Enterprise AI Automation Platform</span>
          </motion.div>
          
          <motion.h1 variants={fadeIn} className="text-5xl sm:text-6xl md:text-8xl font-extrabold tracking-tighter mb-8 leading-[1.1] text-white">
            Build intelligent <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-linear-to-r from-violet-400 via-cyan-400 to-emerald-400 drop-shadow-sm">
              workflows seamlessly.
            </span>
          </motion.h1>
          
          <motion.p variants={fadeIn} className="text-lg sm:text-xl text-zinc-400 max-w-3xl mx-auto mb-12 font-light leading-relaxed">
            Design, deploy, and monitor scalable AI agents. Connect your proprietary data, integrate with internal services, and automate complex processes at enterprise scale with zero friction.
          </motion.p>
          
          <motion.div variants={fadeIn} className="flex flex-col sm:flex-row items-center gap-5 w-full sm:w-auto">
            <Link href="/build" className="w-full sm:w-auto">
              <Button size="lg" className="w-full h-14 px-10 bg-white hover:bg-zinc-100 text-zinc-950 font-bold text-base rounded-xl transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.15)] group">
                Start Building
                <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/deploy" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full h-14 px-10 border-zinc-700 bg-zinc-900/50 hover:bg-zinc-800 hover:text-white text-zinc-300 font-semibold text-base rounded-xl backdrop-blur-sm transition-all hover:scale-105 active:scale-95">
                View Deployments
              </Button>
            </Link>
          </motion.div>
        </motion.section>

        {/* ─── Bento Grid Features ─── */}
        <motion.section 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
          className="w-full max-w-6xl mx-auto mt-20"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <motion.div variants={fadeIn} className="col-span-1 md:col-span-2 bg-zinc-900/40 rounded-2xl border border-zinc-800/60 p-10 hover:bg-zinc-900/60 hover:border-zinc-700/80 transition-all duration-300 backdrop-blur-md group">
              <div className="h-14 w-14 bg-violet-500/10 rounded-xl flex items-center justify-center mb-8 border border-violet-500/20 group-hover:scale-110 group-hover:bg-violet-500/20 transition-all">
                <Workflow className="h-7 w-7 text-violet-400" />
              </div>
              <h3 className="text-2xl font-bold text-zinc-100 mb-4 tracking-tight">Visual Orchestration</h3>
              <p className="text-base text-zinc-400 leading-relaxed max-w-md">
                Design complex AI agent architectures visually. Connect nodes, define dynamic logic, and manage state in an intuitive, node-based workspace built for power users.
              </p>
            </motion.div>

            <motion.div variants={fadeIn} className="col-span-1 bg-zinc-900/40 rounded-2xl border border-zinc-800/60 p-10 hover:bg-zinc-900/60 hover:border-zinc-700/80 transition-all duration-300 backdrop-blur-md group">
              <div className="h-14 w-14 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-8 border border-emerald-500/20 group-hover:scale-110 group-hover:bg-emerald-500/20 transition-all">
                <Brain className="h-7 w-7 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-zinc-100 mb-4 tracking-tight">Cognitive Agents</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Empower workflows with autonomous agents that reason, plan, and execute multi-step tasks natively.
              </p>
            </motion.div>

            <motion.div variants={fadeIn} className="col-span-1 bg-zinc-900/40 rounded-2xl border border-zinc-800/60 p-10 hover:bg-zinc-900/60 hover:border-zinc-700/80 transition-all duration-300 backdrop-blur-md group">
              <div className="h-14 w-14 bg-cyan-500/10 rounded-xl flex items-center justify-center mb-8 border border-cyan-500/20 group-hover:scale-110 group-hover:bg-cyan-500/20 transition-all">
                <Rocket className="h-7 w-7 text-cyan-400" />
              </div>
              <h3 className="text-xl font-bold text-zinc-100 mb-4 tracking-tight">1-Click Deploy</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Deploy models seamlessly into production environments. Manage versioning and instant rollbacks with ease.
              </p>
            </motion.div>

            <motion.div variants={fadeIn} className="col-span-1 md:col-span-2 bg-zinc-900/40 rounded-2xl border border-zinc-800/60 p-10 hover:bg-zinc-900/60 hover:border-zinc-700/80 transition-all duration-300 backdrop-blur-md group">
              <div className="h-14 w-14 bg-blue-500/10 rounded-xl flex items-center justify-center mb-8 border border-blue-500/20 group-hover:scale-110 group-hover:bg-blue-500/20 transition-all">
                <Activity className="h-7 w-7 text-blue-400" />
              </div>
              <h3 className="text-2xl font-bold text-zinc-100 mb-4 tracking-tight">Deep Observability</h3>
              <p className="text-base text-zinc-400 leading-relaxed max-w-md">
                Monitor execution traces, debug agent reasoning in real-time, and analyze cost and performance metrics with our built-in telemetry suite.
              </p>
            </motion.div>

          </div>
        </motion.section>
      </main>
    </div>
  )
}
