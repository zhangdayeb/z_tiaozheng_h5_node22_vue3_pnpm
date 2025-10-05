<template>
  <div class="record-list-container">
    <!-- 顶部导航 - 固定在顶部 -->
    <van-nav-bar
      :title="`${username} 的游戏记录`"
      left-arrow
      @click-left="goBack"
      fixed
      placeholder
    />

    <!-- 下拉刷新容器 -->
    <van-pull-refresh 
      v-model="refreshing" 
      @refresh="onRefresh"
      class="main-content"
    >
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
          <span class="value money">{{ formatMoney(statsInfo.balance) }}</span>
        </div>
      </div>

      <!-- 记录列表 -->
      <van-list
        v-model:loading="loading"
        :finished="finished"
        finished-text="没有更多了"
        @load="onLoad"
        :immediate-check="false"
        class="record-list"
      >
        <div
          v-for="item in recordList"
          :key="item.id"
          class="record-item"
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
            <div class="status-info">
              <van-tag 
                :type="getStatusTagType(item)"
                size="medium"
              >
                {{ getStatusText(item) }}
              </van-tag>
              
              <!-- 操作按钮区域 - 只有赢钱记录才显示 -->
              <div v-if="canModify(item)" class="action-buttons">
                <van-button
                  size="mini"
                  type="primary"
                  plain
                  round
                  @click="handleChangeAmount(item)"
                  :loading="item.changing"
                >
                  修改金额
                </van-button>
              </div>
            </div>
            
            <!-- 备注信息 -->
            <span class="remark" v-if="getRemarkText(item)">
              {{ getRemarkText(item) }}
            </span>
          </div>
        </div>

        <!-- 空状态 -->
        <van-empty
          v-if="!loading && !refreshing && recordList.length === 0"
          description="暂无记录"
          image="default"
        />
      </van-list>
    </van-pull-refresh>

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

    <!-- 金额修改对话框 -->
    <van-dialog
      v-model:show="showAmountDialog"
      title="修改赢钱金额"
      show-cancel-button
      @confirm="confirmChangeAmount"
      @cancel="cancelChangeAmount"
    >
      <div class="amount-dialog-content">
        <div class="current-info">
          <p>当前金额：<span class="win">+¥{{ currentEditItem?.money || '0.00' }}</span></p>
        </div>
        <van-field
          v-model="newAmount"
          type="number"
          label="新金额"
          placeholder="请输入新的赢钱金额"
          :formatter="formatAmountInput"
        >
          <template #left-icon>
            <span style="color: #67c23a; font-weight: 600;">+¥</span>
          </template>
        </van-field>
        <div class="dialog-tips">
          <van-icon name="info-o" />
          <span>只能修改赢钱金额，请输入正数</span>
        </div>
      </div>
    </van-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast, showConfirmDialog } from 'vant'
import { searchRecords, changeRecord } from '@/services/gameApi'

const route = useRoute()
const router = useRouter()

// 定义操作类型常量
const OPERATE_TYPES = {
  BET: 1,           // 下注
  SETTLEMENT: 2,    // 结算
  RECHARGE: 3,      // 充值
  WITHDRAW: 4,      // 提现
  WIN: 11,          // 赢钱结算
}

// 用户名
const username = ref('')

// 搜索条件
const startDate = ref('')
const endDate = ref('')
const showStartPicker = ref(false)
const showEndPicker = ref(false)
const startPickerDate = ref(['2025', '10', '01'])
const endPickerDate = ref(['2025', '10', '05'])

// 列表数据
const recordList = ref<any[]>([])
const loading = ref(false)
const finished = ref(false)
const refreshing = ref(false)
const page = ref(1)
const limit = 20

// 统计信息
const statsInfo = ref({
  visible: false,
  total: 0,
  balance: '0.00'
})

// 金额修改相关
const showAmountDialog = ref(false)
const currentEditItem = ref<any>(null)
const newAmount = ref('')

