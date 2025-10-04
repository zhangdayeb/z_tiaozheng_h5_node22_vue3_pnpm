// src/services/httpClient.ts
import axios from 'axios'
import type { AxiosInstance, AxiosResponse, AxiosError } from 'axios'

// API响应接口
interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
}

// 业务错误类
export class BusinessError extends Error {
  public readonly code: number
  public readonly businessError = true
  
  constructor(message: string, code: number) {
    super(message)
    this.code = code
    this.name = 'BusinessError'
  }
}

// HTTP客户端类
class HttpClient {
  private client: AxiosInstance
  private token: string = ''

  constructor() {
    this.client = this.createClient()
    this.setupInterceptors()
  }

  private createClient(): AxiosInstance {
    return axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL || '',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }

  private setupInterceptors(): void {
    // 请求拦截器 - 强制添加token
    this.client.interceptors.request.use(
      (config) => {
        if (!this.token) {
          throw new Error('Token未设置，无法发送请求')
        }
        config.headers['x-csrf-token'] = this.token
        return config
      },
      (error) => Promise.reject(error)
    )

    // 响应拦截器
    this.client.interceptors.response.use(
      (response: AxiosResponse<ApiResponse>) => {
        const { data } = response
        
        if (data.code === 200 || data.code === 1) {
          return response
        } else {
          throw new BusinessError(data.message || '操作失败', data.code)
        }
      },
      (error: AxiosError) => {
        const message = this.getHttpErrorMessage(error)
        throw new Error(message)
      }
    )
  }

  private getHttpErrorMessage(error: AxiosError): string {
    if (!error.response) {
      return '网络连接失败'
    }
    
    const status = error.response.status
    switch (status) {
      case 401: return '认证失败'
      case 403: return '权限不足'
      case 404: return '请求的资源不存在'
      case 500: return '服务器内部错误'
      default: return `请求失败 (${status})`
    }
  }

  setAuthToken(token: string): void {
    if (!token) {
      throw new Error('Token不能为空')
    }
    this.token = token
  }

  async get<T = any>(url: string, params?: Record<string, any>): Promise<T> {
    const response = await this.client.get<ApiResponse<T>>(url, { params })
    return response.data.data
  }

  async post<T = any>(url: string, data?: any): Promise<T> {
    const response = await this.client.post<ApiResponse<T>>(url, data)
    return response.data.data
  }
}

// 创建单例实例
const httpClient = new HttpClient()

// 导出
export { httpClient }
export const setAuthToken = (token: string) => httpClient.setAuthToken(token)
export const get = <T = any>(url: string, params?: Record<string, any>): Promise<T> =>
  httpClient.get<T>(url, params)
export const post = <T = any>(url: string, data?: any): Promise<T> =>
  httpClient.post<T>(url, data)

export default httpClient