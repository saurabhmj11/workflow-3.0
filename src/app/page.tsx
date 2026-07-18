'use client'

import Link from 'next/link'
import { motion, useScroll, useTransform, Variants } from 'framer-motion'
import { useRef } from 'react'
import {
  Zap, Workflow, Shield, ArrowRight, Activity,
  Code2, Globe, Lock, Layers, BarChart3, Rocket,
  CheckCircle2, Cpu, Github, Star, Users,
  ChevronRight, Sparkles, IndianRupee
} from 'lucide-react'

// ─── Animation Variants ───────────────────────────────────────
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: 'easeOut' as const }
  })
}

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } }
}

// ─── Data ────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Workflow,
    title: 'Visual Workflow Builder',
    description: 'Drag-and-drop canvas to design multi-step automations, AI agent chains, and complex business logic—no coding required.',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    glow: 'group-hover:shadow-violet-500/20',
    border: 'group-hover:border-violet-500/40',
  },
  {
    icon: Activity,
    title: 'Real-time Observability',
    description: 'Monitor execution logs, variable transformations, and token usage live across your entire automation fleet.',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    glow: 'group-hover:shadow-cyan-500/20',
    border: 'group-hover:border-cyan-500/40',
  },
  {
    icon: Lock,
    title: 'Enterprise-Grade Security',
    description: 'Role-based access control, isolated execution environments, full audit logging, and SSO — built for serious teams.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    glow: 'group-hover:shadow-emerald-500/20',
    border: 'group-hover:border-emerald-500/40',
  },
  {
    icon: Code2,
    title: 'Code When You Need It',
    description: 'Drop into code mode at any node. JavaScript, Python snippets, or full API integrations — all in one unified canvas.',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    glow: 'group-hover:shadow-amber-500/20',
    border: 'group-hover:border-amber-500/40',
  },
  {
    icon: Globe,
    title: 'Embeddable Anywhere',
    description: 'Embed your workflows as chat widgets, REST APIs, or iframes into any existing product in under 5 minutes.',
    color: 'text-sky-400',
    bg: 'bg-sky-500/10',
    glow: 'group-hover:shadow-sky-500/20',
    border: 'group-hover:border-sky-500/40',
  },
  {
    icon: IndianRupee,
    title: 'Built for Bharat',
    description: 'First-class support for Indian payment rails, regional language models, and rupee-denominated billing with local compliance.',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    glow: 'group-hover:shadow-orange-500/20',
    border: 'group-hover:border-orange-500/40',
  },
]

const STATS = [
  { value: '10×', label: 'Faster to deploy vs. hand-coded' },
  { value: '99.9%', label: 'Uptime SLA' },
  { value: '0₹', label: 'To start — free forever tier' },
  { value: '150+', label: 'Pre-built integration nodes' },
]

const STACK_LOGOS = [
  { name: 'OpenAI', color: 'text-emerald-400' },
  { name: 'Gemini', color: 'text-blue-400' },
  { name: 'Claude', color: 'text-orange-400' },
  { name: 'Slack', color: 'text-violet-400' },
  { name: 'PostgreSQL', color: 'text-cyan-400' },
  { name: 'Stripe', color: 'text-indigo-400' },
  { name: 'WhatsApp', color: 'text-green-400' },
  { name: 'Razorpay', color: 'text-sky-400' },
]

