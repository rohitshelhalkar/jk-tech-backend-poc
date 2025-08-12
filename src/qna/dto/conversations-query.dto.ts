import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ConversationsQueryDto {
  @ApiPropertyOptional({
    description: 'Number of conversations to return',
    minimum: 1,
    default: 20,
    example: 20
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Number of conversations to skip',
    minimum: 0,
    default: 0,
    example: 0
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(0)
  offset?: number = 0;

  @ApiPropertyOptional({
    description: 'Search term to filter conversations by title',
    example: 'document analysis'
  })
  @IsOptional()
  @IsString()
  search?: string;
}