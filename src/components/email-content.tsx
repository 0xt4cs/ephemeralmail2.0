'use client'

import {
  Mail,
  Calendar,
  User,
  Paperclip,
  Clock,
  ChevronDown
} from 'lucide-react'
import { FilePreview } from '@/components/file-preview'
import { motion } from 'framer-motion'
import { EmptyState } from './empty-state'

function preserveOriginalEmail(html: string): string {
  if (!html) return ''
  return html
}

interface EmailContentProps {
  selected: {
    id: string
    fromAddress: string
    subject: string
    receivedAt: string
    bodyHtml?: string | null
    bodyText?: string | null
    headers?: Record<string, string>
    attachments?: Array<{
      name: string
      size: number
      type?: string
    }>
  } | null
}

export function EmailContent({ selected }: EmailContentProps) {
  if (!selected) {
    return <EmptyState type="select-message" />
  }

  const getFingerprint = (): string => {
    const stored = localStorage.getItem('ephemeralmail_fingerprint')
    let fingerprint = 'temp_' + Date.now().toString(36)
    if (stored) {
      try {
        const fp = JSON.parse(stored)
        fingerprint = fp.id
      } catch {
        // Use default
      }
    }
    return fingerprint
  }

  return (
    <motion.div
      key={selected.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="h-full flex flex-col bg-card relative overflow-hidden"
    >
      {/* Premium Header/Metadata Area */}
      <div className="shrink-0 border-b border-border/40 bg-gradient-to-b from-card to-background p-6">
        <div className="max-w-4xl mx-auto space-y-5">
          {/* Subject */}
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground leading-tight">
            {selected.subject || <span className="opacity-50 italic">(No Subject)</span>}
          </h1>

          {/* Metadata Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-background/50 border border-border/50 backdrop-blur-sm">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 text-primary shrink-0 font-bold border border-primary/20">
                {selected.fromAddress.charAt(0).toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-semibold truncate text-foreground">
                  {selected.fromAddress}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Sender
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-semibold text-muted-foreground/80 shrink-0 uppercase tracking-wider border-t sm:border-t-0 sm:border-l border-border/50 pt-3 sm:pt-0 sm:pl-4">
              <div className="flex items-center gap-1.5 bg-muted/30 px-2.5 py-1.5 rounded-md">
                <Calendar className="h-3.5 w-3.5" />
                <span>{new Date(selected.receivedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-muted/30 px-2.5 py-1.5 rounded-md">
                <Clock className="h-3.5 w-3.5" />
                <span>{new Date(selected.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Email Body */}
      <div className="flex-1 overflow-auto bg-background p-6 scroller">
        <div className="max-w-4xl mx-auto w-full min-h-full pb-10">
          {selected.bodyHtml ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="prose prose-sm sm:prose-base dark:prose-invert max-w-none email-original-content glass-card rounded-xl p-6 md:p-8"
              dangerouslySetInnerHTML={{ __html: preserveOriginalEmail(selected.bodyHtml) }}
            />
          ) : selected.bodyText ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-muted/20 border border-border/50 p-6 md:p-8 rounded-xl overflow-auto shadow-inner"
            >
              <pre className="whitespace-pre-wrap font-sans text-[15px] leading-relaxed text-foreground/90">
                {selected.bodyText}
              </pre>
            </motion.div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground border border-dashed border-border/50 rounded-xl">
              <Mail className="h-12 w-12 mb-4 opacity-20" />
              <p className="font-medium">This email has no readable content.</p>
            </div>
          )}

          {/* Attachments Section */}
          {selected.attachments && selected.attachments.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-8 pt-6 border-t border-border/50"
            >
              <div className="flex items-center space-x-2 mb-4">
                <div className="p-1.5 rounded-md bg-primary/10">
                  <Paperclip className="h-4 w-4 text-primary" />
                </div>
                <h3 className="text-sm font-bold text-foreground tracking-wide uppercase">
                  Attachments
                  <span className="ml-2 text-muted-foreground font-medium text-xs">
                    ({selected.attachments.length})
                  </span>
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {selected.attachments.map((attachment, index) => (
                  <div key={index} className="transition-transform hover:-translate-y-1 duration-200">
                    <FilePreview
                      emailId={selected.id}
                      attachment={attachment}
                      fingerprint={getFingerprint()}
                      className="h-full bg-card hover:bg-muted/30 border-border/50 shadow-sm transition-colors rounded-xl overflow-hidden"
                    />
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  )
}