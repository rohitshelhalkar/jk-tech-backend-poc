import { Module, forwardRef } from '@nestjs/common';
import { IngestionController } from './ingestion.controller';
import { IngestionService } from './ingestion.service';
import { MockIngestionService } from './mock-ingestion.service';
import { PrismaModule } from '../prisma/prisma.module';
import { DocumentsModule } from '../documents/documents.module';

@Module({
  imports: [PrismaModule, forwardRef(() => DocumentsModule)],
  controllers: [IngestionController],
  providers: [IngestionService, MockIngestionService],
  exports: [IngestionService],
})
export class IngestionModule {}