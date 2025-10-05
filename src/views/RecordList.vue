<template>
  <div class="record-list-container">
    <!-- 顶部导航 -->
    <van-nav-bar
      :title="`${username} 的游戏记录`"
      left-arrow
      @click-left="goBack"
    />

    <!-- 搜索条件 -->
    <div class="search-section">
      <van-cell-group inset>
        <van-field
          v-model="startDate"
          label="开始日期"
          placeholder="选择开始日期"
          readonly
          clickable
          @click="showStartPicker = true"
        >
          <template #right-icon>
            <van-icon name="calendar-o" />
          </template>
        </van-field>
        
        <van-field
          v-model="endDate"
          label="结束日期"
          placeholder="选择结束日期"
          readonly
          clickable
          @click="showEndPicker = true"
        >
          <template #right-icon>
            <van-icon name="calendar-o" />
          </template>
        </van-field>
      </van-cell-group>

      <div class="search-buttons">
        <van-button type="primary" size="small" @click="handleSearch">
          搜索
        </van-button>
        <van-button type="default" size="small" @click="handleReset">
          重置
        </van-button>
      </div>
    </div>

    <!-- 统计信息 -->
    <div class="stats-info" v-if="statsInfo.visible">
      <div class="stat-item">
        <span class="label">总记录：</span>
        <span class="value">{{ statsInfo.total }}</span>
      </div>
      <div class="stat-item">
        <span class="label">当前余额：</span>
        <span class="value money">¥{{ statsInfo.balance }}</span>
      </div>
    </div>

    <!-- 记录列表 -->
    <div class="record-list">
      <van-list
        v-model:loading="loading"
        :finished="finished"
        finished-text="没有更多了"
        @load="onLoad"
        :immediate-check="false"
      >
        <div
          v-for="item in recordList"
          :key="item.id"
          class="record-item"
          :class="{ 'clickable': isModifiable(item) }"
          @click="handleItemClick(item)"
        >
          <div class="item-header">
            <span class="game-type">{{ getGameTypeText(item) }}</span>
            <span class="time">{{ formatTime(item.created_at) }}</span>
          </div>
          
          <div class="item-content">
            <div class="money-info">
              <span class="label">金额：</span>
              <span class="amount" :class="getMoneyClass(item)">
                {{ getMoneyDisplay(item) }}
              </span>
            </div>
            
            <div class="balance-info">
              <span class="label">余额：</span>
              <span class="balance">{{ formatMoney(item.money_after) }}</span>
            </div>
          </div>
          
          <div class="item-footer">
            <van-tag 
              :type="getStatusTagType(item)"
              size="medium"
            >
              {{ getStatusText(item) }}
            </van-tag>
            <span class="remark">{{ getRemarkText(item) }}</span>
          </div>
        </div>
      </van-list>

      <!-- 空状态 -->
      <van-empty
        v-if="!loading && recordList.length === 0"
        description="暂无记录"
        image="default"
      />
    </div>

    <!-- 日期选择器 -->
    <van-popup v-model:show="showStartPicker" position="bottom">
      <van-date-picker
        v-model="startPickerDate"
        title="选择开始日期"
        @confirm="onStartDateConfirm"
        @cancel="showStartPicker = false"
      />
    </van-popup>

    <van-popup v-model:show="showEndPicker" position="bottom">
      <van-date-picker
        v-model="endPickerDate"
        title="选择结束日期"
        @confirm="onEndDateConfirm"
        @cancel="showEndPicker = false"
      />
    </van-popup>

    <!-- 加载动画 -->
    <van-overlay :show="changeLoading">
      <div class="loading-wrapper">
        <van-loading size="24px" vertical>修改中...</van-loading>
      </div>
    </van-overlay>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast, showConfirmDialog } from 'vant'
import { searchRecords, changeRecord } from '@/services/gameApi'

const route = useRoute()
const router = useRouter()

// 定义操作类型常量（根据实际后端定义调整）
const OPERATE_TYPES = {
  BET: 1,           // 下注
  SETTLEMENT: 2,    // 结算
  RECHARGE: 3,      // 充值
  WITHDRAW: 4,      // 提现
  // ... 其他类型
}

// 用户名
const username = ref('')

// 搜索条件
const startDate = ref('')
const endDate = ref('')
const showStartPicker = ref(false)
const showEndPicker = ref(false)
const startPickerDate = ref(['2024', '01', '01'])
const endPickerDate = ref(['2024', '12', '31'])

// 列表数据
const recordList = ref<any[]>([])
const loading = ref(false)
const finished = ref(false)
const page = ref(1)
const limit = 20
const changeLoading = ref(false)

