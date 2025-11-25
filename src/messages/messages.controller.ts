import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  Query,
  Patch,
} from '@nestjs/common';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedRequest } from '../auth/auth.controller';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  create(@Body() createMessageDto: CreateMessageDto, @Req() req: AuthenticatedRequest) {
    return this.messagesService.create(createMessageDto, req.user.userId);
  }

  @Get('conversations')
  getConversations(@Req() req: AuthenticatedRequest) {
    return this.messagesService.getConversations(req.user.userId);
  }

  @Get('conversation/:placeId/:userId')
  getMessagesByPath(
    @Param('placeId') placeId: string,
    @Param('userId') userId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.messagesService.getMessages(req.user.userId, placeId, userId);
  }

  @Patch(':id/read')
  markAsRead(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.messagesService.markAsRead(id, req.user.userId);
  }
}

