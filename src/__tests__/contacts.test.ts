import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { ContactService } from '@/services/ContactService';
import { prisma } from '@/lib/prisma';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    contact: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

describe('ContactService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new contact successfully', async () => {
      const mockContact = {
        id: '123',
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '+1234567890',
        email: 'john@example.com',
        tags: '[]',
        attributes: '{}',
        optInStatus: 'pending',
        lifecycleStatus: 'lead',
        displayName: 'John Doe',
        userId: 'user123',
        organizationId: 'org123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.contact.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.contact.create as jest.Mock).mockResolvedValue(mockContact);

      const result = await ContactService.create({
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '+1234567890',
        email: 'john@example.com',
        organizationId: 'org123',
        userId: 'user123',
      });

      expect(result).toEqual(mockContact);
      expect(prisma.contact.create).toHaveBeenCalled();
    });

    it('should throw error if contact already exists', async () => {
      (prisma.contact.findFirst as jest.Mock).mockResolvedValue({ id: 'existing' });

      await expect(
        ContactService.create({
          phoneNumber: '+1234567890',
          organizationId: 'org123',
          userId: 'user123',
        })
      ).rejects.toThrow('Contact with this phone number already exists');
    });
  });

  describe('update', () => {
    it('should update an existing contact', async () => {
      const mockContact = {
        id: '123',
        firstName: 'Jane',
        lastName: 'Doe',
        phoneNumber: '+1234567890',
        email: 'jane@example.com',
        tags: '[]',
        attributes: '{}',
        optInStatus: 'opted_in',
        lifecycleStatus: 'active',
        displayName: 'Jane Doe',
        userId: 'user123',
        organizationId: 'org123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.contact.findFirst as jest.Mock).mockResolvedValue(mockContact);
      (prisma.contact.update as jest.Mock).mockResolvedValue(mockContact);

      const result = await ContactService.update({
        id: '123',
        firstName: 'Jane',
        organizationId: 'org123',
      });

      expect(result).toEqual(mockContact);
      expect(prisma.contact.update).toHaveBeenCalled();
    });

    it('should throw error if contact not found', async () => {
      (prisma.contact.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        ContactService.update({
          id: '123',
          organizationId: 'org123',
        })
      ).rejects.toThrow('Contact not found');
    });
  });

  describe('delete', () => {
    it('should delete a contact', async () => {
      const mockContact = { id: '123' };
      (prisma.contact.findFirst as jest.Mock).mockResolvedValue(mockContact);
      (prisma.contact.delete as jest.Mock).mockResolvedValue(mockContact);

      const result = await ContactService.delete('123', 'org123');

      expect(result).toEqual({ success: true });
      expect(prisma.contact.delete).toHaveBeenCalledWith({
        where: { id: '123' },
      });
    });
  });

  describe('list', () => {
    it('should list contacts with filters', async () => {
      const mockContacts = [
        { id: '1', firstName: 'John', phoneNumber: '+1234567890' },
        { id: '2', firstName: 'Jane', phoneNumber: '+0987654321' },
      ];

      (prisma.contact.findMany as jest.Mock).mockResolvedValue(mockContacts);
      (prisma.contact.count as jest.Mock).mockResolvedValue(2);

      const result = await ContactService.list('org123', {
        search: 'John',
        page: 1,
        limit: 10,
      });

      expect(result.contacts).toEqual(mockContacts);
      expect(result.total).toBe(2);
    });
  });
});
