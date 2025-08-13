import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { IngestionService } from './ingestion.service';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentsService } from '../documents/documents.service';
import { MockIngestionService } from './mock-ingestion.service';
import {IngestionStatus} from '../utils/StringConst';

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
    isDeleted: false,
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
              findFirst: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
            document: {
              findUnique: jest.fn(),
            },
            documentChunk: {
              create: jest.fn(),
              createMany: jest.fn(),
            },
          },
        },
        {
          provide: DocumentsService,
          useValue: {
            findOne: jest.fn(),
            updateDocumentStatus: jest.fn(),
            setIngestionService: jest.fn(),
          },
        },
        {
          provide: MockIngestionService,
          useValue: {
            processDocument: jest.fn(),
            processDocumentWithTimeout: jest.fn(),
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

    // Reset all mocks
    jest.clearAllMocks();
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
        data: { 
          status: IngestionStatus.PENDING,
          updatedAt: expect.any(Date)
        },
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

      expect(result).toEqual(mockJob);
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

  describe('triggerAutomaticIngestion', () => {
    const mockDocument = {
      id: 'doc123',
      filename: 'test.pdf',
      originalName: 'test-document.pdf',
      title: 'Test Document',
    };

    beforeEach(() => {
      jest.spyOn(console, 'log').mockImplementation();
    });

    it('should trigger automatic ingestion with mock service', async () => {
      documentsService.updateDocumentStatus.mockResolvedValue(undefined);
      (prisma.ingestionJob.create as jest.Mock).mockResolvedValue(mockJob);
      configService.get.mockImplementation((key) => {
        if (key === 'USE_MOCK_INGEST') return 'true';
        if (key === 'INGESTION_TIMEOUT_MS') return 60000;
        return undefined;
      });

      const result = await service.triggerAutomaticIngestion('doc123', 'user123');

      expect(result).toEqual(mockJob);
      expect(documentsService.updateDocumentStatus).toHaveBeenCalledWith('doc123', 'PROCESSING');
      expect(mockIngestionService.processDocumentWithTimeout).toHaveBeenCalled();
    });

    it('should use external ingestion service when mock is disabled', async () => {
      documentsService.updateDocumentStatus.mockResolvedValue(undefined);
      (prisma.ingestionJob.create as jest.Mock).mockResolvedValue(mockJob);
      configService.get.mockImplementation((key) => {
        if (key === 'USE_MOCK_INGEST') return 'false';
        if (key === 'INGESTION_TIMEOUT_MS') return 60000;
        return undefined;
      });

      // Mock the private method by spying on the service
      const callExternalSpy = jest.spyOn(service as any, 'callExternalIngestionService').mockResolvedValue(undefined);

      const result = await service.triggerAutomaticIngestion('doc123', 'user123');

      expect(result).toEqual(mockJob);
      expect(callExternalSpy).toHaveBeenCalledWith('job123', 'doc123', 60000);
    });
  });

  describe('getIngestionJob', () => {
    const mockUser = { id: 'user123', role: 'EDITOR' };
    const mockViewer = { id: 'viewer123', role: 'VIEWER' };

    it('should return ingestion job for admin/editor', async () => {
      (prisma.ingestionJob.findFirst as jest.Mock).mockResolvedValue(mockJob);

      const result = await service.getIngestionJob('job123', mockUser);

      expect(result).toEqual(mockJob);
      expect(prisma.ingestionJob.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'job123',
          isDeleted: false,
        },
        include: expect.any(Object),
      });
    });

    it('should return ingestion job for job owner viewer', async () => {
      const jobWithOwner = { ...mockJob, userId: 'viewer123' };
      (prisma.ingestionJob.findFirst as jest.Mock).mockResolvedValue(jobWithOwner);

      const result = await service.getIngestionJob('job123', mockViewer);

      expect(result).toEqual(jobWithOwner);
    });

    it('should throw ForbiddenException for non-owner viewer', async () => {
      (prisma.ingestionJob.findFirst as jest.Mock).mockResolvedValue(mockJob);

      await expect(service.getIngestionJob('job123', mockViewer))
        .rejects.toThrow('Access denied');
    });

    it('should throw NotFoundException when job not found', async () => {
      (prisma.ingestionJob.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.getIngestionJob('nonexistent', mockUser))
        .rejects.toThrow('Ingestion job not found');
    });
  });

  describe('getIngestionJobs', () => {
    const mockQuery = { page: 1, limit: 10, status: IngestionStatus.COMPLETED };
    const mockAdmin = { id: 'admin123', role: 'ADMIN' };
    const mockViewer = { id: 'viewer123', role: 'VIEWER' };

    it('should return paginated jobs for admin', async () => {
      const mockJobs = [mockJob];
      const mockTotal = 1;
      (prisma.ingestionJob.findMany as jest.Mock).mockResolvedValue(mockJobs);
      (prisma.ingestionJob.count as jest.Mock).mockResolvedValue(mockTotal);

      const result = await service.getIngestionJobs(mockQuery, mockAdmin);

      expect(result.jobs).toEqual(mockJobs);
      expect(result.pagination.total).toBe(mockTotal);
      expect(prisma.ingestionJob.findMany).toHaveBeenCalledWith({
        where: { isDeleted: false, status: IngestionStatus.COMPLETED },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });
    });

    it('should filter jobs for viewer to only their own', async () => {
      const mockJobs = [mockJob];
      const mockTotal = 1;
      (prisma.ingestionJob.findMany as jest.Mock).mockResolvedValue(mockJobs);
      (prisma.ingestionJob.count as jest.Mock).mockResolvedValue(mockTotal);

      const result = await service.getIngestionJobs(mockQuery, mockViewer);

      expect(result.jobs).toEqual(mockJobs);
      expect(prisma.ingestionJob.findMany).toHaveBeenCalledWith({
        where: { userId: 'viewer123', isDeleted: false, status: IngestionStatus.COMPLETED },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });
    });

    it('should handle pagination correctly', async () => {
      const query = { page: 2, limit: 5 };
      (prisma.ingestionJob.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.ingestionJob.count as jest.Mock).mockResolvedValue(0);

      await service.getIngestionJobs(query, mockAdmin);

      expect(prisma.ingestionJob.findMany).toHaveBeenCalledWith({
        where: { isDeleted: false },
        skip: 5,
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });
    });
  });

  describe('onModuleInit', () => {
    it('should set ingestion service in documents service', () => {
      service.onModuleInit();

      expect(documentsService.setIngestionService).toHaveBeenCalledWith(service);
    });
  });

  describe('handleIngestionComplete', () => {
    const documentId = 'doc123';
    const jobId = 'job123';

    beforeEach(() => {
      jest.spyOn(console, 'log').mockImplementation();
      jest.spyOn(console, 'error').mockImplementation();
      jest.spyOn(service, 'updateJobStatus').mockResolvedValue(mockJob);
      jest.spyOn(service as any, 'createDocumentChunks').mockResolvedValue(undefined);
    });

    it('should handle successful ingestion completion', async () => {
      documentsService.updateDocumentStatus.mockResolvedValue(undefined);

      await (service as any).handleIngestionComplete(documentId, jobId, 'COMPLETED');

      expect(service.updateJobStatus).toHaveBeenCalledWith(jobId, 'COMPLETED', undefined);
      expect(documentsService.updateDocumentStatus).toHaveBeenCalledWith(documentId, 'PROCESSED');
      expect((service as any).createDocumentChunks).toHaveBeenCalledWith(documentId);
    });

    it('should handle failed ingestion completion', async () => {
      const errorMessage = 'Processing failed';
      documentsService.updateDocumentStatus.mockResolvedValue(undefined);

      await (service as any).handleIngestionComplete(documentId, jobId, 'FAILED', errorMessage);

      expect(service.updateJobStatus).toHaveBeenCalledWith(jobId, 'FAILED', errorMessage);
      expect(documentsService.updateDocumentStatus).toHaveBeenCalledWith(documentId, 'FAILED');
    });

    it('should handle errors and set document to failed status', async () => {
      const error = new Error('Database error');
      jest.spyOn(service, 'updateJobStatus').mockRejectedValue(error);
      documentsService.updateDocumentStatus.mockResolvedValue(undefined);

      await (service as any).handleIngestionComplete(documentId, jobId, 'COMPLETED');

      expect(documentsService.updateDocumentStatus).toHaveBeenCalledWith(documentId, 'FAILED');
    });
  });

  describe('callExternalIngestionService', () => {
    beforeEach(() => {
      jest.spyOn(console, 'log').mockImplementation();
      jest.spyOn(service as any, 'handleIngestionComplete').mockResolvedValue(undefined);
    });

    it('should call external ingestion service and fall back to mock', async () => {
      mockIngestionService.processDocumentWithTimeout.mockResolvedValue(undefined);

      await (service as any).callExternalIngestionService('job123', 'doc123', 60000);

      expect(mockIngestionService.processDocumentWithTimeout).toHaveBeenCalledWith(
        'job123',
        'doc123',
        60000,
        expect.any(Function)
      );
    });
  });

  describe('createDocumentChunks', () => {
    const mockDocument = {
      id: 'doc123',
      title: 'Test Document',
      filename: 'test.pdf',
      mimetype: 'application/pdf'
    };

    beforeEach(() => {
      jest.spyOn(console, 'log').mockImplementation();
      jest.spyOn(console, 'error').mockImplementation();
      jest.spyOn(service as any, 'generateMockDocumentContent').mockReturnValue('Mock content for testing. This is a longer text that will be split into chunks.');
      jest.spyOn(service as any, 'splitTextIntoChunks').mockReturnValue(['Chunk 1', 'Chunk 2']);
    });

    it('should create document chunks successfully', async () => {
      (prisma.document.findUnique as jest.Mock).mockResolvedValue(mockDocument);
      (prisma.documentChunk.create as jest.Mock).mockResolvedValue({ id: 'chunk1' });

      await (service as any).createDocumentChunks('doc123');

      expect(prisma.document.findUnique).toHaveBeenCalledWith({
        where: { id: 'doc123' }
      });
      expect(prisma.documentChunk.create).toHaveBeenCalledTimes(2);
    });

    it('should handle document not found', async () => {
      (prisma.document.findUnique as jest.Mock).mockResolvedValue(null);

      await (service as any).createDocumentChunks('doc123');

      expect(console.error).toHaveBeenCalledWith('Document doc123 not found for chunking');
    });

    it('should handle errors during chunk creation', async () => {
      const error = new Error('Database error');
      (prisma.document.findUnique as jest.Mock).mockRejectedValue(error);

      await (service as any).createDocumentChunks('doc123');

      expect(console.error).toHaveBeenCalledWith('Error creating chunks for document doc123:', error);
    });
  });

  describe('generateMockDocumentContent', () => {
    it('should generate mock content for PDF document', () => {
      const document = {
        title: 'Test PDF',
        originalName: 'test.pdf',
        mimetype: 'application/pdf'
      };

      const content = (service as any).generateMockDocumentContent(document);

      expect(content).toContain('Test PDF');
      expect(content).toContain('PDF');
      expect(content).toContain('Introduction:');
    });

    it('should generate mock content for document without title', () => {
      const document = {
        originalName: 'test-doc.docx',
        mimetype: 'application/docx'
      };

      const content = (service as any).generateMockDocumentContent(document);

      expect(content).toContain('test-doc.docx');
    });
  });

  describe('splitTextIntoChunks', () => {
    it('should split text into chunks of specified size', () => {
      const text = 'First sentence. Second sentence. Third sentence. Fourth sentence.';
      const chunks = (service as any).splitTextIntoChunks(text, 30);

      expect(chunks.length).toBeGreaterThan(1);
      chunks.forEach(chunk => {
        expect(chunk.length).toBeLessThanOrEqual(50); // Allow some flexibility
      });
    });

    it('should handle single sentence longer than max chunk size', () => {
      const longSentence = 'This is a very long sentence that exceeds the maximum chunk size limit and should be handled properly';
      const chunks = (service as any).splitTextIntoChunks(longSentence, 20);

      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks[0]).toBe(longSentence.substring(0, 20));
    });

    it('should filter out empty chunks', () => {
      const text = 'First sentence.   . . Third sentence.';
      const chunks = (service as any).splitTextIntoChunks(text, 100);

      expect(chunks.every(chunk => chunk.trim().length > 0)).toBe(true);
    });

    it('should handle empty text', () => {
      const chunks = (service as any).splitTextIntoChunks('', 100);
      expect(chunks).toEqual([]);
    });
  });
});