import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateDocumentDto {
  @ApiPropertyOptional({ example: 'My Document' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 'Document description' })
  @IsOptional()
  @IsString()
  description?: string;
}