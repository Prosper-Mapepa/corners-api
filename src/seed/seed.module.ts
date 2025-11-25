import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from '../categories/category.entity';
import { Location } from '../locations/location.entity';
import { Place } from '../places/place.entity';
import { User } from '../users/user.entity';
import { SeedService } from './seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([Category, Location, Place, User])],
  providers: [SeedService],
  exports: [SeedService],
})
export class SeedModule {}

