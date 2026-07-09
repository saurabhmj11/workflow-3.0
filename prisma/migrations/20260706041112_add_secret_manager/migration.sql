-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "hashedPassword" TEXT,
    "image" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "emailVerified" DATETIME,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" DATETIME NOT NULL,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Workflow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL DEFAULT 'Untitled Workflow',
    "description" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "metadata" TEXT,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Workflow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "XmlNode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workflowId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "config" TEXT NOT NULL DEFAULT '{}',
    "positionX" REAL NOT NULL DEFAULT 0,
    "positionY" REAL NOT NULL DEFAULT 0,
    CONSTRAINT "XmlNode_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Edge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workflowId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "sourceHandle" TEXT NOT NULL DEFAULT 'default',
    "targetHandle" TEXT NOT NULL DEFAULT 'input',
    CONSTRAINT "Edge_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Execution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workflowId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "triggeredBy" TEXT NOT NULL DEFAULT 'api',
    "input" TEXT,
    "output" TEXT,
    "steps" TEXT NOT NULL DEFAULT '[]',
    "totalDurationMs" INTEGER NOT NULL DEFAULT 0,
    "totalCostUsd" REAL NOT NULL DEFAULT 0,
    "error" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    CONSTRAINT "Execution_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MCPServer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'sse',
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'disconnected',
    "headers" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MCPTool" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serverId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "inputSchema" TEXT,
    "annotations" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MCPTool_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "MCPServer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkflowVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workflowId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "snapshot" TEXT NOT NULL,
    "changeNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkflowVersion_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CustomerProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "company" TEXT,
    "tier" TEXT NOT NULL DEFAULT 'free',
    "avatarUrl" TEXT,
    "metadata" TEXT,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CustomerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Interaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "subject" TEXT,
    "content" TEXT NOT NULL,
    "summary" TEXT,
    "sentiment" TEXT,
    "confidence" REAL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "assignee" TEXT,
    "resolution" TEXT,
    "tags" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "resolvedAt" DATETIME,
    CONSTRAINT "Interaction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CustomerProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SentimentLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sentiment" TEXT NOT NULL,
    "score" REAL NOT NULL,
    "confidence" REAL NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SentimentLog_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CustomerProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MemoryNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'ai_extraction',
    "sourceId" TEXT,
    "confidence" REAL NOT NULL DEFAULT 1.0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tags" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MemoryNote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CustomerProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CustomerSegment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'auto',
    "rules" TEXT NOT NULL,
    "color" TEXT,
    "memberCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ApprovalRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "assignee" TEXT,
    "context" TEXT NOT NULL,
    "notes" TEXT,
    "slaDeadline" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME
);

-- CreateTable
CREATE TABLE "IntegrationCredential" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "integrationId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "apiKey" TEXT,
    "expiresAt" DATETIME,
    "metadata" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "IntegrationCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WebhookTrigger" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workflowId" TEXT NOT NULL,
    "triggerId" TEXT NOT NULL,
    "secret" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastTriggeredAt" DATETIME,
    "triggerCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WebhookTrigger_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ScheduleTrigger" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workflowId" TEXT NOT NULL,
    "cronExpression" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastTriggeredAt" DATETIME,
    "triggerCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ScheduleTrigger_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EmailTrigger" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workflowId" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL DEFAULT 993,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "mailbox" TEXT NOT NULL DEFAULT 'INBOX',
    "pollInterval" INTEGER NOT NULL DEFAULT 30,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastTriggeredAt" DATETIME,
    "triggerCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EmailTrigger_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FormTrigger" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "formId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "fields" TEXT NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "submitCount" INTEGER NOT NULL DEFAULT 0,
    "lastSubmittedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FormTrigger_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VoiceCallTrigger" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "triggerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'twilio',
    "phoneNumber" TEXT,
    "webhookUrl" TEXT,
    "welcomeMessage" TEXT,
    "recordCall" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastTriggeredAt" DATETIME,
    "triggerCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VoiceCallTrigger_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WhatsAppTrigger" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "triggerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'meta',
    "phoneNumberId" TEXT,
    "webhookVerifyToken" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastTriggeredAt" DATETIME,
    "triggerCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WhatsAppTrigger_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TriggerLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "triggerType" TEXT NOT NULL,
    "triggerId" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "duration" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "userEmail" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "resourceName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'success',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "details" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "actionUrl" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" DATETIME,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastUsedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RateLimitEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "resetTime" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DeploymentEnvironment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6B7280',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Deployment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workflowId" TEXT NOT NULL,
    "environmentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshotId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'deployed',
    "deployedBy" TEXT,
    "deployedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "promotedFrom" TEXT,
    "rollbackData" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Deployment_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Deployment_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "DeploymentEnvironment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SSOConfiguration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "samlEntryPoint" TEXT,
    "samlCertificate" TEXT,
    "samlIssuer" TEXT,
    "oidcDiscoveryUrl" TEXT,
    "oidcClientId" TEXT,
    "oidcClientSecret" TEXT,
    "allowedDomains" TEXT,
    "autoProvision" BOOLEAN NOT NULL DEFAULT true,
    "defaultRole" TEXT NOT NULL DEFAULT 'USER',
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SiteConfig" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Secret" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'api_key',
    "userId" TEXT,
    "isGlobal" BOOLEAN NOT NULL DEFAULT false,
    "lastUsedAt" DATETIME,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" DATETIME,
    "tags" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "WorkflowPermission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workflowId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "grantedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "Workflow_userId_idx" ON "Workflow"("userId");

