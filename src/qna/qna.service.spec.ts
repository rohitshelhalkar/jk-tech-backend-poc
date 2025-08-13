import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { QnaService } from './qna.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { ConversationsQueryDto } from './dto/conversations-query.dto';

describe('QnaService', () => {
  let service: QnaService;
  let prisma: jest.Mocked<PrismaService>;

  const mockConversation = {
    id: 'conversation-id',
    title: 'Test Conversation',
    userId: 'user-id',
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    messages: [],
  };

  const mockMessage = {
    id: 'message-id',
    conversationId: 'conversation-id',
    userId: 'user-id',
    content: 'Test message',
    role: 'user',
    metadata: null,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDocumentChunk = {
    id: 'chunk-id',
    documentId: 'doc-id',
    content: 'Test content for searching',
    chunkIndex: 0,
    embedding: null,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    document: {
      id: 'doc-id',
      title: 'Test Document',
      filename: 'test.pdf',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QnaService,
        {
          provide: PrismaService,
          useValue: {
            conversation: {
              create: jest.fn(),
              findMany: jest.fn(),
              findFirst: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
            message: {
              create: jest.fn(),
              updateMany: jest.fn(),
            },
            documentChunk: {
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<QnaService>(QnaService);
    prisma = module.get(PrismaService);
  });

  describe('createConversation', () => {
    it('should create a new conversation', async () => {
      const createDto: CreateConversationDto = {
        title: 'Test Conversation',
      };
      
      (prisma.conversation.create as jest.Mock).mockResolvedValue(mockConversation);

      const result = await service.createConversation('user-id', createDto);

      expect(result).toEqual(mockConversation);
      expect(prisma.conversation.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-id',
          title: createDto.title,
        },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' }
          }
        }
      });
    });
  });

  describe('getConversations', () => {
    it('should return paginated conversations', async () => {
      const query: ConversationsQueryDto = {
        limit: 10,
        offset: 0,
      };
      const mockConversations = [mockConversation];
      const mockTotal = 1;

      (prisma.conversation.findMany as jest.Mock).mockResolvedValue(mockConversations);
      (prisma.conversation.count as jest.Mock).mockResolvedValue(mockTotal);

      const result = await service.getConversations('user-id', query);

      expect(result).toEqual({
        conversations: mockConversations,
        total: mockTotal,
        limit: query.limit,
        offset: query.offset,
      });
    });

    it('should filter conversations by search term', async () => {
      const query: ConversationsQueryDto = {
        limit: 10,
        offset: 0,
        search: 'test',
      };

      (prisma.conversation.findMany as jest.Mock).mockResolvedValue([mockConversation]);
      (prisma.conversation.count as jest.Mock).mockResolvedValue(1);

      await service.getConversations('user-id', query);

      expect(prisma.conversation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            title: {
              contains: 'test',
              mode: 'insensitive'
            }
          })
        })
      );
    });
  });

  describe('getConversation', () => {
    it('should return conversation with messages', async () => {
      const conversationWithMessages = {
        ...mockConversation,
        messages: [mockMessage],
      };
      
      (prisma.conversation.findFirst as jest.Mock).mockResolvedValue(conversationWithMessages);

      const result = await service.getConversation('user-id', 'conversation-id');

      expect(result).toEqual(conversationWithMessages);
      expect(prisma.conversation.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'conversation-id',
          userId: 'user-id',
          isDeleted: false,
        },
        include: {
          messages: {
            where: { isDeleted: false },
            orderBy: { createdAt: 'asc' }
          }
        }
      });
    });

    it('should throw NotFoundException when conversation not found', async () => {
      (prisma.conversation.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.getConversation('user-id', 'nonexistent'))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('sendMessage', () => {
    it('should send message and return response', async () => {
      const sendDto: SendMessageDto = {
        conversationId: 'conversation-id',
        content: 'Test message',
      };

      const assistantMessage = {
        ...mockMessage,
        id: 'assistant-message-id',
        content: 'AI response',
        role: 'assistant',
        metadata: expect.any(Object),
      };

      (prisma.conversation.findFirst as jest.Mock).mockResolvedValue(mockConversation);
      (prisma.message.create as jest.Mock)
        .mockResolvedValueOnce(mockMessage)
        .mockResolvedValueOnce(assistantMessage);
      (prisma.conversation.update as jest.Mock).mockResolvedValue(mockConversation);
      (prisma.documentChunk.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.sendMessage('user-id', sendDto);

      expect(result.userMessage).toEqual(mockMessage);
      expect(result.assistantMessage).toEqual(assistantMessage);
      expect(prisma.message.create).toHaveBeenCalledTimes(2);
    });

    it('should throw NotFoundException when conversation not found', async () => {
      const sendDto: SendMessageDto = {
        conversationId: 'nonexistent',
        content: 'Test message',
      };

      (prisma.conversation.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.sendMessage('user-id', sendDto))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteConversation', () => {
    it('should soft delete conversation and messages', async () => {
      (prisma.conversation.findFirst as jest.Mock).mockResolvedValue(mockConversation);
      (prisma.conversation.update as jest.Mock).mockResolvedValue(undefined);
      (prisma.message.updateMany as jest.Mock).mockResolvedValue(undefined);

      const result = await service.deleteConversation('user-id', 'conversation-id');

      expect(result).toEqual({ message: 'Conversation deleted successfully' });
      expect(prisma.conversation.update).toHaveBeenCalledWith({
        where: { id: 'conversation-id' },
        data: {
          isDeleted: true,
          updatedAt: expect.any(Date),
        },
      });
      expect(prisma.message.updateMany).toHaveBeenCalledWith({
        where: {
          conversationId: 'conversation-id',
          isDeleted: false,
        },
        data: {
          isDeleted: true,
          updatedAt: expect.any(Date),
        },
      });
    });

    it('should throw NotFoundException when conversation not found', async () => {
      (prisma.conversation.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.deleteConversation('user-id', 'nonexistent'))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('updateConversationTitle', () => {
    it('should update conversation title', async () => {
      const updatedConversation = { ...mockConversation, title: 'Updated Title' };
      
      (prisma.conversation.findFirst as jest.Mock).mockResolvedValue(mockConversation);
      (prisma.conversation.update as jest.Mock).mockResolvedValue(updatedConversation);

      const result = await service.updateConversationTitle('user-id', 'conversation-id', 'Updated Title');

      expect(result).toEqual(updatedConversation);
      expect(prisma.conversation.update).toHaveBeenCalledWith({
        where: { id: 'conversation-id' },
        data: { title: 'Updated Title' },
      });
    });

    it('should throw NotFoundException when conversation not found', async () => {
      (prisma.conversation.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.updateConversationTitle('user-id', 'nonexistent', 'New Title'))
        .rejects.toThrow(NotFoundException);
    });
  });
});