import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

  async create(file: Express.Multer.File, createDocumentDto: CreateDocumentDto, userId: string) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const document = await this.prisma.document.create({
      data: {
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        filePath: file.path,
        title: createDocumentDto.title || file.originalname,
        description: createDocumentDto.description,
        uploadedBy: userId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return document;
  }

  async findAll(query: PaginationQueryDto, user: any) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    // Viewers can only see their own documents, admins and editors can see all
    const whereClause = user.role === UserRole.VIEWER 
      ? { uploadedBy: user.id }
      : {};

    const [documents, total] = await Promise.all([
      this.prisma.document.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.document.count({ where: whereClause }),
    ]);

    return {
      documents,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, user: any) {
    const document = await this.prisma.document.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Check permissions
    if (user.role === UserRole.VIEWER && document.uploadedBy !== user.id) {
      throw new ForbiddenException('Access denied');
    }

    return document;
  }

  async getFileInfo(id: string, user: any) {
    const document = await this.findOne(id, user);
    
    const filePath = path.resolve(document.filePath);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('File not found on disk');
    }

    return {
      filePath,
      filename: document.originalName,
      mimetype: document.mimetype,
    };
  }

  async update(id: string, updateDocumentDto: UpdateDocumentDto, user: any) {
    const document = await this.findOne(id, user);

    const updatedDocument = await this.prisma.document.update({
      where: { id },
      data: updateDocumentDto,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return updatedDocument;
  }

  async remove(id: string, user: any) {
    const document = await this.findOne(id, user);

    // Delete file from disk
    if (fs.existsSync(document.filePath)) {
      fs.unlinkSync(document.filePath);
    }

    await this.prisma.document.delete({
      where: { id },
    });

    return { message: 'Document deleted successfully' };
  }
}