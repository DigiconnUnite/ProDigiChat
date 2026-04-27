import { BaseRepository } from './BaseRepository';

export class ContactRepository extends BaseRepository {
  constructor() {
    super('contact');
  }

  async findByPhoneAndOrganization(phoneNumber: string, organizationId: string) {
    return this.findOne({
      phoneNumber,
      organizationId
    });
  }

  async findByOrganization(organizationId: string, options: {
    includeDeleted?: boolean;
    status?: string;
    lifecycleStatus?: string;
    search?: string;
    skip?: number;
    take?: number;
    orderBy?: any;
  } = {}) {
    const { includeDeleted, status, lifecycleStatus, search, skip, take, orderBy } = options;

    const where: any = { organizationId };

    if (!includeDeleted) {
      where.isDeleted = { not: true };
    }

    if (status && status !== 'all') {
      where.optInStatus = status;
    }

    if (lifecycleStatus && lifecycleStatus !== 'all') {
      where.lifecycleStatus = lifecycleStatus;
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    return this.findMany(where, { skip, take, orderBy });
  }

  async countByOrganization(organizationId: string, filters: {
    includeDeleted?: boolean;
    status?: string;
  } = {}) {
    const { includeDeleted, status } = filters;

    const where: any = { organizationId };

    if (!includeDeleted) {
      where.isDeleted = { not: true };
    }

    if (status && status !== 'all') {
      where.optInStatus = status;
    }

    return this.count(where);
  }
}
