import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PlacesService } from './places.service';
import { CreatePlaceDto } from './dto/create-place.dto';
import { UpdatePlaceDto } from './dto/update-place.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';
import { RolesGuard } from '../auth/roles.guard';
import { PlaceStatus } from './place.entity';

@Controller('places')
export class PlacesController {
  constructor(private readonly placesService: PlacesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  create(@Body() createPlaceDto: CreatePlaceDto) {
    return this.placesService.create(createPlaceDto);
  }

  @Get()
  findAll(
    @Query('status') status?: PlaceStatus,
    @Query('categoryId') categoryId?: string,
    @Query('locationId') locationId?: string,
    @Query('featured') featured?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
  ) {
    return this.placesService.findAll({
      status,
      categoryId,
      locationId,
      search,
      featured: featured !== undefined ? featured === 'true' : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getStats() {
    return this.placesService.getStatistics();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.placesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  update(@Param('id') id: string, @Body() updatePlaceDto: UpdatePlaceDto) {
    return this.placesService.update(id, updatePlaceDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.placesService.remove(id);
  }
}

