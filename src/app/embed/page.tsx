'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Code, Copy, CheckCircle2, Link as LinkIcon, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'

export default function EmbedPage() {
  const [copied, setCopied] = useState<string | null>(null)

  const iframeSnippet = `<iframe
  src="https://workflow.example.com/widget/wf_123456"
  width="100%"
  height="600"
  style="border: none; border-radius: 8px;"
  title="OpenWorkflow Widget"
></iframe>`

  const scriptSnippet = `<script src="https://workflow.example.com/embed.js"></script>
<open-workflow id="wf_123456" theme="light"></open-workflow>`

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    toast({ title: 'Copied to clipboard' })
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Embed Workflow</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Integrate your workflows into any website or application using our drop-in snippets.
        </p>
      </div>

      <Tabs defaultValue="iframe" className="space-y-6">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="iframe" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white">
            <LinkIcon className="h-3.5 w-3.5 mr-1.5" />
            iFrame
          </TabsTrigger>
          <TabsTrigger value="script" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white">
            <Code className="h-3.5 w-3.5 mr-1.5" />
            Script Tag
          </TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white">
            <Settings className="h-3.5 w-3.5 mr-1.5" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="iframe" className="space-y-4">
          <Card className="bg-zinc-900/80 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
                iFrame Embed
              </CardTitle>
              <CardDescription className="text-xs text-zinc-500">
                The easiest way to embed a workflow. Simply copy and paste this code into your HTML.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative group">
                <pre className="p-4 rounded-md bg-zinc-950 border border-zinc-800 text-sm text-zinc-300 overflow-x-auto">
                  <code>{iframeSnippet}</code>
                </pre>
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute top-3 right-3 h-8 w-8 bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                  onClick={() => handleCopy(iframeSnippet, 'iframe')}
                >
                  {copied === 'iframe' ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="script" className="space-y-4">
          <Card className="bg-zinc-900/80 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
                Web Component Script
              </CardTitle>
              <CardDescription className="text-xs text-zinc-500">
                A lightweight custom element that gives you more control over styling and behavior.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative group">
                <pre className="p-4 rounded-md bg-zinc-950 border border-zinc-800 text-sm text-zinc-300 overflow-x-auto">
                  <code>{scriptSnippet}</code>
                </pre>
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute top-3 right-3 h-8 w-8 bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                  onClick={() => handleCopy(scriptSnippet, 'script')}
                >
                  {copied === 'script' ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="settings" className="space-y-4">
           <Card className="bg-zinc-900/80 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
                Embed Settings
              </CardTitle>
              <CardDescription className="text-xs text-zinc-500">
                Configure allowed origins and appearance settings for your embeds.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400">Allowed Origins</label>
                <input
                  type="text"
                  placeholder="https://yourwebsite.com"
                  className="w-full h-9 rounded-md bg-zinc-950 border border-zinc-800 px-3 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700"
                />
                <p className="text-[10px] text-zinc-500">Leave blank to allow all origins.</p>
              </div>
              <Button size="sm" className="bg-zinc-100 text-zinc-900 hover:bg-white">
                Save Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  )
}