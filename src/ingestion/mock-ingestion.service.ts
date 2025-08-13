import {Injectable} from '@nestjs/common';
import {PrismaService} from '../prisma/prisma.service';
import {IngestionStatus} from '../utils/StringConst';

@Injectable()
export class MockIngestionService {
  constructor(private prisma: PrismaService) { }

  // New method with configurable timeout and callback
  async processDocumentWithTimeout(
    jobId: string,
    documentId: string,
    timeoutMs: number,
    onComplete: (status: string, errorMessage?: string) => Promise<void>
  ) {
    console.log(`Mock ingestion started for job ${jobId}, document ${documentId} with ${timeoutMs}ms timeout`);

    // Simulate processing time (random between 10-50% of timeout)
    const processingTime = Math.random() * (timeoutMs * 0.4) + (timeoutMs * 0.1);
    const isSuccess = Math.random() > 0.15;
    if (isSuccess) {
      console.log(`Mock ingestion will complete in ${processingTime}ms`);
      setTimeout(async () => {
        try {
          await onComplete(IngestionStatus.COMPLETED);
        } catch (error) {
          console.error(`Error in mock ingestion for job ${jobId}:`, error);
          await onComplete(IngestionStatus.FAILED, `System error: ${error.message}`);
        }
      }, processingTime);
    } else {
      console.log(`Mock ingestion will fail in ${processingTime}ms`);
      // Set up timeout handler
      setTimeout(async () => {
        console.log(`Mock ingestion timed out for job ${jobId} after ${timeoutMs}ms`);
        await onComplete(IngestionStatus.FAILED, `Ingestion timed out after ${timeoutMs}ms`);
      }, timeoutMs);
    }



  }

  // Legacy method for backward compatibility
  async processDocument(jobId: string, documentId: string) {
    console.log(`Mock ingestion started for job ${jobId}, document ${documentId}`);

    // Simulate processing time
    setTimeout(async () => {
      try {
        // Simulate random success/failure (80% success rate)
        const isSuccess = Math.random() > 0.2;

        if (isSuccess) {
          await this.prisma.ingestionJob.update({
            where: {id: jobId},
            data: {
              status: IngestionStatus.COMPLETED,
              completedAt: new Date(),
            },
          });
          console.log(`Mock ingestion completed successfully for job ${jobId}`);
        } else {
          await this.prisma.ingestionJob.update({
            where: {id: jobId},
            data: {
              status: IngestionStatus.FAILED,
              completedAt: new Date(),
              errorMessage: 'Mock ingestion failed randomly for demonstration',
            },
          });
          console.log(`Mock ingestion failed for job ${jobId}`);
        }
      } catch (error) {
        console.error(`Error updating job ${jobId}:`, error);
        await this.prisma.ingestionJob.update({
          where: {id: jobId},
          data: {
            status: IngestionStatus.FAILED,
            completedAt: new Date(),
            errorMessage: `System error: ${error.message}`,
          },
        }).catch(console.error);
      }
    }, 5000 + Math.random() * 10000); // 5-15 seconds delay
  }

  async getJobStatus(jobId: string) {
    return this.prisma.ingestionJob.findUnique({
      where: {id: jobId},
      select: {
        id: true,
        status: true,
        errorMessage: true,
        startedAt: true,
        completedAt: true,
      },
    });
  }
}