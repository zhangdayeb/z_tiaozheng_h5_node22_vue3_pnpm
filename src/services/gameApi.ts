// src/services/gameApi.ts

import { get, post } from './httpClient'

/**
 * 游戏API服务 - 简化版
 * 对应后端路由:
 * - /tiaozheng/login - 登录
 * - /tiaozheng/search - 搜索
 * - /tiaozheng/change - 修改
 */
export class GameApiService {
  
  /**
   * 用户登录
   * @param username 用户名
   * @param password 密码
   */
  static async login(username: string, password: string) {
    return post('/tiaozheng/login', { 
      username, 
      password 
    })
  }

  /**
   * 搜索游戏记录
   * @param params 搜索参数
   */
  static async searchRecords(params: {
    username: string
    start_date?: string
    end_date?: string
    page?: number
    limit?: number
  }) {
    return get('/tiaozheng/search', params)
  }

  /**
   * 获取系统配置
   * @param params 参数
   */
  static async getSysConfig(params: {}) {
    return get('/tiaozheng/config', params)
  }

  // 修改记录的输赢状态
  static async changeRecord(params: {
    log_id: number      // 记录ID
    status: string      // 输赢状态：'win' 或 'lose'
  }) {
    return post('/tiaozheng/change', params)
  }
}

// 导出默认实例
export default GameApiService

// 快捷方法导出
export const login = GameApiService.login
export const searchRecords = GameApiService.searchRecords
export const changeRecord = GameApiService.changeRecord