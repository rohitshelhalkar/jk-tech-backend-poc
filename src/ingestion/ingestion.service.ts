import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentsService } from '../documents/documents.service';
import { MockIngestionService } from './mock-ingestion.service';
import { IngestionJobsQueryDto } from './dto/ingestion-jobs-query.dto';
import {UserRole, IngestionStatus, DocumentStatus} from '../utils/StringConst';

@Injectable()
export class IngestionService implements OnModuleInit {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => DocumentsService))
    private documentsService: DocumentsService,
    private mockIngestionService: MockIngestionService,
    private configService: ConfigService,
  ) {}

  onModuleInit() {
    // Set this service in documents service to resolve circular dependency
    this.documentsService.setIngestionService(this);
  }

  // Method for automatic ingestion triggered when document is uploaded
  async triggerAutomaticIngestion(documentId: string, userId: string) {
    console.log(`Starting automatic ingestion for document ${documentId}`);
    
    // Update document status to PROCESSING
    await this.documentsService.updateDocumentStatus(documentId, DocumentStatus.PROCESSING);

    // Create ingestion job
    const ingestionJob = await this.prisma.ingestionJob.create({
      data: {
        documentId,
        userId,
        status: IngestionStatus.PENDING,
        startedAt: new Date(),
      },
    });

    // Get ingestion timeout from config (default 1 minute = 60000ms)
    const ingestionTimeoutMs = this.configService.get<number>('INGESTION_TIMEOUT_MS') || 60000;

    // Trigger ingestion process
    const useMockIngestion = this.configService.get<string>('USE_MOCK_INGEST') !== 'false';
    
    if (useMockIngestion) {
      // Use mock ingestion service with configurable timeout
      await this.mockIngestionService.processDocumentWithTimeout(
        ingestionJob.id, 
        documentId, 
        ingestionTimeoutMs,
        async (status: string, errorMessage?: string) => {
          await this.handleIngestionComplete(documentId, ingestionJob.id, status, errorMessage);
        }
      );
    } else {
      // In a real implementation, this would call an external Python service
      await this.callExternalIngestionService(ingestionJob.id, documentId, ingestionTimeoutMs);
    }

    return ingestionJob;
  }

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
      const defaultTimeoutMs = this.configService.get<number>('INGESTION_TIMEOUT_MS') || 60000;
      await this.callExternalIngestionService(ingestionJob.id, documentId, defaultTimeoutMs);
    }

    // Update status to processing
    await this.prisma.ingestionJob.update({
      where: { id: ingestionJob.id },
      data: { status: IngestionStatus.PENDING, updatedAt: new Date() },
    });

    return ingestionJob;
  }

  async getIngestionJob(jobId: string, user: any) {
    const job = await this.prisma.ingestionJob.findFirst({
      where: { 
        id: jobId,
        isDeleted: false
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
      ? { userId: user.id, isDeleted: false }
      : { isDeleted: false };

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

  async updateJobStatus(jobId: string, status: string, errorMessage?: string) {
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


  // Handle ingestion completion and update document status
  private async handleIngestionComplete(documentId: string, jobId: string, status: string, errorMessage?: string) {
    try {
      // Update ingestion job status
      await this.updateJobStatus(jobId, status, errorMessage);

      // Update document status based on ingestion result
      if (status === IngestionStatus.COMPLETED) {
        await this.documentsService.updateDocumentStatus(documentId, DocumentStatus.PROCESSED);
        
        // Create document chunks for Q&A functionality
        await this.createDocumentChunks(documentId);
        
        console.log(`Document ${documentId} successfully processed`);
      } else if (status === IngestionStatus.FAILED) {
        await this.documentsService.updateDocumentStatus(documentId, DocumentStatus.FAILED);
        console.log(`Document ${documentId} processing failed: ${errorMessage}`);
      }
    } catch (error) {
      console.error(`Error handling ingestion completion for document ${documentId}:`, error);
      // Ensure document status is updated to failed if there's an error
      await this.documentsService.updateDocumentStatus(documentId, DocumentStatus.FAILED);
    }
  }

  // Update external ingestion service call to handle timeout
  private async callExternalIngestionService(jobId: string, documentId: string, timeoutMs: number) {
    // This would be replaced with actual HTTP calls to Python service
    console.log(`Would call external ingestion service for job ${jobId}, document ${documentId} with ${timeoutMs}ms timeout`);
    
    // Example of what this might look like:
    // const response = await fetch('http://python-ingestion-service/process', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ jobId, documentId, timeoutMs }),
    //   signal: AbortSignal.timeout(timeoutMs)
    // });
    
    // For demonstration, fall back to mock service with timeout
    await this.mockIngestionService.processDocumentWithTimeout(
      jobId, 
      documentId, 
      timeoutMs,
      async (status: string, errorMessage?: string) => {
        await this.handleIngestionComplete(documentId, jobId, status, errorMessage);
      }
    );
  }

  // Create document chunks for Q&A functionality
  private async createDocumentChunks(documentId: string) {
    try {
      console.log(`Creating document chunks for document ${documentId}`);

      // Get document information
      const document = await this.prisma.document.findUnique({
        where: { id: documentId }
      });

      if (!document) {
        console.error(`Document ${documentId} not found for chunking`);
        return;
      }

      // Mock document content extraction and chunking
      // In a real implementation, this would:
      // 1. Read the actual file from storage
      // 2. Extract text using appropriate libraries (PDF.js, docx, etc.)
      // 3. Split text into meaningful chunks
      // 4. Generate embeddings for each chunk using OpenAI, Sentence Transformers, etc.

      const mockContent = this.generateMockDocumentContent(document);
      const chunks = this.splitTextIntoChunks(mockContent, 500); // 500 characters per chunk

      // Save chunks to database
      const chunkPromises = chunks.map((chunk, index) => 
        this.prisma.documentChunk.create({
          data: {
            documentId,
            content: chunk,
            chunkIndex: index,
            embedding: null, // Would contain vector embedding in real implementation
            metadata: {
              documentTitle: document.title,
              documentFilename: document.filename,
              chunkLength: chunk.length,
              createdBy: 'ingestion-service'
            }
          }
        })
      );

      await Promise.all(chunkPromises);
      console.log(`Successfully created ${chunks.length} chunks for document ${documentId}`);

    } catch (error) {
      console.error(`Error creating chunks for document ${documentId}:`, error);
    }
  }

  // Generate mock document content for demonstration
  private generateMockDocumentContent(document: any): string {
    const templates = [
      `This document titled "${document.title || document.originalName}" contains comprehensive information about various topics. The document discusses key concepts, methodologies, and findings that are relevant to the subject matter. It provides detailed analysis and insights that can be useful for understanding the core principles.`,
      
      `Introduction: This ${document.mimetype.includes('pdf') ? 'PDF' : 'document'} provides an overview of important topics and concepts. The content is organized into several sections that cover different aspects of the subject matter.`,
      
      `Main Content: The document explores various themes and presents detailed information about the topic. It includes analysis, examples, and explanations that help readers understand the key points being discussed.`,
      
      `Analysis Section: This part of the document contains analytical content that examines different perspectives and approaches to the subject matter. The analysis is supported by examples and case studies.`,
      
      `Conclusion: The document concludes with a summary of the main findings and recommendations. It provides actionable insights and suggestions for further exploration of the topic.`,
      
      `Technical Details: This section contains technical information and specifications related to the subject matter. It includes detailed explanations of processes, methodologies, and best practices.`
    ];

    return templates.join('\n\n');
  }

  // Split text into chunks of specified size
  private splitTextIntoChunks(text: string, maxChunkSize: number): string[] {
    const chunks: string[] = [];
    const sentences = text.split('. ');
    let currentChunk = '';

    for (const sentence of sentences) {
      const potentialChunk = currentChunk ? `${currentChunk}. ${sentence}` : sentence;
      
      if (potentialChunk.length <= maxChunkSize) {
        currentChunk = potentialChunk;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk);
          currentChunk = sentence;
        } else {
          // Handle case where single sentence is longer than maxChunkSize
          chunks.push(sentence.substring(0, maxChunkSize));
          currentChunk = sentence.substring(maxChunkSize);
        }
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks.filter(chunk => chunk.trim().length > 0);
  }
}