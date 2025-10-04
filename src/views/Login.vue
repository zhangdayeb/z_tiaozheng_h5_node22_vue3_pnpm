<template>
  <div class="login-container">
    <!-- 登录表单 -->
    <div class="login-form">
      <h2 class="login-title">用户登录</h2>
      
      <van-form @submit="handleLogin">
        <van-cell-group inset>
          <van-field
            v-model="formData.username"
            name="username"
            label="用户名"
            placeholder="请输入用户名"
            :rules="[{ required: true, message: '请输入用户名' }]"
            clearable
          />
          
          <van-field
            v-model="formData.password"
            type="password"
            name="password"
            label="密码"
            placeholder="请输入密码"
            :rules="[{ required: true, message: '请输入密码' }]"
            clearable
          />
        </van-cell-group>
        
        <div class="login-button">
          <van-button 
            round 
            block 
            type="primary" 
            native-type="submit"
            :loading="loginLoading"
            loading-text="登录中..."
          >
            登录
          </van-button>
        </div>
      </van-form>
    </div>

    <!-- 在线客服 -->
    <div class="customer-service" v-if="kefuUrl">
      <van-button 
        round 
        block 
        type="success" 
        icon="service-o"
        @click="openCustomerService"
      >
        在线客服
      </van-button>
    </div>

    <!-- 系统公告/提示信息 -->
    <div class="notice-section" v-if="noticeMsg">
      <div class="notice-header">
        <van-icon name="volume-o" />
        <span>系统公告</span>
      </div>
      <div class="notice-content">
        <pre>{{ noticeMsg }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { login } from '@/services/gameApi'
import { setAuthToken, get } from '@/services/httpClient'

const router = useRouter()

// 表单数据
const formData = ref({
  username: '',
  password: ''
})

// 登录加载状态
const loginLoading = ref(false)

// 系统配置
const kefuUrl = ref('')
const noticeMsg = ref('')

// 获取系统配置
const getSystemConfig = async () => {
  try {
    // 获取系统配置不需要token，临时设置一个
    setAuthToken('temp_token_for_config')
    
    const result: any = await get('/tiaozheng/config')
    
    if (result && result.data && result.data.configs) {
      // 获取客服链接
      if (result.data.configs.kefu_url) {
        kefuUrl.value = result.data.configs.kefu_url.value
      }
      
      // 获取提示信息
      if (result.data.configs.notice_msg) {
        noticeMsg.value = result.data.configs.notice_msg.value
      }
    }
  } catch (error) {
    console.error('获取系统配置失败:', error)
    // 不显示错误提示，使用默认值即可
  }
}

// 处理登录
const handleLogin = async () => {
  if (!formData.value.username || !formData.value.password) {
    showToast('请输入用户名和密码')
    return
  }
  
  loginLoading.value = true
  
  try {
    // 设置临时token用于登录请求
    setAuthToken('login_temp_token')
    
    const result: any = await login(formData.value.username, formData.value.password)
    
    if (result && result.code === 1) {
      // 登录成功
      showToast.success('登录成功')
      
      // 保存登录信息到localStorage
      const loginData = {
        token: result.data.token,
        username: result.data.username,
        controller_users: result.data.controller_users
      }
      
      localStorage.setItem('loginData', JSON.stringify(loginData))
      localStorage.setItem('token', result.data.token)
      
      // 设置全局token
      setAuthToken(result.data.token)
      
      // 跳转到首页
      setTimeout(() => {
        router.push('/')
      }, 500)
    } else {
      showToast(result.msg || '登录失败')
    }
  } catch (error: any) {
    console.error('登录失败:', error)
    showToast(error.message || '登录失败，请稍后重试')
  } finally {
    loginLoading.value = false
  }
}

// 打开客服链接
const openCustomerService = () => {
  if (kefuUrl.value) {
    window.open(kefuUrl.value, '_blank')
  } else {
    showToast('客服链接未配置')
  }
}

// 页面初始化
onMounted(() => {
  // 清除可能存在的旧登录信息
  localStorage.removeItem('loginData')
  localStorage.removeItem('token')
  
  // 获取系统配置
  getSystemConfig()
})
</script>

<style lang="scss" scoped>
.login-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

// 登录表单区域
.login-form {
  background: white;
  border-radius: 16px;
  padding: 24px 20px;
  margin-bottom: 20px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);

  .login-title {
    text-align: center;
    font-size: 24px;
    font-weight: 600;
    color: #333;
    margin-bottom: 24px;
  }

  :deep(.van-cell-group) {
    background: transparent;
    
    .van-field {
      background: #f8f9fa;
      border-radius: 8px;
      margin-bottom: 12px;
      padding: 12px 16px;
      
      &::after {
        display: none;
      }
    }
    
    .van-field__label {
      width: 70px;
      color: #666;
      font-weight: 500;
    }
  }

  .login-button {
    margin-top: 24px;
    padding: 0 16px;

    :deep(.van-button) {
      height: 48px;
      font-size: 16px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
    }
  }
}

// 客服按钮
.customer-service {
  margin-bottom: 20px;
  padding: 0 20px;

  :deep(.van-button) {
    height: 48px;
    font-size: 16px;
    background: linear-gradient(135deg, #00c853 0%, #00a047 100%);
    border: none;
    box-shadow: 0 4px 15px rgba(0, 200, 83, 0.3);
  }
}

// 公告区域
.notice-section {
  background: white;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);

  .notice-header {
    display: flex;
    align-items: center;
    padding-bottom: 12px;
    border-bottom: 1px solid #eee;
    margin-bottom: 12px;
    color: #333;
    font-weight: 500;
    font-size: 16px;

    .van-icon {
      margin-right: 8px;
      color: #ff6034;
      font-size: 20px;
    }
  }

  .notice-content {
    pre {
      margin: 0;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 14px;
      line-height: 1.6;
      color: #666;
      white-space: pre-wrap;
      word-wrap: break-word;
      max-height: 400px;
      overflow-y: auto;
      
      // 自定义滚动条
      &::-webkit-scrollbar {
        width: 6px;
      }
      
      &::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 3px;
      }
      
      &::-webkit-scrollbar-thumb {
        background: #888;
        border-radius: 3px;
        
        &:hover {
          background: #666;
        }
      }
    }
  }
}

// 移动端适配
@media (max-width: 480px) {
  .login-container {
    padding: 15px;
  }
  
  .login-form {
    padding: 20px 16px;
    
    .login-title {
      font-size: 20px;
    }
  }
}
</style>