// src/stores/gameStore.ts

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import GameApiService from '@/services/gameApi'
import { getGameParams } from '@/utils/urlParams'
import type { TableInfo, LuZhuInfo } from '@/types/gameTypes'

export const useGameStore = defineStore('game', () => {
  // URL参数 - 只读取，不更新
  const urlParams = ref(getGameParams())
  
  // 台桌列表
  const tableList = ref<TableInfo[]>([])
  const currentTable = ref<TableInfo | null>(null)
  const tableLoading = ref(false)
  
  // 露珠列表
  const luzhuList = ref<LuZhuInfo[]>([])
  const currentLuzhu = ref<LuZhuInfo | null>(null)
  const luzhuLoading = ref(false)
  const luzhuTotal = ref(0)
  const luzhuPage = ref(1)
  const luzhuLimit = ref(20)
  
  // 错误信息
  const error = ref<string>('')

  // 获取URL参数
  const groupPrefix = computed(() => urlParams.value.group_prefix)
  const tableId = computed(() => urlParams.value.table_id ? Number(urlParams.value.table_id) : null)
  const luzhuId = computed(() => urlParams.value.luzhu_id ? Number(urlParams.value.luzhu_id) : null)

  // 获取台桌列表
  async function fetchTableList() {
    if (!groupPrefix.value) {
      error.value = '缺少集团参数'
      return
    }
    
    tableLoading.value = true
    error.value = ''
    
    try {
      const data = await GameApiService.getGroupTableList(groupPrefix.value)
      tableList.value = data
    } catch (e: any) {
      error.value = e.message || '获取台桌列表失败'
      console.error('获取台桌列表失败:', e)
    } finally {
      tableLoading.value = false
    }
  }


  // 获取露珠列表
  async function fetchLuZhuList(page = 1, filters?: any) {
    if (!tableId.value) {
      error.value = '缺少台桌ID'
      return
    }
    
    // 如果是第一页，显示加载状态并清空列表
    if (page === 1) {
      luzhuLoading.value = true
      luzhuList.value = []  // 第一页时清空列表
    }
    
    error.value = ''
    luzhuPage.value = page
    
    try {
      const data = await GameApiService.getLuZhuByTableId({
        table_id: tableId.value,
        group_prefix: groupPrefix.value,
        page: page,  // 使用传入的 page 参数，而不是 luzhuPage.value
        limit: luzhuLimit.value,
        ...filters
      })
      
      // 根据页码决定是替换还是追加数据
      if (page === 1) {
        // 第一页：替换数据
        luzhuList.value = data.list || []
      } else {
        // 后续页：追加数据（不清空原有数据）
        luzhuList.value = [...luzhuList.value, ...(data.list || [])]
      }
      
      // 更新总数
      luzhuTotal.value = data.total || 0
      
    } catch (e: any) {
      error.value = e.message || '获取露珠列表失败'
      console.error('获取露珠列表失败:', e)
    } finally {
      // 只在第一页时关闭加载状态
      if (page === 1) {
        luzhuLoading.value = false
      }
    }
  }

  // 添加露珠
  async function addLuZhu(data: any) {
    // 直接从URL参数获取
    const tableIdFromUrl = urlParams.value.table_id ? Number(urlParams.value.table_id) : null
    const gameTypeFromUrl = urlParams.value.game_type ? Number(urlParams.value.game_type) : null
    
    if (!tableIdFromUrl) {
      throw new Error('缺少台桌ID')
    }
    
    if (!gameTypeFromUrl) {
      throw new Error('缺少游戏类型')
    }
    
    try {
      await GameApiService.addLuZhu({
        ...data,
        table_id: tableIdFromUrl,
        game_type: gameTypeFromUrl
      })
      
      // 刷新列表
      await fetchLuZhuList(luzhuPage.value)
      return true
    } catch (e: any) {
      error.value = e.message || '添加失败'
      throw e
    }
  }

  // 编辑露珠
  async function editLuZhu(id: number, data: any) {
    try {
      await GameApiService.editLuZhu(id, data)
      
      // 刷新列表
      await fetchLuZhuList(luzhuPage.value)
      return true
    } catch (e: any) {
      error.value = e.message || '编辑失败'
      throw e
    }
  }

  // 删除露珠（只支持单个）
  async function deleteLuZhu(id: number) {
    try {
      await GameApiService.deleteLuZhu(id)
      
      // 刷新列表
      await fetchLuZhuList(luzhuPage.value)
      return true
    } catch (e: any) {
      error.value = e.message || '删除失败'
      throw e
    }
  }

  // 选择台桌
  function selectTable(table: TableInfo) {
    currentTable.value = table
  }

  // 获取单个露珠详情
  async function fetchLuZhuDetail(id: number) {
    try {
      const data = await GameApiService.getLuZhuDetail(id)
      currentLuzhu.value = data
      return data
    } catch (e: any) {
      error.value = e.message || '获取详情失败'
      throw e
    }
  }

  // 清除错误
  function clearError() {
    error.value = ''
  }

  // 重置状态
  function reset() {
    tableList.value = []
    currentTable.value = null
    luzhuList.value = []
    currentLuzhu.value = null
    error.value = ''
    luzhuPage.value = 1
  }

  return {
    // 状态
    urlParams,
    tableList,
    currentTable,
    luzhuList,
    currentLuzhu,
    tableLoading,
    luzhuLoading,
    luzhuTotal,
    luzhuPage,
    luzhuLimit,
    error,
    
    // 计算属性
    groupPrefix,
    tableId,
    luzhuId,
    
    // 方法
    fetchTableList,
    fetchLuZhuList,
    addLuZhu,
    editLuZhu,
    deleteLuZhu,
    selectTable,
    fetchLuZhuDetail,
    clearError,
    reset
  }
})