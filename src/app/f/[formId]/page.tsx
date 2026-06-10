'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { CheckCircle2, Loader2, AlertCircle, FileText, ArrowLeft } from 'lucide-react'

// ─── Types ────────────────────────────────────────

interface FormField {
  name: string
  type: 'text' | 'email' | 'number' | 'tel' | 'url' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'date' | 'hidden'
  label: string
  required?: boolean
  placeholder?: string
  options?: string[]
  defaultValue?: string
  helpText?: string
}

interface FormData {
  formId: string
  name: string
  fields: FormField[]
  isActive: boolean
  submitCount: number
}

// ─── Page Component ───────────────────────────────

export default function PublicFormPage() {
  const params = useParams<{ formId: string }>()
  const formId = params.formId

  const [formData, setFormData] = useState<FormData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [values, setValues] = useState<Record<string, string | boolean>>({})

  // ─── Fetch form schema ──────────────────────

  useEffect(() => {
    async function loadForm() {
      try {
        const res = await fetch(`/api/triggers/form/${formId}`, {
          headers: { 'Accept': 'application/json' },
        })
        const json = await res.json()

        if (!json.ok) {
          setError(json.error || 'Form not found')
          return
        }

        setFormData(json.data)

        // Initialize default values
        const defaults: Record<string, string | boolean> = {}
        for (const field of json.data.fields as FormField[]) {
          if (field.type === 'checkbox') {
            defaults[field.name] = false
          } else {
            defaults[field.name] = field.defaultValue || ''
          }
        }
        setValues(defaults)
      } catch {
        setError('Failed to load form')
      } finally {
        setLoading(false)
      }
    }

    if (formId) loadForm()
  }, [formId])

  // ─── Handle field change ───────────────────

  const handleChange = useCallback((name: string, value: string | boolean) => {
    setValues(prev => ({ ...prev, [name]: value }))
  }, [])

  // ─── Handle form submit ────────────────────

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData || submitting) return

    setSubmitting(true)

    try {
      // Convert boolean checkbox values to strings for the API
      const payload: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(values)) {
        payload[key] = typeof value === 'boolean' ? String(value) : value
      }

      const res = await fetch(`/api/triggers/form/${formId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()

      if (!json.ok) {
        setError(json.error || 'Submission failed')
        return
      }

      setSubmitted(true)
    } catch {
      setError('Failed to submit form. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }, [formData, formId, submitting, values])

  // ─── Loading State ──────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex items-center gap-3 text-zinc-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading form...</span>
        </div>
      </div>
    )
  }

  // ─── Error State ────────────────────────────

  if (error && !formData) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="h-16 w-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-red-400" />
          </div>
          <h1 className="text-xl font-semibold text-zinc-100 mb-2">Form Not Available</h1>
          <p className="text-sm text-zinc-400 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  // ─── Success State ─────────────────────────

  if (submitted) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
          </div>
          <h1 className="text-xl font-semibold text-zinc-100 mb-2">Thank You!</h1>
          <p className="text-sm text-zinc-400 mb-6">
            Your submission has been received. We&apos;ll get back to you as soon as possible.
          </p>
          <button
            onClick={() => {
              setSubmitted(false)
              setValues(
                Object.fromEntries(
                  formData!.fields.map((f) => [f.name, f.type === 'checkbox' ? false : f.defaultValue || ''])
                )
              )
            }}
            className="inline-flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Submit another response
          </button>
        </div>
      </div>
    )
  }

  // ─── Form Rendering ────────────────────────

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full">
        {/* Form Card */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 backdrop-blur-sm shadow-2xl shadow-black/40">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-zinc-800">
            <div className="flex items-center gap-3 mb-1">
              <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center">
                <FileText className="h-4.5 w-4.5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-zinc-100">{formData?.name || 'Form'}</h1>
                {formData && formData.submitCount > 0 && (
                  <p className="text-[11px] text-zinc-500">{formData.submitCount} submission{formData.submitCount !== 1 ? 's' : ''} received</p>
                )}
              </div>
            </div>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                <p className="text-xs text-red-300">{error}</p>
              </div>
            )}

            {formData?.fields.map((field) => (
              <div key={field.name} className="space-y-1.5">
                <label
                  htmlFor={field.name}
                  className="block text-sm font-medium text-zinc-300"
                >
                  {field.label}
                  {field.required && <span className="text-red-400 ml-0.5">*</span>}
                </label>

                {field.helpText && (
                  <p className="text-[11px] text-zinc-500">{field.helpText}</p>
                )}

                {field.type === 'textarea' ? (
                  <textarea
                    id={field.name}
                    name={field.name}
                    value={(values[field.name] as string) || ''}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    required={field.required}
                    rows={4}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40 transition-colors resize-vertical"
                  />
                ) : field.type === 'select' ? (
                  <select
                    id={field.name}
                    name={field.name}
                    value={(values[field.name] as string) || ''}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    required={field.required}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40 transition-colors appearance-none"
                  >
                    <option value="">Select...</option>
                    {field.options?.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : field.type === 'checkbox' ? (
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      id={field.name}
                      name={field.name}
                      checked={(values[field.name] as boolean) || false}
                      onChange={(e) => handleChange(field.name, e.target.checked)}
                      className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-violet-500 focus:ring-violet-500/40 focus:ring-offset-0"
                    />
                    <span className="text-sm text-zinc-400">{field.placeholder || 'Yes'}</span>
                  </label>
                ) : field.type === 'radio' ? (
                  <div className="space-y-2">
                    {field.options?.map((opt) => (
                      <label key={opt} className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="radio"
                          name={field.name}
                          value={opt}
                          checked={(values[field.name] as string) === opt}
                          onChange={(e) => handleChange(field.name, e.target.value)}
                          required={field.required}
                          className="h-4 w-4 border-zinc-600 bg-zinc-800 text-violet-500 focus:ring-violet-500/40 focus:ring-offset-0"
                        />
                        <span className="text-sm text-zinc-400">{opt}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <input
                    type={field.type}
                    id={field.name}
                    name={field.name}
                    value={(values[field.name] as string) || ''}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    required={field.required}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40 transition-colors"
                  />
                )}
              </div>
            ))}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-lg bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-semibold text-sm transition-all shadow-lg shadow-violet-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit'
              )}
            </button>
          </form>
        </div>

        {/* Branding */}
        <p className="text-center text-[11px] text-zinc-600 mt-4">
          Powered by <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent font-medium">OpenWorkflow</span>
        </p>
      </div>
    </div>
  )
}
