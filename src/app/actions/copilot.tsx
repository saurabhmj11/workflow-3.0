'use server'

import { streamUI } from '@ai-sdk/rsc'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import { ReactNode } from 'react'

export async function askCopilot(
  prompt: string,
  nodeType: string,
  currentConfig: any
): Promise<{ id: string; display: ReactNode }> {
  const result = await streamUI({
    model: openai('gpt-4o'),
    prompt: `The user wants help configuring a workflow node of type "${nodeType}". Current config: ${JSON.stringify(currentConfig)}. User request: ${prompt}`,
    system: 'You are an AI assistant helping a user configure a workflow node. You can suggest configuration changes.',
    text: ({ content, done }) => {
      return <div className="text-sm text-zinc-300">{content}</div>
    },
    tools: {
      suggestConfig: {
        description: 'Suggest a new configuration for the node',
        parameters: z.object({
          explanation: z.string().describe('Explanation of the suggested changes'),
          config: z.record(z.string(), z.any()).describe('The suggested configuration object (key-value pairs)'),
        }),
        generate: async ({ explanation, config }) => {
          // This will be rendered on the client as a Generative UI component
          return (
            <div className="bg-zinc-800/50 border border-violet-500/30 rounded-lg p-3 space-y-3 mt-2">
              <p className="text-xs text-zinc-300">{explanation}</p>
              <div className="bg-zinc-950 rounded p-2 text-[10px] text-zinc-400 font-mono">
                {JSON.stringify(config, null, 2)}
              </div>
              <button 
                className="w-full h-7 text-xs bg-violet-600 hover:bg-violet-500 text-white rounded font-medium apply-config-btn"
                data-config={JSON.stringify(config)}
              >
                Apply Configuration
              </button>
            </div>
          )
        }
      }
    }
  })

  return {
    id: Date.now().toString(),
    display: result.value
  }
}
