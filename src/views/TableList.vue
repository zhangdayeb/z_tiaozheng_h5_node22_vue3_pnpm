<template>
  <div class="table-list-container">
    <!-- 顶部导航 -->
    <van-nav-bar 
      title="台桌列表" 
      :fixed="true"
      placeholder
    />

    <!-- 集团信息提示 -->
    <van-notice-bar
      v-if="groupPrefix"
      :text="`当前集团: ${groupPrefix}`"
      left-icon="info-o"
    />

    <!-- 加载状态 -->
    <van-loading v-if="tableLoading" class="loading-wrapper" size="24px" vertical>
      加载中...
    </van-loading>

    <!-- 错误提示 -->
    <van-empty 
      v-else-if="error" 
      image="error" 
      :description="error"
    >
      <van-button round type="primary" @click="handleRetry">重试</van-button>
    </van-empty>

    <!-- 空数据 -->
    <van-empty 
      v-else-if="!tableList.length" 
      description="暂无台桌数据"
    />

    <!-- 台桌列表 -->
    <div v-else class="table-list">
      <van-cell-group inset>
        <van-cell
          v-for="table in tableList"
          :key="table.id"
          :title="table.table_title"
          :label="getTableLabel(table)"
          is-link
          @click="goToLuZhuList(table)"
        >
          <template #value>
            <van-tag 
              :type="table.status === 1 ? 'success' : 'warning'"
              size="medium"
            >
              {{ table.status === 1 ? '正常' : '维护' }}
            </van-tag>
          </template>
        </van-cell>
      </van-cell-group>
    </div>

    <!-- 底部安全距离 -->
    <div class="bottom-safe-area"></div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/stores/gameStore'
import { showToast, showConfirmDialog } from 'vant'
import type { TableInfo } from '@/types/gameTypes'

const router = useRouter()
const gameStore = useGameStore()

// 计算属性
const groupPrefix = computed(() => gameStore.groupPrefix)
const tableList = computed(() => gameStore.tableList)
const tableLoading = computed(() => gameStore.tableLoading)
const error = computed(() => gameStore.error)

// 获取台桌标签信息
const getTableLabel = (table: TableInfo) => {
  const parts = []
  parts.push(`游戏类型: ${table.game_type_id}`)
  parts.push(`排序: ${table.list_order}`)
  if (table.remark) {
    parts.push(`备注: ${table.remark}`)
  }
  return parts.join(' | ')
}

// 跳转到露珠列表
const goToLuZhuList = (table: TableInfo) => {
  if (table.status !== 1) {
    showToast('该台桌正在维护中')
    return
  }

  // 保存当前选中的台桌
  gameStore.selectTable(table)
  
  // 跳转到露珠列表
  router.push({
    path: '/luzhu',
    query: {
      group_prefix: groupPrefix.value,
      table_id: String(table.id),
      game_type: String(table.game_type_id)
    }
  })
}

// 重试加载
const handleRetry = () => {
  gameStore.clearError()
  loadTableList()
}

// 加载台桌列表
const loadTableList = async () => {
  if (!groupPrefix.value) {
    showConfirmDialog({
      title: '参数缺失',
      message: '缺少集团参数(group_prefix)，无法加载台桌列表',
      showCancelButton: false
    })
    return
  }
  
  try {
    await gameStore.fetchTableList()
  } catch (e) {
    console.error('加载台桌列表失败:', e)
  }
}

// 页面加载
onMounted(() => {
  loadTableList()
})
</script>

<style lang="scss" scoped>
.table-list-container {
  min-height: 100vh;
  background-color: #f7f8fa;
}

.loading-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
}

.table-list {
  padding: 12px 0;
}

.bottom-safe-area {
  height: 50px;
}

:deep(.van-cell__label) {
  margin-top: 4px;
  font-size: 12px;
  color: #969799;
}

:deep(.van-tag) {
  font-weight: 500;
}
</style>