import { createApp } from 'vue'
import { ElLoadingDirective } from 'element-plus/es/components/loading/index'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import App from './App.vue'
import router from './router/index'
import { setupPermissionDirective } from '@/directives/permission'
import '@/assets/styles/variables.css'

const app = createApp(App)

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

app.directive('loading', ElLoadingDirective)
app.use(pinia)
app.use(router)
setupPermissionDirective(app)

app.mount('#app')
