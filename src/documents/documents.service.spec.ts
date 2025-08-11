import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { DocumentsService } from './documents.service';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';

jest.mock('fs');

describe('DocumentsService', () => {
  let service: DocumentsService;
  let prisma: jest.Mocked<PrismaService>;

  const mockUser = {
    id: 'user123',
    role: UserRole.EDITOR,
  };

  const mockDocument = {
    id: 'doc123',
    filename: 'test.pdf',
    originalName: 'test-document.pdf',
    mimetype: 'application/pdf',
    size: 1024,
    filePath: '/uploads/test.pdf',
    title: 'Test Document',
    description: 'Test description',
    uploadedBy: 'user123',
    createdAt: new Date(),
    updatedAt: new Date(),
    user: {
      id: 'user123',
      name: 'Test User',
      email: 'test@example.com',
    },
  };

  const mockFile = {
    filename: 'test.pdf',
    originalname: 'test-document.pdf',
    mimetype: 'application/pdf',
    size: 1024,
    path: '/uploads/test.pdf',
  } as Express.Multer.File;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        {
          provide: PrismaService,
          useValue: {
            document: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
              count: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
    prisma = module.get(PrismaService);
  });

  describe('create', () => {
    it('should create a document', async () => {
      const createDto = { title: 'Test Document', description: 'Test description' };
      prisma.document.create.mockResolvedValue(mockDocument);

      const result = await service.create(mockFile, createDto, 'user123');

      expect(result).toEqual(mockDocument);
      expect(prisma.document.create).toHaveBeenCalledWith({
        data: {
          filename: mockFile.filename,
          originalName: mockFile.originalname,
          mimetype: mockFile.mimetype,
          size: mockFile.size,
          filePath: mockFile.path,
          title: createDto.title,
          description: createDto.description,
          uploadedBy: 'user123',
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
    });

    it('should throw BadRequestException if no file provided', async () => {
      const createDto = { title: 'Test Document' };

      await expect(service.create(null, createDto, 'user123'))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('should return document for admin/editor', async () => {
      prisma.document.findUnique.mockResolvedValue(mockDocument);

      const result = await service.findOne('doc123', mockUser);

      expect(result).toEqual(mockDocument);
    });

    it('should return document for owner viewer', async () => {
      const viewerUser = { id: 'user123', role: UserRole.VIEWER };
      prisma.document.findUnique.mockResolvedValue(mockDocument);

      const result = await service.findOne('doc123', viewerUser);

      expect(result).toEqual(mockDocument);
    });

    it('should throw ForbiddenException for non-owner viewer', async () => {
      const viewerUser = { id: 'other-user', role: UserRole.VIEWER };
      prisma.document.findUnique.mockResolvedValue(mockDocument);

      await expect(service.findOne('doc123', viewerUser))
        .rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if document not found', async () => {
      prisma.document.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent', mockUser))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete document and file', async () => {
      prisma.document.findUnique.mockResolvedValue(mockDocument);
      prisma.document.delete.mockResolvedValue(mockDocument);
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.unlinkSync as jest.Mock).mockImplementation(() => {});

      const result = await service.remove('doc123', mockUser);

      expect(result).toEqual({ message: 'Document deleted successfully' });
      expect(fs.unlinkSync).toHaveBeenCalledWith(mockDocument.filePath);
      expect(prisma.document.delete).toHaveBeenCalledWith({ where: { id: 'doc123' } });
    });
  });
});