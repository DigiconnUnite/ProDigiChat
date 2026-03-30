import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getToken } from 'next-auth/jwt'

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });
  const orgId = (token?.organizationId || token?.orgId) as string;

  if (!orgId) {
    return NextResponse.json(
      { error: 'Organization ID not found in token' },
      { status: 400 }
    );
  }

   // Build organization-level filters for org-wide analytics
   const contactFilter = { organizationId: orgId };
   const automationFilter = {};
   const campaignFilter = { organizationId: orgId };
   const messageFilter = { organizationId: orgId };
   const activityFilter = {};

  try {
    const { searchParams } = new URL(request.url)
    const dateRange = searchParams.get('dateRange') || '30d'
    
    // Calculate date range
    const now = new Date()
    let startDate = new Date()
    let previousStartDate = new Date()
    let daysInRange = 30
    
    if (dateRange === '7d') {
      daysInRange = 7
      startDate.setDate(now.getDate() - 7)
      previousStartDate.setDate(now.getDate() - 14)
    } else if (dateRange === '30d') {
      daysInRange = 30
      startDate.setDate(now.getDate() - 30)
      previousStartDate.setDate(now.getDate() - 60)
    } else if (dateRange === '90d') {
      daysInRange = 90
      startDate.setDate(now.getDate() - 90)
      previousStartDate.setDate(now.getDate() - 180)
    }

    // Fetch all data in parallel for current period
    const [
      totalContacts,
      messagesSent,
      campaignsData,
      automationStats,
      // Activity logs
      recentActivity,
      // Contact growth - current period
      newContactsCurrent,
      // Message stats for current period
      messageStatsCurrent
    ] = await Promise.all([
      // Total contacts count
      prisma.contact.count({
        where: contactFilter
      }),
      
      // Messages sent in date range
      prisma.message.count({
        where: {
          direction: 'outgoing',
          createdAt: {
            gte: startDate
          },
          ...messageFilter
        }
      }),
      
      // Campaigns summary
      prisma.campaign.groupBy({
        by: ['status'],
        _count: true,
        where: {
          createdAt: {
            gte: startDate
          },
          ...campaignFilter
        }
      }),
      
      // Automation workflow stats
      prisma.automationWorkflow.findMany({
        where: automationFilter,
        select: {
          id: true,
          name: true,
          status: true
        }
      }),

      // Recent activity logs (latest 10)
      prisma.activityLog.findMany({
        where: activityFilter,
        orderBy: {
          createdAt: 'desc'
        },
        take: 10,
        select: {
          id: true,
          action: true,
          details: true,
          createdAt: true
        }
      }),

      // New contacts in current period
      prisma.contact.count({
        where: {
          ...contactFilter,
          createdAt: {
            gte: startDate
          }
        }
      }),

      // Message stats for current period
      prisma.message.groupBy({
        by: ['status', 'direction'],
        _count: true,
        where: {
          direction: 'outgoing',
          createdAt: {
            gte: startDate
          },
          ...messageFilter
        }
      })
    ])

    // Calculate current period stats
    // Calculate current period stats via status roll-up
    const getCount = (status: string) => messageStatsCurrent.find(m => m.status === status)?._count || 0
    
    const sentOnly = getCount('sent')
    const deliveredOnly = getCount('delivered')
    const readOnly = getCount('read')
    const failedOnly = getCount('failed')
    
    // Roll-up logic: messages that are 'read' were also 'delivered' and 'sent'. 
    // totalSentForRate should include 'failed' to calculate delivery percentage of all attempts.
    const totalSentForRate = sentOnly + deliveredOnly + readOnly + failedOnly
    const totalDeliveredForRate = deliveredOnly + readOnly
    const totalReadForRate = readOnly

    const deliveryRate = totalSentForRate > 0 ? ((totalDeliveredForRate / totalSentForRate) * 100) : 0
    const readRate = totalDeliveredForRate > 0 ? ((totalReadForRate / totalDeliveredForRate) * 100) : 0

    // Fetch previous period stats for trends
    const [
      messagesSentPrevious,
      messageStatsPrevious,
      newContactsPrevious
    ] = await Promise.all([
      // Messages sent in previous period
      prisma.message.count({
        where: {
          direction: 'outgoing',
          createdAt: {
            gte: previousStartDate,
            lt: startDate
          },
          ...messageFilter
        }
      }),

      // Message stats for previous period
      prisma.message.groupBy({
        by: ['status', 'direction'],
        _count: true,
        where: {
          direction: 'outgoing',
          createdAt: {
            gte: previousStartDate,
            lt: startDate
          },
          ...messageFilter
        }
      }),

      // New contacts in previous period
      prisma.contact.count({
        where: {
          ...contactFilter,
          createdAt: {
            gte: previousStartDate,
            lt: startDate
          }
        }
      })
    ])

    // Calculate previous period rates
    // Calculate previous period rates with roll-up
    const getPrevCount = (status: string) => messageStatsPrevious.find(m => m.status === status)?._count || 0
    
    const prevSentOnly = getPrevCount('sent')
    const prevDeliveredOnly = getPrevCount('delivered')
    const prevReadOnly = getPrevCount('read')
    const prevFailedOnly = getPrevCount('failed')
    
    const prevTotalSent = prevSentOnly + prevDeliveredOnly + prevReadOnly + prevFailedOnly
    const prevTotalDelivered = prevDeliveredOnly + prevReadOnly
    const prevTotalRead = prevReadOnly

    const prevDeliveryRate = prevTotalSent > 0 ? ((prevTotalDelivered / prevTotalSent) * 100) : 0
    const prevReadRate = prevTotalDelivered > 0 ? ((prevTotalRead / prevTotalDelivered) * 100) : 0

    // Calculate trend percentages
    const calculateTrend = (current: number, previous: number): number => {
      if (previous === 0) {
        return current > 0 ? 100 : 0
      }
      return ((current - previous) / previous) * 100
    }

    const trends = {
      messagesSent: parseFloat(calculateTrend(totalSentForRate, prevTotalSent).toFixed(1)),
      deliveryRate: parseFloat(calculateTrend(deliveryRate, prevDeliveryRate).toFixed(1)),
      readRate: parseFloat(calculateTrend(readRate, prevReadRate).toFixed(1)),
      newContacts: parseFloat(calculateTrend(newContactsCurrent, newContactsPrevious).toFixed(1))
    }

    // Fetch time series data - message volume by day
    const allMessagesInRange = await prisma.message.findMany({
      where: {
        direction: 'outgoing',
        createdAt: {
          gte: startDate
        },
        ...messageFilter
      },
      select: {
        status: true,
        createdAt: true
      }
    })

    // Group messages by date
    const messageVolumeMap = new Map<string, { sent: number; delivered: number; read: number }>()
    
    // Initialize all dates in range
    for (let i = 0; i < daysInRange; i++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]
      messageVolumeMap.set(dateStr, { sent: 0, delivered: 0, read: 0 })
    }

    // Count messages by date and status
    // Count messages by date and status with roll-up
    allMessagesInRange.forEach(msg => {
      const dateStr = msg.createdAt.toISOString().split('T')[0]
      const dayData = messageVolumeMap.get(dateStr)
      if (dayData) {
        // Roll-up logic: if delivered, it was also sent. if read, it was delivered and sent.
        if (msg.status === 'sent' || msg.status === 'delivered' || msg.status === 'read') dayData.sent++
        if (msg.status === 'delivered' || msg.status === 'read') dayData.delivered++
        if (msg.status === 'read') dayData.read++
      }
    })

    const messageVolume = Array.from(messageVolumeMap.entries()).map(([date, counts]) => ({
      date,
      sent: counts.sent,
      delivered: counts.delivered,
      read: counts.read
    }))

    // Fetch all campaigns with their stats
    const campaignsWithStats = await prisma.campaign.findMany({
      where: {
        createdAt: {
          gte: startDate
        },
        ...campaignFilter
      },
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        stats: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Parse campaign stats JSON
    const campaigns = campaignsWithStats.map(campaign => {
      let parsedStats = {
        sent: 0,
        delivered: 0,
        read: 0,
        clicked: 0,
        failed: 0
      }
      
      try {
        if (campaign.stats) {
          const statsObj = JSON.parse(campaign.stats)
          parsedStats = {
            sent: typeof statsObj.totalSent === 'number' ? statsObj.totalSent : 0,
            delivered: typeof statsObj.delivered === 'number' ? statsObj.delivered : 0,
            read: typeof statsObj.read === 'number' ? statsObj.read : 0,
            clicked: typeof statsObj.clicked === 'number' ? statsObj.clicked : 0,
            failed: typeof statsObj.failed === 'number' ? statsObj.failed : 0
          }
        }
      } catch (e) {
        // Keep default values if parsing fails
      }

      return {
        id: campaign.id,
        name: campaign.name,
        type: campaign.type,
        status: campaign.status,
        sent: parsedStats.sent,
        delivered: parsedStats.delivered,
        read: parsedStats.read,
        clicked: parsedStats.clicked,
        failed: parsedStats.failed
      }
    })

    // Process activity logs - parse details JSON
    const formattedActivity = recentActivity.map(activity => {
      let parsedDetails: Record<string, any> = {}
      try {
        if (activity.details) {
          parsedDetails = JSON.parse(activity.details)
        }
      } catch (e) {
        // Keep empty object if parsing fails
      }

      return {
        id: activity.id,
        action: activity.action,
        details: parsedDetails,
        createdAt: activity.createdAt.toISOString()
      }
    })

    // Calculate contact growth
    const contactGrowth = {
      newContacts: newContactsCurrent,
      trend: trends.newContacts
    }

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalContacts,
          messagesSent: totalSentForRate || 0,
          activeCampaigns: campaignsData.filter(c => c.status === 'running').length,
          activeAutomations: automationStats.filter(a => a.status === 'active').length
        },
        performance: {
          deliveryRate: parseFloat(deliveryRate.toFixed(1)),
          readRate: parseFloat(readRate.toFixed(1)),
          dateRange
        },
        // Existing fields (kept for backwards compatibility)
        campaigns: campaignsData,
        automations: automationStats,
        // New enhanced fields
        messageVolume,
        campaignDetails: campaigns,
        recentActivity: formattedActivity,
        trends,
        contactGrowth
      }
    })
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch analytics'
    }, { status: 500 })
  }
}
