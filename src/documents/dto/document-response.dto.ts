import { ApiProperty } from '@nestjs/swagger';

export class DocumentResponseDto {
  @ApiProperty({ example: 'cuid123' })
  id: string;

  @ApiProperty({ example: 'document.pdf' })
  filename: string;

  @ApiProperty({ example: 'My Document.pdf' })
  originalName: string;

  @ApiProperty({ example: 'application/pdf' })
  mimetype: string;

  @ApiProperty({ example: 1024000 })
  size: number;

  @ApiProperty({ example: 'My Document' })
  title: string;

  @ApiProperty({ example: 'Document description' })
  description: string;

  @ApiProperty({ example: '2023-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2023-01-01T00:00:00.000Z' })
  updatedAt: Date;

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