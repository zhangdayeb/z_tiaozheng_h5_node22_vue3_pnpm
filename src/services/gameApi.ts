// src/services/gameApi.ts

import { get, post } from './httpClient'
import type { TableInfo, LuZhuInfo, PageResponse } from '@/types/gameTypes'

interface TableListResponse {
  list: TableInfo[]
  total: number
  page: number
  limit: number
}

/**
 * 游戏API服务
 */
export class GameApiService {
  
  /**
   * 获取集团台桌列表
   * @param group_prefix 集团前缀
   */
  static async getGroupTableList(group_prefix: string): Promise<TableInfo[]> {
    // 后端返回的是分页结构，需要提取 list 数组
    const response = await get<TableListResponse>('/caipiao/group_table_list', { 
      group_prefix,
      page: 1,
      limit: 100  // 获取所有台桌
    })
    
    // 返回列表数组
    return response.list || []
  }

  /**
   * 根据台桌ID获取露珠列表
   * @param params 查询参数
   */
  static async getLuZhuByTableId(params: {
    table_id: number
    group_prefix?: string
    page?: number
    limit?: number
    qihao_number?: string
    start_date?: string
    end_date?: string
  }): Promise<PageResponse<LuZhuInfo>> {
    return get('/caipiao/group_lu_zhu_by_table_id_list', params)
  }

  /**
   * 新增露珠记录
   * @param data 露珠数据
   */
  static async addLuZhu(data: {
    table_id: number
    game_type: number
    qihao_number: string
    result: string
    status: number
    show_time?: string
    remark?: string
  }): Promise<{ id: number }> {
    return post('/caipiao/group_lu_zhu_add', data)
  }

  /**
   * 编辑露珠记录
   * @param luzhu_id 露珠ID
   * @param data 要更新的数据
   */
  static async editLuZhu(
    luzhu_id: number, 
    data: {
      qihao_number?: string
      result?: string
      status?: number
      show_time?: string
      remark?: string
    }
  ): Promise<void> {
    return post('/caipiao/group_lu_edit', {
      id: luzhu_id,
      ...data
    })
  }

  /**
   * 删除露珠记录
   * @param luzhu_id 露珠ID或ID数组
   */
  static async deleteLuZhu(luzhu_id: number | number[]): Promise<{ deleted: number }> {
    return post('/caipiao/group_lu_del', { id: luzhu_id })
  }

  /**
   * 获取单个露珠详情
   * @param luzhu_id 露珠ID
   */
  static async getLuZhuDetail(luzhu_id: number): Promise<LuZhuInfo> {
    return get('/caipiao/group_lu_zhu_info', { id: luzhu_id })
  }
}

export default GameApiService