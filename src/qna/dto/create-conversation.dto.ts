import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateConversationDto {
  @ApiPropertyOptional({
    description: 'Title of the conversation',
    example: 'Document Analysis Discussion'
  })
  @IsOptional()
  @IsString()
  title?: string;
}