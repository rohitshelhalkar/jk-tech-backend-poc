import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { ConversationsQueryDto } from './dto/conversations-query.dto';

@Injectable()
export class QnaService {
  constructor(private prisma: PrismaService) {}

  async createConversation(userId: string, createConversationDto: CreateConversationDto) {
    const conversation = await this.prisma.conversation.create({
      data: {
        userId,
        title: createConversationDto.title,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    return conversation;
  }

  async getConversations(userId: string, query: ConversationsQueryDto) {
    const where: any = {
      userId,
      isDeleted: false
    };

    if (query.search) {
      where.title = {
        contains: query.search,
        mode: 'insensitive'
      };
    }

    const [conversations, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where,
        include: {
          messages: {
            where: { isDeleted: false }, // Only include non-deleted messages
            orderBy: { createdAt: 'desc' },
            take: 1 // Only get the latest message for preview
          }
        },
        orderBy: { updatedAt: 'desc' },
        take: query.limit,
        skip: query.offset
      }),
      this.prisma.conversation.count({ where })
    ]);

    return {
      conversations,
      total,
      limit: query.limit,
      offset: query.offset
    };
  }

  async getConversation(userId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId,
        isDeleted: false
      },
      include: {
        messages: {
          where: { isDeleted: false },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  async sendMessage(userId: string, sendMessageDto: SendMessageDto) {
    const { content, conversationId, documentIds } = sendMessageDto;

    // Verify conversation belongs to user
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId,
        isDeleted: false
      }
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Save user message
    const userMessage = await this.prisma.message.create({
      data: {
        conversationId,
        userId,
        content,
        role: 'user'
      }
    });

    // Generate AI response
    const aiResponse = await this.generateResponse(content, documentIds, userId);

    // Save AI response
    const assistantMessage = await this.prisma.message.create({
      data: {
        conversationId,
        userId,
        content: aiResponse.content,
        role: 'assistant',
        metadata: aiResponse.metadata
      }
    });

    // Update conversation timestamp
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() }
    });

    return {
      userMessage,
      assistantMessage
    };
  }

  async deleteConversation(userId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId,
        isDeleted: false
      }
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Soft delete conversation and its messages
    await Promise.all([
      this.prisma.conversation.update({
        where: { id: conversationId },
        data: { 
          isDeleted: true,
          updatedAt: new Date()
        }
      }),
      this.prisma.message.updateMany({
        where: { 
          conversationId,
          isDeleted: false // Only update non-deleted messages
        },
        data: { 
          isDeleted: true,
          updatedAt: new Date()
        }
      })
    ]);

    return { message: 'Conversation deleted successfully' };
  }

  private async generateResponse(userMessage: string, documentIds?: string[], userId?: string) {
    try {
      // For now, implement a mock response
      // In a real implementation, this would:
      // 1. Search for relevant document chunks using vector similarity
      // 2. Create context from relevant chunks
      // 3. Send to LLM (OpenAI, Anthropic, etc.) with RAG context
      // 4. Return the response with source references

      let context = '';
      const sources: any[] = [];

      if (documentIds && documentIds.length > 0) {
        // Search for relevant content in specified documents
        const relevantChunks = await this.searchRelevantChunks(userMessage, documentIds, userId);
        context = relevantChunks.map(chunk => chunk.content).join('\n\n');
        sources.push(...relevantChunks.map(chunk => ({
          documentId: chunk.documentId,
          chunkId: chunk.id,
          content: chunk.content.substring(0, 200) + '...'
        })));
      } else {
        // Search across all user's processed documents
        const relevantChunks = await this.searchAllUserDocuments(userMessage, userId);
        context = relevantChunks.map(chunk => chunk.content).join('\n\n');
        sources.push(...relevantChunks.map(chunk => ({
          documentId: chunk.documentId,
          chunkId: chunk.id,
          content: chunk.content.substring(0, 200) + '...'
        })));
      }

      // Mock AI response for now
      const response = await this.mockLLMResponse(userMessage, context);

      return {
        content: response,
        metadata: {
          sources,
          tokensUsed: Math.floor(Math.random() * 1000) + 500, // Mock token count
          model: 'mock-model-v1',
          processingTime: Math.floor(Math.random() * 2000) + 500 // Mock processing time
        }
      };
    } catch (error) {
      console.error('Error generating response:', error);
      return {
        content: 'I apologize, but I encountered an error while processing your request. Please try again.',
        metadata: {
          error: true,
          sources: []
        }
      };
    }
  }

  private async searchRelevantChunks(query: string, documentIds: string[], userId: string) {
    // For now, return a simple text-based search
    // In a real implementation, this would use vector similarity search
    const chunks = await this.prisma.documentChunk.findMany({
      where: {
        documentId: { in: documentIds },
        isDeleted: false,
        document: {
          uploadedBy: userId,
          isDeleted: false
        }
      },
      include: {
        document: {
          select: {
            id: true,
            title: true,
            filename: true
          }
        }
      },
      take: 5 // Limit to top 5 relevant chunks
    });

    // Simple keyword matching for now
    return chunks.filter(chunk => 
      chunk.content.toLowerCase().includes(query.toLowerCase().split(' ')[0])
    );
  }

  private async searchAllUserDocuments(query: string, userId: string) {
    // Search across all user's processed documents
    const chunks = await this.prisma.documentChunk.findMany({
      where: {
        isDeleted: false,
        document: {
          uploadedBy: userId,
          isDeleted: false,
          status: 'PROCESSED' // Only search in processed documents
        }
      },
      include: {
        document: {
          select: {
            id: true,
            title: true,
            filename: true
          }
        }
      },
      take: 10
    });

    // Simple keyword matching for now
    return chunks.filter(chunk => 
      chunk.content.toLowerCase().includes(query.toLowerCase().split(' ')[0])
    );
  }

  private async mockLLMResponse(userMessage: string, context: string): Promise<string> {
    // Mock response based on context
    if (context.length === 0) {
      return "I don't have any relevant documents to answer your question. Please make sure you have uploaded and processed documents first.";
    }

    const responses = [
      `Based on the documents you've provided, ${userMessage.toLowerCase()} relates to the following key points from your content...`,
      `According to your uploaded documents, I can provide the following insights about your question...`,
      `From the analysis of your documents, here's what I found regarding your inquiry...`,
      `Based on the processed content in your documents, I can answer your question as follows...`
    ];

    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    
    // Add some context-based content
    const contextSample = context.substring(0, 300);
    return `${randomResponse}\n\n${contextSample}...\n\nThis information is based on your uploaded documents. Would you like me to elaborate on any specific aspect?`;
  }

  // Method to update conversation title
  async updateConversationTitle(userId: string, conversationId: string, title: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId,
        isDeleted: false
      }
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return this.prisma.conversation.update({
      where: { id: conversationId },
      data: { title }
    });
  }
}