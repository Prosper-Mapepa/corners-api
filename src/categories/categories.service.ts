import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
  ) {}

  async create(createCategoryDto: CreateCategoryDto) {
    const existing = await this.categoriesRepository.findOne({
      where: [{ slug: createCategoryDto.slug }, { name: createCategoryDto.name }],
    });
    if (existing) {
      throw new ConflictException('Category with same name or slug already exists');
    }
    const category = this.categoriesRepository.create(createCategoryDto);
    return this.categoriesRepository.save(category);
  }

  findAll() {
    return this.categoriesRepository.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string) {
    const category = await this.categoriesRepository.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    const category = await this.categoriesRepository.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    if (updateCategoryDto.slug && updateCategoryDto.slug !== category.slug) {
      const existingSlug = await this.categoriesRepository.findOne({ where: { slug: updateCategoryDto.slug } });
      if (existingSlug) {
        throw new ConflictException('Slug already in use');
      }
    }
    if (updateCategoryDto.name && updateCategoryDto.name !== category.name) {
      const existingName = await this.categoriesRepository.findOne({ where: { name: updateCategoryDto.name } });
      if (existingName) {
        throw new ConflictException('Name already in use');
      }
    }
    Object.assign(category, updateCategoryDto);
    return this.categoriesRepository.save(category);
  }

  async remove(id: string) {
    const result = await this.categoriesRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Category not found');
    }
  }
}

