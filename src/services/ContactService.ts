import { prisma } from '@/lib/prisma';
import { parseTags, stringifyTags, parseAttributes, stringifyAttributes } from '@/types/common';

export interface CreateContactData {
  firstName?: string;
  lastName?: string;
  phoneNumber: string;
  email?: string;
  tags?: string | string[];
  attributes?: Record<string, unknown> | string;
  optInStatus?: string;
  lifecycleStatus?: string;
  organizationId: string;
  userId: string;
}

export interface UpdateContactData {
  id: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  email?: string;
  tags?: string | string[];
  attributes?: Record<string, unknown> | string;
  optInStatus?: string;
  lifecycleStatus?: string;
  organizationId: string;
}

export class ContactService {
  static async create(data: CreateContactData) {
    const { firstName, lastName, phoneNumber, email, tags, attributes, optInStatus, lifecycleStatus, organizationId, userId } = data;

    // Normalize phone number
    const normalizedPhone = phoneNumber.trim().replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '');

    // Check for existing contact
    const existing = await prisma.contact.findFirst({
      where: {
        phoneNumber: normalizedPhone,
        organizationId
      }
    });

    if (existing) {
      throw new Error('Contact with this phone number already exists');
    }

    // Create contact
    const contact = await prisma.contact.create({
      data: {
        firstName: firstName?.trim() || '',
        lastName: lastName?.trim() || '',
        phoneNumber: normalizedPhone,
        email: email?.trim() || '',
        tags: stringifyTags(parseTags(tags || null)),
        attributes: stringifyAttributes(parseAttributes(attributes || null)),
        optInStatus: optInStatus || 'pending',
        lifecycleStatus: lifecycleStatus || 'lead',
        displayName: `${firstName?.trim() || ''} ${lastName?.trim() || ''}`.trim() || normalizedPhone,
        optInAt: optInStatus === 'opted_in' ? new Date() : null,
        optOutAt: optInStatus === 'opted_out' ? new Date() : null,
        userId,
        organizationId
      }
    });

    return contact;
  }

  static async update(data: UpdateContactData) {
    const { id, firstName, lastName, phoneNumber, email, tags, attributes, optInStatus, lifecycleStatus, organizationId } = data;

    // Verify contact belongs to organization
    const existing = await prisma.contact.findFirst({
      where: {
        id,
        organizationId
      }
    });

    if (!existing) {
      throw new Error('Contact not found');
    }

    // Normalize phone number if provided
    const normalizedPhone = phoneNumber ? phoneNumber.trim().replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '') : existing.phoneNumber;

    // Update contact
    const contact = await prisma.contact.update({
      where: { id },
      data: {
        ...(firstName !== undefined && { firstName: firstName.trim() }),
        ...(lastName !== undefined && { lastName: lastName.trim() }),
        ...(phoneNumber && { phoneNumber: normalizedPhone }),
        ...(email !== undefined && { email: email.trim() }),
        ...(tags !== undefined && { tags: stringifyTags(parseTags(tags)) }),
        ...(attributes !== undefined && { attributes: stringifyAttributes(parseAttributes(attributes)) }),
        ...(optInStatus !== undefined && {
          optInStatus,
          optInAt: optInStatus === 'opted_in' ? new Date() : (optInStatus === 'opted_out' ? null : existing.optInAt),
          optOutAt: optInStatus === 'opted_out' ? new Date() : (optInStatus === 'opted_in' ? null : existing.optOutAt)
        }),
        ...(lifecycleStatus !== undefined && { lifecycleStatus }),
        displayName: `${firstName?.trim() || existing.firstName} ${lastName?.trim() || existing.lastName}`.trim() || normalizedPhone
      }
    });

    return contact;
  }

  static async delete(id: string, organizationId: string) {
    const existing = await prisma.contact.findFirst({
      where: {
        id,
        organizationId
      }
    });

    if (!existing) {
      throw new Error('Contact not found');
    }

    await prisma.contact.delete({
      where: { id }
    });

    return { success: true };
  }

  static async softDelete(id: string, organizationId: string) {
    const existing = await prisma.contact.findFirst({
      where: {
        id,
        organizationId
      }
    });

    if (!existing) {
      throw new Error('Contact not found');
    }

    await prisma.contact.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date()
      }
    });

    return { success: true };
  }

  static async getById(id: string, organizationId: string) {
    return prisma.contact.findFirst({
      where: {
        id,
        organizationId
      }
    });
  }

  static async list(organizationId: string, filters: {
    search?: string;
    status?: string;
    lifecycleStatus?: string;
    tags?: string;
    includeDeleted?: boolean;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const { search, status, lifecycleStatus, tags, includeDeleted, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = filters;

    const conditions: any = { organizationId };

    if (!includeDeleted) {
      conditions.isDeleted = { not: true };
    }

    if (status && status !== 'all') {
      conditions.optInStatus = status;
    }

    if (lifecycleStatus && lifecycleStatus !== 'all') {
      conditions.lifecycleStatus = lifecycleStatus;
    }

    if (tags) {
      conditions.tags = { contains: tags };
    }

    if (search) {
      conditions.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where: conditions,
        orderBy,
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.contact.count({ where: conditions })
    ]);

    return { contacts, total, page, limit };
  }
}
