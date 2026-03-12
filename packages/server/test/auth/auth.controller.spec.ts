import { Test, TestingModule } from '@nestjs/testing'
import { AuthController } from '../../src/modules/auth/auth.controller'
import { AuthService } from '../../src/modules/auth/auth.service'
import { RedisService } from '../../src/common/redis'
import { UserRole } from '@crm/shared'

describe('AuthController', () => {
  let controller: AuthController
  let authService: {
    login: jest.Mock
    refreshToken: jest.Mock
    getProfile: jest.Mock
    updateProfile: jest.Mock
    changePassword: jest.Mock
    logout: jest.Mock
  }

  const mockReq = (userId = 1) =>
    ({
      user: { id: userId, username: 'testuser', role: UserRole.SALES },
      headers: { authorization: 'Bearer mock-token' },
    }) as never

  beforeEach(async () => {
    authService = {
      login: jest.fn(),
      refreshToken: jest.fn(),
      getProfile: jest.fn(),
      updateProfile: jest.fn(),
      changePassword: jest.fn(),
      logout: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: RedisService, useValue: { get: jest.fn(), set: jest.fn(), del: jest.fn(), exists: jest.fn(), delByPattern: jest.fn() } },
      ],
    }).compile()

    controller = module.get<AuthController>(AuthController)
  })

  /* ---------- login ---------- */
  describe('login', () => {
    it('should call authService.login and return tokens', async () => {
      const tokens = { accessToken: 'at', refreshToken: 'rt', user: { id: 1, username: 'test', role: 'sales', name: 'Test' } }
      authService.login.mockResolvedValue(tokens)

      const result = await controller.login({ username: 'test', password: 'pass123' })

      expect(authService.login).toHaveBeenCalledWith({ username: 'test', password: 'pass123' })
      expect(result).toBe(tokens)
    })
  })

  /* ---------- refresh ---------- */
  describe('refresh', () => {
    it('should call authService.refreshToken', async () => {
      const tokens = { accessToken: 'new-at', refreshToken: 'new-rt', user: { id: 1 } }
      authService.refreshToken.mockResolvedValue(tokens)

      const result = await controller.refresh({ refreshToken: 'old-rt' })

      expect(authService.refreshToken).toHaveBeenCalledWith('old-rt')
      expect(result).toBe(tokens)
    })
  })

  /* ---------- getProfile ---------- */
  describe('getProfile', () => {
    it('should pass userId to getProfile', async () => {
      const profile = { id: 1, username: 'test', name: 'Test' }
      authService.getProfile.mockResolvedValue(profile)

      const result = await controller.getProfile(1)

      expect(authService.getProfile).toHaveBeenCalledWith(1)
      expect(result).toBe(profile)
    })
  })

  /* ---------- updateProfile ---------- */
  describe('updateProfile', () => {
    it('should pass userId and dto to service', async () => {
      const updated = { id: 1, name: 'New Name' }
      authService.updateProfile.mockResolvedValue(updated)

      const dto = { name: 'New Name' }
      const result = await controller.updateProfile(1, dto)

      expect(authService.updateProfile).toHaveBeenCalledWith(1, dto)
      expect(result).toBe(updated)
    })
  })

  /* ---------- changePassword ---------- */
  describe('changePassword', () => {
    it('should pass userId and dto to service', async () => {
      authService.changePassword.mockResolvedValue(null)

      const dto = { oldPassword: 'old', newPassword: 'new123' }
      const result = await controller.changePassword(1, dto)

      expect(authService.changePassword).toHaveBeenCalledWith(1, dto)
      expect(result).toBeNull()
    })
  })

  /* ---------- logout ---------- */
  describe('logout', () => {
    it('should extract token from authorization header and call logout', async () => {
      authService.logout.mockResolvedValue(undefined)

      const result = await controller.logout(mockReq())

      expect(authService.logout).toHaveBeenCalledWith('mock-token')
      expect(result).toBeNull()
    })

    it('should not call logout if no authorization header', async () => {
      authService.logout.mockResolvedValue(undefined)
      const req = { user: { id: 1 }, headers: {} } as never

      const result = await controller.logout(req)

      expect(authService.logout).not.toHaveBeenCalled()
      expect(result).toBeNull()
    })
  })
})
