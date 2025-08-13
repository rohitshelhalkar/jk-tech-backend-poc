import { Test, TestingModule } from '@nestjs/testing';
import { IngestionController } from './ingestion.controller';
import { IngestionService } from './ingestion.service';
import { TriggerIngestionDto } from './dto/trigger-ingestion.dto';
import { IngestionJobsQueryDto } from './dto/ingestion-jobs-query.dto';
import { IngestionStatus, UserRole } from '../utils/StringConst';

describe('IngestionController', () => {
  let controller: IngestionController;
  let ingestionService: jest.Mocked<IngestionService>;

  const mockUser = {
    id: 'user-id',
    role: UserRole.EDITOR,
  };

  const mockIngestionJob = {
    id: 'job-id',
    documentId: 'doc-id',
    userId: 'user-id',
    status: IngestionStatus.PENDING,
    errorMessage: null,
    startedAt: new Date(),
    completedAt: null,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    document: {
      id: 'doc-id',
      filename: 'test.pdf',
      originalName: 'test-document.pdf',
      title: 'Test Document',
    },
    user: {
      id: 'user-id',
      name: 'Test User',
      email: 'test@example.com',
    },
  };

  const mockIngestionService = {
    triggerIngestion: jest.fn(),
    getIngestionJob: jest.fn(),
    getIngestionJobs: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IngestionController],
      providers: [
        {
          provide: IngestionService,
          useValue: mockIngestionService,
        },
      ],
    }).compile();

    controller = module.get<IngestionController>(IngestionController);
    ingestionService = module.get(IngestionService);
  });

  describe('triggerIngestion', () => {
    it('should trigger document ingestion', async () => {
      const triggerDto: TriggerIngestionDto = {
        documentId: 'doc-id',
      };
      const mockRequest = { user: mockUser };

      ingestionService.triggerIngestion.mockResolvedValue(mockIngestionJob);

      const result = await controller.triggerIngestion(triggerDto, mockRequest);

      expect(result).toEqual(mockIngestionJob);
      expect(ingestionService.triggerIngestion).toHaveBeenCalledWith('doc-id', 'user-id');
    });
  });

  describe('getIngestionJob', () => {
    it('should return ingestion job by id', async () => {
      const mockRequest = { user: mockUser };
      ingestionService.getIngestionJob.mockResolvedValue(mockIngestionJob);

      const result = await controller.getIngestionJob('job-id', mockRequest);

      expect(result).toEqual(mockIngestionJob);
      expect(ingestionService.getIngestionJob).toHaveBeenCalledWith('job-id', mockUser);
    });
  });

  describe('getIngestionJobs', () => {
    it('should return paginated ingestion jobs', async () => {
      const query: IngestionJobsQueryDto = {
        page: 1,
        limit: 10,
        status: IngestionStatus.PENDING,
      };
      const mockRequest = { user: mockUser };
      const mockResult = {
        jobs: [mockIngestionJob],
        pagination: {
          total: 1,
          page: 1,
          limit: 10,
          pages: 1,
        },
      };

      ingestionService.getIngestionJobs.mockResolvedValue(mockResult);

      const result = await controller.getIngestionJobs(query, mockRequest);

      expect(result).toEqual(mockResult);
      expect(ingestionService.getIngestionJobs).toHaveBeenCalledWith(query, mockUser);
    });
  });
});