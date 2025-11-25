import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './message.entity';
import { User } from '../users/user.entity';
import { Place } from '../places/place.entity';
import { CreateMessageDto } from './dto/create-message.dto';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private messagesRepository: Repository<Message>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Place)
    private placesRepository: Repository<Place>,
  ) {}

  async create(createMessageDto: CreateMessageDto, senderId: string): Promise<Message> {
    const sender = await this.usersRepository.findOne({ where: { id: senderId } });
    if (!sender) {
      throw new NotFoundException('Sender not found');
    }

    const place = await this.placesRepository.findOne({ where: { id: createMessageDto.placeId } });
    if (!place) {
      throw new NotFoundException('Place not found');
    }

    // If recipientId is provided, use it; otherwise find business owner by place ownerEmail
    let recipient: User | null = null;
    if (createMessageDto.recipientId) {
      recipient = await this.usersRepository.findOne({ where: { id: createMessageDto.recipientId } });
      if (!recipient) {
        throw new NotFoundException('Recipient not found');
      }
    } else if (place.ownerEmail) {
      // Find business owner by email
      recipient = await this.usersRepository.findOne({ where: { email: place.ownerEmail } });
      if (!recipient) {
        throw new NotFoundException('Business owner not found. Please ensure the business owner has an account.');
      }
    } else {
      throw new NotFoundException('No recipient specified and place has no owner email');
    }

    if (!recipient) {
      throw new NotFoundException('Recipient could not be resolved');
    }

    const message = this.messagesRepository.create({
      sender,
      recipient,
      place,
      content: createMessageDto.content,
      read: false,
    });

    return this.messagesRepository.save(message);
  }

  async getConversations(userId: string): Promise<any[]> {
    // Get all unique conversations for a user
    const sentMessages = await this.messagesRepository.find({
      where: { sender: { id: userId } },
      relations: ['sender', 'recipient', 'place'],
      order: { createdAt: 'DESC' },
    });

    const receivedMessages = await this.messagesRepository.find({
      where: { recipient: { id: userId } },
      relations: ['sender', 'recipient', 'place'],
      order: { createdAt: 'DESC' },
    });

    // Group by conversation (place + other user)
    const conversationMap = new Map<string, any>();

    [...sentMessages, ...receivedMessages].forEach((message) => {
      const otherUserId = message.sender.id === userId ? message.recipient.id : message.sender.id;
      const conversationKey = `${message.place.id}-${otherUserId}`;

      if (!conversationMap.has(conversationKey)) {
        conversationMap.set(conversationKey, {
          place: message.place,
          otherUser: message.sender.id === userId ? message.recipient : message.sender,
          lastMessage: message,
          unreadCount: 0,
        });
      }

      const conversation = conversationMap.get(conversationKey);
      if (message.createdAt > conversation.lastMessage.createdAt) {
        conversation.lastMessage = message;
      }
      if (!message.read && message.recipient.id === userId) {
        conversation.unreadCount++;
      }
    });

    return Array.from(conversationMap.values()).sort(
      (a, b) => b.lastMessage.createdAt.getTime() - a.lastMessage.createdAt.getTime(),
    );
  }

  async getMessages(userId: string, placeId: string, otherUserId: string): Promise<Message[]> {
    const messages = await this.messagesRepository.find({
      where: [
        {
          sender: { id: userId },
          recipient: { id: otherUserId },
          place: { id: placeId },
        },
        {
          sender: { id: otherUserId },
          recipient: { id: userId },
          place: { id: placeId },
        },
      ],
      relations: ['sender', 'recipient', 'place'],
      order: { createdAt: 'ASC' },
    });

    // Mark messages as read
    await this.messagesRepository.update(
      {
        sender: { id: otherUserId },
        recipient: { id: userId },
        place: { id: placeId },
        read: false,
      },
      { read: true },
    );

    return messages;
  }

  async markAsRead(messageId: string, userId: string): Promise<Message> {
    const message = await this.messagesRepository.findOne({
      where: { id: messageId },
      relations: ['recipient'],
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.recipient.id !== userId) {
      throw new UnauthorizedException('You can only mark your own messages as read');
    }

    message.read = true;
    return this.messagesRepository.save(message);
  }
}

