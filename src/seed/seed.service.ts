import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Category } from '../categories/category.entity';
import { Location } from '../locations/location.entity';
import { Place, PlaceStatus } from '../places/place.entity';
import { User, UserRole } from '../users/user.entity';

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);
  private seeded = false;

  constructor(
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
    @InjectRepository(Location)
    private readonly locationsRepository: Repository<Location>,
    @InjectRepository(Place)
    private readonly placesRepository: Repository<Place>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async seed() {
    if (this.seeded) {
      return;
    }
    await this.seedCategories();
    await this.seedLocations();
    await this.seedUsers();
    await this.seedPlaces();
    this.seeded = true;
  }

  private async seedCategories() {
    const count = await this.categoriesRepository.count();
    if (count > 0) {
      return;
    }
    const categories = [
      { name: 'Restaurants', slug: 'restaurants', icon: '🍽️' },
      { name: 'Hotels', slug: 'hotels', icon: '🏨' },
      { name: 'Nightlife', slug: 'nightlife', icon: '🌙' },
      { name: 'Culture', slug: 'culture', icon: '🎭' },
      { name: 'Shopping', slug: 'shopping', icon: '🛍️' },
      { name: 'Outdoor', slug: 'outdoor', icon: '🌳' },
      { name: 'Wellness', slug: 'wellness', icon: '🧘' },
      { name: 'Events', slug: 'events', icon: '🎉' },
    ];
    await this.categoriesRepository.save(categories);
    this.logger.log('Seeded categories');
  }

  private async seedLocations() {
    const count = await this.locationsRepository.count();
    if (count > 0) {
      return;
    }
    const locations = [
      { name: 'Lagos, Nigeria', city: 'Lagos', country: 'Nigeria', slug: 'lagos' },
      { name: 'Cape Town, South Africa', city: 'Cape Town', country: 'South Africa', slug: 'cape-town' },
      { name: 'Nairobi, Kenya', city: 'Nairobi', country: 'Kenya', slug: 'nairobi' },
      { name: 'Accra, Ghana', city: 'Accra', country: 'Ghana', slug: 'accra' },
      { name: 'Cairo, Egypt', city: 'Cairo', country: 'Egypt', slug: 'cairo' },
      { name: 'Marrakech, Morocco', city: 'Marrakech', country: 'Morocco', slug: 'marrakech' },
    ];
    await this.locationsRepository.save(locations);
    this.logger.log('Seeded locations');
  }

  private async seedUsers() {
    const adminExists = await this.usersRepository.findOne({ where: { email: 'admin@corners.africa' } });
    if (!adminExists) {
      const admin = this.usersRepository.create({
        email: 'admin@corners.africa',
        name: 'Corners Admin',
        passwordHash: await bcrypt.hash('Admin@123', 12),
        role: UserRole.SUPER_ADMIN,
      });
      await this.usersRepository.save(admin);
      this.logger.log('Seeded admin user (admin@corners.africa / Admin@123)');
    }

    const demoUserExists = await this.usersRepository.findOne({ where: { email: 'explorer@corners.africa' } });
    if (!demoUserExists) {
      const user = this.usersRepository.create({
        email: 'explorer@corners.africa',
        name: 'Global Explorer',
        passwordHash: await bcrypt.hash('Explorer@123', 12),
        role: UserRole.USER,
      });
      await this.usersRepository.save(user);
      this.logger.log('Seeded demo explorer user');
    }
  }

  private async seedPlaces() {
    const count = await this.placesRepository.count();
    if (count > 0) {
      return;
    }
    const categoryMap = new Map<string, Category>();
    const categories = await this.categoriesRepository.find();
    categories.forEach((cat) => categoryMap.set(cat.slug, cat));

    const locationMap = new Map<string, Location>();
    const locations = await this.locationsRepository.find();
    locations.forEach((loc) => locationMap.set(loc.slug, loc));

    const places: Partial<Place>[] = [
      {
        name: 'Mama Africa Restaurant',
        description: "Authentic Nigerian cuisine in the heart of Lagos with traditional live music.",
        category: categoryMap.get('restaurants'),
        location: locationMap.get('lagos'),
        rating: 4.8,
        reviews: 234,
        priceLevel: '$$',
        imageUrl:
          'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1200&q=80',
        isOpen: true,
        tags: ['Nigerian', 'Traditional', 'Family-friendly', 'Live Music'],
        distance: '0.8 km',
        verified: true,
        featured: true,
        status: PlaceStatus.APPROVED,
        ownerName: 'John Adebayo',
        ownerEmail: 'john@mamaafrica.ng',
        metadata: {
          gallery: [
            'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1529042410759-befb1204b468?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80',
          ],
          amenities: ['Free WiFi', 'Parking', 'Card Payment', 'Outdoor Seating', 'Live Music', 'COVID Safe'],
          highlights: ['Nigerian', 'Traditional', 'Family-friendly', 'Live Music', 'Authentic', 'Local Favorite'],
          contact: {
            phone: '+234 123 456 7890',
            website: 'https://www.mamaafrica.ng',
            address: '123 Ahmadu Bello Way, Victoria Island, Lagos',
          },
          hours: {
            Monday: '11:00 AM - 10:00 PM',
            Tuesday: '11:00 AM - 10:00 PM',
            Wednesday: '11:00 AM - 10:00 PM',
            Thursday: '11:00 AM - 10:00 PM',
            Friday: '11:00 AM - 11:00 PM',
            Saturday: '10:00 AM - 11:00 PM',
            Sunday: '12:00 PM - 9:00 PM',
          },
          menu: [
            { name: 'Jollof Rice', price: '₦2,500', description: 'Traditional Nigerian rice dish with spices' },
            { name: 'Pepper Soup', price: '₦3,000', description: 'Spicy Nigerian soup with fish or meat' },
            { name: 'Suya', price: '₦1,500', description: 'Grilled spiced meat skewers' },
            { name: 'Pounded Yam', price: '₦2,000', description: 'Traditional yam dish with soup' },
          ],
        },
      },
      {
        name: 'The Rooftop Lounge',
        description: 'Stunning city views with craft cocktails and international DJs.',
        category: categoryMap.get('nightlife'),
        location: locationMap.get('cape-town'),
        rating: 4.6,
        reviews: 189,
        priceLevel: '$$$',
        imageUrl:
          'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1200&q=80',
        isOpen: false,
        tags: ['Cocktails', 'Views', 'Upscale', 'DJ'],
        distance: '1.2 km',
        verified: true,
        featured: false,
        status: PlaceStatus.PENDING,
        ownerName: 'Michael van der Merwe',
        ownerEmail: 'michael@rooftoplounge.co.za',
      },
      {
        name: 'Safari Lodge Retreat',
        description: 'Luxury safari experience near the city with wildlife viewing.',
        category: categoryMap.get('hotels'),
        location: locationMap.get('nairobi'),
        rating: 4.9,
        reviews: 156,
        priceLevel: '$$$$',
        imageUrl:
          'https://images.unsplash.com/photo-1496412705862-e0088f16f791?auto=format&fit=crop&w=1200&q=80',
        isOpen: true,
        tags: ['Safari', 'Luxury', 'Wildlife', 'Spa'],
        distance: '15.3 km',
        verified: true,
        featured: true,
        status: PlaceStatus.APPROVED,
        ownerName: 'Sarah Kimani',
        ownerEmail: 'sarah@safarilodge.ke',
      },
      {
        name: 'Kente Cultural Center',
        description: 'Learn about traditional Ghanaian culture and crafts.',
        category: categoryMap.get('culture'),
        location: locationMap.get('accra'),
        rating: 4.7,
        reviews: 98,
        priceLevel: '$',
        imageUrl:
          'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=1200&q=80',
        isOpen: true,
        tags: ['Cultural', 'Educational', 'Traditional', 'Crafts'],
        distance: '2.1 km',
        verified: true,
        featured: false,
        status: PlaceStatus.APPROVED,
        ownerName: 'Akosua Mensah',
        ownerEmail: 'akosua@kenteghana.org',
      },
      {
        name: 'Nile View Café',
        description: 'Mediterranean cuisine with stunning Nile river views.',
        category: categoryMap.get('restaurants'),
        location: locationMap.get('cairo'),
        rating: 4.5,
        reviews: 267,
        priceLevel: '$$',
        imageUrl:
          'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80',
        isOpen: true,
        tags: ['Mediterranean', 'Views', 'Café', 'Romantic'],
        distance: '0.5 km',
        verified: true,
        featured: false,
        status: PlaceStatus.APPROVED,
        ownerName: 'Layla Hassan',
        ownerEmail: 'layla@nileviewcafe.eg',
      },
      {
        name: 'Afrobeat Club',
        description: 'Live Afrobeat music and dancing till dawn.',
        category: categoryMap.get('nightlife'),
        location: locationMap.get('lagos'),
        rating: 4.4,
        reviews: 312,
        priceLevel: '$$',
        imageUrl:
          'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80',
        isOpen: false,
        tags: ['Live Music', 'Dancing', 'Afrobeat', 'Local'],
        distance: '1.8 km',
        verified: false,
        featured: false,
        status: PlaceStatus.PENDING,
        ownerName: 'Tunde Oladipo',
        ownerEmail: 'tunde@afrobeatclub.ng',
      },
    ];

    await this.placesRepository.save(places);
    this.logger.log('Seeded sample places');
  }
}

