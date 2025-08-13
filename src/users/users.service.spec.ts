import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole } from '../utils/StringConst';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: jest.Mocked<PrismaService>;

  const mockUser = {
    id: 'user-id',
    email: 'test@example.com',
    name: 'Test User',
    password: 'hashedPassword',
    role: UserRole.VIEWER,
    active: true,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUserResponse = {
    id: mockUser.id,
    email: mockUser.email,
    name: mockUser.name,
    role: mockUser.role,
    active: mockUser.active,
    createdAt: mockUser.createdAt,
    updatedAt: mockUser.updatedAt,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              create: jest.fn(),
              findMany: jest.fn(),
              findFirst: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get(PrismaService);
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const userData = {
        name: 'New User',
        email: 'new@example.com',
        password: 'hashedPassword',
        role: UserRole.VIEWER,
      };

      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.create(userData);

      expect(result).toEqual(mockUser);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: userData,
      });
    });
  });

  describe('findAll', () => {
    it('should return array of users', async () => {
      const mockUsers = [mockUserResponse];
      (prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);

      const result = await service.findAll();

      expect(result).toEqual(mockUsers);
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: {
          isDeleted: false,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          active: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });
  });

  describe('findById', () => {
    it('should return user by id', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUserResponse);

      const result = await service.findById('user-id');

      expect(result).toEqual(mockUserResponse);
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'user-id',
          isDeleted: false,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          active: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.findById('nonexistent'))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('findByEmail', () => {
    it('should return user by email', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          email: 'test@example.com',
          isDeleted: false,
        },
      });
    });
  });

  describe('update', () => {
    const updateDto: UpdateUserDto = {
      name: 'Updated Name',
      active: false,
    };

    it('should update user', async () => {
      const updatedUser = { ...mockUserResponse, ...updateDto };
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue(updatedUser);

      const result = await service.update('user-id', updateDto);

      expect(result).toEqual(updatedUser);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-id' },
        data: {
          ...updateDto,
          updatedAt: expect.any(Date),
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          active: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.update('nonexistent', updateDto))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft delete user', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue(undefined);

      const result = await service.remove('user-id');

      expect(result).toEqual({ message: 'User deleted successfully' });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-id' },
        data: {
          isDeleted: true,
          updatedAt: expect.any(Date),
        },
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.remove('nonexistent'))
        .rejects.toThrow(NotFoundException);
    });
  });
});