// 初始化
onMounted(async () => {
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
  
  // 延迟加载数据，确保DOM准备好
  await nextTick()
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

// 格式化金额输入
const formatAmountInput = (value: string) => {
  // 只允许输入数字和小数点
  value = value.replace(/[^\d.]/g, '')
  // 只保留一个小数点
  const parts = value.split('.')
  if (parts.length > 2) {
    value = parts[0] + '.' + parts.slice(1).join('')
  }
  // 限制小数位数为2位
  if (parts[1] && parts[1].length > 2) {
    value = parts[0] + '.' + parts[1].substring(0, 2)
  }
  return value
}

// 判断是否可以修改（只有赢钱记录可以修改）
const canModify = (item: any) => {
  // 判断是否为赢钱记录
  // 1. 根据 operate_type 判断
  if (item.operate_type === OPERATE_TYPES.WIN) {
    return true
  }
  // 2. 根据描述判断是否包含"WIN"且金额为正
  if (item.description && item.description.includes('WIN') && parseFloat(item.money) > 0) {
    return true
  }
  // 3. 根据 number_type 和金额判断
  if (item.number_type === 1 && parseFloat(item.money) > 0) {
    return true
  }
  return false
}

// 判断输赢状态
const isWin = (item: any) => {
  // 优先根据 number_type 判断
  if (item.number_type !== undefined) {
    return item.number_type === 1
  }
  // 备用：根据金额正负判断
  return parseFloat(item.money) > 0
}

// 获取游戏类型文本
const getGameTypeText = (item: any) => {
  return item.game_code || '游戏'
}

// 获取金额显示样式类
const getMoneyClass = (item: any) => {
  return isWin(item) ? 'win' : 'lose'
}

// 获取金额显示文本
const getMoneyDisplay = (item: any) => {
  const money = Math.abs(parseFloat(item.money))
  const prefix = isWin(item) ? '+' : '-'
  return `${prefix}¥${money.toFixed(2)}`
}

// 获取状态标签类型
const getStatusTagType = (item: any) => {
  if (isWin(item)) {
    return 'success'
  }
  return 'danger'
}

// 获取状态文本
const getStatusText = (item: any) => {
  if (item.operate_type === OPERATE_TYPES.WIN || (item.description && item.description.includes('WIN'))) {
    return '赢钱结算'
  }
  if (isWin(item)) {
    return '赢'
  }
  return '输'
}

// 获取备注文本
const getRemarkText = (item: any) => {
  if (item.remark) {
    return item.remark
  }
  if (item.description) {
    return item.description
  }
  return ''
}

// 下拉刷新
const onRefresh = async () => {
  refreshing.value = true
  page.value = 1
  recordList.value = []
  finished.value = false
  
  await onLoad()
  
  refreshing.value = false
  showToast('刷新成功')
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
      
      // 为每条记录添加changing状态
      list.forEach((item: any) => {
        item.changing = false
      })
      
      if (page.value === 1) {
        recordList.value = list
      } else {
        recordList.value = [...recordList.value, ...list]
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

// 点击修改金额
const handleChangeAmount = (item: any) => {
  currentEditItem.value = item
  newAmount.value = Math.abs(parseFloat(item.money)).toFixed(2)
  showAmountDialog.value = true
}

// 确认修改金额
const confirmChangeAmount = async () => {
  if (!currentEditItem.value) {
    return
  }
  
  const amount = parseFloat(newAmount.value)
  
  // 验证输入
  if (isNaN(amount) || amount <= 0) {
    showToast('请输入正确的金额')
    return
  }
  
  // 如果金额没有变化
  const currentAmount = Math.abs(parseFloat(currentEditItem.value.money))
  if (amount === currentAmount) {
    showToast('金额未发生变化')
    showAmountDialog.value = false
    return
  }
  
  try {
    // 再次确认
    await showConfirmDialog({
      title: '确认修改',
      message: `将赢钱金额从 ¥${currentAmount.toFixed(2)} 修改为 ¥${amount.toFixed(2)}？`,
      confirmButtonText: '确定',
      cancelButtonText: '取消'
    })
    
    // 设置loading状态
    currentEditItem.value.changing = true
    showAmountDialog.value = false
    
    // 调用接口
    await changeRecord({
      log_id: currentEditItem.value.id,
      money: amount
    })
    
    showToast('修改成功')
    
    // 刷新列表
    setTimeout(() => {
      onRefresh()
    }, 500)
    
  } catch (error: any) {
    currentEditItem.value.changing = false
    if (error !== 'cancel' && error.message !== 'cancel') {
      showToast(error.message || '修改失败')
    }
  }
}

// 取消修改金额
const cancelChangeAmount = () => {
  currentEditItem.value = null
  newAmount.value = ''
}
</script>

<style lang="scss" scoped>
.record-list-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

// 主内容区域 - 可滚动
.main-content {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

// 搜索区域
.search-section {
  background: white;
  padding: 12px 0;
  position: sticky;
  top: 0;
  z-index: 10;

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
  padding: 0 12px 20px;

  .record-item {
    background: white;
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 10px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

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
      .status-info {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;

        .action-buttons {
          display: flex;
          gap: 8px;

          .van-button {
            height: 26px;
            padding: 0 12px;
            font-size: 12px;
          }
        }
      }

      .remark {
        display: block;
        font-size: 12px;
        color: #999;
        line-height: 1.4;
        word-break: break-all;
        padding: 4px 8px;
        background: #f8f8f8;
        border-radius: 4px;
        margin-top: 8px;
      }
    }
  }
}

// 金额修改对话框样式
.amount-dialog-content {
  padding: 16px;

  .current-info {
    margin-bottom: 16px;
    padding: 12px;
    background: #f5f5f5;
    border-radius: 8px;
    
    p {
      margin: 0;
      font-size: 14px;
      color: #666;
      
      span.win {
        color: #67c23a;
        font-size: 16px;
        font-weight: 600;
        margin-left: 8px;
      }
    }
  }

  :deep(.van-field) {
    background: white;
    border: 1px solid #e5e5e5;
    border-radius: 8px;
    margin-bottom: 12px;
    
    .van-field__label {
      width: 60px;
      color: #333;
    }
    
    input {
      font-size: 16px;
      font-weight: 500;
    }
  }

  .dialog-tips {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    background: #fff7e6;
    border-radius: 4px;
    font-size: 12px;
    color: #f90;
    
    .van-icon {
      margin-right: 6px;
      font-size: 14px;
    }
  }
}

// 自定义样式
:deep(.van-nav-bar) {
  background: white;
}

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

:deep(.van-pull-refresh) {
  min-height: 100%;
}

:deep(.van-list__loading),
:deep(.van-list__finished-text) {
  padding: 16px 0;
}

:deep(.van-tag) {
  padding: 2px 8px;
}

// 对话框样式
:deep(.van-dialog) {
  border-radius: 12px;
  overflow: visible;
  
  .van-dialog__header {
    font-weight: 600;
    padding: 20px 16px 16px;
  }
  
  .van-dialog__content {
    padding: 0;
    max-height: 60vh;
    overflow-y: auto;
  }
  
  .van-dialog__footer {
    padding: 12px 16px;
    
    .van-button {
      height: 40px;
      border-radius: 8px;
      font-size: 14px;
    }
  }
}
</style>