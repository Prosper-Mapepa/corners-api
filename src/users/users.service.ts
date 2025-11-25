import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

type SafeUser = Omit<User, 'passwordHash'>;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
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

  async remove(id: string): Promise<void> {
    const result = await this.usersRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('User not found');
    }
  }
}

