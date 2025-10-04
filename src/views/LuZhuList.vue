<template>
  <div class="luzhu-list-container">
    <!-- 顶部导航 -->
    <van-nav-bar 
      title="露珠列表" 
      left-text="返回"
      left-arrow
      :fixed="true"
      placeholder
      @click-left="onClickLeft"
    >
      <template #right>
        <van-button 
          type="primary" 
          size="small" 
          round
          @click="goToAdd"
        >
          新增
        </van-button>
      </template>
    </van-nav-bar>

    <!-- 搜索栏 -->
    <div class="search-bar">
      <van-search
        v-model="searchForm.qihao"
        placeholder="请输入期号搜索"
        @search="onSearch"
        @clear="onClear"
      />
      <van-row :gutter="10">
        <van-col :span="12">
          <van-field
            v-model="searchForm.startDate"
            label="开始日期"
            placeholder="选择开始日期"
            readonly
            @click="showStartPicker = true"
          />
        </van-col>
        <van-col :span="12">
          <van-field
            v-model="searchForm.endDate"
            label="结束日期"
            placeholder="选择结束日期"
            readonly
            @click="showEndPicker = true"
          />
        </van-col>
      </van-row>
    </div>

    <!-- 加载状态 -->
    <van-loading v-if="luzhuLoading && !luzhuList.length" class="loading-wrapper" size="24px" vertical>
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
      v-else-if="!luzhuList.length" 
      description="暂无露珠数据"
    >
      <van-button round type="primary" @click="goToAdd">新增露珠</van-button>
    </van-empty>

    <!-- 露珠列表 -->
    <van-list
      v-else
      v-model:loading="listLoading"
      :finished="listFinished"
      finished-text="没有更多了"
      @load="onLoad"
    >
      <van-swipe-cell v-for="item in luzhuList" :key="item.id">
        <van-cell 
          :title="`期号: ${item.qihao_number}`"
          :label="getLuZhuLabel(item)"
          @click="goToEdit(item)"
        >
          <template #value>
            <div class="cell-value">
              <div class="result-text">{{ item.result }}</div>
              <van-tag 
                :type="item.status === 1 ? 'success' : 'default'"
                size="medium"
              >
                {{ item.status === 1 ? '正常' : '停用' }}
              </van-tag>
            </div>
          </template>
        </van-cell>
        <template #right>
          <van-button 
            type="primary" 
            square 
            text="编辑"
            style="height: 100%"
            @click="goToEdit(item)"
          />
          <van-button 
            type="danger" 
            square 
            text="删除"
            style="height: 100%"
            @click="handleDelete(item)"
          />
        </template>
      </van-swipe-cell>
    </van-list>

    <!-- 日期选择器 -->
    <van-calendar 
      v-model:show="showStartPicker" 
      @confirm="onStartDateConfirm"
    />
    <van-calendar 
      v-model:show="showEndPicker" 
      @confirm="onEndDateConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/stores/gameStore'
import { showToast, showConfirmDialog } from 'vant'
import type { LuZhuInfo } from '@/types/gameTypes'

const router = useRouter()
const gameStore = useGameStore()

// 添加一个标志来控制首次加载
const isFirstLoad = ref(true)

// 状态
const searchForm = ref({
  qihao: '',
  startDate: '',
  endDate: ''
})
const showStartPicker = ref(false)
const showEndPicker = ref(false)
const listLoading = ref(false)
const listFinished = ref(false)

// 计算属性
const groupPrefix = computed(() => gameStore.groupPrefix)
const tableId = computed(() => gameStore.tableId)
const luzhuList = computed(() => gameStore.luzhuList)
const luzhuLoading = computed(() => gameStore.luzhuLoading)
const luzhuTotal = computed(() => gameStore.luzhuTotal)
const luzhuPage = computed(() => gameStore.luzhuPage)
const luzhuLimit = computed(() => gameStore.luzhuLimit)
const error = computed(() => gameStore.error)

// 获取露珠标签信息
const getLuZhuLabel = (item: LuZhuInfo) => {
  const parts = []
  parts.push(`显示时间: ${item.show_time}`)
  if (item.remark) {
    parts.push(`备注: ${item.remark}`)
  }
  parts.push(`创建: ${item.create_time}`)
  return parts.join('\n')
}

// 返回上一页
const onClickLeft = () => {
  router.back()
}

