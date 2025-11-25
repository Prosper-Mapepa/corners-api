import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlacesService } from './places.service';
import { PlacesController } from './places.controller';
import { Place } from './place.entity';
import { Category } from '../categories/category.entity';
import { Location } from '../locations/location.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Place, Category, Location])],
  controllers: [PlacesController],
  providers: [PlacesService],
  exports: [PlacesService],
})
export class PlacesModule {}

