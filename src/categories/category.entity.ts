import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Place } from '../places/place.entity';

@Entity({ name: 'categories' })
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  slug: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  icon?: string;

  @OneToMany(() => Place, (place) => place.category)
  places: Place[];
}