-- CreateIndex
CREATE INDEX "Workflow_isActive_idx" ON "Workflow"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "XmlNode_workflowId_nodeId_key" ON "XmlNode"("workflowId", "nodeId");

-- CreateIndex
CREATE UNIQUE INDEX "Execution_runId_key" ON "Execution"("runId");

-- CreateIndex
CREATE INDEX "Execution_workflowId_idx" ON "Execution"("workflowId");

-- CreateIndex
CREATE INDEX "Execution_status_idx" ON "Execution"("status");

-- CreateIndex
CREATE INDEX "Execution_startedAt_idx" ON "Execution"("startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MCPTool_serverId_name_key" ON "MCPTool"("serverId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowVersion_workflowId_version_key" ON "WorkflowVersion"("workflowId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerProfile_email_key" ON "CustomerProfile"("email");

-- CreateIndex
CREATE INDEX "ApprovalRecord_runId_idx" ON "ApprovalRecord"("runId");

-- CreateIndex
CREATE INDEX "ApprovalRecord_workflowId_idx" ON "ApprovalRecord"("workflowId");

-- CreateIndex
CREATE INDEX "ApprovalRecord_status_idx" ON "ApprovalRecord"("status");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationCredential_integrationId_key" ON "IntegrationCredential"("integrationId");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookTrigger_triggerId_key" ON "WebhookTrigger"("triggerId");

-- CreateIndex
CREATE UNIQUE INDEX "FormTrigger_formId_key" ON "FormTrigger"("formId");

-- CreateIndex
CREATE UNIQUE INDEX "VoiceCallTrigger_triggerId_key" ON "VoiceCallTrigger"("triggerId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppTrigger_triggerId_key" ON "WhatsAppTrigger"("triggerId");

-- CreateIndex
CREATE INDEX "TriggerLog_triggerType_idx" ON "TriggerLog"("triggerType");

-- CreateIndex
CREATE INDEX "TriggerLog_workflowId_idx" ON "TriggerLog"("workflowId");

-- CreateIndex
CREATE INDEX "TriggerLog_createdAt_idx" ON "TriggerLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_resource_resourceId_idx" ON "AuditLog"("resource", "resourceId");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyPrefix_key" ON "ApiKey"("keyPrefix");

-- CreateIndex
CREATE UNIQUE INDEX "RateLimitEntry_key_key" ON "RateLimitEntry"("key");

-- CreateIndex
CREATE UNIQUE INDEX "DeploymentEnvironment_slug_key" ON "DeploymentEnvironment"("slug");

-- CreateIndex
CREATE INDEX "Deployment_workflowId_idx" ON "Deployment"("workflowId");

-- CreateIndex
CREATE INDEX "Deployment_environmentId_idx" ON "Deployment"("environmentId");

-- CreateIndex
CREATE INDEX "Secret_userId_idx" ON "Secret"("userId");

-- CreateIndex
CREATE INDEX "Secret_isGlobal_idx" ON "Secret"("isGlobal");

-- CreateIndex
CREATE UNIQUE INDEX "Secret_userId_key_key" ON "Secret"("userId", "key");

-- CreateIndex
CREATE INDEX "WorkflowPermission_workflowId_idx" ON "WorkflowPermission"("workflowId");

-- CreateIndex
CREATE INDEX "WorkflowPermission_userId_idx" ON "WorkflowPermission"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowPermission_workflowId_userId_key" ON "WorkflowPermission"("workflowId", "userId");
