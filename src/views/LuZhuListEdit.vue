<template>
  <div class="luzhu-edit-container">
    <!-- 顶部导航 -->
    <van-nav-bar 
      :title="pageTitle" 
      left-text="返回"
      left-arrow
      :fixed="true"
      placeholder
      @click-left="onClickLeft"
    />

    <!-- 加载状态 -->
    <van-loading v-if="loading" class="loading-wrapper" size="24px" vertical>
      {{ isEditMode ? '加载中...' : '准备中...' }}
    </van-loading>

    <!-- 表单 -->
    <van-form v-else @submit="onSubmit">
      <van-cell-group inset>
        <!-- 期号 -->
        <van-field
          v-model="formData.qihao_number"
          name="qihao_number"
          label="期号"
          placeholder="请输入期号"
          :rules="[{ required: true, message: '请输入期号' }]"
        />

        <!-- 结果 -->
        <van-field
          v-model="formData.result"
          name="result"
          label="结果"
          placeholder="请输入结果"
          :rules="[{ required: true, message: '请输入结果' }]"
        />

        <!-- 状态 -->
        <van-field
          v-model="statusText"
          name="status"
          label="状态"
          placeholder="请选择状态"
          readonly
          is-link
          @click="showStatusPicker = true"
          :rules="[{ required: true, message: '请选择状态' }]"
        />

        <!-- 显示时间 -->
        <van-field
          v-model="formData.show_time"
          name="show_time"
          label="显示时间"
          placeholder="请选择显示时间"
          readonly
          is-link
          @click="showTimePicker = true"
        />

        <!-- 备注 -->
        <van-field
          v-model="formData.remark"
          name="remark"
          label="备注"
          type="textarea"
          placeholder="请输入备注（选填）"
          rows="3"
          maxlength="200"
          show-word-limit
        />
      </van-cell-group>

      <!-- 提交按钮 -->
      <div class="submit-wrapper">
        <van-button 
          type="primary" 
          round 
          block 
          native-type="submit"
          :loading="submitting"
        >
          {{ isEditMode ? '保存修改' : '确认新增' }}
        </van-button>
        
        <van-button 
          v-if="!isEditMode"
          type="default" 
          round 
          block 
          @click="resetForm"
          style="margin-top: 10px"
        >
          重置表单
        </van-button>
      </div>
    </van-form>

    <!-- 状态选择器 -->
    <van-popup v-model:show="showStatusPicker" position="bottom">
      <van-picker
        :columns="statusColumns"
        @confirm="onStatusConfirm"
        @cancel="showStatusPicker = false"
      />
    </van-popup>

    <!-- 时间选择器 -->
    <van-popup v-model:show="showTimePicker" position="bottom">
      <van-datetime-picker
        v-model="currentDate"
        type="datetime"
        title="选择时间"
        @confirm="onTimeConfirm"
        @cancel="showTimePicker = false"
      />
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch,onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/stores/gameStore'
import { showToast, showConfirmDialog } from 'vant'
import type { LuZhuFormData } from '@/types/gameTypes'

const router = useRouter()
const gameStore = useGameStore()

// 状态选项
const statusColumns = [
  { text: '正常', value: 1 },
  { text: '停用', value: 0 }
]

// 状态
const loading = ref(false)
const submitting = ref(false)
const showStatusPicker = ref(false)
const showTimePicker = ref(false)
const currentDate = ref(new Date())
const originalFormData = ref<LuZhuFormData | null>(null) // 保存原始数据用于对比

// 表单数据
const formData = ref<LuZhuFormData>({
  qihao_number: '',
  result: '',
  status: 1,
  show_time: '',
  remark: ''
})

// 计算属性
const luzhuId = computed(() => gameStore.luzhuId)
const isEditMode = computed(() => !!luzhuId.value)
const pageTitle = computed(() => isEditMode.value ? '编辑露珠' : '新增露珠')
const statusText = computed(() => {
  const item = statusColumns.find(s => s.value === formData.value.status)
  return item ? item.text : ''
})

// 返回上一页
const onClickLeft = () => {
  if (hasUnsavedChanges()) {
    showConfirmDialog({
      title: '提示',
      message: '有未保存的修改，确定要离开吗？'
    }).then(() => {
      router.back()
    }).catch(() => {})
  } else {
    router.back()
  }
}

// 检查是否有未保存的修改
const hasUnsavedChanges = () => {
  // 编辑模式时，比较是否有改动
  if (isEditMode.value && originalFormData.value) {
    return JSON.stringify(formData.value) !== JSON.stringify(originalFormData.value)
  }
  
  // 新增模式时，检查是否填写了内容
  return formData.value.qihao_number || 
         formData.value.result || 
         (formData.value.show_time && formData.value.show_time !== formatDateTime(new Date())) || 
         formData.value.remark
}

// 选择状态
const onStatusConfirm = ({ selectedValues }: any) => {
  formData.value.status = selectedValues[0]
  showStatusPicker.value = false
}