// 统计信息
const statsInfo = ref({
  visible: false,
  total: 0,
  balance: '0.00'
})

// 初始化
onMounted(() => {
  username.value = route.query.username as string || ''
  if (!username.value) {
    showToast('用户名不能为空')
    router.back()
    return
  }
  
  // 设置默认日期（今天）
  const today = new Date()
  const year = today.getFullYear().toString()
  const month = (today.getMonth() + 1).toString().padStart(2, '0')
  const day = today.getDate().toString().padStart(2, '0')
  
  startPickerDate.value = [year, month, '01']
  endPickerDate.value = [year, month, day]
  
  startDate.value = `${year}-${month}-01`
  endDate.value = `${year}-${month}-${day}`
  
  // 加载数据
  resetList()
})

// 返回上一页
const goBack = () => {
  router.back()
}

// 格式化时间
const formatTime = (time: string) => {
  if (!time) return ''
  return time.replace(/(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}):\d{2}/, '$1 $2')
}

// 格式化金额
const formatMoney = (money: string | number) => {
  const val = typeof money === 'string' ? parseFloat(money) : money
  return `¥${val.toFixed(2)}`
}

// 判断记录是否可修改（只有结算类型可修改）
const isModifiable = (item: any) => {
  // 根据 operate_type 判断是否为结算类型
  // 这里需要根据实际的后端定义来判断
  // 暂时假设 operate_type == 2 是结算
  return item.operate_type === OPERATE_TYPES.SETTLEMENT
}

// 判断输赢状态（基于 number_type）
const isWin = (item: any) => {
  return item.number_type === 1
}

// 获取游戏类型文本
const getGameTypeText = (item: any) => {
  if (item.game_code) {
    return item.game_code
  }
  // 根据 operate_type 返回对应文本
  switch (item.operate_type) {
    case OPERATE_TYPES.BET:
      return '游戏下注'
    case OPERATE_TYPES.SETTLEMENT:
      return '游戏结算'
    case OPERATE_TYPES.RECHARGE:
      return '充值'
    case OPERATE_TYPES.WITHDRAW:
      return '提现'
    default:
      return '游戏'
  }
}

// 获取金额显示样式类
const getMoneyClass = (item: any) => {
  // 基于 number_type 判断，而不是 money 的正负
  return isWin(item) ? 'win' : 'lose'
}

// 获取金额显示文本
const getMoneyDisplay = (item: any) => {
  const money = Math.abs(parseFloat(item.money)) // 确保显示正数
  const prefix = isWin(item) ? '+' : '-'
  return `${prefix}¥${money.toFixed(2)}`
}

// 获取状态标签类型
const getStatusTagType = (item: any) => {
  if (item.operate_type === OPERATE_TYPES.SETTLEMENT) {
    return isWin(item) ? 'success' : 'danger'
  }
  // 非结算类型用默认颜色
  return 'default'
}

// 获取状态文本
const getStatusText = (item: any) => {
  if (item.operate_type === OPERATE_TYPES.SETTLEMENT) {
    return isWin(item) ? '赢' : '输'
  }
  // 根据不同类型返回对应文本
  switch (item.operate_type) {
    case OPERATE_TYPES.BET:
      return '下注'
    case OPERATE_TYPES.RECHARGE:
      return '充值'
    case OPERATE_TYPES.WITHDRAW:
      return '提现'
    default:
      return '其他'
  }
}

// 获取备注文本
const getRemarkText = (item: any) => {
  // 如果有 description 字段，优先使用
  if (item.description) {
    return item.description
  }
  
  // 只有可修改的结算记录才显示可修改提示
  if (isModifiable(item)) {
    return '点击可修改输赢状态'
  }
  
  // 其他类型返回空或对应说明
  return ''
}

// 处理记录点击
const handleItemClick = (item: any) => {
  // 只有可修改的记录才处理点击
  if (!isModifiable(item)) {
    return
  }
  
  handleChangeStatus(item)
}

