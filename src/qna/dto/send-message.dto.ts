import { IsString, IsUUID, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({
    description: 'The message content from the user',
    example: 'What are the main topics discussed in the uploaded document?'
  })
  @IsString()
  content: string;

  @ApiProperty({
    description: 'ID of the conversation',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  conversationId: string;

  @ApiPropertyOptional({
    description: 'Optional array of document IDs to search within',
    example: ['123e4567-e89b-12d3-a456-426614174001']
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  documentIds?: string[];
}