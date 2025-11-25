import { ConflictException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';

const createMockRepository = () => ({
  findOne: jest.fn(),
  save: jest.fn(),
});

const setup = () => {
  const repo = createMockRepository();
  const service = new UsersService(repo as any);
  return { service, repo };
};

describe('UsersService.updateProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates name and avatar', async () => {
    const { service, repo } = setup();
    repo.findOne.mockResolvedValueOnce({
      id: 'user-1',
      email: 'biz@example.com',
      name: 'Old Name',
      avatarUrl: null,
      passwordHash: 'hash',
    });
    repo.save.mockImplementation(async (entity: any) => entity);

    const result = await service.updateProfile('user-1', {
      name: 'New Name',
      avatarUrl: 'https://example.com/avatar.png',
    });

    expect(result.name).toBe('New Name');
    expect(result.avatarUrl).toBe('https://example.com/avatar.png');
    expect(repo.save).toHaveBeenCalled();
  });

  it('throws when email already exists', async () => {
    const { service, repo } = setup();
    repo.findOne
      .mockResolvedValueOnce({
        id: 'user-1',
        email: 'biz@example.com',
        name: 'Biz',
        passwordHash: 'hash',
      })
      .mockResolvedValueOnce({
        id: 'user-2',
        email: 'taken@example.com',
      });

    await expect(
      service.updateProfile('user-1', {
        email: 'taken@example.com',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws NotFoundException when user missing', async () => {
    const { service, repo } = setup();
    repo.findOne.mockResolvedValue(null);
    await expect(service.updateProfile('missing', { name: 'X' })).rejects.toBeInstanceOf(NotFoundException);
  });
});


