import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from './user.entity';
import { Place } from '../places/place.entity';

@Entity({ name: 'saved_places' })
@Unique(['user', 'place'])
export class SavedPlace {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Place, { nullable: false, onDelete: 'CASCADE' })
  place: Place;

  @Column({ type: 'text', nullable: true })
  note?: string; // Optional note about why they saved it

  @CreateDateColumn()
  createdAt: Date;
}


