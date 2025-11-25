import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Place } from '../places/place.entity';

@Entity({ name: 'locations' })
export class Location {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  slug: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  city?: string;

  @Column({ nullable: true })
  country?: string;

  @OneToMany(() => Place, (place) => place.location)
  places: Place[];
}

