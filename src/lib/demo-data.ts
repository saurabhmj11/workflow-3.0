// ─── Demo Data for AI Support Employee ────────────
// Rich, realistic sample data for the polished demo experience

export interface DemoEmail {
  id: string
  from: string
  fromName: string
  subject: string
  body: string
  timestamp: string
  category: 'billing' | 'technical' | 'account' | 'general' | 'feature-request'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  confidence: number
  avatar: string
}

export interface KBArticle {
  id: string
  title: string
  category: string
  excerpt: string
  relevance: number
  lastUpdated: string
  views: number
}

export interface PipelineStage {
  id: string
  label: string
  type: 'email' | 'classifier' | 'condition' | 'rag' | 'llm' | 'approval' | 'escalation' | 'slack' | 'send'
  icon: string
  description: string
  avgDurationMs: number
}

export interface DemoMetric {
  label: string
  value: string
  change: string
  changeType: 'positive' | 'negative' | 'neutral'
  icon: string
}

// ─── Sample Emails ────────────────────────────────

export const DEMO_EMAILS: DemoEmail[] = [
  {
    id: 'email-001',
    from: 'sarah.johnson@acmecorp.com',
    fromName: 'Sarah Johnson',
    subject: 'Billing discrepancy on March invoice',
    body: 'Hi Support Team,\n\nI noticed a $47.50 charge on my March invoice that doesn\'t match my subscription plan. I\'ve been on the Pro plan ($29/month) since January, and my invoices for January and February were correct at $29.\n\nHowever, March shows a charge of $76.50. I haven\'t upgraded or added any additional services.\n\nCould you please review and correct this? I\'ve attached a screenshot of the invoice for reference.\n\nThanks,\nSarah Johnson\nAccount #ACM-2847',
    timestamp: '2 min ago',
    category: 'billing',
    priority: 'normal',
    confidence: 94,
    avatar: 'SJ',
  },
  {
    id: 'email-002',
    from: 'mike.chen@startup.io',
    fromName: 'Mike Chen',
    subject: 'URGENT: Production server down — all users affected',
    body: 'Hi,\n\nOur production instance has been completely unresponsive for the last 30 minutes. None of our 500+ users can access the platform.\n\nThis is CRITICAL — we\'re losing approximately $10,000/hour in revenue. Our customers are complaining on social media and our SLA guarantees 99.9% uptime.\n\nWe\'ve tried:\n- Clearing browser cache\n- Restarting our application server\n- Checking our network configuration\n\nNothing works. We need immediate assistance!\n\nMike Chen\nCTO, Startup.io\nEnterprise Plan — Priority Support',
    timestamp: '5 min ago',
    category: 'technical',
    priority: 'urgent',
    confidence: 62,
    avatar: 'MC',
  },
  {
    id: 'email-003',
    from: 'lisa.park@enterprise.com',
    fromName: 'Lisa Park',
    subject: 'How to set up SSO for our team?',
    body: 'Hello,\n\nWe just signed up for the Enterprise plan and need to configure SAML SSO for our 200-person team. The documentation mentions it\'s supported but I can\'t find the exact configuration steps.\n\nSpecifically, I need help with:\n1. Where to find the SSO configuration page\n2. What metadata URL to provide to our IdP (Okta)\n3. How to map user attributes (email, name, role)\n4. Testing the connection before rolling out to all users\n\nAlso, is there a way to set up automatic provisioning via SCIM?\n\nThanks,\nLisa Park\nIT Administrator\nEnterprise Corp',
    timestamp: '12 min ago',
    category: 'account',
    priority: 'normal',
    confidence: 89,
    avatar: 'LP',
  },
  {
    id: 'email-004',
    from: 'alex.rivera@designco.com',
    fromName: 'Alex Rivera',
    subject: 'Feature request: Dark mode for dashboard',
    body: 'Hi there,\n\nI love the product, but I spend 8+ hours a day in the dashboard and the bright white background is really straining my eyes.\n\nWould it be possible to add a dark mode toggle? I\'ve noticed many of our team members would appreciate this as well.\n\nSome specifics that would be ideal:\n- System preference detection (prefers-color-scheme)\n- Manual toggle in settings\n- Persistent preference across sessions\n- Support for all dashboard pages including reports\n\nI checked your public roadmap and didn\'t see this listed. Happy to provide more feedback if helpful!\n\nBest,\nAlex Rivera\nHead of Design, DesignCo',
    timestamp: '28 min ago',
    category: 'feature-request',
    priority: 'low',
    confidence: 91,
    avatar: 'AR',
  },
  {
    id: 'email-005',
    from: 'tom.williams@retailco.com',
    fromName: 'Tom Williams',
    subject: 'Can I export my data to CSV?',
    body: 'Hey,\n\nI need to export all our customer data from the platform for our annual audit. Is there a way to do a bulk CSV export?\n\nI\'m looking for:\n- Customer names and emails\n- Purchase history\n- Account status\n- Last login date\n\nIdeally I\'d like to filter by date range and account status before exporting.\n\nThanks!\nTom',
    timestamp: '45 min ago',
    category: 'general',
    priority: 'normal',
    confidence: 87,
    avatar: 'TW',
  },
]

