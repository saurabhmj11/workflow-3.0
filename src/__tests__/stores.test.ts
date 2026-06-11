import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useWorkflowStore } from '@/stores/workflow-store'
import { useExecutionStore } from '@/stores/execution-store'
import { useApprovalStore } from '@/stores/approval-store'
import { useNotificationStore } from '@/stores/notification-store'

// ─── WorkflowStore Tests ────────────────────────────────

describe('WorkflowStore', () => {
  beforeEach(() => {
    useWorkflowStore.getState().reset()
  })

  it('starts with empty nodes and edges', () => {
    const state = useWorkflowStore.getState()
    expect(state.nodes).toHaveLength(0)
    expect(state.edges).toHaveLength(0)
  })

  it('adds a node correctly', () => {
    useWorkflowStore.getState().addNode({
      id: 'node-1',
      type: 'webhook',
      label: 'Webhook',
      category: 'trigger' as any,
      config: {},
      position: { x: 100, y: 100 },
    })
    expect(useWorkflowStore.getState().nodes).toHaveLength(1)
    expect(useWorkflowStore.getState().nodes[0].id).toBe('node-1')
    expect(useWorkflowStore.getState().nodes[0].type).toBe('webhook')
  })

  it('removes a node correctly', () => {
    useWorkflowStore.getState().addNode({
      id: 'node-1',
      type: 'webhook',
      label: 'Webhook',
      category: 'trigger' as any,
      config: {},
      position: { x: 100, y: 100 },
    })
    useWorkflowStore.getState().removeNode('node-1')
    expect(useWorkflowStore.getState().nodes).toHaveLength(0)
  })

  it('adds an edge correctly', () => {
    useWorkflowStore.getState().addEdge({
      id: 'edge-1',
      source: 'node-1',
      target: 'node-2',
      sourceHandle: 'default',
      targetHandle: 'input',
    })
    expect(useWorkflowStore.getState().edges).toHaveLength(1)
    expect(useWorkflowStore.getState().edges[0].source).toBe('node-1')
  })

  it('updates node position', () => {
    useWorkflowStore.getState().addNode({
      id: 'node-1',
      type: 'webhook',
      label: 'Webhook',
      category: 'trigger' as any,
      config: {},
      position: { x: 100, y: 100 },
    })
    useWorkflowStore.getState().updateNodePosition('node-1', { x: 200, y: 300 })
    expect(useWorkflowStore.getState().nodes[0].position).toEqual({ x: 200, y: 300 })
  })

  it('resets store state', () => {
    useWorkflowStore.getState().addNode({
      id: 'node-1',
      type: 'webhook',
      label: 'Webhook',
      category: 'trigger' as any,
      config: {},
      position: { x: 100, y: 100 },
    })
    useWorkflowStore.getState().addEdge({
      id: 'edge-1',
      source: 'node-1',
      target: 'node-2',
      sourceHandle: 'default',
      targetHandle: 'input',
    })
    useWorkflowStore.getState().reset()
    expect(useWorkflowStore.getState().nodes).toHaveLength(0)
    expect(useWorkflowStore.getState().edges).toHaveLength(0)
  })

  it('selects and deselects nodes', () => {
    useWorkflowStore.getState().selectNode('node-1')
    expect(useWorkflowStore.getState().selectedNodeId).toBe('node-1')
    useWorkflowStore.getState().selectNode(null)
    expect(useWorkflowStore.getState().selectedNodeId).toBeNull()
  })

  it('sets workflow name', () => {
    useWorkflowStore.getState().setName('My Test Workflow')
    expect(useWorkflowStore.getState().name).toBe('My Test Workflow')
  })
})

// ─── ExecutionStore Tests ──────────────────────────────

describe('ExecutionStore', () => {
  beforeEach(() => {
    useExecutionStore.getState().reset()
  })

  it('starts with empty results and not running', () => {
    const state = useExecutionStore.getState()
    expect(state.results).toHaveLength(0)
    expect(state.isRunning).toBe(false)
  })

  it('starts a run correctly and returns a runId', () => {
    const runId = useExecutionStore.getState().startRun('wf-test')
    expect(runId).toBeTruthy()
    expect(useExecutionStore.getState().isRunning).toBe(true)
    expect(useExecutionStore.getState().currentRunId).toBe(runId)
  })

  it('creates a result entry when starting a run', () => {
    const runId = useExecutionStore.getState().startRun('wf-test')
    const result = useExecutionStore.getState().results.find(r => r.runId === runId)
    expect(result).toBeDefined()
    expect(result?.status).toBe('running')
    expect(result?.workflowId).toBe('wf-test')
  })

  it('completes a run correctly', () => {
    const runId = useExecutionStore.getState().startRun('wf-test')
    useExecutionStore.getState().completeRun(runId, {
      status: 'success',
      totalDurationMs: 1000,
    })
    expect(useExecutionStore.getState().isRunning).toBe(false)
    expect(useExecutionStore.getState().currentRunId).toBeNull()
    const result = useExecutionStore.getState().results.find(r => r.runId === runId)
    expect(result?.status).toBe('success')
  })

  it('force resets running state', () => {
    useExecutionStore.getState().startRun('wf-test')
    useExecutionStore.getState().forceResetRunning()
    expect(useExecutionStore.getState().isRunning).toBe(false)
    expect(useExecutionStore.getState().currentRunId).toBeNull()
  })

  it('limits stored results to MAX_RESULTS', () => {
    // Start 25 runs
    for (let i = 0; i < 25; i++) {
      const runId = useExecutionStore.getState().startRun('wf-test')
      useExecutionStore.getState().completeRun(runId, { status: 'success', totalDurationMs: 100 })
    }
    // Should be capped at 20
    expect(useExecutionStore.getState().results.length).toBeLessThanOrEqual(20)
  })
})

