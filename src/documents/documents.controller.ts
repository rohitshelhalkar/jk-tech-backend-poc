import { 
  Controller, 
  Get, 
  Post, 
  Patch, 
  Delete, 
  Param, 
  Body, 
  Query,
  UseGuards, 
  UseInterceptors, 
  UploadedFile, 
  Request,
  Res,
  NotFoundException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Response } from 'express';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { DocumentResponseDto } from './dto/document-response.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import {UserRole} from '../utils/StringConst';

@ApiTags('Documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a document' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        title: {
          type: 'string',
          example: 'My Document',
        },
        description: {
          type: 'string',
          example: 'Document description',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Document uploaded successfully', type: DocumentResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body() createDocumentDto: CreateDocumentDto,
    @Request() req,
  ) {
    return this.documentsService.create(file, createDocumentDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all documents with pagination' })
  @ApiResponse({ status: 200, description: 'Documents retrieved successfully' })
  async findAll(@Query() query: PaginationQueryDto, @Request() req) {
    return this.documentsService.findAll(query, req.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get document by ID' })
  @ApiResponse({ status: 200, description: 'Document retrieved successfully', type: DocumentResponseDto })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async findOne(@Param('id') id: string, @Request() req) {
    return this.documentsService.findOne(id, req.user);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download document file' })
  @ApiResponse({ status: 200, description: 'File downloaded successfully' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async download(@Param('id') id: string, @Request() req, @Res() res: Response) {
    const { filePath, filename, mimetype } = await this.documentsService.getFileInfo(id, req.user);
    
    res.setHeader('Content-Type', mimetype);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    return res.sendFile(filePath, { root: '.' });
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Update document metadata (Admin/Editor only)' })
  @ApiResponse({ status: 200, description: 'Document updated successfully', type: DocumentResponseDto })
  @ApiResponse({ status: 404, description: 'Document not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async update(@Param('id') id: string, @Body() updateDocumentDto: UpdateDocumentDto, @Request() req) {
    return this.documentsService.update(id, updateDocumentDto, req.user);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Delete document (Admin/Editor only)' })
  @ApiResponse({ status: 200, description: 'Document deleted successfully' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async remove(@Param('id') id: string, @Request() req) {
    return this.documentsService.remove(id, req.user);
  }
}