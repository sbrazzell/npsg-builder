'use server'

import { requireAuth } from '@/lib/auth-guard'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { runApplicationReview, applyFixToSnapshot } from '@/lib/application-review/runner'
import type { ApplicationReview, ReviewHistoryEntry } from '@/lib/application-review/types'
import type { FilingSnapshot } from './filings'

// ─── Run a fresh review ───────────────────────────────────────────────────────

export async function runReview(draftId: string): Promise<ApplicationReview> {
  await requireAuth()
  const draft = await prisma.applicationDraft.findUniqueOrThrow({
    where: { id: draftId },
  })

  const snapshot: FilingSnapshot = JSON.parse(draft.snapshotJson)
  const review = runApplicationReview(snapshot, draftId)

  // Persist the review
  await prisma.applicationReview.create({
    data: {
      id: review.id,
      draftId,
      overallScore: review.scores.overall,
      reviewStatus: review.reviewStatus,
      totalFindings: review.totalFindings,
      blockerCount: review.blockerCount,
      warningCount: review.warningCount,
      suggestionCount: review.suggestionCount,
      resolvedCount: review.resolvedCount,
      unresolvedBlockers: review.unresolvedBlockers,
      reviewJson: JSON.stringify(review),
      updatedAt: new Date(),
    },
  })

  revalidatePath(`/sites/${draft.siteId}/filings/${draftId}/review`)
  return review
}

// ─── Load the latest review for a draft ──────────────────────────────────────

export async function getLatestReview(
  draftId: string,
): Promise<ApplicationReview | null> {
  const record = await prisma.applicationReview.findFirst({
    where: { draftId },
    orderBy: { createdAt: 'desc' },
  })
  if (!record) return null
  return JSON.parse(record.reviewJson) as ApplicationReview
}

// ─── Get review history for a draft ──────────────────────────────────────────

export async function getReviewHistory(draftId: string): Promise<ReviewHistoryEntry[]> {
  await requireAuth()
  const records = await prisma.applicationReview.findMany({
    where: { draftId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      draftId: true,
      createdAt: true,
      overallScore: true,
      reviewStatus: true,
      totalFindings: true,
      blockerCount: true,
      resolvedCount: true,
      unresolvedBlockers: true,
    },
  })

  return records.map((r) => ({
    id: r.id,
    draftId: r.draftId,
    createdAt: r.createdAt.toISOString(),
    overallScore: r.overallScore,
    reviewStatus: r.reviewStatus as ReviewHistoryEntry['reviewStatus'],
    totalFindings: r.totalFindings,
    blockerCount: r.blockerCount,
    resolvedCount: r.resolvedCount,
    unresolvedBlockers: r.unresolvedBlockers,
  }))
}

// ─── Accept a proposed fix ────────────────────────────────────────────────────
// Applies the fix to the draft's snapshotJson AND marks the finding resolved.
// The user may have edited the proposed text before accepting — editedText takes priority.

export async function acceptFix(
  reviewId: string,
  findingId: string,
  editedText?: string,
): Promise<{ review: ApplicationReview; snapshotUpdated: boolean }> {
  // Load review
  const record = await prisma.applicationReview.findUniqueOrThrow({
    where: { id: reviewId },
    include: { draft: true },
  })

  const review = JSON.parse(record.reviewJson) as ApplicationReview
  const finding = review.findings.find((f) => f.id === findingId)

  if (!finding) throw new Error(`Finding ${findingId} not found in review ${reviewId}`)
  if (!finding.proposedFix) throw new Error(`Finding ${findingId} has no proposed fix`)

  // Apply fix to snapshot
  const snapshot: FilingSnapshot = JSON.parse(record.draft.snapshotJson)
  const appliedText = editedText ?? finding.proposedFix.proposed
  const patchedSnapshot = applyFixToSnapshot(snapshot, finding.proposedFix.targetPath, appliedText)

  // Mark finding as resolved
  finding.resolved = true
  finding.resolvedAt = new Date().toISOString()

  // Recount
  review.resolvedCount = review.findings.filter((f) => f.resolved).length
  review.unresolvedBlockers = review.findings.filter(
    (f) => f.severity === 'blocker' && !f.resolved,
  ).length

  // Persist both changes
  await prisma.$transaction([
    prisma.applicationDraft.update({
      where: { id: record.draftId },
      data: {
        snapshotJson: JSON.stringify(patchedSnapshot),
        updatedAt: new Date(),
      },
    }),
    prisma.applicationReview.update({
      where: { id: reviewId },
      data: {
        resolvedCount: review.resolvedCount,
        unresolvedBlockers: review.unresolvedBlockers,
        reviewJson: JSON.stringify(review),
        updatedAt: new Date(),
      },
    }),
  ])

  revalidatePath(`/sites/${record.draft.siteId}/filings/${record.draftId}/review`)
  return { review, snapshotUpdated: true }
}

// ─── Reject a finding ─────────────────────────────────────────────────────────
// Marks a finding as explicitly dismissed (not fixed, but user has acknowledged it).

export async function rejectFinding(
  reviewId: string,
  findingId: string,
): Promise<ApplicationReview> {
  const record = await prisma.applicationReview.findUniqueOrThrow({
    where: { id: reviewId },
    include: { draft: true },
  })

  const review = JSON.parse(record.reviewJson) as ApplicationReview
  const finding = review.findings.find((f) => f.id === findingId)

  if (!finding) throw new Error(`Finding ${findingId} not found in review ${reviewId}`)

  finding.rejected = true

  await prisma.applicationReview.update({
    where: { id: reviewId },
    data: {
      reviewJson: JSON.stringify(review),
      updatedAt: new Date(),
    },
  })

  revalidatePath(`/sites/${record.draft.siteId}/filings/${record.draftId}/review`)
  return review
}

// ─── Mark a finding as manually resolved ─────────────────────────────────────
// Used when the user has fixed the issue in the app (not via autofix) and
// wants to dismiss the finding in the current review.

export async function markFindingResolved(
  reviewId: string,
  findingId: string,
): Promise<ApplicationReview> {
  const record = await prisma.applicationReview.findUniqueOrThrow({
    where: { id: reviewId },
    include: { draft: true },
  })

  const review = JSON.parse(record.reviewJson) as ApplicationReview
  const finding = review.findings.find((f) => f.id === findingId)

  if (!finding) throw new Error(`Finding ${findingId} not found`)

  finding.resolved = true
  finding.resolvedAt = new Date().toISOString()
  review.resolvedCount = review.findings.filter((f) => f.resolved).length
  review.unresolvedBlockers = review.findings.filter(
    (f) => f.severity === 'blocker' && !f.resolved,
  ).length

  await prisma.applicationReview.update({
    where: { id: reviewId },
    data: {
      resolvedCount: review.resolvedCount,
      unresolvedBlockers: review.unresolvedBlockers,
      reviewJson: JSON.stringify(review),
      updatedAt: new Date(),
    },
  })

  revalidatePath(`/sites/${record.draft.siteId}/filings/${record.draftId}/review`)
  return review
}
