import { ApiProperty } from '@nestjs/swagger';

export class MessageResponseDto {
  @ApiProperty({
    description: 'Message ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  id: string;

  @ApiProperty({
    description: 'Message content',
    example: 'The document discusses three main topics: AI, machine learning, and data processing.'
  })
  content: string;

  @ApiProperty({
    description: 'Message role - user or assistant',
    example: 'assistant'
  })
  role: string;

  @ApiProperty({
    description: 'Message metadata including sources and references'
  })
  metadata?: any;

  @ApiProperty({
    description: 'Message creation timestamp',
    example: '2024-01-15T10:30:00Z'
  })
  createdAt: Date;
}

export class ConversationResponseDto {
  @ApiProperty({
    description: 'Conversation ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  id: string;

  @ApiProperty({
    description: 'Conversation title',
    example: 'Document Analysis Discussion'
  })
  title?: string;

  @ApiProperty({
    description: 'User ID who owns this conversation',
    example: '123e4567-e89b-12d3-a456-426614174001'
  })
  userId: string;

  @ApiProperty({
    description: 'Conversation creation timestamp',
    example: '2024-01-15T10:30:00Z'
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Conversation last updated timestamp',
    example: '2024-01-15T10:30:00Z'
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'Messages in the conversation',
    type: [MessageResponseDto]
  })
  messages?: MessageResponseDto[];
}