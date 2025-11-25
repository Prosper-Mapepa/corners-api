import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Place, PlaceMetadata, PlaceStatus } from './place.entity';
import { CreatePlaceDto } from './dto/create-place.dto';
import { UpdatePlaceDto } from './dto/update-place.dto';
import { Category } from '../categories/category.entity';
import { Location } from '../locations/location.entity';
import { UserRole } from '../users/user.entity';

export interface FindPlacesFilters {
  status?: PlaceStatus;
  categoryId?: string;
  locationId?: string;
  search?: string;
  featured?: boolean;
  limit?: number;
  ownerEmail?: string;
}

interface CreatePlaceOptions {
  requestedByRole?: UserRole;
  fallbackOwnerEmail?: string;
}

interface ManagePlaceOptions {
  requestedByRole?: UserRole;
  requesterEmail?: string;
}

@Injectable()
export class PlacesService {
  constructor(
    @InjectRepository(Place)
    private readonly placesRepository: Repository<Place>,
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
    @InjectRepository(Location)
    private readonly locationsRepository: Repository<Location>,
  ) {}

  async create(createPlaceDto: CreatePlaceDto, options: CreatePlaceOptions = {}): Promise<Place> {
    const { requestedByRole = UserRole.ADMIN, fallbackOwnerEmail } = options;
    const category = await this.categoriesRepository.findOne({ where: { id: createPlaceDto.categoryId } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    const location = await this.locationsRepository.findOne({ where: { id: createPlaceDto.locationId } });
    if (!location) {
      throw new NotFoundException('Location not found');
    }

    const place = this.placesRepository.create({
      name: createPlaceDto.name,
      description: createPlaceDto.description,
      category,
      location,
      rating: createPlaceDto.rating ?? 0,
      reviews: createPlaceDto.reviews ?? 0,
      priceLevel: createPlaceDto.priceLevel,
      priceRangeMin: createPlaceDto.priceRangeMin,
      priceRangeMax: createPlaceDto.priceRangeMax,
      imageUrl: createPlaceDto.imageUrl,
      isOpen: createPlaceDto.isOpen ?? true,
      tags: createPlaceDto.tags ?? [],
      distance: createPlaceDto.distance,
      verified: requestedByRole === UserRole.BUSINESS ? false : createPlaceDto.verified ?? false,
      featured: requestedByRole === UserRole.BUSINESS ? false : createPlaceDto.featured ?? false,
      status: requestedByRole === UserRole.BUSINESS ? PlaceStatus.PENDING : createPlaceDto.status ?? PlaceStatus.PENDING,
      ownerName: createPlaceDto.ownerName,
      ownerEmail: this.normalizeEmail(createPlaceDto.ownerEmail ?? fallbackOwnerEmail) ?? undefined,
      metadata: this.normalizeMetadata(createPlaceDto.metadata),
    });
    return this.placesRepository.save(place);
  }

  async findAll(filters: FindPlacesFilters = {}): Promise<Place[]> {
    const qb = this.placesRepository
      .createQueryBuilder('place')
      .leftJoinAndSelect('place.category', 'category')
      .leftJoinAndSelect('place.location', 'location');

    if (filters.status) {
      qb.andWhere('place.status = :status', { status: filters.status });
    }
    if (filters.categoryId) {
      qb.andWhere('category.id = :categoryId', { categoryId: filters.categoryId });
    }
    if (filters.locationId) {
      qb.andWhere('location.id = :locationId', { locationId: filters.locationId });
    }
    if (filters.featured !== undefined) {
      qb.andWhere('place.featured = :featured', { featured: filters.featured });
    }
    if (filters.ownerEmail) {
      qb.andWhere('LOWER(place.ownerEmail) = LOWER(:ownerEmail)', {
        ownerEmail: this.normalizeEmail(filters.ownerEmail),
      });
    }
    if (filters.search) {
      qb.andWhere(
        '(LOWER(place.name) LIKE :search OR LOWER(place.description) LIKE :search OR LOWER(location.name) LIKE :search)',
        { search: `%${filters.search.toLowerCase()}%` },
      );
    }
    qb.orderBy('place.featured', 'DESC').addOrderBy('place.rating', 'DESC').addOrderBy('place.createdAt', 'DESC');

    if (filters.limit) {
      qb.take(filters.limit);
    }

    return qb.getMany();
  }

  async findOne(id: string): Promise<Place> {
    const place = await this.placesRepository.findOne({
      where: { id },
      relations: ['category', 'location'],
    });
    if (!place) {
      throw new NotFoundException('Place not found');
    }
    return place;
  }

  async update(id: string, updatePlaceDto: UpdatePlaceDto, options: ManagePlaceOptions = {}): Promise<Place> {
    const place = await this.placesRepository.findOne({
      where: { id },
      relations: ['category', 'location'],
    });
    if (!place) {
      throw new NotFoundException('Place not found');
    }

    const { requestedByRole = UserRole.ADMIN, requesterEmail } = options;
    const effectiveDto =
      requestedByRole === UserRole.BUSINESS ? this.sanitizeBusinessUpdate(updatePlaceDto) : updatePlaceDto;

    if (requestedByRole === UserRole.BUSINESS) {
      this.ensureBusinessOwnership(place, requesterEmail);
    }

    if (effectiveDto.categoryId && effectiveDto.categoryId !== place.category.id) {
      const category = await this.categoriesRepository.findOne({ where: { id: effectiveDto.categoryId } });
      if (!category) {
        throw new NotFoundException('Category not found');
      }
      place.category = category;
    }
    if (effectiveDto.locationId && effectiveDto.locationId !== place.location.id) {
      const location = await this.locationsRepository.findOne({ where: { id: effectiveDto.locationId } });
      if (!location) {
        throw new NotFoundException('Location not found');
      }
      place.location = location;
    }

    if (effectiveDto.name !== undefined) {
      place.name = effectiveDto.name;
    }
    if (effectiveDto.description !== undefined) {
      place.description = effectiveDto.description;
    }
    if (effectiveDto.rating !== undefined) {
      place.rating = effectiveDto.rating;
    }
    if (effectiveDto.reviews !== undefined) {
      place.reviews = effectiveDto.reviews;
    }
    if (effectiveDto.priceLevel !== undefined) {
      place.priceLevel = effectiveDto.priceLevel;
    }
    if (effectiveDto.priceRangeMin !== undefined) {
      place.priceRangeMin = effectiveDto.priceRangeMin;
    }
    if (effectiveDto.priceRangeMax !== undefined) {
      place.priceRangeMax = effectiveDto.priceRangeMax;
    }
    if (effectiveDto.imageUrl !== undefined) {
      place.imageUrl = effectiveDto.imageUrl;
    }
    if (effectiveDto.isOpen !== undefined) {
      place.isOpen = effectiveDto.isOpen;
    }
    if (effectiveDto.tags !== undefined) {
      place.tags = effectiveDto.tags;
    }
    if (effectiveDto.distance !== undefined) {
      place.distance = effectiveDto.distance;
    }
    if (effectiveDto.verified !== undefined) {
      place.verified = effectiveDto.verified;
    }
    if (effectiveDto.featured !== undefined) {
      place.featured = effectiveDto.featured;
    }
    if (effectiveDto.status !== undefined) {
      place.status = effectiveDto.status;
    }
    if (effectiveDto.ownerName !== undefined) {
      place.ownerName = effectiveDto.ownerName;
    }
    if (effectiveDto.ownerEmail !== undefined) {
      place.ownerEmail = this.normalizeEmail(effectiveDto.ownerEmail) ?? undefined;
    }
    if (effectiveDto.metadata !== undefined) {
      place.metadata = this.normalizeMetadata(effectiveDto.metadata);
    }

    return this.placesRepository.save(place);
  }

  async remove(id: string, options: ManagePlaceOptions = {}): Promise<void> {
    const place = await this.placesRepository.findOne({ where: { id } });
    if (!place) {
      throw new NotFoundException('Place not found');
    }
    if (options.requestedByRole === UserRole.BUSINESS) {
      this.ensureBusinessOwnership(place, options.requesterEmail);
    }
    const result = await this.placesRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Place not found');
    }
  }

  async getStatistics() {
    const [totalPlaces, approved, pending, rejected, featured] = await Promise.all([
      this.placesRepository.count(),
      this.placesRepository.count({ where: { status: PlaceStatus.APPROVED } }),
      this.placesRepository.count({ where: { status: PlaceStatus.PENDING } }),
      this.placesRepository.count({ where: { status: PlaceStatus.REJECTED } }),
      this.placesRepository.count({ where: { featured: true } }),
    ]);

    const recentSubmissions = await this.placesRepository.find({
      order: { submittedAt: 'DESC' },
      take: 10,
      relations: ['category', 'location'],
    });

    return {
      totalPlaces,
      approved,
      pending,
      rejected,
      featured,
      recentSubmissions,
    };
  }

  private sanitizeBusinessUpdate(updatePlaceDto: UpdatePlaceDto): UpdatePlaceDto {
    const { status, verified, featured, ownerEmail, rating, reviews, ...allowed } = updatePlaceDto;
    return allowed;
  }

  private ensureBusinessOwnership(place: Place, requesterEmail?: string | null) {
    if (!requesterEmail) {
      throw new ForbiddenException('Missing account information for this action');
    }
    if (this.normalizeEmail(place.ownerEmail) !== this.normalizeEmail(requesterEmail)) {
      throw new ForbiddenException('You can only manage listings that belong to you');
    }
  }

  private normalizeEmail(email?: string | null) {
    return email?.trim().toLowerCase() ?? null;
  }

  private normalizeMetadata(metadata?: Record<string, any> | null): PlaceMetadata | undefined {
    if (!metadata || typeof metadata !== 'object') {
      return undefined;
    }
    const gallery = Array.isArray(metadata.gallery)
      ? metadata.gallery.filter((value) => typeof value === 'string' && value.trim().length > 0)
      : undefined;
    const amenities = Array.isArray(metadata.amenities)
      ? metadata.amenities.filter((value: unknown) => typeof value === 'string' && value.trim().length > 0)
      : undefined;
    const highlights = Array.isArray(metadata.highlights)
      ? metadata.highlights.filter((value: unknown) => typeof value === 'string' && value.trim().length > 0)
      : undefined;
    const hours =
      metadata.hours && typeof metadata.hours === 'object'
        ? Object.fromEntries(
            Object.entries(metadata.hours as Record<string, string>)
              .filter(([key, value]) => key && typeof value === 'string' && value.trim().length > 0)
              .map(([key, value]) => [key, value.trim()]),
          )
        : undefined;
    const menu = Array.isArray(metadata.menu)
      ? metadata.menu
          .map((item: any) => ({
            name: typeof item?.name === 'string' ? item.name : undefined,
            price: typeof item?.price === 'string' ? item.price : undefined,
            description: typeof item?.description === 'string' ? item.description : undefined,
          }))
          .filter((item) => item.name)
      : undefined;
    const similarPlaces = Array.isArray(metadata.similarPlaces)
      ? metadata.similarPlaces
          .map((item: any) => ({
            name: typeof item?.name === 'string' ? item.name : undefined,
            rating: typeof item?.rating === 'number' ? item.rating : undefined,
            icon: typeof item?.icon === 'string' ? item.icon : undefined,
          }))
          .filter((item) => item.name)
      : undefined;

    return {
      gallery,
      amenities,
      highlights,
      contact:
        metadata.contact && typeof metadata.contact === 'object'
          ? {
              phone: typeof metadata.contact.phone === 'string' ? metadata.contact.phone : undefined,
              website: typeof metadata.contact.website === 'string' ? metadata.contact.website : undefined,
              address: typeof metadata.contact.address === 'string' ? metadata.contact.address : undefined,
            }
          : undefined,
      hours,
      menu,
      similarPlaces,
    };
  }
}

