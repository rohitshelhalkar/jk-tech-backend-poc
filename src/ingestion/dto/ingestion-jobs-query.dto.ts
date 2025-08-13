import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsPositive, Min, IsEnum } from 'class-validator';
import {IngestionStatus} from '../../utils/StringConst';

export class IngestionJobsQueryDto {
  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({ example: IngestionStatus.COMPLETED })
  @IsOptional()
  status?: string;
}