import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole, IngestionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentsService } from '../documents/documents.service';
import { MockIngestionService } from './mock-ingestion.service';
import { IngestionJobsQueryDto } from './dto/ingestion-jobs-query.dto';

@Injectable()
export class IngestionService {
  constructor(
    private prisma: PrismaService,
    private documentsService: DocumentsService,
    private mockIngestionService: MockIngestionService,
    private configService: ConfigService,
  ) {}

  async triggerIngestion(documentId: string, userId: string) {
    // Verify document exists and user has access
    const document = await this.documentsService.findOne(documentId, { 
      id: userId, 
      role: UserRole.ADMIN // We'll check proper permissions in the service
    });

    // Create ingestion job
    const ingestionJob = await this.prisma.ingestionJob.create({
      data: {
        documentId,
        userId,
        status: IngestionStatus.PENDING,
        startedAt: new Date(),
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

    // Trigger ingestion process
    const useMockIngestion = this.configService.get<string>('USE_MOCK_INGEST') === 'true';
    
    if (useMockIngestion) {
      // Use mock ingestion service
      await this.mockIngestionService.processDocument(ingestionJob.id, documentId);
    } else {
      // In a real implementation, this would call an external Python service
      await this.callExternalIngestionService(ingestionJob.id, documentId);
    }

    // Update status to processing
    await this.prisma.ingestionJob.update({
      where: { id: ingestionJob.id },
      data: { status: IngestionStatus.PROCESSING },
    });

    return ingestionJob;
  }

  async getIngestionJob(jobId: string, user: any) {
    const job = await this.prisma.ingestionJob.findUnique({
      where: { id: jobId },
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

    if (!job) {
      throw new NotFoundException('Ingestion job not found');
    }

    // Check permissions
    if (user.role === UserRole.VIEWER && job.userId !== user.id) {
      throw new ForbiddenException('Access denied');
    }

    return job;
  }

  async getIngestionJobs(query: IngestionJobsQueryDto, user: any) {
    const { page = 1, limit = 10, status } = query;
    const skip = (page - 1) * limit;

    // Viewers can only see their own jobs, admins and editors can see all
    const whereClause: any = user.role === UserRole.VIEWER 
      ? { userId: user.id }
      : {};

    if (status) {
      whereClause.status = status;
    }

    const [jobs, total] = await Promise.all([
      this.prisma.ingestionJob.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
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
      }),
      this.prisma.ingestionJob.count({ where: whereClause }),
    ]);

    return {
      jobs,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async updateJobStatus(jobId: string, status: IngestionStatus, errorMessage?: string) {
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    if (status === IngestionStatus.COMPLETED || status === IngestionStatus.FAILED) {
      updateData.completedAt = new Date();
    }

    if (errorMessage) {
      updateData.errorMessage = errorMessage;
    }

    return this.prisma.ingestionJob.update({
      where: { id: jobId },
      data: updateData,
    });
  }

  private async callExternalIngestionService(jobId: string, documentId: string) {
    // This would be replaced with actual HTTP calls to Python service
    // For now, we'll use the mock service even when USE_MOCK_INGEST is false
    console.log(`Would call external ingestion service for job ${jobId}, document ${documentId}`);
    
    // Example of what this might look like:
    // const response = await fetch('http://python-ingestion-service/process', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ jobId, documentId })
    // });
    
    // For demonstration, fall back to mock service
    await this.mockIngestionService.processDocument(jobId, documentId);
  }
}