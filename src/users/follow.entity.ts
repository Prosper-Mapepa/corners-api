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

@Entity({ name: 'follows' })
@Unique(['follower', 'place'])
export class Follow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  follower: User;

  @ManyToOne(() => Place, { nullable: false, onDelete: 'CASCADE' })
  place: Place; // Users follow places (businesses), not other users

  @CreateDateColumn()
  createdAt: Date;
}

