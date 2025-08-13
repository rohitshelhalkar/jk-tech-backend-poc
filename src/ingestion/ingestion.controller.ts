import { Controller, Get, Post, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { IngestionService } from './ingestion.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TriggerIngestionDto } from './dto/trigger-ingestion.dto';
import { IngestionJobResponseDto } from './dto/ingestion-job-response.dto';
import { IngestionJobsQueryDto } from './dto/ingestion-jobs-query.dto';
import {UserRole} from '../utils/StringConst';

@ApiTags('Ingestion')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ingest')
export class IngestionController {
  constructor(private readonly ingestionService: IngestionService) {}

  @Post('trigger')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Trigger document ingestion (Admin/Editor only)' })
  @ApiResponse({ status: 201, description: 'Ingestion job created successfully', type: IngestionJobResponseDto })
  @ApiResponse({ status: 404, description: 'Document not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async triggerIngestion(@Body() triggerIngestionDto: TriggerIngestionDto, @Request() req) {
    return this.ingestionService.triggerIngestion(triggerIngestionDto.documentId, req.user.id);
  }

  @Get(':jobId')
  @ApiOperation({ summary: 'Get ingestion job status' })
  @ApiResponse({ status: 200, description: 'Ingestion job retrieved successfully', type: IngestionJobResponseDto })
  @ApiResponse({ status: 404, description: 'Ingestion job not found' })
  async getIngestionJob(@Param('jobId') jobId: string, @Request() req) {
    return this.ingestionService.getIngestionJob(jobId, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'Get ingestion jobs with filters' })
  @ApiResponse({ status: 200, description: 'Ingestion jobs retrieved successfully' })
  async getIngestionJobs(@Query() query: IngestionJobsQueryDto, @Request() req) {
    return this.ingestionService.getIngestionJobs(query, req.user);
  }
}