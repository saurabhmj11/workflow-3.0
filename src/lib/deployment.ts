// ─── Deployment Manager ────────────────────────────
// Manages workflow promotion between environments (dev/staging/production)
// with version tracking, snapshots, and rollback support

import { db } from '@/lib/db'
import { createLogger } from '@/lib/logger'

const log = createLogger('Deployment')

// ─── Types ─────────────────────────────────────────

export interface DeploymentResult {
  id: string
  workflowId: string
  environment: string
  environmentId: string
  version: number
  snapshotId: string | null
  status: string
  deployedBy: string | null
  deployedAt: string
  promotedFrom: string | null
  notes: string | null
  createdAt: string
}

// ─── Default Environment Definitions ───────────────

const DEFAULT_ENVIRONMENTS = [
  {
    name: 'Development',
    slug: 'dev',
    description: 'Local development and testing environment',
    color: '#10B981', // emerald
    isDefault: true,
    requiresApproval: false,
  },
  {
    name: 'Staging',
    slug: 'staging',
    description: 'Pre-production testing and QA environment',
    color: '#F59E0B', // amber
    isDefault: false,
    requiresApproval: false,
  },
  {
    name: 'Production',
    slug: 'production',
    description: 'Live production environment',
    color: '#EF4444', // red
    isDefault: false,
    requiresApproval: true,
  },
]

// ─── Initialize Default Environments ───────────────

/**
 * Seeds the default deployment environments (dev, staging, production)
 * if they don't already exist. Called lazily when first needed.
 */
export async function initializeEnvironments(): Promise<void> {
  try {
    const existing = await db.deploymentEnvironment.count()
    if (existing > 0) return

    for (const env of DEFAULT_ENVIRONMENTS) {
      await db.deploymentEnvironment.create({ data: env })
    }
    log.info('Initialized default deployment environments')
  } catch (err) {
    log.error({ err }, 'Failed to initialize deployment environments')
  }
}

// ─── Helper: Serialize Deployment ──────────────────

function serializeDeployment(d: {
  id: string
  workflowId: string
  environmentId: string
  version: number
  snapshotId: string | null
  status: string
  deployedBy: string | null
  deployedAt: Date
  promotedFrom: string | null
  notes: string | null
  createdAt: Date
  environment: { slug: string; name: string; color: string }
}): DeploymentResult {
  return {
    id: d.id,
    workflowId: d.workflowId,
    environment: d.environment.slug,
    environmentId: d.environmentId,
    version: d.version,
    snapshotId: d.snapshotId,
    status: d.status,
    deployedBy: d.deployedBy,
    deployedAt: d.deployedAt.toISOString(),
    promotedFrom: d.promotedFrom,
    notes: d.notes,
    createdAt: d.createdAt.toISOString(),
  }
}

// ─── Deploy Workflow to Environment ────────────────

/**
 * Deploys a workflow to a specific environment.
 * Creates a WorkflowVersion snapshot before deploying.
 */
