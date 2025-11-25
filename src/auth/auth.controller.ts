import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { UsersService } from '../users/users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserRole } from '../users/user.entity';

type AuthenticatedUser = {
  userId: string;
  email?: string;
  role: UserRole;
};

export type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
};

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() request: AuthenticatedRequest) {
    const userId = request.user?.userId;
    return this.usersService.findOne(userId);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(@Req() request: AuthenticatedRequest, @Body() updateProfileDto: UpdateProfileDto) {
    const userId = request.user?.userId;
    return this.usersService.updateProfile(userId, updateProfileDto);
  }

  @Get('profile/stats')
  @UseGuards(JwtAuthGuard)
  async getProfileStats(@Req() request: AuthenticatedRequest) {
    const userId = request.user?.userId;
    return this.usersService.getUserStats(userId);
  }

  @Post('follow-place/:placeId')
  @UseGuards(JwtAuthGuard)
  async followPlace(@Req() request: AuthenticatedRequest, @Param('placeId') placeId: string) {
    const followerId = request.user?.userId;
    await this.usersService.followPlace(followerId, placeId);
    return { message: 'Successfully followed place' };
  }

  @Post('unfollow-place/:placeId')
  @UseGuards(JwtAuthGuard)
  async unfollowPlace(@Req() request: AuthenticatedRequest, @Param('placeId') placeId: string) {
    const followerId = request.user?.userId;
    await this.usersService.unfollowPlace(followerId, placeId);
    return { message: 'Successfully unfollowed place' };
  }

  @Get('following')
  @UseGuards(JwtAuthGuard)
  async getFollowing(@Req() request: AuthenticatedRequest) {
    const userId = request.user?.userId;
    return this.usersService.getFollowingPlaces(userId);
  }

  @Get('is-following-place/:placeId')
  @UseGuards(JwtAuthGuard)
  async isFollowingPlace(@Req() request: AuthenticatedRequest, @Param('placeId') placeId: string) {
    const followerId = request.user?.userId;
    return { isFollowing: await this.usersService.isFollowingPlace(followerId, placeId) };
  }

  @Post('save-place/:placeId')
  @UseGuards(JwtAuthGuard)
  async savePlace(
    @Req() request: AuthenticatedRequest,
    @Param('placeId') placeId: string,
    @Body() body: { note?: string },
  ) {
    const userId = request.user?.userId;
    await this.usersService.savePlace(userId, placeId, body.note);
    return { message: 'Place saved successfully' };
  }

  @Post('unsave-place/:placeId')
  @UseGuards(JwtAuthGuard)
  async unsavePlace(@Req() request: AuthenticatedRequest, @Param('placeId') placeId: string) {
    const userId = request.user?.userId;
    await this.usersService.unsavePlace(userId, placeId);
    return { message: 'Place unsaved successfully' };
  }

  @Get('saved-places')
  @UseGuards(JwtAuthGuard)
  async getSavedPlaces(@Req() request: AuthenticatedRequest) {
    const userId = request.user?.userId;
    return this.usersService.getSavedPlaces(userId);
  }

  @Get('is-place-saved/:placeId')
  @UseGuards(JwtAuthGuard)
  async isPlaceSaved(@Req() request: AuthenticatedRequest, @Param('placeId') placeId: string) {
    const userId = request.user?.userId;
    return { isSaved: await this.usersService.isPlaceSaved(userId, placeId) };
  }

  @Get('profile/activity')
  @UseGuards(JwtAuthGuard)
  async getRecentActivity(@Req() request: AuthenticatedRequest) {
    const userId = request.user?.userId;
    return this.usersService.getRecentActivity(userId);
  }

  @Post('places/followers-count')
  @UseGuards(JwtAuthGuard)
  async getFollowersCount(@Req() request: AuthenticatedRequest, @Body() body: { placeIds: string[] }) {
    return { count: await this.usersService.getFollowerCountForPlaces(body.placeIds || []) };
  }
}

