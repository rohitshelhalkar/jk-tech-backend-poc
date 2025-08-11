import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class TriggerIngestionDto {
  @ApiProperty({ example: 'cuid123' })
  @IsString()
  @IsNotEmpty()
  documentId: string;
}