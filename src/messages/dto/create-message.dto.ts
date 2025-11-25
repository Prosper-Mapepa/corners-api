import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateMessageDto {
  @IsUUID()
  @IsOptional()
  recipientId?: string;

  @IsUUID()
  @IsNotEmpty()
  placeId: string;

  @IsString()
  @IsNotEmpty()
  content: string;
}

