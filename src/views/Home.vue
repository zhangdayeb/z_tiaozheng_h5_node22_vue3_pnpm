<template>
  <div class="home-container">
    <!-- 用户信息卡片 -->
    <div class="user-info-card">
      <div class="info-header">
        <van-icon name="user-o" size="24" color="#1989fa" />
        <span class="title">账户信息</span>
      </div>
      <div class="info-content">
        <div class="info-item">
          <span class="label">用户名：</span>
          <span class="value">{{ userInfo.username }}</span>
        </div>
      </div>
    </div>

    <!-- 可管理用户列表 -->
    <div class="user-list-section">
      <div class="section-header">
        <van-icon name="friends-o" size="20" />
        <span>可管理用户</span>
        <span class="count">{{ userList.length }}个</span>
      </div>
      
      <van-list
        v-if="userList.length > 0"
        :loading="loading"
        :finished="true"
      >
        <van-cell
          v-for="user in userList"
          :key="user"
          :title="user"
          is-link
          @click="goToRecordList(user)"
        >
          <template #icon>
            <van-icon name="user-circle-o" size="20" style="margin-right: 8px;" />
          </template>
          <template #right-icon>
            <van-icon name="arrow" />
          </template>
        </van-cell>
      </van-list>

      <!-- 空状态 -->
      <van-empty
        v-else
        description="暂无可管理用户"
        image="default"
      />
    </div>

    <!-- 退出登录按钮 -->
    <div class="logout-section">
      <van-button 
        type="danger" 
        size="large" 
        round 
        block
        @click="handleLogout"
      >
        退出登录
      </van-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showConfirmDialog } from 'vant'

const router = useRouter()

// 用户信息
const userInfo = ref({
  username: '',
  balance: '0.00'
})

// 可管理的用户列表
const userList = ref<string[]>([])

// 加载状态
const loading = ref(false)

// 初始化数据
onMounted(() => {
  loadUserInfo()
})

// 加载用户信息
const loadUserInfo = () => {
  // 从localStorage获取登录信息
  const loginData = localStorage.getItem('loginData')
  
  if (!loginData) {
    showToast('请先登录')
    // 跳转到登录页面（如果有的话）
    return
  }
  
  try {
    const data = JSON.parse(loginData)
    userInfo.value.username = data.username || '未知用户'
    userInfo.value.balance = data.balance || '0.00'
    
    // 解析可管理用户列表
    if (data.controller_users) {
      // controller_users 是逗号分隔的字符串
      userList.value = data.controller_users.split(',').filter(Boolean)
    }
  } catch (error) {
    console.error('解析用户信息失败', error)
    showToast('用户信息加载失败')
  }
}

// 跳转到记录列表
const goToRecordList = (username: string) => {
  router.push({
    path: '/record_list',
    query: { username }
  })
}

// 退出登录
const handleLogout = async () => {
  try {
    await showConfirmDialog({
      title: '提示',
      message: '确定要退出登录吗？',
      confirmButtonText: '确定',
      cancelButtonText: '取消'
    })
    
    // 清除本地存储
    localStorage.removeItem('loginData')
    localStorage.removeItem('token')
    
    showToast('已退出登录')
    
    // 跳转到登录页面或刷新页面
    // router.push('/login')
    
  } catch (error) {
    // 用户取消
  }
}
</script>

<style lang="scss" scoped>
.home-container {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 12px;
}

// 用户信息卡片
.user-info-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

  .info-header {
    display: flex;
    align-items: center;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid #f0f0f0;

    .title {
      margin-left: 8px;
      font-size: 16px;
      font-weight: 500;
      color: #333;
    }
  }

  .info-content {
    .info-item {
      display: flex;
      align-items: center;
      margin-bottom: 12px;
      font-size: 15px;

      &:last-child {
        margin-bottom: 0;
      }

      .label {
        color: #666;
        margin-right: 8px;
      }

      .value {
        color: #333;
        font-weight: 500;

        &.money {
          color: #ff6034;
          font-size: 18px;
          font-weight: 600;
        }
      }
    }
  }
}

// 用户列表部分
.user-list-section {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

  .section-header {
    display: flex;
    align-items: center;
    padding: 16px;
    border-bottom: 1px solid #f0f0f0;
    font-size: 15px;
    color: #333;
    font-weight: 500;

    .van-icon {
      margin-right: 6px;
      color: #1989fa;
    }

    .count {
      margin-left: auto;
      color: #999;
      font-size: 14px;
      font-weight: normal;
    }
  }

  :deep(.van-cell) {
    padding: 14px 16px;
    
    &::after {
      left: 16px;
      right: 16px;
    }

    .van-cell__title {
      font-size: 15px;
      color: #333;
    }
  }

  :deep(.van-empty) {
    padding: 40px 0;
  }
}

// 退出登录部分
.logout-section {
  padding: 20px 20px 30px;

  :deep(.van-button) {
    height: 46px;
    font-size: 16px;
  }
}
</style>