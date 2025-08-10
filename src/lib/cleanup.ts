import { prisma } from '@/lib/db'

/**
 * Cleanup utility for hard deleting soft-deleted emails after 14 days
 */
export async function cleanupExpiredEmails() {
  try {
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    
    // Find all soft-deleted emails older than 14 days
    const expiredEmails = await prisma.email.findMany({
      where: {
        deletedAt: {
          not: null,
          lt: fourteenDaysAgo
        }
      },
      select: {
        id: true,
        emailAddress: true,
        deletedAt: true
      }
    })

    if (expiredEmails.length === 0) {
      console.log('[Cleanup] No expired soft-deleted emails found')
      return { deleted: 0 }
    }

    // Hard delete expired emails
    const deleteResult = await prisma.email.deleteMany({
      where: {
        deletedAt: {
          not: null,
          lt: fourteenDaysAgo
        }
      }
    })

    console.log(`[Cleanup] Hard deleted ${deleteResult.count} expired emails`)
    
    return {
      deleted: deleteResult.count,
      emails: expiredEmails.map(e => e.emailAddress)
    }
  } catch (error) {
    console.error('[Cleanup] Error during cleanup:', error)
    throw error
  }
}

/**
 * Cleanup utility for hard deleting expired emails (not soft-deleted)
 */
export async function cleanupExpiredActiveEmails() {
  try {
    const now = new Date()
    
    // Find all expired active emails
    const expiredEmails = await prisma.email.findMany({
      where: {
        expiresAt: {
          lt: now
        },
        deletedAt: null,
        isActive: true
      },
      select: {
        id: true,
        emailAddress: true,
        expiresAt: true
      }
    })

    if (expiredEmails.length === 0) {
      console.log('[Cleanup] No expired active emails found')
      return { deleted: 0 }
    }

    // Hard delete expired emails
    const deleteResult = await prisma.email.deleteMany({
      where: {
        expiresAt: {
          lt: now
        },
        deletedAt: null,
        isActive: true
      }
    })

    console.log(`[Cleanup] Hard deleted ${deleteResult.count} expired active emails`)
    
    return {
      deleted: deleteResult.count,
      emails: expiredEmails.map(e => e.emailAddress)
    }
  } catch (error) {
    console.error('[Cleanup] Error during active email cleanup:', error)
    throw error
  }
}

/**
 * Run both cleanup operations
 */
export async function runCleanup() {
  console.log('[Cleanup] Starting cleanup process...')
  
  const softDeleteResult = await cleanupExpiredEmails()
  const activeDeleteResult = await cleanupExpiredActiveEmails()
  
  const totalDeleted = softDeleteResult.deleted + activeDeleteResult.deleted
  
  console.log(`[Cleanup] Cleanup completed. Total deleted: ${totalDeleted}`)
  
  return {
    softDeleted: softDeleteResult.deleted,
    activeDeleted: activeDeleteResult.deleted,
    total: totalDeleted
  }
}
