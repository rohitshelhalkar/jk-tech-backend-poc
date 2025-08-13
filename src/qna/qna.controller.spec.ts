import { Test, TestingModule } from '@nestjs/testing';
import { QnaController } from './qna.controller';
import { QnaService } from './qna.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { ConversationsQueryDto } from './dto/conversations-query.dto';

describe('QnaController', () => {
  let controller: QnaController;
  let qnaService: jest.Mocked<QnaService>;

  const mockUser = {
    id: 'user-id',
    email: 'test@example.com',
  };

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

  const mockQnaService = {
    createConversation: jest.fn(),
    getConversations: jest.fn(),
    getConversation: jest.fn(),
    sendMessage: jest.fn(),
    updateConversationTitle: jest.fn(),
    deleteConversation: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QnaController],
      providers: [
        {
          provide: QnaService,
          useValue: mockQnaService,
        },
      ],
    }).compile();

    controller = module.get<QnaController>(QnaController);
    qnaService = module.get(QnaService);
  });

  describe('createConversation', () => {
    it('should create a new conversation', async () => {
      const createDto: CreateConversationDto = {
        title: 'Test Conversation',
      };
      const mockRequest = { user: mockUser };

      qnaService.createConversation.mockResolvedValue(mockConversation);

      const result = await controller.createConversation(mockRequest, createDto);

      expect(result).toEqual(mockConversation);
      expect(qnaService.createConversation).toHaveBeenCalledWith('user-id', createDto);
    });
  });

  describe('getConversations', () => {
    it('should return paginated conversations', async () => {
      const query: ConversationsQueryDto = {
        limit: 10,
        offset: 0,
      };
      const mockRequest = { user: mockUser };
      const mockResult = {
        conversations: [mockConversation],
        total: 1,
        limit: 10,
        offset: 0,
      };

      qnaService.getConversations.mockResolvedValue(mockResult);

      const result = await controller.getConversations(mockRequest, query);

      expect(result).toEqual(mockResult);
      expect(qnaService.getConversations).toHaveBeenCalledWith('user-id', query);
    });
  });

  describe('getConversation', () => {
    it('should return conversation by id', async () => {
      const mockRequest = { user: mockUser };
      const conversationWithMessages = {
        ...mockConversation,
        messages: [mockMessage],
      };

      qnaService.getConversation.mockResolvedValue(conversationWithMessages);

      const result = await controller.getConversation(mockRequest, 'conversation-id');

      expect(result).toEqual(conversationWithMessages);
      expect(qnaService.getConversation).toHaveBeenCalledWith('user-id', 'conversation-id');
    });
  });

  describe('sendMessage', () => {
    it('should send message and return response', async () => {
      const sendDto: SendMessageDto = {
        conversationId: 'conversation-id',
        content: 'Test message',
      };
      const mockRequest = { user: mockUser };
      const mockResponse = {
        userMessage: mockMessage,
        assistantMessage: {
          ...mockMessage,
          id: 'ai-message-id',
          content: 'AI response',
          role: 'assistant',
        },
      };

      qnaService.sendMessage.mockResolvedValue(mockResponse);

      const result = await controller.sendMessage(mockRequest, sendDto);

      expect(result).toEqual(mockResponse);
      expect(qnaService.sendMessage).toHaveBeenCalledWith('user-id', sendDto);
    });
  });

  describe('updateConversationTitle', () => {
    it('should update conversation title', async () => {
      const mockRequest = { user: mockUser };
      const newTitle = 'Updated Title';
      const updatedConversation = { ...mockConversation, title: newTitle };

      qnaService.updateConversationTitle.mockResolvedValue(updatedConversation);

      const result = await controller.updateConversationTitle(mockRequest, 'conversation-id', newTitle);

      expect(result).toEqual(updatedConversation);
      expect(qnaService.updateConversationTitle).toHaveBeenCalledWith('user-id', 'conversation-id', newTitle);
    });
  });

  describe('deleteConversation', () => {
    it('should delete conversation', async () => {
      const mockRequest = { user: mockUser };
      const deleteResult = { message: 'Conversation deleted successfully' };

      qnaService.deleteConversation.mockResolvedValue(deleteResult);

      const result = await controller.deleteConversation(mockRequest, 'conversation-id');

      expect(result).toEqual(deleteResult);
      expect(qnaService.deleteConversation).toHaveBeenCalledWith('user-id', 'conversation-id');
    });
  });
});