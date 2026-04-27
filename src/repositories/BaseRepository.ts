import { prisma } from '@/lib/prisma';

export abstract class BaseRepository {
  protected modelName: string;

  constructor(modelName: string) {
    this.modelName = modelName;
  }

  protected get model() {
    return (prisma as any)[this.modelName];
  }

  async findById(id: string, include?: any) {
    return this.model.findUnique({
      where: { id },
      include
    });
  }

  async findOne(where: any, include?: any) {
    return this.model.findFirst({
      where,
      include
    });
  }

  async findMany(where: any = {}, options: {
    include?: any;
    orderBy?: any;
    skip?: number;
    take?: number;
  } = {}) {
    const { include, orderBy, skip, take } = options;
    return this.model.findMany({
      where,
      include,
      orderBy,
      skip,
      take
    });
  }

  async count(where: any = {}) {
    return this.model.count({ where });
  }

  async create(data: any) {
    return this.model.create({ data });
  }

  async update(id: string, data: any) {
    return this.model.update({
      where: { id },
      data
    });
  }

  async delete(id: string) {
    return this.model.delete({
      where: { id }
    });
  }

  async updateMany(where: any, data: any) {
    return this.model.updateMany({
      where,
      data
    });
  }

  async deleteMany(where: any) {
    return this.model.deleteMany({
      where
    });
  }
}
