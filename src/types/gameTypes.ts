// src/types/gameTypes.ts

// ===== 基础类型定义 =====

/**
 * 台桌信息
 */
export interface TableInfo {
  id: number
  group_prefix: string
  table_title: string
  game_type_id: number
  status: number  // 1正常 2维护
  start_time: string
  close_time: string
  countdown_time: number
  kaipai_time: number
  list_order: number
  create_time: string
  update_time: string
  remark?: string
}

/**
 * 露珠信息
 */
export interface LuZhuInfo {
  id: number
  table_id: number
  qihao_number: string
  result: string
  status: number
  show_time: string
  create_time: string
  update_time: string
  remark?: string
}

/**
 * API响应格式
 */
export interface ApiResponse<T = any> {
  code: number
  msg: string
  data: T
}

/**
 * 分页响应
 */
export interface PageResponse<T> {
  list: T[]
  total: number
  page: number
  limit: number
}

/**
 * 露珠表单数据
 */
export interface LuZhuFormData {
  qihao_number: string
  result: string
  status: number
  show_time: string
  remark?: string
}