// ─── Grid Background ──────────────────────────────────────────
function GridBackground() {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage: `
          linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
      }}
    />
  )
}

// ─── Glowing Orb ────────────────────────────────────────────
function Orb({ className }: { className?: string }) {
  return (
    <div className={`absolute rounded-full blur-[120px] pointer-events-none ${className}`} />
  )
}

export default function LandingPage() {
  const heroRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: heroRef })
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 120])

  return (
    <div className="min-h-screen bg-[#080a0f] text-zinc-50 flex flex-col overflow-x-hidden selection:bg-violet-500/30" style={{ fontFamily: '"Inter", system-ui, sans-serif' }}>

      {/* ── Navbar ─────────────────────────────────────────── */}
      <header className="border-b border-white/6 bg-[#080a0f]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-linear-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <div>
              <span className="font-bold tracking-tight text-white text-[15px]">OpenWorkflow</span>
              <span className="ml-2 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/25">🇮🇳 India</span>
            </div>
          </div>

          <nav className="hidden md:flex gap-8 text-[13px] font-medium text-zinc-400">
            {['Features', 'Integrations', 'Security', 'Pricing'].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`} className="hover:text-zinc-50 transition-colors duration-200">{item}</a>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <a href="https://github.com/saurabhmj11/workflow-3.0" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5 text-[13px] font-medium">
              <Github className="h-4 w-4" />
              <span className="hidden sm:inline">Star on GitHub</span>
            </a>
            <Link href="/login" className="text-[13px] font-medium text-zinc-400 hover:text-white transition-colors">
              Sign In
            </Link>
            <Link
              href="/register"
              className="text-[13px] font-semibold bg-linear-to-r from-violet-600 to-cyan-500 text-white px-4 py-2 rounded-full hover:opacity-90 transition-all duration-200 shadow-lg shadow-violet-500/25"
            >
              Start Free
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">

        {/* ── Hero ─────────────────────────────────────────── */}
        <section ref={heroRef} className="relative min-h-[92vh] flex items-center justify-center overflow-hidden">
          <GridBackground />
          <Orb className="top-[-200px] left-1/2 -translate-x-1/2 w-[900px] h-[700px] bg-violet-600/20" />
          <Orb className="bottom-[-100px] left-[-100px] w-[400px] h-[400px] bg-cyan-600/15" />
          <Orb className="bottom-[-100px] right-[-100px] w-[400px] h-[400px] bg-orange-600/10" />

          {/* Radial fade at bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-48 bg-linear-to-t from-[#080a0f] to-transparent pointer-events-none" />

          <motion.div
            style={{ y: heroY }}
            className="relative z-10 text-center px-6 max-w-5xl mx-auto"
          >
            {/* Badge */}
            <motion.div
              variants={fadeUp} initial="hidden" animate="show"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-zinc-300 mb-8 backdrop-blur-sm"
            >
              <Sparkles className="h-3.5 w-3.5 text-violet-400" />
              <span>India's First AI-Powered No-Code Workflow Platform</span>
              <ChevronRight className="h-3 w-3 text-zinc-500" />
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={fadeUp} custom={1} initial="hidden" animate="show"
              className="text-5xl md:text-7xl lg:text-[82px] font-extrabold tracking-[-0.04em] leading-[1.05] mb-7"
            >
              <span className="text-white">Build Powerful</span>
              <br />
              <span
                style={{
                  backgroundImage: 'linear-gradient(135deg, #a78bfa 0%, #22d3ee 50%, #f97316 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                AI Workflows
              </span>
              <br />
              <span className="text-white">Without Code.</span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              variants={fadeUp} custom={2} initial="hidden" animate="show"
              className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed"
            >
              OpenWorkflow is India&apos;s enterprise-grade AI operating system — visually build, deploy and scale autonomous agents, business logic, and API automations in minutes.
            </motion.p>

            {/* CTA Row */}
            <motion.div
              variants={fadeUp} custom={3} initial="hidden" animate="show"
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link
                href="/register"
                className="group h-12 px-8 rounded-full bg-linear-to-r from-violet-600 to-cyan-500 text-white font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-all duration-200 w-full sm:w-auto shadow-xl shadow-violet-500/30"
              >
                Start Building Free
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/login"
                className="h-12 px-8 rounded-full bg-white/5 text-zinc-200 border border-white/10 font-semibold flex items-center justify-center gap-2 hover:bg-white/9 transition-all duration-200 w-full sm:w-auto backdrop-blur-sm"
              >
                <Rocket className="h-4 w-4" />
                View Dashboard
              </Link>
            </motion.div>

            {/* Trust line */}
            <motion.p
              variants={fadeUp} custom={4} initial="hidden" animate="show"
              className="mt-6 text-xs text-zinc-500"
            >
              No credit card required &nbsp;·&nbsp; Free forever tier &nbsp;·&nbsp; Setup in under 2 minutes
            </motion.p>
          </motion.div>
        </section>

        {/* ── Stats Strip ──────────────────────────────────── */}
        <section className="py-16 border-y border-white/6 bg-white/2">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}
              className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center"
            >
              {STATS.map((stat, i) => (
                <motion.div key={i} variants={fadeUp} custom={i}>
                  <p className="text-4xl md:text-5xl font-black tracking-tighter bg-linear-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">{stat.value}</p>
                  <p className="text-sm text-zinc-400 mt-2">{stat.label}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ── Dashboard Preview ─────────────────────────────── */}
        <section className="py-28 relative overflow-hidden">
          <Orb className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-violet-600/10" />
          <div className="max-w-6xl mx-auto px-6 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-2xl border border-white/8 bg-white/3 backdrop-blur-sm overflow-hidden shadow-2xl shadow-black/60"
            >
              {/* Fake browser bar */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/6 bg-white/2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <div className="w-3 h-3 rounded-full bg-green-500/60" />
                </div>
                <div className="flex-1 mx-4 h-6 rounded-md bg-white/5 border border-white/[0.07] flex items-center px-3">
                  <span className="text-[11px] text-zinc-500">app.openworkflow.in/dashboard</span>
                </div>
              </div>
              {/* Placeholder dashboard UI */}
              <div className="p-6 grid grid-cols-12 gap-4 min-h-[420px]">
                {/* Sidebar */}
                <div className="col-span-2 space-y-2">
                  {['Dashboard', 'Build', 'Test', 'Deploy', 'Embed'].map((nav, i) => (
                    <div key={nav} className={`h-8 rounded-lg flex items-center gap-2 px-2 ${i === 0 ? 'bg-violet-500/20 border border-violet-500/30' : 'bg-white/3'}`}>
                      <div className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-violet-400' : 'bg-zinc-600'}`} />
                      <div className={`h-2 rounded flex-1 ${i === 0 ? 'bg-violet-400/40' : 'bg-zinc-700/50'}`} />
                    </div>
                  ))}
                </div>
                {/* Main content */}
                <div className="col-span-10 space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { color: 'from-violet-500/20 to-violet-500/5', accent: 'bg-violet-400' },
                      { color: 'from-cyan-500/20 to-cyan-500/5', accent: 'bg-cyan-400' },
                      { color: 'from-emerald-500/20 to-emerald-500/5', accent: 'bg-emerald-400' },
                    ].map((c, i) => (
                      <div key={i} className={`h-24 rounded-xl bg-linear-to-br ${c.color} border border-white/6 p-4`}>
                        <div className={`w-6 h-6 rounded-lg ${c.accent} mb-2 opacity-70`} />
                        <div className="h-2 rounded bg-white/20 w-3/4 mb-1.5" />
                        <div className="h-4 rounded bg-white/30 w-1/2" />
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-5 gap-4">
                    <div className="col-span-3 h-48 rounded-xl bg-white/3 border border-white/6 p-4">
                      <div className="flex gap-1 items-end h-full pb-2">
                        {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95].map((h, i) => (
                          <div key={i} className="flex-1 rounded-sm bg-linear-to-t from-violet-500/50 to-cyan-500/30" style={{ height: `${h}%` }} />
                        ))}
                      </div>
                    </div>
                    <div className="col-span-2 space-y-2">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-10 rounded-lg bg-white/3 border border-white/6 p-2 flex items-center gap-2">
                          <div className="w-4 h-4 rounded bg-cyan-500/30" />
                          <div className="flex-1 space-y-1">
                            <div className="h-1.5 rounded bg-white/20 w-full" />
                            <div className="h-1.5 rounded bg-white/10 w-2/3" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── Features Grid ─────────────────────────────────── */}
        <section id="features" className="py-28 border-t border-white/5">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}
              className="text-center mb-20"
            >
              <motion.p variants={fadeUp} className="text-sm font-semibold tracking-widest text-violet-400 uppercase mb-4">Everything You Need</motion.p>
              <motion.h2 variants={fadeUp} custom={1} className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-5">
                The Complete AI Workflow Stack
              </motion.h2>
              <motion.p variants={fadeUp} custom={2} className="text-zinc-400 max-w-xl mx-auto text-lg">
                From idea to production — build, test, deploy, and monitor your automation workflows without touching infrastructure.
              </motion.p>
            </motion.div>

            <motion.div
              variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {FEATURES.map((f, i) => (
                <motion.div
                  key={i}
                  variants={fadeUp} custom={i}
                  className={`group relative p-6 rounded-2xl bg-white/3 border border-white/[0.07] hover:border-white/20 transition-all duration-300 ${f.border} cursor-default`}
                >
                  {/* Glow */}
                  <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-2xl ${f.glow}`} />

                  <div className={`relative h-11 w-11 rounded-xl ${f.bg} flex items-center justify-center mb-5`}>
                    <f.icon className={`h-5 w-5 ${f.color}`} />
                  </div>
                  <h3 className="relative text-[15px] font-semibold mb-2.5 text-white">{f.title}</h3>
                  <p className="relative text-sm text-zinc-400 leading-relaxed">{f.description}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ── Integrations ──────────────────────────────────── */}
        <section id="integrations" className="py-24 border-t border-white/5 bg-white/1">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <motion.p
              initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
              className="text-sm font-medium text-zinc-500 uppercase tracking-widest mb-10"
            >
              Natively connects with the tools you already use
            </motion.p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              {STACK_LOGOS.map((logo, i) => (
                <motion.div
                  key={logo.name}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/4 border border-white/8 backdrop-blur-sm"
                >
                  <Cpu className={`h-3.5 w-3.5 ${logo.color}`} />
                  <span className="text-sm font-medium text-zinc-300">{logo.name}</span>
                </motion.div>
              ))}
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/2 border border-white/5 text-zinc-500 text-sm">
                + 140 more
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA Section ───────────────────────────────────── */}
        <section className="py-28 relative overflow-hidden">
          <Orb className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-violet-600/20" />
          <GridBackground />

          <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/25 text-xs text-violet-300 mb-8">
                <Star className="h-3.5 w-3.5" />
                Made with ❤️ in Bharat
              </div>

              <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 text-white">
                Ready to automate<br />your business?
              </h2>
              <p className="text-zinc-400 text-lg mb-10 max-w-xl mx-auto">
                Join forward-thinking Indian businesses building their AI-powered operations on OpenWorkflow — for free, today.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/register"
                  className="group h-13 px-9 rounded-full bg-linear-to-r from-violet-600 to-cyan-500 text-white font-bold flex items-center justify-center gap-2.5 hover:opacity-90 transition-opacity w-full sm:w-auto text-[15px] shadow-2xl shadow-violet-500/40"
                >
                  Get Started — It's Free
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="/login"
                  className="h-13 px-9 rounded-full text-zinc-300 font-semibold flex items-center justify-center gap-2 hover:text-white border border-white/10 hover:border-white/20 transition-all w-full sm:w-auto text-[15px]"
                >
                  <Users className="h-4 w-4" />
                  Sign in to Workspace
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer className="py-12 border-t border-white/6 bg-[#06080c]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-linear-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
                <Zap className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="font-bold text-zinc-300 tracking-tight">OpenWorkflow</span>
              <span className="text-zinc-600">·</span>
              <span className="text-[11px] text-zinc-500">🇮🇳 Made in India</span>
            </div>

            <div className="text-center">
              <p className="text-xs text-zinc-600">
                Designed &amp; Developed by{' '}
                <span className="text-zinc-400 font-semibold">Saurabh Lokhande</span>
                {' '}— India&apos;s Version of a No-Code AI Platform
              </p>
              <p className="text-xs text-zinc-700 mt-1">
                &copy; {new Date().getFullYear()} OpenWorkflow. All rights reserved.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <Link href="/login" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">Privacy</Link>
              <Link href="/login" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">Terms</Link>
              <a href="https://github.com/saurabhmj11/workflow-3.0" target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-zinc-300 transition-colors">
                <Github className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
