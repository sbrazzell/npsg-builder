'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { budgetItemSchema, type BudgetItemInput } from '@/lib/validations'

export async function getBudgetItems(projectId: string) {
  try {
    const items = await prisma.budgetItem.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    })
    return { success: true, data: items }
  } catch (error) {
    return { success: false, error: 'Failed to fetch budget items' }
  }
}

export async function createBudgetItem(input: BudgetItemInput) {
  const parsed = budgetItemSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Validation error" }
  }

  const data = {
    ...parsed.data,
    totalCost: parsed.data.quantity * parsed.data.unitCost,
    vendorUrl: parsed.data.vendorUrl || null,
  }

  try {
    const item = await prisma.budgetItem.create({ data })
    const project = await prisma.projectProposal.findUnique({ where: { id: parsed.data.projectId } })
    if (project) {
      revalidatePath(`/sites/${project.siteId}/projects/${parsed.data.projectId}/budget`)
    }
    return { success: true, data: item }
  } catch (error) {
    return { success: false, error: 'Failed to create budget item' }
  }
}

export async function updateBudgetItem(id: string, input: BudgetItemInput) {
  const parsed = budgetItemSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Validation error" }
  }

  const data = {
    ...parsed.data,
    totalCost: parsed.data.quantity * parsed.data.unitCost,
    vendorUrl: parsed.data.vendorUrl || null,
  }

  try {
    const item = await prisma.budgetItem.update({ where: { id }, data })
    const project = await prisma.projectProposal.findUnique({ where: { id: parsed.data.projectId } })
    if (project) {
      revalidatePath(`/sites/${project.siteId}/projects/${parsed.data.projectId}/budget`)
    }
    return { success: true, data: item }
  } catch (error) {
    return { success: false, error: 'Failed to update budget item' }
  }
}

export async function deleteBudgetItem(id: string) {
  try {
    const item = await prisma.budgetItem.findUnique({ where: { id } })
    await prisma.budgetItem.delete({ where: { id } })
    if (item) {
      const project = await prisma.projectProposal.findUnique({ where: { id: item.projectId } })
      if (project) {
        revalidatePath(`/sites/${project.siteId}/projects/${item.projectId}/budget`)
      }
    }
    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to delete budget item' }
  }
}
