import { Test, TestingModule } from '@nestjs/testing';
import { MockIngestionService } from './mock-ingestion.service';
import { PrismaService } from '../prisma/prisma.service';
import { IngestionStatus } from '../utils/StringConst';

describe('MockIngestionService', () => {
  let service: MockIngestionService;
  let prisma: jest.Mocked<PrismaService>;

  const mockJob = {
    id: 'job-id',
    status: IngestionStatus.PENDING,
    errorMessage: null,
    startedAt: new Date(),
    completedAt: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MockIngestionService,
        {
          provide: PrismaService,
          useValue: {
            ingestionJob: {
              update: jest.fn(),
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<MockIngestionService>(MockIngestionService);
    prisma = module.get(PrismaService);

    // Mock console methods to avoid log spam in tests
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  describe('processDocument', () => {
    it('should call processDocument method', () => {
      // Mock Math.random to return success (> 0.2)
      jest.spyOn(Math, 'random').mockReturnValue(0.5);

      expect(() => service.processDocument('job-id', 'doc-id')).not.toThrow();
    });
  });

  describe('processDocumentWithTimeout', () => {
    it('should call processDocumentWithTimeout method', () => {
      const onComplete = jest.fn().mockResolvedValue(undefined);
      
      // Mock Math.random to return success (> 0.15)
      jest.spyOn(Math, 'random').mockReturnValue(0.5);

      expect(() => service.processDocumentWithTimeout('job-id', 'doc-id', 10000, onComplete)).not.toThrow();
    });
  });

  describe('getJobStatus', () => {
    it('should return job status', async () => {
      (prisma.ingestionJob.findUnique as jest.Mock).mockResolvedValue(mockJob);

      const result = await service.getJobStatus('job-id');

      expect(result).toEqual(mockJob);
      expect(prisma.ingestionJob.findUnique).toHaveBeenCalledWith({
        where: { id: 'job-id' },
        select: {
          id: true,
          status: true,
          errorMessage: true,
          startedAt: true,
          completedAt: true,
        },
      });
    });
  });
});