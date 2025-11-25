import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review, ReviewStatus } from './review.entity';
import { Place } from '../places/place.entity';
import { User } from '../users/user.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private reviewsRepository: Repository<Review>,
    @InjectRepository(Place)
    private placesRepository: Repository<Place>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(createReviewDto: CreateReviewDto, userId: string): Promise<Review> {
    const place = await this.placesRepository.findOne({ where: { id: createReviewDto.placeId } });
    if (!place) {
      throw new NotFoundException('Place not found');
    }

    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user already reviewed this place
    const existingReview = await this.reviewsRepository.findOne({
      where: { place: { id: place.id }, user: { id: user.id } },
    });

    if (existingReview) {
      throw new UnauthorizedException('You have already reviewed this place');
    }

    const review = this.reviewsRepository.create({
      place,
      user,
      rating: createReviewDto.rating,
      comment: createReviewDto.comment,
      images: createReviewDto.images || [],
      status: ReviewStatus.PENDING,
    });

    const savedReview = await this.reviewsRepository.save(review);

    // Update place rating and review count when review is approved
    // This will be handled when admin approves the review

    return savedReview;
  }

  async findAll(placeId?: string, status?: ReviewStatus, userId?: string): Promise<Review[]> {
    const where: any = {};
    if (placeId) {
      where.place = { id: placeId };
    }
    if (status) {
      where.status = status;
    }
    if (userId) {
      where.user = { id: userId };
    }

    return this.reviewsRepository.find({
      where,
      relations: ['user', 'place'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Review> {
    const review = await this.reviewsRepository.findOne({
      where: { id },
      relations: ['user', 'place'],
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return review;
  }

  async update(id: string, updateReviewDto: UpdateReviewDto, userId?: string, userRole?: string): Promise<Review> {
    const review = await this.reviewsRepository.findOne({
      where: { id },
      relations: ['place', 'user'],
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    // Only admins can update status, users can only update their own reviews (rating, comment, images)
    const isAdmin = userRole === 'admin' || userRole === 'super_admin';
    const isOwner = userId && review.user.id === userId;

    if (!isAdmin && !isOwner) {
      throw new UnauthorizedException('You can only update your own reviews');
    }

    // Users can only update rating, comment, and images (not status)
    if (!isAdmin && updateReviewDto.status) {
      throw new UnauthorizedException('Only admins can update review status');
    }

    if (updateReviewDto.rating !== undefined) {
      review.rating = updateReviewDto.rating;
    }
    if (updateReviewDto.comment !== undefined) {
      review.comment = updateReviewDto.comment;
    }
    if (updateReviewDto.images !== undefined) {
      review.images = updateReviewDto.images;
    }

    if (updateReviewDto.status && isAdmin) {
      const oldStatus = review.status;
      review.status = updateReviewDto.status;

      // If status changed to approved, update place rating
      if (oldStatus !== ReviewStatus.APPROVED && updateReviewDto.status === ReviewStatus.APPROVED) {
        await this.updatePlaceRating(review.place.id);
      }
      // If status changed from approved to something else, recalculate
      else if (oldStatus === ReviewStatus.APPROVED && updateReviewDto.status !== ReviewStatus.APPROVED) {
        await this.updatePlaceRating(review.place.id);
      }
    } else if (isOwner && (updateReviewDto.rating !== undefined || updateReviewDto.comment !== undefined)) {
      // If user updated their review and it was approved, recalculate place rating
      if (review.status === ReviewStatus.APPROVED) {
        await this.updatePlaceRating(review.place.id);
      }
    }

    return this.reviewsRepository.save(review);
  }

  async remove(id: string, userId?: string, userRole?: string): Promise<void> {
    const review = await this.reviewsRepository.findOne({
      where: { id },
      relations: ['place', 'user'],
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    // Only admins or the review owner can delete
    const isAdmin = userRole === 'admin' || userRole === 'super_admin';
    const isOwner = userId && review.user.id === userId;

    if (!isAdmin && !isOwner) {
      throw new UnauthorizedException('You can only delete your own reviews');
    }

    const placeId = review.place.id;
    await this.reviewsRepository.remove(review);
    await this.updatePlaceRating(placeId);
  }

  async markHelpful(id: string): Promise<Review> {
    const review = await this.reviewsRepository.findOne({ where: { id } });
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    review.helpfulCount += 1;
    return this.reviewsRepository.save(review);
  }

  private async updatePlaceRating(placeId: string): Promise<void> {
    const approvedReviews = await this.reviewsRepository.find({
      where: { place: { id: placeId }, status: ReviewStatus.APPROVED },
    });

    const place = await this.placesRepository.findOne({ where: { id: placeId } });
    if (!place) return;

    if (approvedReviews.length === 0) {
      place.rating = 0;
      place.reviews = 0;
    } else {
      const totalRating = approvedReviews.reduce((sum, review) => sum + review.rating, 0);
      place.rating = Number((totalRating / approvedReviews.length).toFixed(1));
      place.reviews = approvedReviews.length;
    }

    await this.placesRepository.save(place);
  }
}