export async function deployWorkflow(
  workflowId: string,
  environmentSlug: string,
  userId?: string,
  notes?: string
): Promise<DeploymentResult> {
  // Ensure environments exist
  await initializeEnvironments()

  // Find the environment
  const env = await db.deploymentEnvironment.findUnique({
    where: { slug: environmentSlug },
  })
  if (!env) {
    throw new Error(`Environment "${environmentSlug}" not found`)
  }

  // Find the workflow with its nodes and edges
  const workflow = await db.workflow.findUnique({
    where: { id: workflowId },
    include: { nodes: true, edges: true },
  })
  if (!workflow) {
    throw new Error(`Workflow "${workflowId}" not found`)
  }

  // Create a version snapshot for this deployment
  const latestVersion = await db.workflowVersion.findFirst({
    where: { workflowId },
    orderBy: { version: 'desc' },
    select: { version: true },
  })
  const nextVersion = (latestVersion?.version ?? 0) + 1

  const snapshotNodes = workflow.nodes.map((n) => ({
    id: n.nodeId,
    type: n.type,
    label: n.label,
    category: n.category,
    config: JSON.parse(n.config),
    position: { x: n.positionX, y: n.positionY },
  }))

  const snapshotEdges = workflow.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle,
    targetHandle: e.targetHandle,
  }))

  const snapshotData = JSON.stringify({ nodes: snapshotNodes, edges: snapshotEdges })

  const version = await db.workflowVersion.create({
    data: {
      workflowId,
      version: nextVersion,
      name: `v${nextVersion}`,
      description: workflow.description,
      snapshot: snapshotData,
      changeNote: notes ?? `Deployed to ${env.name}`,
    },
  })

  // Update the workflow's version counter
  await db.workflow.update({
    where: { id: workflowId },
    data: { version: nextVersion },
  })

  // Get the current active deployment (if any) for rollback data
  const currentDeployment = await db.deployment.findFirst({
    where: {
      workflowId,
      environmentId: env.id,
      status: 'deployed',
    },
    orderBy: { deployedAt: 'desc' },
  })

  // Mark any existing active deployments as rolled_back
  if (currentDeployment) {
    await db.deployment.update({
      where: { id: currentDeployment.id },
      data: { status: 'rolled_back' },
    })
  }

  // Create the new deployment
  const deployment = await db.deployment.create({
    data: {
      workflowId,
      environmentId: env.id,
      version: nextVersion,
      snapshotId: version.id,
      status: 'deployed',
      deployedBy: userId ?? null,
      rollbackData: currentDeployment ? JSON.stringify({
        deploymentId: currentDeployment.id,
        version: currentDeployment.version,
        snapshotId: currentDeployment.snapshotId,
      }) : null,
      notes: notes ?? null,
    },
    include: { environment: true },
  })

  log.info({ workflowId, environment: environmentSlug, version: nextVersion }, 'Workflow deployed')

  return serializeDeployment(deployment)
}

// ─── Promote Workflow Between Environments ─────────

/**
 * Promotes a workflow from one environment to another.
 * Uses the snapshot from the source environment's deployment.
 */
export async function promoteWorkflow(
  workflowId: string,
  fromEnv: string,
  toEnv: string,
  userId?: string,
  notes?: string
): Promise<DeploymentResult> {
  // Ensure environments exist
  await initializeEnvironments()

  // Find both environments
  const sourceEnv = await db.deploymentEnvironment.findUnique({ where: { slug: fromEnv } })
  const targetEnv = await db.deploymentEnvironment.findUnique({ where: { slug: toEnv } })

  if (!sourceEnv) throw new Error(`Source environment "${fromEnv}" not found`)
  if (!targetEnv) throw new Error(`Target environment "${toEnv}" not found`)
  if (fromEnv === toEnv) throw new Error('Cannot promote to the same environment')

  // Find the current deployment in the source environment
  const sourceDeployment = await db.deployment.findFirst({
    where: {
      workflowId,
      environmentId: sourceEnv.id,
      status: 'deployed',
    },
    orderBy: { deployedAt: 'desc' },
  })

  if (!sourceDeployment) {
    throw new Error(`No active deployment found in ${sourceEnv.name} for this workflow`)
  }

  // Get the snapshot from the source deployment
  const snapshot = await db.workflowVersion.findUnique({
    where: { id: sourceDeployment.snapshotId ?? '' },
  })

  if (!snapshot) {
    throw new Error('Source deployment snapshot not found')
  }

  // Check if target environment requires approval
  if (targetEnv.requiresApproval) {
    // Create deployment in "promoting" status (needs manual approval)
    const deployment = await db.deployment.create({
      data: {
        workflowId,
        environmentId: targetEnv.id,
        version: sourceDeployment.version,
        snapshotId: snapshot.id,
        status: 'promoting',
        deployedBy: userId ?? null,
        promotedFrom: sourceDeployment.id,
        notes: notes ?? `Promotion from ${sourceEnv.name} to ${targetEnv.name} — awaiting approval`,
      },
      include: { environment: true },
    })

    log.info({ workflowId, fromEnv, toEnv }, 'Promotion pending approval')

    return serializeDeployment(deployment)
  }

  // Get the current active deployment in the target environment for rollback data
  const currentTargetDeployment = await db.deployment.findFirst({
    where: {
      workflowId,
      environmentId: targetEnv.id,
      status: 'deployed',
    },
    orderBy: { deployedAt: 'desc' },
  })

  // Mark existing target deployments as rolled_back
  if (currentTargetDeployment) {
    await db.deployment.update({
      where: { id: currentTargetDeployment.id },
      data: { status: 'rolled_back' },
    })
  }

  // Create the promoted deployment
  const deployment = await db.deployment.create({
    data: {
      workflowId,
      environmentId: targetEnv.id,
      version: sourceDeployment.version,
      snapshotId: snapshot.id,
      status: 'deployed',
      deployedBy: userId ?? null,
      promotedFrom: sourceDeployment.id,
      rollbackData: currentTargetDeployment ? JSON.stringify({
        deploymentId: currentTargetDeployment.id,
        version: currentTargetDeployment.version,
        snapshotId: currentTargetDeployment.snapshotId,
      }) : null,
      notes: notes ?? `Promoted from ${sourceEnv.name}`,
    },
    include: { environment: true },
  })

  log.info({ workflowId, fromEnv, toEnv, version: sourceDeployment.version }, 'Workflow promoted')

  return serializeDeployment(deployment)
}

