import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { IngestionService } from './ingestion.service';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentsService } from '../documents/documents.service';
import { MockIngestionService } from './mock-ingestion.service';
import {IngestionStatus} from 'src/utils/StringConst';

describe('IngestionService', () => {
  let service: IngestionService;
  let prisma: jest.Mocked<PrismaService>;
  let documentsService: jest.Mocked<DocumentsService>;
  let mockIngestionService: jest.Mocked<MockIngestionService>;
  let configService: jest.Mocked<ConfigService>;

  const mockJob = {
    id: 'job123',
    documentId: 'doc123',
    userId: 'user123',
    status: IngestionStatus.PENDING,
    errorMessage: null,
    startedAt: new Date(),
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    document: {
      id: 'doc123',
      filename: 'test.pdf',
      originalName: 'test-document.pdf',
      title: 'Test Document',
    },
    user: {
      id: 'user123',
      name: 'Test User',
      email: 'test@example.com',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IngestionService,
        {
          provide: PrismaService,
          useValue: {
            ingestionJob: {
              create: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
          },
        },
        {
          provide: DocumentsService,
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: MockIngestionService,
          useValue: {
            processDocument: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<IngestionService>(IngestionService);
    prisma = module.get(PrismaService);
    documentsService = module.get(DocumentsService);
    mockIngestionService = module.get(MockIngestionService);
    configService = module.get(ConfigService);
  });

  describe('triggerIngestion', () => {
    const mockDocument = {
      id: 'a084882f-f0b3-46e4-95da-9ef394676a11',
      filename: 'test.pdf',
      originalName: 'test-document.pdf',
      mimetype: 'application/pdf',
      size: 1024,
      filePath: '/uploads/test.pdf',
      title: 'Test Document',
      description: 'Test description',
      status: 'UPLOADED',
      uploadedBy: 'user123',
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      user: {
        id: 'user123',
        name: 'Test User',
        email: 'test@example.com',
      },
    };

    it('should create ingestion job and trigger mock processing', async () => {
      documentsService.findOne.mockResolvedValue(mockDocument);
      (prisma.ingestionJob.create as jest.Mock).mockResolvedValue(mockJob);
      (prisma.ingestionJob.update as jest.Mock).mockResolvedValue({ ...mockJob, status: IngestionStatus.PENDING });
      configService.get.mockReturnValue('true');

      const result = await service.triggerIngestion('doc123', 'user123');

      expect(result).toEqual(mockJob);
      expect(mockIngestionService.processDocument).toHaveBeenCalledWith('job123', 'doc123');
      expect(prisma.ingestionJob.update).toHaveBeenCalledWith({
        where: { id: 'job123' },
        data: { status: IngestionStatus.PENDING },
      });
    });

    it('should create ingestion job', async () => {
      documentsService.findOne.mockResolvedValue(mockDocument);
      (prisma.ingestionJob.create as jest.Mock).mockResolvedValue(mockJob);
      (prisma.ingestionJob.update as jest.Mock).mockResolvedValue({ ...mockJob, status: IngestionStatus.PENDING });
      configService.get.mockReturnValue('true');

      await service.triggerIngestion('doc123', 'user123');

      expect(prisma.ingestionJob.create).toHaveBeenCalledWith({
        data: {
          documentId: 'doc123',
          userId: 'user123',
          status: IngestionStatus.PENDING,
          startedAt: expect.any(Date),
        },
        include: {
          document: {
            select: {
              id: true,
              filename: true,
              originalName: true,
              title: true,
            },
          },
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
  });

  describe('updateJobStatus', () => {
    it('should update job status to completed', async () => {
      const updatedJob = { ...mockJob, status: IngestionStatus.COMPLETED, completedAt: new Date() };
      (prisma.ingestionJob.update as jest.Mock).mockResolvedValue(mockJob);

      const result = await service.updateJobStatus('job123', IngestionStatus.COMPLETED);

      expect(result).toEqual(updatedJob);
      expect(prisma.ingestionJob.update).toHaveBeenCalledWith({
        where: { id: 'job123' },
        data: {
          status: IngestionStatus.COMPLETED,
          updatedAt: expect.any(Date),
          completedAt: expect.any(Date),
        },
      });
    });

    it('should update job status to failed with error message', async () => {
      const errorMessage = 'Processing failed';
      const updatedJob = { ...mockJob, status: IngestionStatus.FAILED, errorMessage };
      (prisma.ingestionJob.update as jest.Mock).mockResolvedValue(updatedJob);

      const result = await service.updateJobStatus('job123', IngestionStatus.FAILED, errorMessage);

      expect(result).toEqual(updatedJob);
      expect(prisma.ingestionJob.update).toHaveBeenCalledWith({
        where: { id: 'job123' },
        data: {
          status: IngestionStatus.FAILED,
          updatedAt: expect.any(Date),
          completedAt: expect.any(Date),
          errorMessage,
        },
      });
    });
  });
});