// ─── Knowledge Base Articles ──────────────────────

export const KB_ARTICLES: KBArticle[] = [
  {
    id: 'KB-142',
    title: 'Billing FAQ: Common Charge Discrepancies',
    category: 'billing',
    excerpt: 'Prorated charges from mid-cycle plan changes are the most common cause of billing discrepancies. When a customer upgrades or downgrades mid-month, the system calculates the difference for the remaining days...',
    relevance: 0.97,
    lastUpdated: '2026-05-15',
    views: 1243,
  },
  {
    id: 'KB-089',
    title: 'Understanding Your Invoice Line Items',
    category: 'billing',
    excerpt: 'Each invoice line item corresponds to a specific service or adjustment. Common line items include: Base subscription, Proration adjustments, Add-on services, Tax, and Credits. Proration charges appear when...',
    relevance: 0.91,
    lastUpdated: '2026-04-28',
    views: 892,
  },
  {
    id: 'KB-203',
    title: 'SSO/SAML Configuration Guide for Enterprise',
    category: 'account',
    excerpt: 'Enterprise customers can configure SAML 2.0 SSO by navigating to Settings > Security > SSO Configuration. Select your Identity Provider (Okta, Azure AD, OneLogin) and follow the step-by-step setup...',
    relevance: 0.95,
    lastUpdated: '2026-06-01',
    views: 2156,
  },
  {
    id: 'KB-312',
    title: 'System Status and Outage Resolution',
    category: 'technical',
    excerpt: 'If your instance is unresponsive, first check status.example.com for any ongoing incidents. Common causes include: DNS propagation delays, CDN edge cache issues, and database connection pool exhaustion...',
    relevance: 0.88,
    lastUpdated: '2026-05-30',
    views: 3421,
  },
  {
    id: 'KB-178',
    title: 'Data Export Guide: CSV and API Methods',
    category: 'general',
    excerpt: 'You can export data from the platform via the Reports > Export page. Available formats: CSV, JSON, PDF. For bulk exports, use the REST API with the /v1/export endpoint. Supports filtering by date range...',
    relevance: 0.93,
    lastUpdated: '2026-05-20',
    views: 1567,
  },
  {
    id: 'KB-445',
    title: 'Feature Request Process and Roadmap',
    category: 'feature-request',
    excerpt: 'We welcome feature requests! Submit them through the in-app feedback widget or email support. Requests are reviewed monthly by the product team. High-impact features with broad demand are prioritized...',
    relevance: 0.82,
    lastUpdated: '2026-06-05',
    views: 723,
  },
  {
    id: 'KB-267',
    title: 'SCIM User Provisioning Setup',
    category: 'account',
    excerpt: 'SCIM 2.0 provisioning is available for Enterprise plans. Configure it under Settings > Security > User Provisioning. Supported providers: Okta, Azure AD, OneLogin. Automatic deprovisioning removes...',
    relevance: 0.79,
    lastUpdated: '2026-05-22',
    views: 445,
  },
]

// ─── Pipeline Stages ──────────────────────────────

export const PIPELINE_STAGES: PipelineStage[] = [
  { id: 'email', label: 'Email Received', type: 'email', icon: 'Mail', description: 'New email arrives in support inbox', avgDurationMs: 50 },
  { id: 'classifier', label: 'AI Classifier', type: 'classifier', icon: 'Brain', description: 'Classifies email category and priority', avgDurationMs: 1200 },
  { id: 'condition', label: 'Confidence Gate', type: 'condition', icon: 'GitBranch', description: 'Routes based on classification confidence', avgDurationMs: 30 },
  { id: 'rag', label: 'Knowledge Search', type: 'rag', icon: 'Search', description: 'Searches knowledge base for relevant articles', avgDurationMs: 800 },
  { id: 'llm', label: 'Draft Response', type: 'llm', icon: 'Bot', description: 'AI drafts a personalized response', avgDurationMs: 2500 },
  { id: 'approval', label: 'Quality Gate', type: 'approval', icon: 'UserCheck', description: 'Human review for quality assurance', avgDurationMs: 180000 },
  { id: 'send', label: 'Send Email', type: 'send', icon: 'Send', description: 'Sends approved response to customer', avgDurationMs: 200 },
  { id: 'escalation', label: 'Escalate', type: 'escalation', icon: 'AlertTriangle', description: 'Routes to human agent for complex cases', avgDurationMs: 300 },
  { id: 'slack', label: 'Team Alert', type: 'slack', icon: 'MessageSquare', description: 'Notifies support team via Slack', avgDurationMs: 150 },
]