// 选择时间
const onTimeConfirm = () => {
  formData.value.show_time = formatDateTime(currentDate.value)
  showTimePicker.value = false
}

// 格式化日期时间
const formatDateTime = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

// 重置表单
const resetForm = () => {
  formData.value = {
    qihao_number: '',
    result: '',
    status: 1,
    show_time: formatDateTime(new Date()),
    remark: ''
  }
  currentDate.value = new Date()
}

// 提交表单
const onSubmit = async () => {
  // 新增模式需要检查台桌信息
  if (!isEditMode.value && !gameStore.tableId) {
    showToast('缺少台桌信息')
    return
  }
  
  submitting.value = true
  
  try {
    const data = {
      qihao_number: formData.value.qihao_number,
      result: formData.value.result,
      status: formData.value.status,
      show_time: formData.value.show_time || formatDateTime(new Date()),
      remark: formData.value.remark || ''
    }
    
    if (isEditMode.value) {
      // 编辑模式
      await gameStore.editLuZhu(luzhuId.value!, data)
      showToast('修改成功')
    } else {
      // 新增模式
      await gameStore.addLuZhu(data)
      showToast('新增成功')
    }
    
    // 返回列表页
    setTimeout(() => {
      router.back()
    }, 500)
    
  } catch (e: any) {
    showToast(e.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

// 加载露珠详情（编辑模式）
const loadLuZhuDetail = async () => {
  if (!luzhuId.value) {
    console.error('编辑模式但没有露珠ID')
    showToast('缺少露珠ID')
    setTimeout(() => {
      router.back()
    }, 1500)
    return
  }
  
  loading.value = true
  
  try {
    console.log('开始加载露珠详情, ID:', luzhuId.value)
    const detail = await gameStore.fetchLuZhuDetail(luzhuId.value)
    console.log('获取到的露珠详情:', detail)
    
    // 确保所有字段都有值（处理 null 和 undefined）
    const formattedData = {
      qihao_number: detail.qihao_number || '',
      result: detail.result || '',
      status: detail.status !== undefined && detail.status !== null ? detail.status : 1,
      show_time: detail.show_time || '',
      remark: detail.remark || ''
    }
    
    // 填充表单
    formData.value = { ...formattedData }
    
    // 保存原始数据用于比较
    originalFormData.value = { ...formattedData }
    
    // 设置时间选择器的默认值
    if (detail.show_time) {
      try {
        // 处理不同的时间格式
        const dateStr = detail.show_time.replace(' ', 'T') // 处理 "2024-01-01 12:00:00" 格式
        currentDate.value = new Date(dateStr)
        
        // 如果日期无效，使用当前时间
        if (isNaN(currentDate.value.getTime())) {
          console.warn('无效的日期格式:', detail.show_time)
          currentDate.value = new Date()
          formData.value.show_time = formatDateTime(currentDate.value)
        }
      } catch (e) {
        console.error('解析日期失败:', e)
        currentDate.value = new Date()
        formData.value.show_time = formatDateTime(currentDate.value)
      }
    } else {
      // 如果没有显示时间，设置为当前时间
      currentDate.value = new Date()
      formData.value.show_time = formatDateTime(currentDate.value)
    }
    
    console.log('表单数据填充完成:', formData.value)
    
  } catch (e: any) {
    console.error('加载露珠详情失败:', e)
    showToast(e.message || '加载失败')
    // 加载失败返回
    setTimeout(() => {
      router.back()
    }, 1500)
  } finally {
    loading.value = false
  }
}

// 初始化新增模式的默认值
const initAddMode = () => {
  // 新增模式，设置默认值
  const now = new Date()
  formData.value = {
    qihao_number: '',
    result: '',
    status: 1,
    show_time: formatDateTime(now),
    remark: ''
  }
  currentDate.value = now
  originalFormData.value = null
}

// 监听路由参数变化（处理从列表页跳转过来的情况）
watch(() => gameStore.luzhuId, (newId) => {
  console.log('露珠ID变化:', newId)
  if (newId) {
    loadLuZhuDetail()
  } else {
    initAddMode()
  }
}, { immediate: true })

// 页面加载
onMounted(() => {
  console.log('页面加载，当前模式:', isEditMode.value ? '编辑' : '新增', '露珠ID:', luzhuId.value)
  
  if (isEditMode.value) {
    // 编辑模式，加载数据
    loadLuZhuDetail()
  } else {
    // 新增模式，初始化默认值
    initAddMode()
  }
})

// 页面卸载时的清理
onUnmounted(() => {
  // 清理原始数据
  originalFormData.value = null
})
</script>

<style lang="scss" scoped>
.luzhu-edit-container {
  min-height: 100vh;
  background-color: #f7f8fa;
}

.loading-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
}

.submit-wrapper {
  padding: 20px 16px;
  padding-bottom: 30px;
}

:deep(.van-cell-group) {
  margin-top: 12px;
}

:deep(.van-field__label) {
  width: 80px;
}
</style>