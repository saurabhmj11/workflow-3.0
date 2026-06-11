'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  FlaskConical, Play, CheckCircle2, XCircle, Clock,
  Loader2, Plus, AlertTriangle, Timer, Target, Zap,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

// ─── Types ──────────────────────────────────────────

interface TestCase {
  id: string
  name: string
  description?: string
  workflowId: string
  input: Record<string, unknown>
  assertions: Array<{
    type: string
    target?: string
    expected?: unknown
    description?: string
  }>
  tags?: string[]
  createdAt: string
  latestResult?: TestResult | null
}

interface TestResult {
  id: string
  testCaseId: string
  status: 'passed' | 'failed' | 'error'
  durationMs: number
  assertionResults: Array<{
    type: string
    passed: boolean
    actual?: unknown
    expected?: unknown
    message?: string
  }>
  executedAt: string
  error?: string
}

// ─── Time Helper ────────────────────────────────────

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

// ─── Main Page ──────────────────────────────────────

export default function TestingPage() {
  const [testCases, setTestCases] = useState<TestCase[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState<string | null>(null)
  const [runningAll, setRunningAll] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newTest, setNewTest] = useState({ name: '', workflowId: 'wf-demo', description: '' })

  const fetchTests = useCallback(async () => {
    try {
      const res = await fetch('/api/testing/cases')
      const json = await res.json()
      if (json.ok) {
        setTestCases(json.data.testCases)
      }
    } catch (err) {
      console.error('Failed to fetch test cases:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchTests() }, [fetchTests])

  const handleRunTest = useCallback(async (testCaseId: string) => {
    setRunning(testCaseId)
    try {
      const res = await fetch('/api/testing/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testCaseId }),
      })
      const json = await res.json()
      if (json.ok) {
        const status = json.data.status
        toast({
          title: status === 'passed' ? 'Test passed!' : status === 'failed' ? 'Test failed' : 'Test error',
          description: `Duration: ${formatDuration(json.data.durationMs)}`,
          variant: status === 'passed' ? undefined : 'destructive',
        })
        await fetchTests()
      } else {
        toast({ title: 'Run failed', description: json.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Run failed', variant: 'destructive' })
    } finally {
      setRunning(null)
    }
  }, [fetchTests])

  const handleRunAll = useCallback(async () => {
    setRunningAll(true)
    try {
      const res = await fetch('/api/testing/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowId: 'wf-demo' }),
      })
      const json = await res.json()
      if (json.ok) {
        const summary = json.data.summary
        toast({
          title: `All tests complete`,
          description: `${summary.passed} passed, ${summary.failed} failed, ${summary.error} errors`,
        })
        await fetchTests()
      }
    } catch {
      toast({ title: 'Run all failed', variant: 'destructive' })
    } finally {
      setRunningAll(false)
    }
  }, [fetchTests])

  const handleCreateTest = useCallback(async () => {
    if (!newTest.name.trim()) {
      toast({ title: 'Name required', variant: 'destructive' })
      return
    }
    try {
      const res = await fetch('/api/testing/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTest.name,
          workflowId: newTest.workflowId,
          description: newTest.description || undefined,
          input: { message: 'test input' },
          assertions: [
            { type: 'status_equals', expected: 'success', description: 'Should complete successfully' },
          ],
        }),
      })
      const json = await res.json()
      if (json.ok) {
        toast({ title: 'Test case created!' })
        setNewTest({ name: '', workflowId: 'wf-demo', description: '' })
        setShowCreateForm(false)
        await fetchTests()
      } else {
        toast({ title: 'Failed to create test', description: json.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Failed to create test', variant: 'destructive' })
    }
  }, [newTest, fetchTests])

  // Compute stats
  const passed = testCases.filter(tc => tc.latestResult?.status === 'passed').length
  const failed = testCases.filter(tc => tc.latestResult?.status === 'failed').length
  const errors = testCases.filter(tc => tc.latestResult?.status === 'error').length
  const notRun = testCases.filter(tc => !tc.latestResult).length
  const avgDuration = testCases
    .filter(tc => tc.latestResult)
    .reduce((sum, tc) => sum + tc.latestResult!.durationMs, 0) / (testCases.filter(tc => tc.latestResult).length || 1)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-amber-400" />
          <p className="text-sm text-zinc-400">Loading test cases...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card className="bg-zinc-900/80 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <FlaskConical className="h-4 w-4 text-amber-400" />
                <span className="text-xs text-zinc-500">Total</span>
              </div>
              <p className="text-2xl font-bold text-zinc-100">{testCases.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900/80 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span className="text-xs text-zinc-500">Passed</span>
              </div>
              <p className="text-2xl font-bold text-emerald-400">{passed}</p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900/80 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <XCircle className="h-4 w-4 text-red-400" />
                <span className="text-xs text-zinc-500">Failed</span>
              </div>
              <p className="text-2xl font-bold text-red-400">{failed}</p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900/80 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-orange-400" />
                <span className="text-xs text-zinc-500">Errors</span>
              </div>
              <p className="text-2xl font-bold text-orange-400">{errors}</p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900/80 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Timer className="h-4 w-4 text-cyan-400" />
                <span className="text-xs text-zinc-500">Avg Duration</span>
              </div>
              <p className="text-2xl font-bold text-zinc-100">{avgDuration > 0 ? formatDuration(avgDuration) : '—'}</p>
            </CardContent>
          </Card>
        </div>

        {/* Pass Rate Bar */}
        {testCases.length > 0 && (
          <Card className="bg-zinc-900/80 border-zinc-800 mb-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-zinc-400">Pass Rate</span>
                <span className="text-xs font-medium text-zinc-200">
                  {testCases.length > 0 ? Math.round((passed / (passed + failed + errors || 1)) * 100) : 0}%
                </span>
              </div>
              <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden flex">
                {passed > 0 && <div className="h-full bg-emerald-500" style={{ width: `${(passed / testCases.length) * 100}%` }} />}
                {failed > 0 && <div className="h-full bg-red-500" style={{ width: `${(failed / testCases.length) * 100}%` }} />}
                {errors > 0 && <div className="h-full bg-orange-500" style={{ width: `${(errors / testCases.length) * 100}%` }} />}
                {notRun > 0 && <div className="h-full bg-zinc-700" style={{ width: `${(notRun / testCases.length) * 100}%` }} />}
              </div>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-emerald-500" /><span className="text-[10px] text-zinc-500">Passed ({passed})</span></div>
                <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-red-500" /><span className="text-[10px] text-zinc-500">Failed ({failed})</span></div>
                <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-orange-500" /><span className="text-[10px] text-zinc-500">Errors ({errors})</span></div>
                <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-zinc-700" /><span className="text-[10px] text-zinc-500">Not run ({notRun})</span></div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Test Cases List */}
        <Card className="bg-zinc-900/80 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
              <Target className="h-4 w-4 text-amber-400" />
              Test Cases
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {testCases.length === 0 ? (
              <div className="py-16 text-center">
                <FlaskConical className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
                <p className="text-sm text-zinc-500">No test cases yet</p>
                <p className="text-xs text-zinc-600 mb-4">Create a test case to validate your workflows</p>
                <Button size="sm" className="bg-amber-600 hover:bg-amber-500 text-white" onClick={() => setShowCreateForm(true)}>
                  <Plus className="h-3 w-3 mr-1.5" />
                  Create Test Case
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800 hover:bg-transparent">
                      <TableHead className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Name</TableHead>
                      <TableHead className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Workflow</TableHead>
                      <TableHead className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Assertions</TableHead>
                      <TableHead className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Last Result</TableHead>
                      <TableHead className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Duration</TableHead>
                      <TableHead className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {testCases.map((tc) => {
                      const result = tc.latestResult
                      const statusColor = result?.status === 'passed' ? 'text-emerald-400' :
                        result?.status === 'failed' ? 'text-red-400' :
                        result?.status === 'error' ? 'text-orange-400' : 'text-zinc-500'
                      const StatusIcon = result?.status === 'passed' ? CheckCircle2 :
                        result?.status === 'failed' ? XCircle :
                        result?.status === 'error' ? AlertTriangle : Clock

                      return (
                        <TableRow key={tc.id} className="border-zinc-800/50 hover:bg-zinc-800/30">
                          <TableCell className="py-3">
                            <div>
                              <span className="text-xs text-zinc-200 font-medium">{tc.name}</span>
                              {tc.description && (
                                <p className="text-[10px] text-zinc-600 mt-0.5">{tc.description}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-3">
                            <Badge variant="outline" className="text-[10px] border-zinc-700 text-zinc-400 font-mono">
                              {tc.workflowId.slice(0, 16)}...
                            </Badge>
                          </TableCell>
                          <TableCell className="py-3">
                            <span className="text-xs text-zinc-400">{tc.assertions.length} checks</span>
                          </TableCell>
                          <TableCell className="py-3">
                            <div className="flex items-center gap-1.5">
                              <StatusIcon className={`h-3.5 w-3.5 ${statusColor}`} />
                              <span className={`text-xs ${statusColor}`}>
                                {result?.status === 'passed' ? 'Passed' :
                                 result?.status === 'failed' ? 'Failed' :
                                 result?.status === 'error' ? 'Error' : 'Not run'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="py-3">
                            <span className="text-xs text-zinc-400 font-mono">
                              {result ? formatDuration(result.durationMs) : '—'}
                            </span>
                          </TableCell>
                          <TableCell className="py-3">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[10px] px-2 border-amber-800/50 text-amber-400 hover:text-amber-200 hover:bg-amber-900/30"
                              onClick={() => handleRunTest(tc.id)}
                              disabled={!!running}
                            >
                              {running === tc.id ? (
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              ) : (
                                <Play className="h-3 w-3 mr-1" />
                              )}
                              Run
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Test Dialog (inline) */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="bg-zinc-900 border-zinc-700 w-full max-w-md">
              <CardHeader>
                <CardTitle className="text-zinc-100 flex items-center gap-2">
                  <Plus className="h-4 w-4 text-amber-400" />
                  Create Test Case
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Test Name</label>
                  <Input
                    value={newTest.name}
                    onChange={(e) => setNewTest({ ...newTest, name: e.target.value })}
                    placeholder="e.g., Support email classification"
                    className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-600"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Workflow ID</label>
                  <Input
                    value={newTest.workflowId}
                    onChange={(e) => setNewTest({ ...newTest, workflowId: e.target.value })}
                    placeholder="wf-demo"
                    className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-600"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Description (optional)</label>
                  <Input
                    value={newTest.description}
                    onChange={(e) => setNewTest({ ...newTest, description: e.target.value })}
                    placeholder="What this test validates"
                    className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-600"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-300" onClick={() => setShowCreateForm(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" className="bg-amber-600 hover:bg-amber-500 text-white" onClick={handleCreateTest}>
                    Create
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
  )
}
