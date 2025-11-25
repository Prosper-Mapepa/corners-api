import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Category } from '../categories/category.entity';
import { Location } from '../locations/location.entity';

export enum PlaceStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity({ name: 'places' })
export class Place {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text' })
  description: string;

  @ManyToOne(() => Category, (category) => category.places, { eager: true, nullable: false })
  category: Category;

  @ManyToOne(() => Location, (location) => location.places, { eager: true, nullable: false })
  location: Location;

  @Column({ type: 'decimal', precision: 3, scale: 1, default: 0 })
  rating: number;

  @Column({ type: 'int', default: 0 })
  reviews: number;

  @Column({ length: 10 })
  priceLevel: string;

  @Column({ nullable: true })
  imageUrl?: string;

  @Column({ default: true })
  isOpen: boolean;

  @Column('text', { array: true, default: [] })
  tags: string[];

  @Column({ nullable: true })
  distance?: string;

  @Column({ default: false })
  verified: boolean;

  @Column({ default: false })
  featured: boolean;

  @Column({ type: 'enum', enum: PlaceStatus, default: PlaceStatus.PENDING })
  status: PlaceStatus;

  @Column({ nullable: true })
  ownerName?: string;

  @Column({ nullable: true })
  ownerEmail?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  submittedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

