import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reservation, ReservationStatus } from './reservation.entity';
import { User } from '../users/user.entity';
import { Place } from '../places/place.entity';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { UserRole } from '../users/user.entity';

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Reservation)
    private reservationsRepository: Repository<Reservation>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Place)
    private placesRepository: Repository<Place>,
  ) {}

  async create(createReservationDto: CreateReservationDto, userId: string): Promise<Reservation> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const place = await this.placesRepository.findOne({ where: { id: createReservationDto.placeId } });
    if (!place) {
      throw new NotFoundException('Place not found');
    }

    const reservation = this.reservationsRepository.create({
      user,
      place,
      reservationDate: new Date(createReservationDto.reservationDate),
      reservationTime: createReservationDto.reservationTime,
      partySize: createReservationDto.partySize,
      specialRequests: createReservationDto.specialRequests,
      contactPhone: createReservationDto.contactPhone || user.email,
      contactEmail: createReservationDto.contactEmail || user.email,
      status: ReservationStatus.PENDING,
    });

    return this.reservationsRepository.save(reservation);
  }

  async findAll(userId: string, userRole: UserRole, placeId?: string): Promise<Reservation[]> {
    if (userRole === UserRole.BUSINESS || userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN) {
      // Business users can see reservations for their places
      const where: any = {};
      if (placeId) {
        where.place = { id: placeId };
      }
      return this.reservationsRepository.find({
        where,
        relations: ['user', 'place'],
        order: { reservationDate: 'DESC', reservationTime: 'DESC' },
      });
    } else {
      // Regular users can only see their own reservations
      const where: any = { user: { id: userId } };
      if (placeId) {
        where.place = { id: placeId };
      }
      return this.reservationsRepository.find({
        where,
        relations: ['user', 'place'],
        order: { reservationDate: 'DESC', reservationTime: 'DESC' },
      });
    }
  }

  async findOne(id: string, userId: string, userRole: UserRole): Promise<Reservation> {
    const reservation = await this.reservationsRepository.findOne({
      where: { id },
      relations: ['user', 'place'],
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    // Check permissions
    if (userRole !== UserRole.BUSINESS && userRole !== UserRole.ADMIN && userRole !== UserRole.SUPER_ADMIN) {
      if (reservation.user.id !== userId) {
        throw new UnauthorizedException('You can only view your own reservations');
      }
    }

    return reservation;
  }

  async update(id: string, updateReservationDto: UpdateReservationDto, userId: string, userRole: UserRole): Promise<Reservation> {
    const reservation = await this.reservationsRepository.findOne({
      where: { id },
      relations: ['user', 'place'],
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    // Check permissions - only business owners or admins can update status
    if (updateReservationDto.status) {
      if (userRole !== UserRole.BUSINESS && userRole !== UserRole.ADMIN && userRole !== UserRole.SUPER_ADMIN) {
        throw new UnauthorizedException('Only business owners can update reservation status');
      }
    } else {
      // Users can only update their own reservations (except status)
      if (reservation.user.id !== userId) {
        throw new UnauthorizedException('You can only update your own reservations');
      }
    }

    if (updateReservationDto.reservationDate) {
      reservation.reservationDate = new Date(updateReservationDto.reservationDate);
    }
    if (updateReservationDto.reservationTime) {
      reservation.reservationTime = updateReservationDto.reservationTime;
    }
    if (updateReservationDto.partySize !== undefined) {
      reservation.partySize = updateReservationDto.partySize;
    }
    if (updateReservationDto.specialRequests !== undefined) {
      reservation.specialRequests = updateReservationDto.specialRequests;
    }
    if (updateReservationDto.status) {
      reservation.status = updateReservationDto.status;
    }

    return this.reservationsRepository.save(reservation);
  }

  async remove(id: string, userId: string, userRole: UserRole): Promise<void> {
    const reservation = await this.reservationsRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    // Users can only delete their own reservations, admins can delete any
    if (userRole !== UserRole.ADMIN && userRole !== UserRole.SUPER_ADMIN) {
      if (reservation.user.id !== userId) {
        throw new UnauthorizedException('You can only delete your own reservations');
      }
    }

    await this.reservationsRepository.remove(reservation);
  }
}


