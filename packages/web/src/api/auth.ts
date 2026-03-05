import request from './request'

export interface LoginDto {
  username: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  user: {
    id: number
    username: string
    name: string
    role: string
  }
}

export interface UserProfile {
  id: number
  username: string
  name: string
  email: string
  phone: string
  role: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface UpdateProfileDto {
  name?: string
  email?: string
  phone?: string
}

export interface ChangePasswordDto {
  oldPassword: string
  newPassword: string
}

export interface ApiResponse<T> {
  code: number
  message: string
  data: T | null
}

export const authApi = {
  login(data: LoginDto): Promise<ApiResponse<LoginResponse>> {
    return request.post('/auth/login', data)
  },

  logout(): Promise<ApiResponse<null>> {
    return request.post('/auth/logout')
  },

  refreshToken(refreshToken: string): Promise<ApiResponse<LoginResponse>> {
    return request.post('/auth/refresh', { refreshToken })
  },

  getProfile(): Promise<ApiResponse<UserProfile>> {
    return request.get('/auth/profile')
  },

  updateProfile(data: UpdateProfileDto): Promise<ApiResponse<UserProfile>> {
    return request.put('/auth/profile', data)
  },

  changePassword(data: ChangePasswordDto): Promise<ApiResponse<null>> {
    return request.put('/auth/change-password', data)
  },
}
