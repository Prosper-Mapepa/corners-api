import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';
import { ReviewStatus } from './review.entity';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createReviewDto: CreateReviewDto, @Req() request: AuthenticatedRequest) {
    const userId = request.user?.userId;
    if (!userId) {
      throw new Error('User not authenticated');
    }
    return this.reviewsService.create(createReviewDto, userId);
  }

  @Get()
  findAll(@Query('placeId') placeId?: string, @Query('status') status?: ReviewStatus, @Query('userId') userId?: string) {
    return this.reviewsService.findAll(placeId, status, userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.reviewsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() updateReviewDto: UpdateReviewDto, @Req() request: AuthenticatedRequest) {
    const userId = request.user?.userId;
    const userRole = request.user?.role;
    return this.reviewsService.update(id, updateReviewDto, userId, userRole);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    const userId = request.user?.userId;
    const userRole = request.user?.role;
    return this.reviewsService.remove(id, userId, userRole);
  }

  @Post(':id/helpful')
  markHelpful(@Param('id') id: string) {
    return this.reviewsService.markHelpful(id);
  }
}

