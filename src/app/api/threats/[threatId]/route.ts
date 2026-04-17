import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ threatId: string }> }
) {
  const { threatId } = await params
  try {
    const threat = await prisma.threatAssessment.findUnique({ where: { id: threatId } })
    if (!threat) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(threat)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch threat' }, { status: 500 })
  }
}
