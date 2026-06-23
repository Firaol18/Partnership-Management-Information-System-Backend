import { Test, TestingModule } from '@nestjs/testing';
import { GroupService } from './group.service';
import { DatabaseService } from '../../common/database/database.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateGroupDto, UpdateGroupDto, SearchGroupDto } from './dto';

const mockPrisma = {
  group: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    delete: jest.fn(),
  },
  employee: {
    count: jest.fn(),
  },
  partnershipOpportunity: {
    count: jest.fn(),
  },
  partnershipAgreement: {
    count: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockGroup = {
  id: 'group-123',
  name: 'Research Division',
  description: 'Focuses on research',
  parent_group_id: null,
  path: '/group-123',
  draft: false,
  drafted_at: null,
  drafted_by_id: null,
  created_at: new Date(),
  updated_at: new Date(),
};

const mockParentGroup = {
  id: 'parent-123',
  name: 'Innovation Directorate',
  description: 'Core innovation',
  parent_group_id: null,
  path: '/parent-123',
  draft: false,
  drafted_at: null,
  drafted_by_id: null,
};

describe('GroupService', () => {
  let service: GroupService;
  let prisma: typeof mockPrisma;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupService,
        { provide: DatabaseService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<GroupService>(GroupService);
    prisma = mockPrisma;
    jest.clearAllMocks();

    // Mock standard transaction implementation
    prisma.$transaction.mockImplementation((callback) => callback(prisma));
  });

  // ─── Create ───────────────────────────────────────────────────────────────

  describe('create', () => {
    const dto: CreateGroupDto = {
      name: 'Research Division',
      description: 'Focuses on research',
    };

    it('should create a root group successfully', async () => {
      prisma.group.findUnique.mockResolvedValue(null);
      prisma.group.create.mockResolvedValue(mockGroup);

      const result = await service.create(dto, 'employee-001');
      expect(result).toEqual(mockGroup);
      expect(prisma.group.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: dto.name,
            description: dto.description,
            parent_group_id: null,
            draft: false,
          }),
        }),
      );
    });

    it('should create a subgroup successfully', async () => {
      prisma.group.findUnique
        .mockResolvedValueOnce(null) // uniqueness check
        .mockResolvedValueOnce(mockParentGroup); // parent check

      const childGroup = {
        ...mockGroup,
        parent_group_id: 'parent-123',
        path: '/parent-123/group-123',
      };
      prisma.group.create.mockResolvedValue(childGroup);

      const result = await service.create(
        { ...dto, parent_group_id: 'parent-123' },
        'employee-001',
      );
      expect(result).toEqual(childGroup);
      expect(prisma.group.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            parent_group_id: 'parent-123',
            path: expect.stringMatching(/^\/parent-123\/[a-f0-9-]+$/),
          }),
        }),
      );
    });

    it('should throw BadRequestException if group name already exists', async () => {
      prisma.group.findUnique.mockResolvedValue(mockGroup);
      await expect(service.create(dto, 'employee-001')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if parent group does not exist', async () => {
      prisma.group.findUnique
        .mockResolvedValueOnce(null) // uniqueness
        .mockResolvedValueOnce(null); // parent check

      await expect(
        service.create({ ...dto, parent_group_id: 'bad-parent' }, 'employee-001'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle draft flag correctly during creation', async () => {
      prisma.group.findUnique.mockResolvedValue(null);
      prisma.group.create.mockResolvedValue({
        ...mockGroup,
        draft: true,
        drafted_by_id: 'employee-001',
      });

      const result = await service.create({ ...dto, draft: true }, 'employee-001');
      expect(result.draft).toBe(true);
      expect(prisma.group.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            draft: true,
            drafted_by_id: 'employee-001',
            drafted_at: expect.any(Date),
          }),
        }),
      );
    });
  });

  // ─── Update ───────────────────────────────────────────────────────────────

  describe('update', () => {
    const dto: UpdateGroupDto = { description: 'Updated desc' };

    it('should update group successfully', async () => {
      prisma.group.findUnique.mockResolvedValue(mockGroup);
      prisma.group.update.mockResolvedValue({
        ...mockGroup,
        description: 'Updated desc',
      });

      const result = await service.update('group-123', dto, 'employee-001');
      expect(result.description).toBe('Updated desc');
    });

    it('should throw NotFoundException if group does not exist', async () => {
      prisma.group.findUnique.mockResolvedValue(null);
      await expect(service.update('bad-id', dto, 'employee-001')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should check unique name constraint on name update', async () => {
      prisma.group.findUnique
        .mockResolvedValueOnce(mockGroup) // group find
        .mockResolvedValueOnce({ id: 'other-123', name: 'Dup Name' }); // duplicate check

      await expect(
        service.update('group-123', { name: 'Dup Name' }, 'employee-001'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should prevent setting self as parent', async () => {
      prisma.group.findUnique.mockResolvedValue(mockGroup);
      await expect(
        service.update('group-123', { parent_group_id: 'group-123' }, 'employee-001'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should prevent circular inheritance (parent is descendant of group)', async () => {
      prisma.group.findUnique
        .mockResolvedValueOnce(mockGroup) // group
        .mockResolvedValueOnce({
          id: 'desc-123',
          path: '/group-123/desc-123', // parent path starts with group path
        }); // parent check

      await expect(
        service.update('group-123', { parent_group_id: 'desc-123' }, 'employee-001'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should recalculate descendant paths on parent update', async () => {
      const parentGroup = {
        id: 'parent-123',
        path: '/parent-123',
      };
      const groupToUpdate = {
        id: 'group-123',
        path: '/group-123',
        parent_group_id: null,
      };
      const descendantGroup = {
        id: 'desc-123',
        path: '/group-123/desc-123',
      };

      prisma.group.findUnique
        .mockResolvedValueOnce(groupToUpdate) // group
        .mockResolvedValueOnce(parentGroup); // new parent check

      prisma.group.findMany.mockResolvedValue([descendantGroup]); // descendants fetch
      prisma.group.update.mockResolvedValue({
        ...groupToUpdate,
        parent_group_id: 'parent-123',
        path: '/parent-123/group-123',
      });

      await service.update('group-123', { parent_group_id: 'parent-123' }, 'employee-001');

      expect(prisma.group.update).toHaveBeenCalledWith({
        where: { id: 'desc-123' },
        data: { path: '/parent-123/group-123/desc-123' },
      });
    });

    it('should handle transition to draft status and update audit fields', async () => {
      prisma.group.findUnique.mockResolvedValue(mockGroup); // draft: false
      prisma.group.update.mockResolvedValue({
        ...mockGroup,
        draft: true,
        drafted_by_id: 'employee-001',
      });

      const result = await service.update('group-123', { draft: true }, 'employee-001');
      expect(result.draft).toBe(true);
      expect(prisma.group.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            draft: true,
            drafted_by_id: 'employee-001',
            drafted_at: expect.any(Date),
          }),
        }),
      );
    });

    it('should clear draft audit fields when transitioning draft to false', async () => {
      prisma.group.findUnique.mockResolvedValue({
        ...mockGroup,
        draft: true,
        drafted_by_id: 'employee-001',
        drafted_at: new Date(),
      });
      prisma.group.update.mockResolvedValue({
        ...mockGroup,
        draft: false,
        drafted_by_id: null,
        drafted_at: null,
      });

      const result = await service.update('group-123', { draft: false }, 'employee-001');
      expect(result.draft).toBe(false);
      expect(prisma.group.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            draft: false,
            drafted_by_id: null,
            drafted_at: null,
          }),
        }),
      );
    });
  });

  // ─── findOne ──────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('should return a group by id', async () => {
      prisma.group.findUnique.mockResolvedValue(mockGroup);
      const result = await service.findOne('group-123');
      expect(result).toEqual(mockGroup);
    });

    it('should throw NotFoundException if group not found', async () => {
      prisma.group.findUnique.mockResolvedValue(null);
      await expect(service.findOne('bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── getTree ──────────────────────────────────────────────────────────────

  describe('getTree', () => {
    it('should assemble groups hierarchy in memory successfully', async () => {
      const groupsList = [
        { id: '1', name: 'Root A', parent_group_id: null, path: '/1' },
        { id: '2', name: 'Child A1', parent_group_id: '1', path: '/1/2' },
        { id: '3', name: 'Grandchild A1-1', parent_group_id: '2', path: '/1/2/3' },
        { id: '4', name: 'Root B', parent_group_id: null, path: '/4' },
      ];
      prisma.group.findMany.mockResolvedValue(groupsList);

      const tree = await service.getTree();
      expect(tree).toHaveLength(2); // Root A and Root B
      expect(tree[0].id).toBe('1');
      expect(tree[0].children).toHaveLength(1);
      expect(tree[0].children[0].id).toBe('2');
      expect(tree[0].children[0].children).toHaveLength(1);
      expect(tree[0].children[0].children[0].id).toBe('3');
      expect(tree[1].id).toBe('4');
    });
  });

  // ─── Deletion Safety Checks ──────────────────────────────────────────────

  describe('remove', () => {
    it('should delete empty group successfully', async () => {
      prisma.group.findUnique.mockResolvedValue(mockGroup);
      prisma.group.count.mockResolvedValue(0); // 0 child subgroups
      prisma.employee.count.mockResolvedValue(0); // 0 employees
      prisma.partnershipOpportunity.count.mockResolvedValue(0); // 0 opportunities
      prisma.partnershipAgreement.count.mockResolvedValue(0); // 0 agreements
      prisma.group.delete.mockResolvedValue(mockGroup);

      const result = await service.remove('group-123');
      expect(result).toEqual(mockGroup);
    });

    it('should throw NotFoundException if deleting non-existent group', async () => {
      prisma.group.findUnique.mockResolvedValue(null);
      await expect(service.remove('bad-id')).rejects.toThrow(NotFoundException);
    });

    it('should block deletion if group has sub-groups (children)', async () => {
      prisma.group.findUnique.mockResolvedValue(mockGroup);
      prisma.group.count.mockResolvedValue(1); // has sub-group
      await expect(service.remove('group-123')).rejects.toThrow(BadRequestException);
    });

    it('should block deletion if group has assigned employees', async () => {
      prisma.group.findUnique.mockResolvedValue(mockGroup);
      prisma.group.count.mockResolvedValue(0);
      prisma.employee.count.mockResolvedValue(1); // has employee
      await expect(service.remove('group-123')).rejects.toThrow(BadRequestException);
    });

    it('should block deletion if group has linked opportunities', async () => {
      prisma.group.findUnique.mockResolvedValue(mockGroup);
      prisma.group.count.mockResolvedValue(0);
      prisma.employee.count.mockResolvedValue(0);
      prisma.partnershipOpportunity.count.mockResolvedValue(1); // has opportunity
      await expect(service.remove('group-123')).rejects.toThrow(BadRequestException);
    });

    it('should block deletion if group has linked agreements', async () => {
      prisma.group.findUnique.mockResolvedValue(mockGroup);
      prisma.group.count.mockResolvedValue(0);
      prisma.employee.count.mockResolvedValue(0);
      prisma.partnershipOpportunity.count.mockResolvedValue(0);
      prisma.partnershipAgreement.count.mockResolvedValue(1); // has agreement
      await expect(service.remove('group-123')).rejects.toThrow(BadRequestException);
    });
  });
});
