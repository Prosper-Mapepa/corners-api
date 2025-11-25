import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Location } from './location.entity';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(Location)
    private readonly locationsRepository: Repository<Location>,
  ) {}

  async create(createLocationDto: CreateLocationDto) {
    const existing = await this.locationsRepository.findOne({
      where: [{ slug: createLocationDto.slug }, { name: createLocationDto.name }],
    });
    if (existing) {
      throw new ConflictException('Location with same name or slug already exists');
    }
    const location = this.locationsRepository.create(createLocationDto);
    return this.locationsRepository.save(location);
  }

  findAll() {
    return this.locationsRepository.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string) {
    const location = await this.locationsRepository.findOne({ where: { id } });
    if (!location) {
      throw new NotFoundException('Location not found');
    }
    return location;
  }

  async update(id: string, updateLocationDto: UpdateLocationDto) {
    const location = await this.locationsRepository.findOne({ where: { id } });
    if (!location) {
      throw new NotFoundException('Location not found');
    }
    if (updateLocationDto.slug && updateLocationDto.slug !== location.slug) {
      const existingSlug = await this.locationsRepository.findOne({ where: { slug: updateLocationDto.slug } });
      if (existingSlug) {
        throw new ConflictException('Slug already in use');
      }
    }
    if (updateLocationDto.name && updateLocationDto.name !== location.name) {
      const existingName = await this.locationsRepository.findOne({ where: { name: updateLocationDto.name } });
      if (existingName) {
        throw new ConflictException('Name already in use');
      }
    }
    Object.assign(location, updateLocationDto);
    return this.locationsRepository.save(location);
  }

  async remove(id: string) {
    const result = await this.locationsRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Location not found');
    }
  }
}

