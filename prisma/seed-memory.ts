// ─── Seed Memory Layer with Demo Data ────────────
// Run with: npx tsx prisma/seed-memory.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding Memory Layer demo data...')

  // Create customer profiles
  const customers = [
    {
      email: 'sarah.johnson@techcorp.com',
      name: 'Sarah Johnson',
      company: 'TechCorp Industries',
      tier: 'enterprise',
      metadata: JSON.stringify({ plan: 'Enterprise', mrr: '$2,499', accountAge: '14 months', npsScore: 9, contractRenewal: 'Q2 2025' }),
    },
    {
      email: 'mike.chen@startup.io',
      name: 'Mike Chen',
      company: 'StartupIO',
      tier: 'pro',
      metadata: JSON.stringify({ plan: 'Pro', mrr: '$99', accountAge: '6 months', npsScore: 7 }),
    },
    {
      email: 'angry.customer@bigco.com',
      name: 'David Wilson',
      company: 'BigCo Corp',
      tier: 'enterprise',
      metadata: JSON.stringify({ plan: 'Enterprise', mrr: '$1,999', accountAge: '22 months', npsScore: 3, churnRisk: 'high' }),
    },
    {
      email: 'emma.davis@design.co',
      name: 'Emma Davis',
      company: 'Design Co',
      tier: 'starter',
      metadata: JSON.stringify({ plan: 'Starter', mrr: '$29', accountAge: '2 months', npsScore: 8 }),
    },
    {
      email: 'alex.kumar@fintech.dev',
      name: 'Alex Kumar',
      company: 'FinTech Dev',
      tier: 'pro',
      metadata: JSON.stringify({ plan: 'Pro', mrr: '$99', accountAge: '9 months', npsScore: 6 }),
    },
  ]

  for (const customerData of customers) {
    const customer = await prisma.customerProfile.upsert({
      where: { email: customerData.email },
      update: customerData,
      create: customerData,
    })

    // Create interactions for each customer
    const interactions = [
      {
        type: 'email',
        subject: 'Billing inquiry about recent charges',
        content: 'Hi, I noticed some additional charges on my latest invoice. Can you help me understand what they are for?',
        summary: 'Customer asked about additional charges. Resolved with detailed breakdown.',
        sentiment: 'neutral',
        confidence: 0.92,
        status: 'resolved',
        priority: 'normal',
        assignee: 'AI Support Agent',
        resolution: 'Provided detailed invoice breakdown and explanation of charges.',
        tags: JSON.stringify(['billing', 'invoice']),
      },
      {
        type: 'chat',
        subject: 'Feature request: API rate limit increase',
        content: 'We need higher API rate limits for our production workload. Currently hitting 429 errors frequently.',
        summary: 'Customer requesting rate limit increase for production workload. Escalated to engineering.',
        sentiment: 'positive',
        confidence: 0.88,
        status: 'escalated',
        priority: 'high',
        assignee: 'AI SDR',
        tags: JSON.stringify(['api', 'rate-limit', 'escalation']),
      },
      {
        type: 'ticket',
        subject: 'Integration setup assistance needed',
        content: 'Having trouble connecting HubSpot CRM integration. OAuth flow keeps failing.',
        summary: 'Customer struggling with HubSpot OAuth integration. Provided step-by-step guide.',
        sentiment: customerData.email.includes('angry') ? 'negative' : 'neutral',
        confidence: 0.85,
        status: 'resolved',
        priority: 'normal',
        resolution: 'Walked customer through OAuth setup with screenshots.',
        tags: JSON.stringify(['integration', 'hubspot', 'oauth']),
      },
    ]

    for (const interactionData of interactions) {
      const daysAgo = Math.floor(Math.random() * 30) + 1
      const createdAt = new Date(Date.now() - daysAgo * 86400000)

      await prisma.interaction.create({
        data: {
          customerId: customer.id,
          ...interactionData,
          createdAt,
          updatedAt: createdAt,
          resolvedAt: interactionData.status === 'resolved' ? new Date(createdAt.getTime() + 86400000) : null,
        },
      })
    }

    // Create sentiment logs
    for (let i = 0; i < 10; i++) {
      const daysAgo = i * 3 + Math.floor(Math.random() * 3)
      const baseScore = customerData.email.includes('angry') ? -0.3 : customerData.tier === 'enterprise' ? 0.5 : 0.2
      const score = Math.max(-1, Math.min(1, baseScore + (Math.random() - 0.5) * 0.4))

      await prisma.sentimentLog.create({
        data: {
          customerId: customer.id,
          source: i % 2 === 0 ? 'interaction' : 'batch_analysis',
          sentiment: score > 0.3 ? 'positive' : score < -0.3 ? 'negative' : 'neutral',
          score,
          confidence: 0.7 + Math.random() * 0.3,
          createdAt: new Date(Date.now() - daysAgo * 86400000),
        },
      })
    }

    // Create memory notes
    const notesByTier: Record<string, Array<{ category: string; content: string; confidence: number; tags: string[] }>> = {
      enterprise: [
        { category: 'preference', content: 'Prefers email communication over phone calls', confidence: 0.95, tags: ['communication', 'preference'] },
        { category: 'fact', content: 'Contract renewal coming up in Q2 2025', confidence: 0.9, tags: ['contract', 'renewal'] },
        { category: 'warning', content: 'Has mentioned evaluating competitors twice in recent calls', confidence: 0.85, tags: ['churn-risk', 'competitors'] },
        { category: 'preference', content: 'Needs dedicated account manager for escalations', confidence: 0.88, tags: ['support', 'escalation'] },
        { category: 'insight', content: 'Expanded team by 40% in Q4 — likely needs more seats', confidence: 0.75, tags: ['growth', 'upsell'] },
      ],
      pro: [
        { category: 'preference', content: 'Prefers self-service documentation over direct support', confidence: 0.8, tags: ['support', 'self-service'] },
        { category: 'fact', content: 'Using API heavily — averaging 50k requests/day', confidence: 0.9, tags: ['api', 'usage'] },
        { category: 'insight', content: 'Good candidate for Enterprise upgrade based on usage patterns', confidence: 0.7, tags: ['upsell', 'enterprise'] },
      ],
      starter: [
        { category: 'fact', content: 'Recently signed up — in onboarding phase', confidence: 0.95, tags: ['onboarding', 'new'] },
        { category: 'preference', content: 'Prefers chat support over email', confidence: 0.7, tags: ['support', 'chat'] },
      ],
    }

    const notes = notesByTier[customerData.tier] || notesByTier.pro || []
    for (const noteData of notes) {
      await prisma.memoryNote.create({
        data: {
          customerId: customer.id,
          category: noteData.category,
          content: noteData.content,
          source: 'ai_extraction',
          confidence: noteData.confidence,
          tags: JSON.stringify(noteData.tags),
        },
      })
    }
  }

  // Create customer segments
  const segments = [
    { name: 'Enterprise VIPs', description: 'Enterprise tier customers with high engagement', type: 'auto', rules: JSON.stringify({ tier: 'enterprise' }), color: '#8b5cf6' },
    { name: 'At Risk', description: 'Customers showing declining sentiment or churn signals', type: 'auto', rules: JSON.stringify({ sentimentTrend: 'declining' }), color: '#ef4444' },
    { name: 'Upsell Candidates', description: 'Pro tier customers with high usage patterns', type: 'auto', rules: JSON.stringify({ tier: 'pro', minInteractions: 5 }), color: '#06b6d4' },
  ]

  for (const segmentData of segments) {
    await prisma.customerSegment.upsert({
      where: { id: `seed-${segmentData.name.toLowerCase().replace(/\s+/g, '-')}` },
      update: segmentData,
      create: { id: `seed-${segmentData.name.toLowerCase().replace(/\s+/g, '-')}`, ...segmentData },
    })
  }

  console.log('✅ Memory Layer seeded successfully!')
  console.log(`  - ${customers.length} customers`)
  console.log(`  - ${customers.length * 3} interactions`)
  console.log(`  - ${customers.length * 10} sentiment logs`)
  console.log(`  - Memory notes for each customer`)
  console.log(`  - ${segments.length} segments`)
}

main()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
