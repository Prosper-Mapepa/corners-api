import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './user.entity';
import { Follow } from './follow.entity';
import { Review } from '../reviews/review.entity';
import { SavedPlace } from './saved-place.entity';
import { Place } from '../places/place.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Follow, Review, SavedPlace, Place])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService, TypeOrmModule],
})
export class UsersModule {}
