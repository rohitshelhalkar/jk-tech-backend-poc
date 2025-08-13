import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { UserRole } from '../utils/StringConst';

describe('DocumentsController', () => {
  let controller: DocumentsController;
  let documentsService: jest.Mocked<DocumentsService>;

  const mockUser = {
    id: 'user-id',
    role: UserRole.EDITOR,
  };

  const mockDocument = {
    id: 'doc-id',
    filename: 'test.pdf',
    originalName: 'test-document.pdf',
    mimetype: 'application/pdf',
    size: 1024,
    filePath: '/uploads/test.pdf',
    title: 'Test Document',
    description: 'Test description',
    status: 'UPLOADED',
    uploadedBy: 'user-id',
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: {
      id: 'user-id',
      name: 'Test User',
      email: 'test@example.com',
    },
  };

  const mockFile = {
    filename: 'test.pdf',
    originalname: 'test-document.pdf',
    mimetype: 'application/pdf',
    size: 1024,
    path: '/uploads/test.pdf',
  } as Express.Multer.File;

  const mockDocumentsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    getFileInfo: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentsController],
      providers: [
        {
          provide: DocumentsService,
          useValue: mockDocumentsService,
        },
      ],
    }).compile();

    controller = module.get<DocumentsController>(DocumentsController);
    documentsService = module.get(DocumentsService);
  });

  describe('create', () => {
    it('should upload document', async () => {
      const createDto: CreateDocumentDto = {
        title: 'Test Document',
        description: 'Test description',
      };
      const mockRequest = { user: mockUser };
      
      documentsService.create.mockResolvedValue(mockDocument);

      const result = await controller.create(mockFile, createDto, mockRequest);

      expect(result).toEqual(mockDocument);
      expect(documentsService.create).toHaveBeenCalledWith(mockFile, createDto, mockUser.id);
    });
  });

  describe('findAll', () => {
    it('should return paginated documents', async () => {
      const query: PaginationQueryDto = {
        page: 1,
        limit: 10,
      };
      const mockRequest = { user: mockUser };
      const mockResult = {
        documents: [mockDocument],
        pagination: {
          total: 1,
          page: 1,
          limit: 10,
          pages: 1,
        },
      };

      documentsService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll(query, mockRequest);

      expect(result).toEqual(mockResult);
      expect(documentsService.findAll).toHaveBeenCalledWith(query, mockUser);
    });
  });

  describe('findOne', () => {
    it('should return document by id', async () => {
      const mockRequest = { user: mockUser };
      documentsService.findOne.mockResolvedValue(mockDocument);

      const result = await controller.findOne('doc-id', mockRequest);

      expect(result).toEqual(mockDocument);
      expect(documentsService.findOne).toHaveBeenCalledWith('doc-id', mockUser);
    });
  });

  describe('download', () => {
    it('should download document file', async () => {
      const mockRequest = { user: mockUser };
      const mockResponse = {
        setHeader: jest.fn(),
        sendFile: jest.fn(),
      } as unknown as Response;

      const fileInfo = {
        filePath: '/uploads/test.pdf',
        filename: 'test-document.pdf',
        mimetype: 'application/pdf',
      };

      documentsService.getFileInfo.mockResolvedValue(fileInfo);

      await controller.download('doc-id', mockRequest, mockResponse);

      expect(documentsService.getFileInfo).toHaveBeenCalledWith('doc-id', mockUser);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="test-document.pdf"');
      expect(mockResponse.sendFile).toHaveBeenCalledWith('/uploads/test.pdf', { root: '.' });
    });
  });

  describe('update', () => {
    it('should update document', async () => {
      const updateDto: UpdateDocumentDto = {
        title: 'Updated Title',
        description: 'Updated description',
      };
      const mockRequest = { user: mockUser };
      const updatedDocument = { ...mockDocument, ...updateDto };

      documentsService.update.mockResolvedValue(updatedDocument);

      const result = await controller.update('doc-id', updateDto, mockRequest);

      expect(result).toEqual(updatedDocument);
      expect(documentsService.update).toHaveBeenCalledWith('doc-id', updateDto, mockUser);
    });
  });

  describe('remove', () => {
    it('should delete document', async () => {
      const mockRequest = { user: mockUser };
      const deleteResult = { message: 'Document deleted successfully' };

      documentsService.remove.mockResolvedValue(deleteResult);

      const result = await controller.remove('doc-id', mockRequest);

      expect(result).toEqual(deleteResult);
      expect(documentsService.remove).toHaveBeenCalledWith('doc-id', mockUser);
    });
  });
});