// ─── Demo Metrics ─────────────────────────────────

export const DEMO_METRICS: DemoMetric[] = [
  { label: 'Avg Response Time', value: '2.3 min', change: '-78%', changeType: 'positive', icon: 'Clock' },
  { label: 'Auto-Resolution Rate', value: '73%', change: '+23%', changeType: 'positive', icon: 'CheckCircle' },
  { label: 'Customer Satisfaction', value: '4.8/5', change: '+0.6', changeType: 'positive', icon: 'Star' },
  { label: 'Cost per Ticket', value: '$0.42', change: '-85%', changeType: 'positive', icon: 'DollarSign' },
  { label: 'Tickets Escalated', value: '12%', change: '-34%', changeType: 'positive', icon: 'TrendingDown' },
  { label: 'Tickets Today', value: '247', change: '+18%', changeType: 'neutral', icon: 'BarChart3' },
]

// ─── AI Draft Responses (per category) ────────────

function generateBillingResponse(email: DemoEmail, articles: KBArticle[]): string {
  const firstName = email.fromName.split(' ')[0]
  const articleRef = articles[0] ? '"' + articles[0].title + '" (' + articles[0].id + ')' : 'our billing FAQ'
  return 'Hi ' + firstName + ',\n\n' +
    'Thank you for reaching out about the billing discrepancy on your March invoice.\n\n' +
    'After reviewing your account, I found that the $47.50 additional charge is a prorated adjustment from a plan upgrade that was processed on March 15th. When a plan change occurs mid-cycle, the system calculates the price difference for the remaining days of the billing period.\n\n' +
    "Here's the breakdown:\n" +
    '- Base Pro plan: $29.00\n' +
    '- Prorated upgrade adjustment: $47.50 (for the remaining 16 days of March)\n\n' +
    "I've initiated a review of this charge. If the upgrade was not intentional, I can process a full refund and revert your plan to the original Pro tier. Either way, your next invoice will reflect the correct amount.\n\n" +
    'For more details, you can refer to our billing guide: ' + articleRef + '\n\n' +
    "Please let me know how you'd like to proceed, and I'll take care of it right away.\n\n" +
    'Best regards,\nAI Support Agent\nOpenWorkflow Support Team'
}

function generateTechnicalResponse(email: DemoEmail, articles: KBArticle[]): string {
  const firstName = email.fromName.split(' ')[0]
  const articleRef = articles[0]
    ? 'Our knowledge base article "' + articles[0].title + '" (' + articles[0].id + ') covers common resolution steps for this type of issue.'
    : ''
  return 'Hi ' + firstName + ',\n\n' +
    "I understand this is a critical situation, and I want to assure you that we're treating this with the highest priority.\n\n" +
    'Based on our initial diagnosis:\n' +
    '- Our status page shows no widespread platform outages\n' +
    '- Your instance appears to be experiencing a connectivity issue specific to your region\n\n' +
    'Immediate steps to try:\n' +
    '1. Check our status page: status.example.com\n' +
    '2. Try accessing via a different network (mobile hotspot)\n' +
    '3. Clear DNS cache: `ipconfig /flushdns` (Windows) or `sudo dscacheutil -flushcache` (Mac)\n\n' +
    articleRef + '\n\n' +
    "Given the severity and revenue impact you've described, I'm escalating this to our senior engineering team immediately. A senior engineer will reach out within 15 minutes via your priority support channel.\n\n" +
    'Best regards,\nAI Support Agent\nOpenWorkflow Support Team'
}

