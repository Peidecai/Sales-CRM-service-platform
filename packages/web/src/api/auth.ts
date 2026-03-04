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

export const authApi = {
  login(data: LoginDto): Promise<LoginResponse> {
    return request.post('/auth/login', data)
  },

  logout(): Promise<void> {
    return request.post('/auth/logout')
  },

  refreshToken(refreshToken: string): Promise<LoginResponse> {
    return request.post('/auth/refresh', { refreshToken })
  },
}