// 跳转到新增页面
const goToAdd = () => {
  if (!tableId.value) {
    showToast('缺少台桌信息')
    return
  }
  
  router.push({
    path: '/luzhu/edit',
    query: {
      group_prefix: groupPrefix.value,
      table_id: String(tableId.value),
      game_type: gameStore.urlParams.game_type
    }
  })
}

// 跳转到编辑页面
const goToEdit = (item: LuZhuInfo) => {
  router.push({
    path: '/luzhu/edit',
    query: {
      group_prefix: groupPrefix.value,
      table_id: String(tableId.value),
      luzhu_id: String(item.id),
      game_type: gameStore.urlParams.game_type
    }
  })
}

// 删除露珠
const handleDelete = async (item: LuZhuInfo) => {
  try {
    await showConfirmDialog({
      title: '确认删除',
      message: `确定要删除期号 ${item.qihao_number} 的露珠记录吗？`
    })
    
    await gameStore.deleteLuZhu(item.id)
    showToast('删除成功')
  } catch (e) {
    // 用户取消或删除失败
    console.log('删除操作取消或失败')
  }
}

// 搜索 - 修改：重置标志
const onSearch = () => {
  // 重置状态
  isFirstLoad.value = true
  listFinished.value = false
  gameStore.luzhuList = []
  gameStore.luzhuPage = 1
  loadLuZhuList()
}

// 清除搜索
const onClear = () => {
  searchForm.value.qihao = ''
  onSearch()
}

// 选择开始日期
const onStartDateConfirm = (date: Date) => {
  searchForm.value.startDate = formatDate(date)
  showStartPicker.value = false
  onSearch()
}

// 选择结束日期
const onEndDateConfirm = (date: Date) => {
  searchForm.value.endDate = formatDate(date)
  showEndPicker.value = false
  onSearch()
}

// 格式化日期
const formatDate = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 加载更多 - 重要修改
const onLoad = async () => {
  // 如果是首次加载，跳过（因为 onMounted 已经加载了）
  if (isFirstLoad.value) {
    isFirstLoad.value = false
    listLoading.value = false
    
    // 检查首次加载后是否需要标记为完成
    if (luzhuList.value.length >= luzhuTotal.value) {
      listFinished.value = true
    }
    return
  }
  
  // 如果已经加载完毕，直接返回
  if (listFinished.value) return
  
  // 加载下一页
  listLoading.value = true
  const nextPage = luzhuPage.value + 1
  await loadLuZhuList(nextPage)
  listLoading.value = false
  
  // 检查是否加载完毕
  if (luzhuList.value.length >= luzhuTotal.value) {
    listFinished.value = true
  }
}

// 重试 - 修改：重置标志
const handleRetry = () => {
  isFirstLoad.value = true
  listFinished.value = false
  gameStore.clearError()
  gameStore.luzhuList = []
  gameStore.luzhuPage = 1
  loadLuZhuList()
}

// 加载露珠列表
const loadLuZhuList = async (page = 1) => {
  if (!tableId.value) {
    showToast('缺少台桌ID参数')
    return
  }
  
  const filters: any = {}
  if (searchForm.value.qihao) {
    filters.qihao_number = searchForm.value.qihao
  }
  if (searchForm.value.startDate) {
    filters.start_date = searchForm.value.startDate
  }
  if (searchForm.value.endDate) {
    filters.end_date = searchForm.value.endDate
  }
  
  try {
    await gameStore.fetchLuZhuList(page, filters)
  } catch (e) {
    console.error('加载露珠列表失败:', e)
  }
}

// 页面加载
onMounted(() => {
  // 初始化时重置状态
  isFirstLoad.value = true
  listFinished.value = false
  gameStore.luzhuList = []
  gameStore.luzhuPage = 1
  loadLuZhuList()
})
</script>

<style lang="scss" scoped>
.luzhu-list-container {
  min-height: 100vh;
  background-color: #f7f8fa;
}

.search-bar {
  background: white;
  padding-bottom: 10px;
}

.loading-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
}

.cell-value {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  
  .result-text {
    font-size: 16px;
    font-weight: 500;
    color: #323233;
  }
}

:deep(.van-cell__label) {
  margin-top: 4px;
  font-size: 12px;
  color: #969799;
  white-space: pre-line;
}

:deep(.van-swipe-cell__right) {
  display: flex;
}
</style>