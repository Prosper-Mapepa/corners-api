import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PlacesService } from './places.service';
import { PlaceStatus } from './place.entity';
import { UserRole } from '../users/user.entity';

const createMockRepository = () => ({
  findOne: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
});

const createService = () => {
  const placeRepo = createMockRepository();
  const categoryRepo = createMockRepository();
  const locationRepo = createMockRepository();
  const service = new PlacesService(placeRepo as any, categoryRepo as any, locationRepo as any);
  return { service, placeRepo, categoryRepo, locationRepo };
};

describe('PlacesService business ownership rules', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws when a business user tries to update a listing they do not own', async () => {
    const { service, placeRepo } = createService();
    placeRepo.findOne.mockResolvedValue({
      id: 'place-1',
      category: { id: 'cat-1' },
      location: { id: 'loc-1' },
      ownerEmail: 'owner@example.com',
    });

    await expect(
      service.update(
        'place-1',
        {
          description: 'Updated description',
        },
        {
          requestedByRole: UserRole.BUSINESS,
          requesterEmail: 'intruder@example.com',
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('removes restricted fields when a business user updates their own listing', async () => {
    const { service, placeRepo } = createService();
    const place = {
      id: 'place-1',
      category: { id: 'cat-1' },
      location: { id: 'loc-1' },
      ownerEmail: 'owner@example.com',
      status: PlaceStatus.PENDING,
      verified: false,
      featured: false,
    };
    placeRepo.findOne.mockResolvedValue(place);
    placeRepo.save.mockImplementation(async (value: any) => value);

    const result = await service.update(
      'place-1',
      {
        description: 'Updated description',
        status: PlaceStatus.APPROVED,
        verified: true,
        featured: true,
      },
      {
        requestedByRole: UserRole.BUSINESS,
        requesterEmail: 'owner@example.com',
      },
    );

    expect(result.description).toBe('Updated description');
    expect(result.status).toBe(PlaceStatus.PENDING);
    expect(result.verified).toBe(false);
    expect(result.featured).toBe(false);
    expect(placeRepo.save).toHaveBeenCalledWith(expect.objectContaining({ description: 'Updated description' }));
  });

  it('prevents a business user from deleting listings they do not own', async () => {
    const { service, placeRepo } = createService();
    placeRepo.findOne.mockResolvedValue({
      id: 'place-1',
      ownerEmail: 'owner@example.com',
    });
    placeRepo.delete.mockResolvedValue({ affected: 1 });

    await expect(
      service.remove('place-1', {
        requestedByRole: UserRole.BUSINESS,
        requesterEmail: 'other@example.com',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('deletes listing when owner matches business user', async () => {
    const { service, placeRepo } = createService();
    placeRepo.findOne.mockResolvedValue({
      id: 'place-1',
      ownerEmail: 'owner@example.com',
    });
    placeRepo.delete.mockResolvedValue({ affected: 1 });

    await service.remove('place-1', {
      requestedByRole: UserRole.BUSINESS,
      requesterEmail: 'owner@example.com',
    });

    expect(placeRepo.delete).toHaveBeenCalledWith('place-1');
  });

  it('throws NotFoundException when removing unknown listing', async () => {
    const { service, placeRepo } = createService();
    placeRepo.findOne.mockResolvedValue(null);

    await expect(service.remove('missing-id')).rejects.toBeInstanceOf(NotFoundException);
  });
});


