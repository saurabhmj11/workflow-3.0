'use client'

// ─── Agent Orchestration Panel ────────────────────
// UI for configuring and running multi-agent orchestration sessions
// Supports sequential, round-robin, supervisor, debate, and pipeline patterns

import { useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import {
  Brain,
  Play,
  Loader2,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Users,
  Pause,
  RotateCcw,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

// ─── Types ─────────────────────────────────────────

type OrchestrationPattern = 'sequential' | 'round-robin' | 'supervisor' | 'debate' | 'pipeline'

interface AgentDef {
  id: string
  name: string
  role: string
  systemPrompt: string
  model?: string
  temperature?: number
}

interface SessionMessage {
  id: string
  fromAgent: string
  toAgent: string
  type: string
  content: string
  timestamp: number
}

interface SessionState {
  id: string
  status: 'initialized' | 'running' | 'completed' | 'failed' | 'paused'
  agents: { id: string; name: string; role: string }[]
  currentRound: number
  maxRounds: number
  messages: SessionMessage[]
  result?: {
    pattern: string
    rounds: number
    finalOutput: string
    allResults: { agentId: string; agentName: string; result: string }[]
    messageCount: number
  }
  error?: string
}

// ─── Pattern Config ────────────────────────────────

const PATTERNS: { value: OrchestrationPattern; label: string; description: string; icon: string }[] = [
  { value: 'sequential', label: 'Sequential', description: 'Agents execute one after another', icon: '→' },
  { value: 'round-robin', label: 'Round Robin', description: 'Agents take turns in order', icon: '↻' },
  { value: 'supervisor', label: 'Supervisor', description: 'Coordinator delegates tasks', icon: '👑' },
  { value: 'debate', label: 'Debate', description: 'Agents argue different perspectives', icon: '⚖️' },
  { value: 'pipeline', label: 'Pipeline', description: 'Agents form a processing chain', icon: '⧉' },
]

const ROLE_PRESETS = [
  { role: 'researcher', name: 'Researcher', prompt: 'You are a research agent. Analyze the task, gather relevant information, and provide detailed findings.' },
  { role: 'writer', name: 'Writer', prompt: 'You are a writing agent. Take the research findings and compose clear, engaging content.' },
  { role: 'reviewer', name: 'Reviewer', prompt: 'You are a review agent. Evaluate the work for quality, accuracy, and completeness.' },
  { role: 'coordinator', name: 'Coordinator', prompt: 'You are a coordinator agent. Synthesize inputs from all agents and produce a final summary.' },
  { role: 'critic', name: 'Critic', prompt: 'You are a critical analysis agent. Challenge assumptions and identify potential issues.' },
]

// ─── Agent Orchestration Panel Component ───────────

export function AgentOrchestrationPanel() {
  const [pattern, setPattern] = useState<OrchestrationPattern>('sequential')
  const [maxRounds, setMaxRounds] = useState(2)
  const [task, setTask] = useState('')
  const [agents, setAgents] = useState<AgentDef[]>([
    { id: 'agent-1', name: 'Researcher', role: 'researcher', systemPrompt: ROLE_PRESETS[0].prompt },
    { id: 'agent-2', name: 'Writer', role: 'writer', systemPrompt: ROLE_PRESETS[1].prompt },
    { id: 'agent-3', name: 'Reviewer', role: 'reviewer', systemPrompt: ROLE_PRESETS[2].prompt },
  ])
  const [running, setRunning] = useState(false)
  const [session, setSession] = useState<SessionState | null>(null)
  const [showResults, setShowResults] = useState(false)
  const [showConfig, setShowConfig] = useState(true)

  // ─── Add Agent ────────────────────────────────
  const addAgent = useCallback(() => {
    const idx = agents.length + 1
    const preset = ROLE_PRESETS[(idx - 1) % ROLE_PRESETS.length]
    setAgents((prev) => [
      ...prev,
      {
        id: `agent-${idx}-${Date.now()}`,
        name: preset.name,
        role: preset.role,
        systemPrompt: preset.prompt,
      },
    ])
  }, [agents.length])

  // ─── Remove Agent ─────────────────────────────
  const removeAgent = useCallback((id: string) => {
    setAgents((prev) => prev.filter((a) => a.id !== id))
  }, [])

  // ─── Update Agent ─────────────────────────────
  const updateAgent = useCallback((id: string, field: keyof AgentDef, value: string) => {
    setAgents((prev) => prev.map((a) => (a.id === id ? { ...a, [field]: value } : a)))
  }, [])

  // ─── Start Orchestration ──────────────────────
  const startOrchestration = useCallback(async () => {
    if (!task.trim()) {
      toast({ title: 'No task', description: 'Enter a task for the agents', variant: 'destructive' })
      return
    }

    if (agents.length === 0) {
      toast({ title: 'No agents', description: 'Add at least one agent', variant: 'destructive' })
      return
    }

    setRunning(true)
    setSession(null)
    setShowResults(true)
    setShowConfig(false)

    try {
      const res = await fetch('/api/agents/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agents,
          pattern,
          task,
          config: { maxRounds },
        }),
      })
      const json = await res.json()

      if (json.ok) {
        setSession(json.data)
        toast({
          title: 'Orchestration complete',
          description: `${agents.length} agents ran ${json.data.currentRound} rounds`,
        })
      } else {
        toast({ title: 'Orchestration failed', description: json.error, variant: 'destructive' })
      }
    } catch (err) {
      toast({
        title: 'Orchestration failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setRunning(false)
    }
  }, [agents, pattern, task, maxRounds])

  // ─── Pause Orchestration ──────────────────────
  const pauseSession = useCallback(async () => {
    if (!session) return
    try {
      await fetch(`/api/agents/sessions/${session.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pause' }),
      })
      toast({ title: 'Paused', description: 'Orchestration paused' })
    } catch (err) {
      console.error('Pause failed:', err)
    }
  }, [session])

  // ─── Reset ────────────────────────────────────
  const resetSession = useCallback(() => {
    setSession(null)
    setShowResults(false)
    setShowConfig(true)
  }, [])

  return (
    <div className="h-full flex flex-col">
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {/* Configuration Section */}
          {showConfig && (
            <>
              {/* Task Input */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="h-3 w-3" />
                  Task
                </label>
                <Input
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                  placeholder="Describe the task for your agents..."
                  className="h-8 text-xs bg-zinc-900 border-zinc-700 text-zinc-200 placeholder:text-zinc-600"
                />
              </div>

              {/* Pattern Selection */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Brain className="h-3 w-3" />
                  Pattern
                </label>
                <div className="grid grid-cols-1 gap-1">
                  {PATTERNS.map((p) => (
                    <button
                      key={p.value}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition-colors ${
                        pattern === p.value
                          ? 'bg-violet-900/30 border border-violet-500/30 text-violet-300'
                          : 'bg-zinc-900/30 border border-zinc-800 text-zinc-400 hover:text-zinc-300 hover:border-zinc-700'
                      }`}
                      onClick={() => setPattern(p.value)}
                    >
                      <span className="text-sm">{p.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-medium">{p.label}</div>
                        <div className="text-[9px] text-zinc-500 truncate">{p.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Max Rounds */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  Max Rounds: {maxRounds}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={1}
                    max={5}
                    value={maxRounds}
                    onChange={(e) => setMaxRounds(Number(e.target.value))}
                    className="flex-1 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-violet-500"
                  />
                  <span className="text-[10px] text-zinc-500 w-6 text-right">{maxRounds}</span>
                </div>
              </div>

              <Separator className="bg-zinc-800" />

              {/* Agent Definitions */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="h-3 w-3" />
                    Agents ({agents.length})
                  </label>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-5 text-[10px] px-1.5 text-violet-400 hover:text-violet-200"
                    onClick={addAgent}
                  >
                    <Plus className="h-3 w-3 mr-0.5" />
                    Add
                  </Button>
                </div>

                <div className="space-y-1.5">
                  {agents.map((agent, idx) => (
                    <Card key={agent.id} className="bg-zinc-900/50 border-zinc-800">
                      <CardContent className="p-2 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <div className="h-5 w-5 rounded bg-violet-500/10 border border-violet-500/30 flex items-center justify-center">
                              <Brain className="h-3 w-3 text-violet-400" />
                            </div>
                            <Input
                              value={agent.name}
                              onChange={(e) => updateAgent(agent.id, 'name', e.target.value)}
                              className="h-5 text-[10px] bg-transparent border-none p-0 text-zinc-200 font-medium w-24"
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-[9px] h-4 px-1 border-zinc-700 text-zinc-400">
                              {agent.role}
                            </Badge>
                            {agents.length > 1 && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-5 w-5 p-0 text-zinc-500 hover:text-red-400"
                                onClick={() => removeAgent(agent.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                        <Input
                          value={agent.systemPrompt}
                          onChange={(e) => updateAgent(agent.id, 'systemPrompt', e.target.value)}
                          className="h-5 text-[10px] bg-zinc-800/50 border-zinc-700/50 text-zinc-400 px-1.5"
                          placeholder="System prompt..."
                        />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Start Button */}
              <Button
                className="w-full h-8 gap-1.5 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white"
                onClick={startOrchestration}
                disabled={running || !task.trim() || agents.length === 0}
              >
                {running ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
                {running ? 'Running...' : 'Start Orchestration'}
              </Button>
            </>
          )}

          {/* Results Section */}
          {showResults && (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  <Brain className="h-3 w-3" />
                  Results
                </div>
                <div className="flex items-center gap-1">
                  {session?.status === 'running' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-5 text-[10px] px-1.5 text-amber-400"
                      onClick={pauseSession}
                    >
                      <Pause className="h-3 w-3 mr-0.5" />
                      Pause
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-5 text-[10px] px-1.5 text-zinc-400"
                    onClick={resetSession}
                  >
                    <RotateCcw className="h-3 w-3 mr-0.5" />
                    Reset
                  </Button>
                </div>
              </div>

              {/* Status Badge */}
              {session && (
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`text-[10px] h-5 ${
                      session.status === 'completed'
                        ? 'border-emerald-500/30 text-emerald-400'
                        : session.status === 'running'
                        ? 'border-amber-500/30 text-amber-400'
                        : session.status === 'failed'
                        ? 'border-red-500/30 text-red-400'
                        : session.status === 'paused'
                        ? 'border-zinc-500/30 text-zinc-400'
                        : 'border-zinc-700 text-zinc-500'
                    }`}
                  >
                    {session.status === 'completed' && <CheckCircle2 className="h-3 w-3 mr-0.5" />}
                    {session.status === 'running' && <Loader2 className="h-3 w-3 mr-0.5 animate-spin" />}
                    {session.status === 'failed' && <AlertCircle className="h-3 w-3 mr-0.5" />}
                    {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                  </Badge>
                  <span className="text-[10px] text-zinc-500">
                    Round {session.currentRound}/{session.maxRounds}
                  </span>
                </div>
              )}

              {/* Running Indicator */}
              {running && !session && (
                <div className="flex items-center justify-center py-6 text-zinc-400">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  <span className="text-xs">Agents collaborating...</span>
                </div>
              )}

              {/* Agent Results */}
              {session?.result && (
                <div className="space-y-2">
                  {session.result.allResults?.map((r, idx) => (
                    <Card key={r.agentId} className="bg-zinc-900/50 border-zinc-800">
                      <CardContent className="p-2.5">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <div className="h-4 w-4 rounded bg-violet-500/10 border border-violet-500/30 flex items-center justify-center">
                            <Brain className="h-2.5 w-2.5 text-violet-400" />
                          </div>
                          <span className="text-[11px] font-medium text-zinc-200">{r.agentName}</span>
                          <Badge variant="outline" className="text-[9px] h-4 px-1 border-zinc-700 text-zinc-500">
                            Agent {idx + 1}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-zinc-400 leading-relaxed line-clamp-4">
                          {r.result}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Messages Log */}
              {session && session.messages.length > 0 && (
                <div className="space-y-1.5">
                  <button
                    className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider w-full hover:text-zinc-300 transition-colors"
                    onClick={() => setShowResults((prev) => !prev)}
                  >
                    <MessageSquare className="h-3 w-3" />
                    Messages ({session.messages.length})
                    {showResults ? <ChevronUp className="h-3 w-3 ml-auto" /> : <ChevronDown className="h-3 w-3 ml-auto" />}
                  </button>

                  {showResults && (
                    <div className="space-y-0.5 max-h-32 overflow-y-auto">
                      {session.messages.slice(-10).map((msg) => (
                        <div key={msg.id} className="flex items-start gap-1.5 px-1.5 py-0.5">
                          <span className="text-[9px] text-violet-400 font-medium shrink-0">
                            {msg.fromAgent === 'system' ? '→' : msg.fromAgent.slice(0, 8)}:
                          </span>
                          <span className="text-[9px] text-zinc-500 line-clamp-2">{msg.content.slice(0, 80)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Error */}
              {session?.error && (
                <div className="flex items-center gap-2 p-2 rounded bg-red-900/20 border border-red-800/30">
                  <AlertCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                  <span className="text-[10px] text-red-300">{session.error}</span>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
