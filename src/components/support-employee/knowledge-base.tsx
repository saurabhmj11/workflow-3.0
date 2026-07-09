'use client'

import { useState } from 'react'
import { Search, BookOpen, Clock, Eye, ChevronRight, FileText, Tag } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { KB_ARTICLES, type KBArticle } from '@/lib/demo-data'

// ─── Props ────────────────────────────────────────

interface KnowledgeBaseProps {
  highlightedCategory?: string
  searchedArticles?: string[]
}

// ─── Category colors ──────────────────────────────

const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  billing: { bg: 'bg-emerald-500/5', border: 'border-emerald-500/20', text: 'text-emerald-400' },
  technical: { bg: 'bg-red-500/5', border: 'border-red-500/20', text: 'text-red-400' },
  account: { bg: 'bg-blue-500/5', border: 'border-blue-500/20', text: 'text-blue-400' },
  general: { bg: 'bg-cyan-500/5', border: 'border-cyan-500/20', text: 'text-cyan-400' },
  'feature-request': { bg: 'bg-violet-500/5', border: 'border-violet-500/20', text: 'text-violet-400' },
}

// ─── Component ────────────────────────────────────

export function KnowledgeBase({ highlightedCategory, searchedArticles = [] }: KnowledgeBaseProps) {
  const [selectedArticle, setSelectedArticle] = useState<KBArticle | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredArticles = KB_ARTICLES.filter((article) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (
        article.title.toLowerCase().includes(q) ||
        article.excerpt.toLowerCase().includes(q) ||
        article.category.toLowerCase().includes(q)
      )
    }
    return true
  })

  // Sort: highlighted category first, then by relevance
  const sortedArticles = [...filteredArticles].sort((a, b) => {
    if (highlightedCategory) {
      const aCat = a.category === highlightedCategory ? 1 : 0
      const bCat = b.category === highlightedCategory ? 1 : 0
      if (aCat !== bCat) return bCat - aCat
    }
    return b.relevance - a.relevance
  })

  const totalArticles = KB_ARTICLES.length
  const categories = [...new Set(KB_ARTICLES.map((a) => a.category))]

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-violet-400" />
          <span className="text-sm font-semibold text-zinc-200">Knowledge Base</span>
          <Badge variant="outline" className="text-[9px] h-4 bg-violet-500/10 border-violet-500/20 text-violet-400">
            {totalArticles} articles
          </Badge>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-2 border-b border-zinc-800/50">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search knowledge base..."
            className="w-full bg-zinc-900 border border-zinc-700 rounded-md pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus-visible:ring-violet-600 focus-visible:ring-1"
          />
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-zinc-800/50 overflow-x-auto">
        <button
          onClick={() => setSearchQuery('')}
          className={`text-[10px] px-2 py-0.5 rounded-full transition-colors whitespace-nowrap ${
            !searchQuery && !highlightedCategory
              ? 'bg-violet-500/10 text-violet-400 border border-violet-500/30'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          All
        </button>
        {categories.map((cat) => {
          const colors = CATEGORY_COLORS[cat] || CATEGORY_COLORS.general
          return (
            <button
              key={cat}
              onClick={() => setSearchQuery(cat)}
              className={`text-[10px] px-2 py-0.5 rounded-full transition-colors whitespace-nowrap ${
                highlightedCategory === cat || searchQuery.toLowerCase() === cat
                  ? `${colors.bg} ${colors.text} border ${colors.border}`
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {cat}
            </button>
          )
        })}
      </div>

      {/* Article list / detail */}
      <div className="flex-1 overflow-y-auto">
        {selectedArticle ? (
          /* ─── Article detail view ─── */
          <div className="p-4 space-y-3">
            <button
              onClick={() => setSelectedArticle(null)}
              className="text-[10px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1"
            >
              ← Back to articles
            </button>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-violet-400" />
                <span className="text-xs font-mono text-zinc-500">{selectedArticle.id}</span>
              </div>
              <h3 className="text-sm font-semibold text-zinc-200 mb-2">{selectedArticle.title}</h3>
              <div className="flex items-center gap-3 text-[10px] text-zinc-500">
                <span className="flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  {selectedArticle.category}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {selectedArticle.lastUpdated}
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {selectedArticle.views} views
                </span>
              </div>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
              <p className="text-[11px] text-zinc-300 leading-relaxed">{selectedArticle.excerpt}</p>
            </div>
            {searchedArticles.includes(selectedArticle.id) && (
              <div className="flex items-center gap-1.5 text-[10px] text-cyan-400">
                <Search className="h-3 w-3" />
                <span>Used in last search — {Math.round(selectedArticle.relevance * 100)}% relevance</span>
              </div>
            )}
          </div>
        ) : (
          /* ─── Article list view ─── */
          sortedArticles.map((article) => {
            const colors = CATEGORY_COLORS[article.category] || CATEGORY_COLORS.general
            const isSearched = searchedArticles.includes(article.id)
            const isHighlighted = highlightedCategory === article.category

            return (
              <button
                key={article.id}
                onClick={() => setSelectedArticle(article)}
                className={`w-full text-left px-4 py-2.5 border-b border-zinc-800/50 transition-all hover:bg-zinc-800/30 ${
                  isSearched ? 'bg-cyan-500/5 border-l-2 border-l-cyan-500' : isHighlighted ? 'bg-violet-500/5' : ''
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[10px] font-mono text-zinc-600">{article.id}</span>
                      <Badge variant="outline" className={`text-[8px] h-3.5 ${colors.bg} ${colors.border} ${colors.text}`}>
                        {article.category}
                      </Badge>
                      {isSearched && (
                        <Badge className="text-[8px] h-3.5 bg-cyan-500/10 text-cyan-400 border-cyan-500/30">
                          {Math.round(article.relevance * 100)}% match
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] font-medium text-zinc-300 truncate">{article.title}</p>
                    <p className="text-[10px] text-zinc-500 line-clamp-2 mt-0.5">{article.excerpt}</p>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-zinc-600 mt-1 shrink-0" />
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