// ─── Rollback Deployment ───────────────────────────

/**
 * Rolls back a deployment to its previous version using stored rollback data.
 */
export async function rollbackDeployment(
  deploymentId: string,
  userId?: string
): Promise<DeploymentResult> {
  const deployment = await db.deployment.findUnique({
    where: { id: deploymentId },
    include: { environment: true },
  })

  if (!deployment) {
    throw new Error(`Deployment "${deploymentId}" not found`)
  }

  if (!deployment.rollbackData) {
    throw new Error('No rollback data available for this deployment')
  }

  // Parse the rollback data
  let rollbackInfo: { deploymentId: string; version: number; snapshotId: string | null }
  try {
    rollbackInfo = JSON.parse(deployment.rollbackData)
  } catch {
    throw new Error('Invalid rollback data')
  }

  // Get the previous snapshot
  const previousSnapshot = rollbackInfo.snapshotId
    ? await db.workflowVersion.findUnique({ where: { id: rollbackInfo.snapshotId } })
    : null

  // Mark current deployment as rolled_back
  await db.deployment.update({
    where: { id: deploymentId },
    data: { status: 'rolled_back' },
  })

  // Create a new deployment with the previous version
  const rollbackDeployment = await db.deployment.create({
    data: {
      workflowId: deployment.workflowId,
      environmentId: deployment.environmentId,
      version: rollbackInfo.version,
      snapshotId: rollbackInfo.snapshotId,
      status: 'deployed',
      deployedBy: userId ?? null,
      rollbackData: JSON.stringify({
        deploymentId: deployment.id,
        version: deployment.version,
        snapshotId: deployment.snapshotId,
      }),
      notes: `Rolled back from v${deployment.version} to v${rollbackInfo.version}`,
    },
    include: { environment: true },
  })

  log.info(
    { deploymentId, workflowId: deployment.workflowId, fromVersion: deployment.version, toVersion: rollbackInfo.version },
    'Deployment rolled back'
  )

  return serializeDeployment(rollbackDeployment)
}

// ─── Get Deployment History ────────────────────────

/**
 * Returns the full deployment history for a workflow, newest first.
 */
export async function getDeploymentHistory(workflowId: string): Promise<DeploymentResult[]> {
  const deployments = await db.deployment.findMany({
    where: { workflowId },
    orderBy: { deployedAt: 'desc' },
    include: { environment: true },
  })

  return deployments.map(serializeDeployment)
}

// ─── Get Active Deployments Per Environment ────────

/**
 * Returns the currently deployed version for each environment.
 */
export async function getActiveDeployments(workflowId: string): Promise<Record<string, DeploymentResult>> {
  // Ensure environments exist
  await initializeEnvironments()

  const environments = await db.deploymentEnvironment.findMany()
  const result: Record<string, DeploymentResult> = {}

  for (const env of environments) {
    const deployment = await db.deployment.findFirst({
      where: {
        workflowId,
        environmentId: env.id,
        status: 'deployed',
      },
      orderBy: { deployedAt: 'desc' },
      include: { environment: true },
    })

    if (deployment) {
      result[env.slug] = serializeDeployment(deployment)
    }
  }

  return result
}
