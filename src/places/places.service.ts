import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Place, PlaceStatus } from './place.entity';
import { CreatePlaceDto } from './dto/create-place.dto';
import { UpdatePlaceDto } from './dto/update-place.dto';
import { Category } from '../categories/category.entity';
import { Location } from '../locations/location.entity';

export interface FindPlacesFilters {
  status?: PlaceStatus;
  categoryId?: string;
  locationId?: string;
  search?: string;
  featured?: boolean;
  limit?: number;
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

  async create(createPlaceDto: CreatePlaceDto): Promise<Place> {
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
      imageUrl: createPlaceDto.imageUrl,
      isOpen: createPlaceDto.isOpen ?? true,
      tags: createPlaceDto.tags ?? [],
      distance: createPlaceDto.distance,
      verified: createPlaceDto.verified ?? false,
      featured: createPlaceDto.featured ?? false,
      status: createPlaceDto.status ?? PlaceStatus.PENDING,
      ownerName: createPlaceDto.ownerName,
      ownerEmail: createPlaceDto.ownerEmail,
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

  async update(id: string, updatePlaceDto: UpdatePlaceDto): Promise<Place> {
    const place = await this.placesRepository.findOne({
      where: { id },
      relations: ['category', 'location'],
    });
    if (!place) {
      throw new NotFoundException('Place not found');
    }

    if (updatePlaceDto.categoryId && updatePlaceDto.categoryId !== place.category.id) {
      const category = await this.categoriesRepository.findOne({ where: { id: updatePlaceDto.categoryId } });
      if (!category) {
        throw new NotFoundException('Category not found');
      }
      place.category = category;
    }
    if (updatePlaceDto.locationId && updatePlaceDto.locationId !== place.location.id) {
      const location = await this.locationsRepository.findOne({ where: { id: updatePlaceDto.locationId } });
      if (!location) {
        throw new NotFoundException('Location not found');
      }
      place.location = location;
    }

    if (updatePlaceDto.name !== undefined) {
      place.name = updatePlaceDto.name;
    }
    if (updatePlaceDto.description !== undefined) {
      place.description = updatePlaceDto.description;
    }
    if (updatePlaceDto.rating !== undefined) {
      place.rating = updatePlaceDto.rating;
    }
    if (updatePlaceDto.reviews !== undefined) {
      place.reviews = updatePlaceDto.reviews;
    }
    if (updatePlaceDto.priceLevel !== undefined) {
      place.priceLevel = updatePlaceDto.priceLevel;
    }
    if (updatePlaceDto.imageUrl !== undefined) {
      place.imageUrl = updatePlaceDto.imageUrl;
    }
    if (updatePlaceDto.isOpen !== undefined) {
      place.isOpen = updatePlaceDto.isOpen;
    }
    if (updatePlaceDto.tags !== undefined) {
      place.tags = updatePlaceDto.tags;
    }
    if (updatePlaceDto.distance !== undefined) {
      place.distance = updatePlaceDto.distance;
    }
    if (updatePlaceDto.verified !== undefined) {
      place.verified = updatePlaceDto.verified;
    }
    if (updatePlaceDto.featured !== undefined) {
      place.featured = updatePlaceDto.featured;
    }
    if (updatePlaceDto.status !== undefined) {
      place.status = updatePlaceDto.status;
    }
    if (updatePlaceDto.ownerName !== undefined) {
      place.ownerName = updatePlaceDto.ownerName;
    }
    if (updatePlaceDto.ownerEmail !== undefined) {
      place.ownerEmail = updatePlaceDto.ownerEmail;
    }

    return this.placesRepository.save(place);
  }

  async remove(id: string): Promise<void> {
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
}

