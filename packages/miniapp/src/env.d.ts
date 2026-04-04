/// <reference types="@dcloudio/types" />

declare module '*.vue' {
  import { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

interface ImportMetaEnv {
  /** API base URL, e.g. https://api.example.com/api/v1 */
  readonly VITE_API_BASE_URL: string
  /** true in development mode */
  readonly DEV: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
