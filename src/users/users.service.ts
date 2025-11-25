import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from './user.entity';
import { Follow } from './follow.entity';
import { SavedPlace } from './saved-place.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto } from '../auth/dto/update-profile.dto';
import { Review } from '../reviews/review.entity';
import { Place } from '../places/place.entity';

type SafeUser = Omit<User, 'passwordHash'>;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Follow)
    private readonly followsRepository: Repository<Follow>,
    @InjectRepository(Review)
    private readonly reviewsRepository: Repository<Review>,
    @InjectRepository(SavedPlace)
    private readonly savedPlacesRepository: Repository<SavedPlace>,
    @InjectRepository(Place)
    private readonly placesRepository: Repository<Place>,
  ) {}

  private toSafeUser(user: User): SafeUser {
    const { passwordHash, ...rest } = user;
    return rest;
  }

  async hashPassword(password: string) {
    return bcrypt.hash(password, 12);
  }

  async comparePassword(password: string, hash: string) {
    return bcrypt.compare(password, hash);
  }

  async create(createUserDto: CreateUserDto): Promise<SafeUser> {
    const existing = await this.usersRepository.findOne({ where: { email: createUserDto.email } });
    if (existing) {
      throw new ConflictException('Email already in use');
    }
    const passwordHash = await this.hashPassword(createUserDto.password);
    const user = this.usersRepository.create({
      email: createUserDto.email,
      name: createUserDto.name,
      passwordHash,
      role: createUserDto.role ?? UserRole.USER,
    });
    const saved = await this.usersRepository.save(user);
    return this.toSafeUser(saved);
  }

  async findAll(): Promise<SafeUser[]> {
    const users = await this.usersRepository.find();
    return users.map((user) => this.toSafeUser(user));
  }

  async findOne(id: string): Promise<SafeUser> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.toSafeUser(user);
  }

  async findEntityByEmail(email: string) {
    return this.usersRepository.findOne({ where: { email } });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<SafeUser> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existing = await this.usersRepository.findOne({ where: { email: updateUserDto.email } });
      if (existing) {
        throw new ConflictException('Email already in use');
      }
    }
    if (updateUserDto.password) {
      user.passwordHash = await this.hashPassword(updateUserDto.password);
    }
    if (updateUserDto.name) {
      user.name = updateUserDto.name;
    }
    if (updateUserDto.role) {
      user.role = updateUserDto.role;
    }
    if (updateUserDto.email) {
      user.email = updateUserDto.email;
    }
    const saved = await this.usersRepository.save(user);
    return this.toSafeUser(saved);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<SafeUser> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (dto.email && dto.email !== user.email) {
      const existing = await this.usersRepository.findOne({ where: { email: dto.email } });
      if (existing) {
        throw new ConflictException('Email already in use');
      }
    }
    if (dto.password) {
      user.passwordHash = await this.hashPassword(dto.password);
    }
    if (dto.name) {
      user.name = dto.name;
    }
    if (dto.avatarUrl !== undefined) {
      user.avatarUrl = dto.avatarUrl;
    }
    if (dto.email) {
      user.email = dto.email;
    }
    const saved = await this.usersRepository.save(user);
    return this.toSafeUser(saved);
  }

  async remove(id: string): Promise<void> {
    const result = await this.usersRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('User not found');
    }
  }

  async followPlace(followerId: string, placeId: string): Promise<void> {
    const follower = await this.usersRepository.findOne({ where: { id: followerId } });
    const place = await this.placesRepository.findOne({ where: { id: placeId } });

    if (!follower) {
      throw new NotFoundException('User not found');
    }
    if (!place) {
      throw new NotFoundException('Place not found');
    }

    // Only regular users (explorers) can follow places
    if (follower.role !== UserRole.USER) {
      throw new BadRequestException('Only explorers can follow places');
    }

    const existing = await this.followsRepository.findOne({
      where: { follower: { id: followerId }, place: { id: placeId } },
    });

    if (existing) {
      throw new ConflictException('Already following this place');
    }

    const follow = this.followsRepository.create({ follower, place });
    await this.followsRepository.save(follow);
  }

  async unfollowPlace(followerId: string, placeId: string): Promise<void> {
    const follow = await this.followsRepository.findOne({
      where: { follower: { id: followerId }, place: { id: placeId } },
    });

    if (!follow) {
      throw new NotFoundException('Not following this place');
    }

    await this.followsRepository.remove(follow);
  }

  async getFollowingPlaces(userId: string): Promise<Place[]> {
    const follows = await this.followsRepository.find({
      where: { follower: { id: userId } },
      relations: ['place', 'place.category', 'place.location'],
    });
    return follows.map((f) => f.place);
  }

  async isFollowingPlace(followerId: string, placeId: string): Promise<boolean> {
    const follow = await this.followsRepository.findOne({
      where: { follower: { id: followerId }, place: { id: placeId } },
    });
    return !!follow;
  }

  async savePlace(userId: string, placeId: string, note?: string): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    const place = await this.placesRepository.findOne({ where: { id: placeId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (!place) {
      throw new NotFoundException('Place not found');
    }

    const existing = await this.savedPlacesRepository.findOne({
      where: { user: { id: userId }, place: { id: placeId } },
    });

    if (existing) {
      throw new ConflictException('Place already saved');
    }

    const savedPlace = this.savedPlacesRepository.create({ user, place, note });
    await this.savedPlacesRepository.save(savedPlace);
  }

  async unsavePlace(userId: string, placeId: string): Promise<void> {
    const savedPlace = await this.savedPlacesRepository.findOne({
      where: { user: { id: userId }, place: { id: placeId } },
    });

    if (!savedPlace) {
      throw new NotFoundException('Place not saved');
    }

    await this.savedPlacesRepository.remove(savedPlace);
  }

  async getSavedPlaces(userId: string): Promise<SavedPlace[]> {
    return this.savedPlacesRepository.find({
      where: { user: { id: userId } },
      relations: ['place', 'place.category', 'place.location'],
      order: { createdAt: 'DESC' },
    });
  }

  async isPlaceSaved(userId: string, placeId: string): Promise<boolean> {
    const savedPlace = await this.savedPlacesRepository.findOne({
      where: { user: { id: userId }, place: { id: placeId } },
    });
    return !!savedPlace;
  }

  async getUserStats(userId: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get review count
    const reviews = await this.reviewsRepository.count({ where: { user: { id: userId } } });

    // Get followers and following counts (for places)
    const followersCount = 0; // Explorers cannot be followed
    const followingCount = await this.followsRepository.count({ where: { follower: { id: userId } } });

    // Get saved places count
    const savedCount = await this.savedPlacesRepository.count({ where: { user: { id: userId } } });

    // Get photos count (from reviews with images)
    const reviewsWithImages = await this.reviewsRepository.find({
      where: { user: { id: userId } },
      select: ['images'],
    });
    const photosCount = reviewsWithImages.reduce((sum: number, review: Review) => sum + (review.images?.length || 0), 0);

    return {
      reviews,
      photos: photosCount,
      saved: savedCount,
      followers: followersCount,
      following: followingCount,
    };
  }

  async getRecentActivity(userId: string, limit: number = 10) {
    const reviews = await this.reviewsRepository.find({
      where: { user: { id: userId } },
      relations: ['place'],
      order: { createdAt: 'DESC' },
      take: limit,
    });

    return reviews.map((review) => ({
      type: 'review',
      id: review.id,
      place: {
        id: review.place.id,
        name: review.place.name,
        imageUrl: review.place.imageUrl,
      },
      action: `left a ${review.rating}-star review`,
      time: review.createdAt,
      rating: review.rating,
      hasImages: review.images && review.images.length > 0,
    }));
  }

  async getFollowerCountForPlaces(placeIds: string[]): Promise<number> {
    if (placeIds.length === 0) return 0;
    return this.followsRepository.count({
      where: { place: { id: In(placeIds) } },
    });
  }
}

