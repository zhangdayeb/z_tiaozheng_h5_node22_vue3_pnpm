// src/services/gameApi.ts

import { get, post } from './httpClient'

/**
 * 游戏API服务
 */
export class GameApiService {

  /**
   * 获取单个露珠详情
   * @param luzhu_id 露珠ID
   */
  static async getLuZhuDetail(luzhu_id: number): Promise<LuZhuInfo> {
    return get('/caipiao/group_lu_zhu_info', { id: luzhu_id })
  }
}

export default GameApiService