function generateAccountResponse(email: DemoEmail, articles: KBArticle[]): string {
  const firstName = email.fromName.split(' ')[0]
  const articleRef = articles[0]
    ? 'For the complete guide with screenshots, see: "' + articles[0].title + '" (' + articles[0].id + ')'
    : ''
  const scimRef = articles[2]
    ? 'See "' + articles[2].title + '" (' + articles[2].id + ') for details.'
    : ''
  return 'Hi ' + firstName + ',\n\n' +
    "Welcome to the Enterprise plan! I'd be happy to help you get SSO configured for your team.\n\n" +
    "Here's a step-by-step guide:\n\n" +
    '**1. Access SSO Configuration**\n' +
    '   Navigate to Settings > Security > SSO Configuration\n\n' +
    '**2. Select Your Identity Provider**\n' +
    '   Choose "Okta" from the dropdown (we support Okta, Azure AD, and OneLogin)\n\n' +
    '**3. Enter Your IdP Metadata**\n' +
    '   - In Okta: Go to Applications > your app > Sign On tab\n' +
    '   - Copy the "Metadata URL" and paste it into our SSO setup page\n\n' +
    '**4. Map User Attributes**\n' +
    '   - Email: {user.email}\n' +
    '   - Name: {user.firstName} {user.lastName}\n' +
    '   - Role: {user.role} (maps to our Admin/Member/Viewer roles)\n\n' +
    '**5. Test Connection**\n' +
    '   Click "Test Connection" to verify with a single user before rolling out\n\n' +
    articleRef + '\n\n' +
    'Regarding SCIM provisioning — yes, we support it! You can configure it under Settings > Security > User Provisioning. ' + scimRef + '\n\n' +
    'Let me know if you need any help during setup!\n\n' +
    'Best regards,\nAI Support Agent\nOpenWorkflow Support Team'
}

function generateFeatureRequestResponse(email: DemoEmail, articles: KBArticle[]): string {
  const firstName = email.fromName.split(' ')[0]
  const articleRef = articles[0]
    ? 'Our product team reviews feature requests monthly. You can track the status on our public roadmap. For more on how we prioritize features, see: "' + articles[0].title + '" (' + articles[0].id + ')'
    : ''
  return 'Hi ' + firstName + ',\n\n' +
    'Thank you for the feature request! Dark mode is a great suggestion, and I completely understand the need after long days in the dashboard.\n\n' +
    "I've logged this request in our product feedback system with the details you provided:\n" +
    '- System preference detection\n' +
    '- Manual toggle\n' +
    '- Persistent preference\n' +
    '- Full dashboard coverage\n\n' +
    articleRef + '\n\n' +
    "In the meantime, as a workaround, you can use your browser's built-in dark mode (most modern browsers support forcing dark mode on all sites), or browser extensions like Dark Reader.\n\n" +
    "We'll keep you updated on the progress. Thanks for helping us improve!\n\n" +
    'Best regards,\nAI Support Agent\nOpenWorkflow Support Team'
}

function generateGeneralResponse(email: DemoEmail, articles: KBArticle[]): string {
  const firstName = email.fromName.split(' ')[0]
  const articleRef = articles[0]
    ? 'For the complete export guide including all available filters and formats, see: "' + articles[0].title + '" (' + articles[0].id + ')'
    : ''
  return 'Hi ' + firstName + ',\n\n' +
    'Great question! Yes, you can absolutely export your data to CSV.\n\n' +
    '**Via the UI:**\n' +
    '1. Go to Reports > Export\n' +
    '2. Select the data type: Customers, Purchases, or Activity\n' +
    '3. Apply filters: Date range, Account status, etc.\n' +
    '4. Click "Export CSV"\n\n' +
    '**Via the API (for bulk/automated exports):**\n' +
    '```\n' +
    'GET /v1/export?format=csv&type=customers&from=2026-01-01&to=2026-06-01\n' +
    '```\n\n' +
    articleRef + '\n\n' +
    "The export typically completes within a few seconds. For very large datasets (>100K records), we'll email you a download link when it's ready.\n\n" +
    'Let me know if you need help with any specific export!\n\n' +
    'Best regards,\nAI Support Agent\nOpenWorkflow Support Team'
}

export const AI_DRAFT_RESPONSES: Record<string, (email: DemoEmail, articles: KBArticle[]) => string> = {
  billing: generateBillingResponse,
  technical: generateTechnicalResponse,
  account: generateAccountResponse,
  'feature-request': generateFeatureRequestResponse,
  general: generateGeneralResponse,
}

// ─── Escalation message ──────────────────────────

export const ESCALATION_TEMPLATE = (email: DemoEmail) => ({
  slack: ':warning: *Escalation Required*\n\n' +
    '*From:* ' + email.fromName + ' (' + email.from + ')\n' +
    '*Subject:* ' + email.subject + '\n' +
    '*Category:* ' + email.category + '\n' +
    '*Priority:* ' + email.priority.toUpperCase() + '\n' +
    '*Confidence:* ' + email.confidence + '%\n\n' +
    'This ticket was classified with low confidence and needs human review. The customer has been waiting for ' + email.timestamp + '.\n\n' +
    '_Please respond within 30 minutes per our SLA._',
  note: 'Low classification confidence (' + email.confidence + '%) for ' + email.category + ' category. The email contains multiple overlapping topics that may require cross-department coordination. Escalating to senior support for accurate resolution.',
})
