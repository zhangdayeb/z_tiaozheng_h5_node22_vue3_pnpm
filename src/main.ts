import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'

// Vant 样式
import 'vant/lib/index.css'
// 全局样式
import './styles/global.scss'
import Vant from 'vant'

// 创建应用实例
const app = createApp(App)

// 使用插件
app.use(createPinia())
app.use(router)
app.use(Vant)
// 挂载应用
app.mount('#app')