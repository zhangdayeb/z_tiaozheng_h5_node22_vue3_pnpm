// src/utils/urlParams.ts
// 百家乐游戏参数获取工具 - 简化版

// 游戏参数接口
export interface GameParams {
  group_prefix: string
  table_id: string
  luzhu_id: string
  game_type: string
}

/**
 * 从URL获取游戏参数
 * 示例URL: http://localhost:3000/?group_prefix=YHYL&table_id=10&luzhu_id=10&game_type=10
 */
export const getGameParams = (): GameParams => {
  const urlParams = new URLSearchParams(window.location.search)

  return {
    group_prefix: urlParams.get('group_prefix') || '',
    table_id: urlParams.get('table_id') || '',
    game_type: urlParams.get('game_type') || '',
    luzhu_id: urlParams.get('luzhu_id') || ''
  }
}

/**
 * 检查参数是否完整
 */
export const hasValidParams = (params: GameParams): boolean => {
  return !!(params.group_prefix && params.table_id && params.game_type && params.luzhu_id)
}

/**
 * 获取参数并验证完整性
 */
export const getValidatedParams = (): {
  params: GameParams
  isValid: boolean
  missing: string[]
} => {
  const params = getGameParams()
  const missing: string[] = []

  if (!params.group_prefix) missing.push('group_prefix')
  if (!params.table_id) missing.push('table_id')
  if (!params.game_type) missing.push('game_type')
  if (!params.luzhu_id) missing.push('luzhu_id')

  return {
    params,
    isValid: missing.length === 0,
    missing
  }
}
