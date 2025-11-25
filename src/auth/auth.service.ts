import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UserRole } from '../users/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string) {
    const user = await this.usersService.findEntityByEmail(email);
    if (!user) {
      return null;
    }
    const isValid = await this.usersService.comparePassword(pass, user.passwordHash);
    if (!isValid) {
      return null;
    }
    const { passwordHash, ...rest } = user;
    return rest;
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findEntityByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const isValid = await this.usersService.comparePassword(dto.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      accessToken: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };
  }

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findEntityByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already in use');
    }
    const created = await this.usersService.create({
      email: dto.email,
      password: dto.password,
      name: dto.name,
      role: dto.role ?? UserRole.USER,
    });
    const payload = { sub: created.id, email: created.email, role: created.role };
    return {
      accessToken: await this.jwtService.signAsync(payload),
      user: created,
    };
  }
}

