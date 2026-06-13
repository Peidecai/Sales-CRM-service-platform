import { vi, beforeEach } from 'vitest'

// Backing storage for uni storage APIs
const storage = new Map<string, string>()

const uni = {
  // Storage
  getStorageSync: vi.fn((key: string) => storage.get(key) ?? ''),
  setStorageSync: vi.fn((key: string, value: string) => {
    storage.set(key, value)
  }),
  removeStorageSync: vi.fn((key: string) => {
    storage.delete(key)
  }),
  getStorageInfoSync: vi.fn(() => ({
    keys: Array.from(storage.keys()),
    currentSize: 0,
    limitSize: 10240,
  })),

  // Network
  request: vi.fn(),
  downloadFile: vi.fn(),

  // UI feedback
  showToast: vi.fn(),
  showModal: vi.fn(),
  showLoading: vi.fn(),
  hideLoading: vi.fn(),

  // Navigation
  reLaunch: vi.fn(),

  // Network status
  onNetworkStatusChange: vi.fn(),

  // WeChat login
  login: vi.fn(),

  // Tab bar
  setTabBarBadge: vi.fn(),
  removeTabBarBadge: vi.fn(),

  // System info
  getSystemInfoSync: vi.fn(() => ({
    platform: 'devtools',
    model: 'iPhone 12',
    system: 'iOS 15.0',
    language: 'zh_CN',
    version: '8.0.5',
    SDKVersion: '2.30.0',
    screenWidth: 375,
    screenHeight: 812,
    windowWidth: 375,
    windowHeight: 812,
    statusBarHeight: 44,
    pixelRatio: 3,
  })),

  // Account info
  getAccountInfoSync: vi.fn(() => ({
    miniProgram: {
      version: '1.0.0',
    },
  })),
}

// Install uni globally
globalThis.uni = uni as unknown as UniNamespace.Uni

// Mock getCurrentPages
globalThis.getCurrentPages = vi.fn(() => [])

// Mock plus (APP runtime)
globalThis.plus = {
  runtime: {
    version: '1.0.0',
    install: vi.fn(),
    restart: vi.fn(),
  },
} as unknown as typeof plus

// Reset state before each test
beforeEach(() => {
  storage.clear()
  vi.clearAllMocks()
})
