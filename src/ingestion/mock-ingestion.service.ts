import { Injectable } from '@nestjs/common';
import { IngestionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MockIngestionService {
  constructor(private prisma: PrismaService) {}

  async processDocument(jobId: string, documentId: string) {
    console.log(`Mock ingestion started for job ${jobId}, document ${documentId}`);
    
    // Simulate processing time
    setTimeout(async () => {
      try {
        // Simulate random success/failure (80% success rate)
        const isSuccess = Math.random() > 0.2;
        
        if (isSuccess) {
          await this.prisma.ingestionJob.update({
            where: { id: jobId },
            data: {
              status: IngestionStatus.COMPLETED,
              completedAt: new Date(),
            },
          });
          console.log(`Mock ingestion completed successfully for job ${jobId}`);
        } else {
          await this.prisma.ingestionJob.update({
            where: { id: jobId },
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
          where: { id: jobId },
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
      where: { id: jobId },
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