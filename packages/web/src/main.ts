import { createApp } from 'vue'
import { ElLoadingDirective } from 'element-plus/es/components/loading/index'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import App from './App.vue'
import router from './router/index'
import { setupPermissionDirective } from '@/directives/permission'
import { vSafeHtml } from '@/directives/safe-html'
import '@/assets/styles/variables.css'

// Element Plus 命令式组件样式（不会被 unplugin 按需引入）
import 'element-plus/es/components/message/style/css'
import 'element-plus/es/components/message-box/style/css'
import 'element-plus/es/components/notification/style/css'
import 'element-plus/es/components/loading/style/css'

const app = createApp(App)

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

app.directive('loading', ElLoadingDirective)
app.directive('safe-html', vSafeHtml)
app.use(pinia)
app.use(router)
setupPermissionDirective(app)

app.mount('#app')
