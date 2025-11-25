import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
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
import { Request } from 'express';
import { JwtPayload } from '../auth/jwt.strategy';

type AuthenticatedRequest = Request & {
  user?: JwtPayload;
};

@Controller('places')
export class PlacesController {
  constructor(private readonly placesService: PlacesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.BUSINESS)
  create(@Body() createPlaceDto: CreatePlaceDto, @Req() request: AuthenticatedRequest) {
    const role = (request.user?.role as UserRole) ?? UserRole.USER;
    const email = request.user?.email;
    const sanitizedDto = { ...createPlaceDto };
    if (role === UserRole.BUSINESS) {
      sanitizedDto.status = undefined;
      if (email) {
        sanitizedDto.ownerEmail = email;
      }
    }
    return this.placesService.create(sanitizedDto, {
      requestedByRole: role,
      fallbackOwnerEmail: email,
    });
  }

  @Get()
  findAll(
    @Query('status') status?: PlaceStatus,
    @Query('categoryId') categoryId?: string,
    @Query('locationId') locationId?: string,
    @Query('featured') featured?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('ownerEmail') ownerEmail?: string,
  ) {
    return this.placesService.findAll({
      status,
      categoryId,
      locationId,
      search,
      featured: featured !== undefined ? featured === 'true' : undefined,
      limit: limit ? Number(limit) : undefined,
      ownerEmail,
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
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.BUSINESS)
  update(@Param('id') id: string, @Body() updatePlaceDto: UpdatePlaceDto, @Req() request: AuthenticatedRequest) {
    const role = (request.user?.role as UserRole) ?? UserRole.USER;
    return this.placesService.update(id, updatePlaceDto, {
      requestedByRole: role,
      requesterEmail: request.user?.email,
    });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.BUSINESS)
  remove(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    const role = (request.user?.role as UserRole) ?? UserRole.USER;
    return this.placesService.remove(id, {
      requestedByRole: role,
      requesterEmail: request.user?.email,
    });
  }
}

