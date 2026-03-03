'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { AlertOctagon } from "lucide-react"

interface DeleteConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  emailAddress: string
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  emailAddress
}: DeleteConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="glass-panel border-destructive/20 sm:max-w-md bg-background/95 shadow-2xl overflow-hidden p-0">
        {/* Top accent line */}
        <div className="h-1.5 w-full bg-destructive" />

        <div className="p-6">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-full bg-destructive/10">
                <AlertOctagon className="h-6 w-6 text-destructive" />
              </div>
              <AlertDialogTitle className="text-xl">Delete Email Address?</AlertDialogTitle>
            </div>

            <div className="space-y-4 text-left">
              <p className="text-muted-foreground">Are you sure you want to delete this email address?</p>

              <div className="p-3 bg-muted/30 rounded-lg border border-border/50 text-center">
                <p className="font-semibold text-foreground tracking-wide break-all">
                  {emailAddress}
                </p>
              </div>

              <AlertDialogDescription className="text-sm font-medium text-destructive/90 bg-destructive/5 p-3 rounded-lg border border-destructive/10">
                This will permanently delete all messages received at this address. This action cannot be undone.
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>

          <AlertDialogFooter className="mt-6 pt-4 border-t border-border/40 gap-2 sm:gap-2">
            <AlertDialogCancel className="w-full sm:w-auto rounded-lg">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirm}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-lg w-full sm:w-auto shadow-sm shadow-destructive/20"
            >
              Permanently Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
