import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { PrismaService } from '../prisma/prisma.service';
import { IngestionService } from '../ingestion/ingestion.service';
import * as fs from 'fs';
import {UserRole} from '../utils/StringConst';

jest.mock('fs');

describe('DocumentsService', () => {
  let service: DocumentsService;
  let prisma: jest.Mocked<PrismaService>;

  const mockUser = {
    id: '9baa37ea-65f3-4bb5-a15d-515b1ba4e9c7',
    role: UserRole.EDITOR,
  };

  const mockDocument = {
    id: 'f3895b13-1b74-45ce-8573-85095702b267',
    filename: 'test.pdf',
    originalName: 'test-document.pdf',
    mimetype: 'application/pdf',
    size: 1024,
    filePath: '/uploads/test.pdf',
    title: 'Test Document',
    description: 'Test description',
    uploadedBy: '9baa37ea-65f3-4bb5-a15d-515b1ba4e9c7',
    createdAt: new Date(),
    updatedAt: new Date(),
    user: {
      id: '9baa37ea-65f3-4bb5-a15d-515b1ba4e9c7',
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
              findFirst: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
              count: jest.fn(),
            },
          },
        },
        {
          provide: IngestionService,
          useValue: {
            triggerIngestion: jest.fn(),
            triggerAutomaticIngestion: jest.fn(),
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
      (prisma.document.create as jest.Mock).mockResolvedValue(mockDocument);

      const result = await service.create(mockFile, createDto, '9baa37ea-65f3-4bb5-a15d-515b1ba4e9c7');

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
          uploadedBy: '9baa37ea-65f3-4bb5-a15d-515b1ba4e9c7',
          status: 'UPLOADED',
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

      await expect(service.create(null, createDto, '9baa37ea-65f3-4bb5-a15d-515b1ba4e9c7'))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('should return document for admin/editor', async () => {
      (prisma.document.findFirst as jest.Mock).mockResolvedValue(mockDocument);

      const result = await service.findOne('f3895b13-1b74-45ce-8573-85095702b267', mockUser);

      expect(result).toEqual(mockDocument);
    });

    it('should return document for owner viewer', async () => {
      const viewerUser = { id: '9baa37ea-65f3-4bb5-a15d-515b1ba4e9c7', role: UserRole.VIEWER };
      (prisma.document.findFirst as jest.Mock).mockResolvedValue(mockDocument);

      const result = await service.findOne('f3895b13-1b74-45ce-8573-85095702b267', viewerUser);

      expect(result).toEqual(mockDocument);
    });

    it('should throw ForbiddenException for non-owner viewer', async () => {
      const viewerUser = { id: 'other-user', role: UserRole.VIEWER };
      (prisma.document.findFirst as jest.Mock).mockResolvedValue(mockDocument);

      await expect(service.findOne('f3895b13-1b74-45ce-8573-85095702b267', viewerUser))
        .rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if document not found', async () => {
      (prisma.document.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('nonexistent', mockUser))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft delete document', async () => {
      (prisma.document.findFirst as jest.Mock).mockResolvedValue(mockDocument);
      (prisma.document.update as jest.Mock).mockResolvedValue(mockDocument);

      const result = await service.remove('f3895b13-1b74-45ce-8573-85095702b267', mockUser);

      expect(result).toEqual({ message: 'Document deleted successfully' });
      expect(prisma.document.update).toHaveBeenCalledWith({ 
        where: { id: 'f3895b13-1b74-45ce-8573-85095702b267' },
        data: { 
          isDeleted: true,
          updatedAt: expect.any(Date)
        }
      });
    });
  });
});