// 加载数据
const onLoad = async () => {
  if (finished.value) {
    return
  }
  
  try {
    loading.value = true
    
    const result = await searchRecords({
      username: username.value,
      start_date: startDate.value,
      end_date: endDate.value,
      page: page.value,
      limit
    })
    
    if (result) {
      const list = result.list || []
      const total = result.total || 0
      const user_info = result.user_info
      
      if (page.value === 1) {
        recordList.value = list
      } else {
        recordList.value.push(...list)
      }
      
      // 更新统计信息
      if (user_info) {
        statsInfo.value = {
          visible: true,
          total,
          balance: user_info.money || '0.00'
        }
      }
      
      // 判断是否还有更多数据
      if (recordList.value.length >= total || list.length < limit) {
        finished.value = true
      } else {
        page.value++
      }
    } else {
      finished.value = true
    }
    
  } catch (error: any) {
    console.error('加载数据失败:', error)
    showToast(error.message || '加载失败')
    finished.value = true
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  resetList()
}

// 重置搜索条件
const handleReset = () => {
  const today = new Date()
  const year = today.getFullYear().toString()
  const month = (today.getMonth() + 1).toString().padStart(2, '0')
  const day = today.getDate().toString().padStart(2, '0')
  
  startDate.value = `${year}-${month}-01`
  endDate.value = `${year}-${month}-${day}`
  
  resetList()
}

// 重置列表
const resetList = () => {
  page.value = 1
  recordList.value = []
  finished.value = false
  // 手动触发加载
  onLoad()
}

// 选择开始日期
const onStartDateConfirm = (value: any) => {
  const [year, month, day] = value.selectedValues
  startDate.value = `${year}-${month}-${day}`
  showStartPicker.value = false
}

// 选择结束日期
const onEndDateConfirm = (value: any) => {
  const [year, month, day] = value.selectedValues
  endDate.value = `${year}-${month}-${day}`
  showEndPicker.value = false
}

// 修改状态
const handleChangeStatus = async (item: any) => {
  try {
    const currentStatus = isWin(item) ? '赢' : '输'
    const newStatus = isWin(item) ? '输' : '赢'
    const money = Math.abs(parseFloat(item.money))
    
    await showConfirmDialog({
      title: '确认修改',
      message: `是否将此记录从"${currentStatus}"改为"${newStatus}"？\n金额：¥${money.toFixed(2)}`,
      confirmButtonText: '确定',
      cancelButtonText: '取消'
    })
    
    changeLoading.value = true
    
    // 调用修改接口
    await changeRecord({
      log_id: item.id,
      status: isWin(item) ? 'lose' : 'win'  // 切换状态
    })
    
    changeLoading.value = false
    showToast('修改成功')
    
    // 刷新列表
    resetList()
    
  } catch (error: any) {
    changeLoading.value = false
    // 用户取消操作不显示错误
    if (error !== 'cancel' && error.message !== 'cancel') {
      showToast(error.message || '修改失败')
    }
  }
}
</script>

<style lang="scss" scoped>
.record-list-container {
  min-height: 100vh;
  background: #f5f5f5;
}

// 搜索区域
.search-section {
  background: white;
  padding: 12px 0;

  .search-buttons {
    display: flex;
    justify-content: center;
    gap: 16px;
    padding: 12px 16px;

    .van-button {
      width: 100px;
    }
  }
}

// 统计信息
.stats-info {
  display: flex;
  justify-content: space-around;
  background: white;
  padding: 12px 16px;
  margin: 8px 12px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

  .stat-item {
    display: flex;
    align-items: center;

    .label {
      color: #666;
      font-size: 14px;
      margin-right: 6px;
    }

    .value {
      color: #333;
      font-size: 16px;
      font-weight: 500;

      &.money {
        color: #ff6034;
        font-weight: 600;
      }
    }
  }
}

// 记录列表
.record-list {
  padding: 8px 12px 20px;

  .record-item {
    background: white;
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 10px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    transition: all 0.3s;
    
    // 只有可点击的记录才有手型光标和点击效果
    &.clickable {
      cursor: pointer;
      
      &:active {
        transform: scale(0.98);
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
      }
    }

    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 1px solid #f0f0f0;

      .game-type {
        font-size: 14px;
        color: #333;
        font-weight: 500;
      }

      .time {
        font-size: 12px;
        color: #999;
      }
    }

    .item-content {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;

      .money-info,
      .balance-info {
        display: flex;
        align-items: center;

        .label {
          font-size: 13px;
          color: #666;
          margin-right: 6px;
        }

        .amount {
          font-size: 18px;
          font-weight: 600;

          &.win {
            color: #67c23a;
          }

          &.lose {
            color: #f56c6c;
          }
        }

        .balance {
          font-size: 15px;
          color: #333;
          font-weight: 500;
        }
      }
    }

    .item-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .remark {
        font-size: 12px;
        color: #999;
        margin-left: auto;
      }
    }
  }
}

// 加载动画
.loading-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

// 自定义样式
:deep(.van-nav-bar__title) {
  font-size: 16px;
  font-weight: 500;
}

:deep(.van-cell-group--inset) {
  margin: 0 12px;
}

:deep(.van-field__label) {
  width: 70px;
}

:deep(.van-list__loading),
:deep(.van-list__finished-text) {
  padding: 16px 0;
}
</style>