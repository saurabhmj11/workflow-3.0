import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-utils'
import ZAI from 'z-ai-web-dev-sdk'

// ─── POST /api/memory/extract ────────────────────
// AI-powered knowledge extraction from a customer's interactions
// Analyzes interactions and extracts structured memory notes (facts, preferences, insights)

const EXTRACTION_SYSTEM_PROMPT = `You are an AI knowledge extractor for OpenWorkflow's Memory Layer. Your job is to analyze customer interactions and extract structured memory notes.

Given a list of customer interactions, extract key facts, preferences, insights, warnings, and commitments as structured notes.

For each extracted note, provide:
- category: One of "preference", "fact", "insight", "warning", "commitment"
- content: A concise, specific statement (e.g., "Prefers communication via email, not phone" or "Has been a customer for 8 months")
- confidence: 0-1, how confident you are in this extraction
- tags: Array of relevant tags

Rules:
1. Only extract information that is clearly stated or strongly implied
2. Be specific — "Prefers email" is better than "Has communication preferences"
3. Don't duplicate — merge similar observations into one note
4. Focus on actionable intelligence that would help an AI employee serve this customer better
5. Include both positive and negative signals
6. Prioritize recent information over older data

Respond with ONLY valid JSON in this format:
{
  "notes": [
    {
      "category": "preference",
      "content": "Prefers email over phone for support requests",
      "confidence": 0.9,
      "tags": ["communication", "support"]
    }
  ]
}

If no meaningful notes can be extracted, return: {"notes": []}`

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { customerId, interactionIds } = body as {
      customerId?: string
      interactionIds?: string[]
    }

    if (!customerId) {
      return errorResponse('customerId is required', 400)
    }

    // Fetch the customer with interactions
    const customer = await db.customerProfile.findUnique({
      where: { id: customerId },
      include: {
        interactions: {
          where: interactionIds?.length
            ? { id: { in: interactionIds } }
            : undefined,
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        memoryNotes: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    })

    if (!customer) {
      return errorResponse('Customer not found', 404)
    }

    if (customer.interactions.length === 0) {
      return successResponse({ notes: [], message: 'No interactions to analyze' })
    }

    // Build context for the AI
    const interactionContext = customer.interactions.map((interaction, i) => {
      const parts = [
        `[Interaction ${i + 1}]`,
        `Type: ${interaction.type}`,
        `Subject: ${interaction.subject || 'N/A'}`,
        `Status: ${interaction.status}`,
        `Priority: ${interaction.priority}`,
        interaction.sentiment ? `Sentiment: ${interaction.sentiment}` : '',
        `Date: ${interaction.createdAt.toISOString().split('T')[0]}`,
        `Content: ${interaction.content.slice(0, 300)}`,
        interaction.summary ? `Summary: ${interaction.summary}` : '',
      ].filter(Boolean)
      return parts.join('\n')
    }).join('\n\n')

    const existingNotes = customer.memoryNotes.map(n => `- [${n.category}] ${n.content}`).join('\n')

    const userMessage = `Customer: ${customer.name || customer.email} (${customer.tier} tier, ${customer.company || 'unknown company'})

Existing memory notes:
${existingNotes || '(none)'}

Recent interactions:
${interactionContext}

Extract new memory notes from these interactions. Don't repeat existing notes.`

    // Call AI for extraction
    const zai = await ZAI.create()
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.3,
    })

    const rawContent = completion.choices?.[0]?.message?.content || ''
    let parsed: { notes: Array<{ category: string; content: string; confidence: number; tags: string[] }> }

    try {
      let cleaned = rawContent.trim()
      const fenceMatch = cleaned.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/)
      if (fenceMatch) cleaned = fenceMatch[1].trim()
      parsed = JSON.parse(cleaned)
    } catch {
      return successResponse({ notes: [], message: 'AI extraction returned invalid JSON, please try again' })
    }

    // Create the notes in the database
    const createdNotes: any[] = []
    for (const note of (parsed.notes || []).slice(0, 10)) {
      try {
        const created = await db.memoryNote.create({
          data: {
            customerId,
            category: note.category || 'fact',
            content: note.content,
            source: 'ai_extraction',
            confidence: note.confidence ?? 0.8,
            tags: note.tags ? JSON.stringify(note.tags) : null,
          },
        })
        createdNotes.push({
          id: created.id,
          category: created.category,
          content: created.content,
          confidence: created.confidence,
          tags: note.tags || [],
          createdAt: created.createdAt.toISOString(),
        })
      } catch {
        // Skip failed note creation
      }
    }

    return successResponse({
      notes: createdNotes,
      analyzedInteractions: customer.interactions.length,
      existingNotesBefore: customer.memoryNotes.length,
    })
  } catch (err) {
    console.error('[POST /api/memory/extract]', err)
    return errorResponse('Failed to extract memory notes', 500)
  }
}
