import { ApiProperty } from '@nestjs/swagger';
import {IngestionStatus} from '../../utils/StringConst';

export class IngestionJobResponseDto {
  @ApiProperty({ example: 'cuid123' })
  id: string;

  @ApiProperty({ example: 'cuid456' })
  documentId: string;

  @ApiProperty({ example: 'cuid789' })
  userId: string;

  @ApiProperty({ example: IngestionStatus.PENDING })
  status: string;

  @ApiProperty({ example: null, nullable: true })
  errorMessage?: string;

  @ApiProperty({ example: '2023-01-01T00:00:00.000Z', nullable: true })
  startedAt?: Date;

  @ApiProperty({ example: null, nullable: true })
  completedAt?: Date;

  @ApiProperty({ example: '2023-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2023-01-01T00:00:00.000Z' })
  updatedAt: Date;

  @ApiProperty({
    example: {
      id: 'doc123',
      filename: 'document.pdf',
      originalName: 'My Document.pdf',
      title: 'My Document'
    }
  })
  document: {
    id: string;
    filename: string;
    originalName: string;
    title: string;
  };

  @ApiProperty({
    example: {
      id: 'user123',
      name: 'John Doe',
      email: 'john@example.com'
    }
  })
  user: {
    id: string;
    name: string;
    email: string;
  };
}