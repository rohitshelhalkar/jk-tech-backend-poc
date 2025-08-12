import {
  Controller,
  Get,
  Post,
  Delete,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ValidationPipe
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { QnaService } from './qna.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { ConversationsQueryDto } from './dto/conversations-query.dto';
import { ConversationResponseDto } from './dto/conversation-response.dto';

@ApiTags('Q&A')
@Controller('qna')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class QnaController {
  constructor(private readonly qnaService: QnaService) {}

  @Post('conversations')
  @ApiOperation({ summary: 'Create a new conversation' })
  @ApiResponse({
    status: 201,
    description: 'Conversation created successfully',
    type: ConversationResponseDto
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createConversation(
    @Request() req: any,
    @Body(ValidationPipe) createConversationDto: CreateConversationDto
  ) {
    const userId = req.user.id;
    return this.qnaService.createConversation(userId, createConversationDto);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Get user conversations with pagination and search' })
  @ApiResponse({
    status: 200,
    description: 'Conversations retrieved successfully'
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getConversations(
    @Request() req: any,
    @Query(ValidationPipe) query: ConversationsQueryDto
  ) {
    const userId = req.user.id;
    return this.qnaService.getConversations(userId, query);
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Get a specific conversation with all messages' })
  @ApiParam({
    name: 'id',
    description: 'Conversation ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({
    status: 200,
    description: 'Conversation retrieved successfully',
    type: ConversationResponseDto
  })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getConversation(
    @Request() req: any,
    @Param('id') conversationId: string
  ) {
    const userId = req.user.id;
    return this.qnaService.getConversation(userId, conversationId);
  }

  @Post('messages')
  @ApiOperation({ summary: 'Send a message in a conversation and get AI response' })
  @ApiResponse({
    status: 201,
    description: 'Message sent and response generated successfully'
  })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async sendMessage(
    @Request() req: any,
    @Body(ValidationPipe) sendMessageDto: SendMessageDto
  ) {
    const userId = req.user.id;
    return this.qnaService.sendMessage(userId, sendMessageDto);
  }

  @Put('conversations/:id/title')
  @ApiOperation({ summary: 'Update conversation title' })
  @ApiParam({
    name: 'id',
    description: 'Conversation ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({
    status: 200,
    description: 'Conversation title updated successfully'
  })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateConversationTitle(
    @Request() req: any,
    @Param('id') conversationId: string,
    @Body('title') title: string
  ) {
    const userId = req.user.id;
    return this.qnaService.updateConversationTitle(userId, conversationId, title);
  }

  @Delete('conversations/:id')
  @ApiOperation({ summary: 'Delete a conversation' })
  @ApiParam({
    name: 'id',
    description: 'Conversation ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({
    status: 200,
    description: 'Conversation deleted successfully'
  })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteConversation(
    @Request() req: any,
    @Param('id') conversationId: string
  ) {
    const userId = req.user.id;
    return this.qnaService.deleteConversation(userId, conversationId);
  }
}