// ─── ApprovalStore Tests ───────────────────────────────

describe('ApprovalStore', () => {
  beforeEach(() => {
    useApprovalStore.setState({ requests: [] })
  })

  it('starts with empty requests', () => {
    expect(useApprovalStore.getState().requests).toHaveLength(0)
  })

  it('adds an approval request', () => {
    useApprovalStore.getState().addRequest({
      id: 'approval-1',
      runId: 'run-1',
      nodeId: 'node-1',
      workflowId: 'wf-1',
      status: 'pending',
      createdAt: new Date().toISOString(),
    })
    expect(useApprovalStore.getState().requests).toHaveLength(1)
  })

  it('updates approval status via updateStatus', () => {
    useApprovalStore.getState().addRequest({
      id: 'approval-1',
      runId: 'run-1',
      nodeId: 'node-1',
      workflowId: 'wf-1',
      status: 'pending',
      createdAt: new Date().toISOString(),
    })
    useApprovalStore.getState().updateStatus('approval-1', 'approved', 'Looks good')
    const req = useApprovalStore.getState().requests.find(r => r.id === 'approval-1')
    expect(req?.status).toBe('approved')
  })

  it('rejects via updateStatus', () => {
    useApprovalStore.getState().addRequest({
      id: 'approval-1',
      runId: 'run-1',
      nodeId: 'node-1',
      workflowId: 'wf-1',
      status: 'pending',
      createdAt: new Date().toISOString(),
    })
    useApprovalStore.getState().updateStatus('approval-1', 'rejected', 'Not appropriate')
    const req = useApprovalStore.getState().requests.find(r => r.id === 'approval-1')
    expect(req?.status).toBe('rejected')
  })

  it('getPending returns only pending requests', () => {
    useApprovalStore.getState().addRequest({
      id: 'approval-1',
      runId: 'run-1',
      nodeId: 'node-1',
      workflowId: 'wf-1',
      status: 'pending',
      createdAt: new Date().toISOString(),
    })
    useApprovalStore.getState().addRequest({
      id: 'approval-2',
      runId: 'run-2',
      nodeId: 'node-2',
      workflowId: 'wf-1',
      status: 'pending',
      createdAt: new Date().toISOString(),
    })
    useApprovalStore.getState().updateStatus('approval-1', 'approved')
    const pending = useApprovalStore.getState().getPending()
    expect(pending).toHaveLength(1)
    expect(pending[0].id).toBe('approval-2')
  })
})

// ─── NotificationStore Tests ───────────────────────────

describe('NotificationStore', () => {
  beforeEach(() => {
    useNotificationStore.setState({ notifications: [], unreadCount: 0 })
  })

  it('starts with empty notifications', () => {
    expect(useNotificationStore.getState().notifications).toHaveLength(0)
    expect(useNotificationStore.getState().unreadCount).toBe(0)
  })

  it('adds a notification and updates unread count', () => {
    useNotificationStore.getState().addNotification({
      title: 'Test notification',
      message: 'This is a test',
      category: 'system',
    })
    expect(useNotificationStore.getState().notifications).toHaveLength(1)
    expect(useNotificationStore.getState().unreadCount).toBe(1)
  })

  it('marks a notification as read', () => {
    useNotificationStore.getState().addNotification({
      title: 'Test notification',
      message: 'This is a test',
      category: 'system',
    })
    const notifId = useNotificationStore.getState().notifications[0].id
    useNotificationStore.getState().markAsRead(notifId)
    const notif = useNotificationStore.getState().notifications.find(n => n.id === notifId)
    expect(notif?.isRead).toBe(true)
    expect(useNotificationStore.getState().unreadCount).toBe(0)
  })

  it('marks all notifications as read', () => {
    useNotificationStore.getState().addNotification({
      title: 'Test 1',
      message: 'Test',
      category: 'system',
    })
    useNotificationStore.getState().addNotification({
      title: 'Test 2',
      message: 'Test',
      category: 'execution',
    })
    expect(useNotificationStore.getState().unreadCount).toBe(2)
    useNotificationStore.getState().markAllAsRead()
    const unread = useNotificationStore.getState().notifications.filter(n => !n.isRead)
    expect(unread).toHaveLength(0)
    expect(useNotificationStore.getState().unreadCount).toBe(0)
  })

  it('deletes a notification', () => {
    useNotificationStore.getState().addNotification({
      title: 'Test notification',
      message: 'This is a test',
      category: 'system',
    })
    const notifId = useNotificationStore.getState().notifications[0].id
    useNotificationStore.getState().deleteNotification(notifId)
    expect(useNotificationStore.getState().notifications).toHaveLength(0)
  })
})
