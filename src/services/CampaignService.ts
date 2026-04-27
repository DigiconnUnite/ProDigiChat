import { prisma } from '@/lib/prisma';

export interface CreateCampaignData {
  name: string;
  description?: string;
  type: string;
  organizationId: string;
  createdBy?: string;
  audienceSegmentId?: string;
  whatsappNumberId?: string;
  whatsappAccountId?: string;
  messageContent: Record<string, unknown>;
  schedule?: Record<string, unknown>;
}

export interface UpdateCampaignData {
  id: string;
  name?: string;
  description?: string;
  type?: string;
  status?: string;
  audienceSegmentId?: string;
  whatsappNumberId?: string;
  whatsappAccountId?: string;
  messageContent?: Record<string, unknown>;
  schedule?: Record<string, unknown>;
  organizationId: string;
}

export class CampaignService {
  static async create(data: CreateCampaignData) {
    const {
      name,
      description,
      type,
      organizationId,
      createdBy,
      audienceSegmentId,
      whatsappNumberId,
      whatsappAccountId,
      messageContent,
      schedule
    } = data;

    const campaign = await prisma.campaign.create({
      data: {
        name,
        description,
        type,
        status: 'draft',
        organizationId,
        createdBy,
        audienceSegmentId,
        whatsappNumberId,
        whatsappAccountId,
        messageContent: JSON.stringify(messageContent),
        schedule: schedule ? JSON.stringify(schedule) : null,
        stats: JSON.stringify({ totalSent: 0, delivered: 0, read: 0, failed: 0, clicked: 0 })
      }
    });

    return campaign;
  }

  static async update(data: UpdateCampaignData) {
    const {
      id,
      name,
      description,
      type,
      status,
      audienceSegmentId,
      whatsappNumberId,
      whatsappAccountId,
      messageContent,
      schedule,
      organizationId
    } = data;

    // Verify campaign belongs to organization
    const existing = await prisma.campaign.findFirst({
      where: {
        id,
        organizationId
      }
    });

    if (!existing) {
      throw new Error('Campaign not found');
    }

    const campaign = await prisma.campaign.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(type !== undefined && { type }),
        ...(status !== undefined && { status }),
        ...(audienceSegmentId !== undefined && { audienceSegmentId }),
        ...(whatsappNumberId !== undefined && { whatsappNumberId }),
        ...(whatsappAccountId !== undefined && { whatsappAccountId }),
        ...(messageContent !== undefined && { messageContent: JSON.stringify(messageContent) }),
        ...(schedule !== undefined && { schedule: schedule ? JSON.stringify(schedule) : null })
      }
    });

    return campaign;
  }

  static async delete(id: string, organizationId: string) {
    const existing = await prisma.campaign.findFirst({
      where: {
        id,
        organizationId
      }
    });

    if (!existing) {
      throw new Error('Campaign not found');
    }

    await prisma.campaign.delete({
      where: { id }
    });

    return { success: true };
  }

  static async getById(id: string, organizationId: string) {
    return prisma.campaign.findFirst({
      where: {
        id,
        organizationId
      },
      include: {
        audience: {
          include: {
            _count: {
              select: { members: true }
            }
          }
        }
      }
    });
  }

  static async list(organizationId: string, filters: {
    status?: string;
    type?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { status, type, search, page = 1, limit = 10 } = filters;

    const conditions: any = { organizationId };

    if (status && status !== 'all') {
      conditions.status = status;
    }

    if (type && type !== 'all') {
      conditions.type = type;
    }

    if (search) {
      conditions.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where: conditions,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          audience: {
            include: {
              _count: {
                select: { members: true }
              }
            }
          }
        }
      }),
      prisma.campaign.count({ where: conditions })
    ]);

    return { campaigns, total, page, limit };
  }

  static async updateStats(id: string, stats: Record<string, number>) {
    const existing = await prisma.campaign.findUnique({
      where: { id },
      select: { stats: true }
    });

    if (!existing) {
      throw new Error('Campaign not found');
    }

    const currentStats = JSON.parse(existing.stats || '{}');
    const updatedStats = { ...currentStats, ...stats };

    await prisma.campaign.update({
      where: { id },
      data: {
        stats: JSON.stringify(updatedStats)
      }
    });

    return updatedStats;
  }
}
