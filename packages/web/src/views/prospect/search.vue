<template>
  <div class="prospect-search-page">
    <!-- 搜索表单 -->
    <el-card class="search-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>互联网获客搜索</span>
          <el-button text type="primary" @click="historyVisible = true">
            <el-icon><Clock /></el-icon>
            搜索历史
          </el-button>
        </div>
      </template>

      <!-- 搜索模板 + 数据源工具栏 -->
      <div class="template-toolbar">
        <el-select
          v-model="selectedTemplateId"
          placeholder="加载搜索模板"
          clearable
          style="width: 200px"
          @change="handleTemplateSelect"
        >
          <el-option v-for="tpl in searchTemplates" :key="tpl.id" :label="tpl.name" :value="tpl.id">
            <div class="template-option">
              <span>{{ tpl.name }}</span>
              <el-icon class="template-delete-icon" @click.stop="handleDeleteTemplate(tpl.id)">
                <Delete />
              </el-icon>
            </div>
          </el-option>
        </el-select>
        <el-button type="default" @click="saveTemplateVisible = true">保存当前条件</el-button>
        <div style="flex: 1" />
        <el-select v-model="selectedDataSource" placeholder="数据源" style="width: 160px">
          <el-option label="Mock 数据" value="mock" />
          <el-option v-for="ds in dataSources" :key="ds.id" :label="ds.name" :value="ds.channel" />
        </el-select>
      </div>

      <el-form :inline="true" :model="searchForm" class="search-form" label-width="auto">
        <el-row :gutter="16">
          <!-- keyword — always shown -->
          <el-col :span="8">
            <el-form-item label="企业名称">
              <el-input
                v-model="searchForm.keyword"
                placeholder="企业名称/关键词"
                clearable
                style="width: 100%"
                @keyup.enter="handleSearch"
              />
            </el-form-item>
          </el-col>
          <el-col v-if="isFilterEnabled('industry')" :span="8">
            <el-form-item label="行业">
              <el-select
                v-model="searchForm.industry"
                placeholder="全部行业"
                clearable
                style="width: 100%"
              >
                <el-option v-for="opt in industryOptions" :key="opt" :label="opt" :value="opt" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col v-if="isFilterEnabled('province')" :span="4">
            <el-form-item label="省份">
              <el-select
                v-model="searchForm.province"
                placeholder="全部"
                clearable
                style="width: 100%"
                @change="searchForm.city = ''"
              >
                <el-option v-for="opt in provinceOptions" :key="opt" :label="opt" :value="opt" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col v-if="isFilterEnabled('city')" :span="4">
            <el-form-item label="城市">
              <el-select v-model="searchForm.city" placeholder="全部" clearable style="width: 100%">
                <el-option v-for="opt in cityOptions" :key="opt" :label="opt" :value="opt" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col v-if="isFilterEnabled('registeredCapital')" :span="8">
            <el-form-item label="注册资本">
              <div class="range-inputs">
                <el-input-number
                  v-model="searchForm.minRegisteredCapital"
                  placeholder="最低"
                  :min="0"
                  :controls="false"
                  style="width: 45%"
                />
                <span class="range-sep">~</span>
                <el-input-number
                  v-model="searchForm.maxRegisteredCapital"
                  placeholder="最高"
                  :min="0"
                  :controls="false"
                  style="width: 45%"
                />
              </div>
            </el-form-item>
          </el-col>
          <el-col v-if="isFilterEnabled('employeeCount')" :span="8">
            <el-form-item label="员工规模">
              <div class="range-inputs">
                <el-input-number
                  v-model="searchForm.minEmployeeCount"
                  placeholder="最低"
                  :min="0"
                  :controls="false"
                  style="width: 45%"
                />
                <span class="range-sep">~</span>
                <el-input-number
                  v-model="searchForm.maxEmployeeCount"
                  placeholder="最高"
                  :min="0"
                  :controls="false"
                  style="width: 45%"
                />
              </div>
            </el-form-item>
          </el-col>

          <!-- Custom filters from filter config -->
          <el-col v-for="cf in filterConfig.customFilters" :key="cf.key" :span="8">
            <el-form-item :label="cf.label">
              <el-input
                v-if="cf.type === 'text'"
                v-model="customFilterValues[cf.key]"
                :placeholder="cf.label"
                clearable
                style="width: 100%"
              />
              <el-input-number
                v-else-if="cf.type === 'number'"
                v-model="customFilterValues[cf.key] as number | undefined"
                :controls="false"
                style="width: 100%"
              />
              <el-select
                v-else-if="cf.type === 'select'"
                v-model="customFilterValues[cf.key]"
                :placeholder="cf.label"
                clearable
                style="width: 100%"
              >
                <el-option v-for="opt in cf.options || []" :key="opt" :label="opt" :value="opt" />
              </el-select>
              <!-- dateRange custom filter not bound to search params for now -->
              <span v-else-if="cf.type === 'dateRange'" class="range-sep"
                >（日期范围暂不支持）</span
              >
            </el-form-item>
          </el-col>

          <el-col :span="8">
            <el-form-item>
              <el-button type="primary" :loading="searchLoading" @click="handleSearch">
                <el-icon><Search /></el-icon>
                搜索
              </el-button>
              <el-button @click="handleReset">重置</el-button>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </el-card>

    <!-- 搜索结果 -->
    <el-card v-if="searchResults.length > 0 || hasSearched" class="result-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>搜索结果 (共 {{ searchTotal }} 条)</span>
          <el-button
            type="primary"
            :disabled="selectedRows.length === 0"
            :loading="importLoading"
            @click="handleImport"
          >
            <el-icon><Download /></el-icon>
            导入选中线索 ({{ selectedRows.length }})
          </el-button>
        </div>
      </template>

      <el-table
        ref="tableRef"
        v-loading="searchLoading"
        :data="searchResults"
        row-key="unifiedCreditCode"
        stripe
        style="width: 100%"
        :row-class-name="getRowClassName"
        @selection-change="handleSelectionChange"
      >
        <el-table-column
          type="selection"
          width="50"
          :selectable="(row: ProspectSearchResultVO) => !row.isDuplicate"
        />
        <el-table-column prop="companyName" label="企业名称" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.companyName }}
            <el-tooltip v-if="row.isDuplicate" content="已存在相似客户" placement="top">
              <el-icon color="#E6A23C" style="margin-left: 4px"><WarningFilled /></el-icon>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="legalPerson" label="法人" width="100" />
        <el-table-column prop="industry" label="行业" width="120" show-overflow-tooltip />
        <el-table-column label="地域" width="120">
          <template #default="{ row }">
            {{ row.province }}{{ row.city ? ' ' + row.city : '' }}
          </template>
        </el-table-column>
        <el-table-column prop="registeredCapital" label="注册资本(万)" width="120" align="right">
          <template #default="{ row }">
            {{ row.registeredCapital ? `${row.registeredCapital}万` : '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="employeeCount" label="员工数" width="90" align="right">
          <template #default="{ row }">
            {{ row.employeeCount ?? '-' }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.isDuplicate" type="warning" size="small">已存在</el-tag>
            <el-tag v-else type="success" size="small">新</el-tag>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="searchPage"
          v-model:page-size="searchPageSize"
          :total="searchTotal"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @size-change="handleSearch"
          @current-change="handleSearch"
        />
      </div>
    </el-card>

    <!-- 搜索历史抽屉 -->
    <el-drawer v-model="historyVisible" title="搜索历史" size="500px">
      <el-table v-loading="historyLoading" :data="searchHistory" stripe>
        <el-table-column prop="createdAt" label="时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="搜索条件" min-width="200">
          <template #default="{ row }">
            {{ formatSearchQuery(row.query) }}
          </template>
        </el-table-column>
        <el-table-column prop="resultCount" label="结果数" width="80" align="right" />
        <el-table-column prop="channel" label="渠道" width="80">
          <template #default="{ row }">
            {{ getChannelLabel(row.channel) }}
          </template>
        </el-table-column>
      </el-table>
    </el-drawer>

    <!-- 保存搜索模板对话框 -->
    <el-dialog
      v-model="saveTemplateVisible"
      title="保存搜索模板"
      width="400px"
      :close-on-click-modal="false"
    >
      <el-form label-width="80px">
        <el-form-item label="模板名称">
          <el-input v-model="saveTemplateName" placeholder="如：北京科技企业" maxlength="100" />
        </el-form-item>
        <el-form-item label="共享">
          <el-switch v-model="saveTemplateShared" active-text="所有人可见" inactive-text="仅自己" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="saveTemplateVisible = false">取消</el-button>
        <el-button type="primary" :loading="saveTemplateLoading" @click="handleSaveTemplate">
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Download, Clock, WarningFilled, Delete } from '@element-plus/icons-vue'
import {
  prospectApi,
  type ProspectSearchResultVO,
  type ProspectSearchLogVO,
  type ProspectSearchParams,
} from '@/api/prospect'
import {
  searchTemplateApi,
  dataSourceApi,
  filterConfigApi,
  type SearchTemplateVO,
  type DataSourceVO,
  type FilterConfigVO,
} from '@/api/prospect-config'
import { formatDate } from '@/utils/format'

/* ---- 搜索表单 ---- */
const searchForm = ref<ProspectSearchParams>({
  keyword: '',
  industry: '',
  province: '',
  city: '',
  minRegisteredCapital: undefined,
  maxRegisteredCapital: undefined,
  minEmployeeCount: undefined,
  maxEmployeeCount: undefined,
})

/* ---- 搜索模板 ---- */
const searchTemplates = ref<SearchTemplateVO[]>([])
const selectedTemplateId = ref<number | undefined>(undefined)
const saveTemplateVisible = ref(false)
const saveTemplateName = ref('')
const saveTemplateShared = ref(false)
const saveTemplateLoading = ref(false)

async function loadSearchTemplates() {
  try {
    const res = await searchTemplateApi.getAll()
    searchTemplates.value = res.data ?? []
  } catch {
    // silently ignore
  }
}

function handleTemplateSelect(templateId: number) {
  const tpl = searchTemplates.value.find((t) => t.id === templateId)
  if (!tpl) return
  const c = tpl.conditions as Partial<ProspectSearchParams>
  searchForm.value.keyword = (c.keyword as string) ?? ''
  searchForm.value.industry = (c.industry as string) ?? ''
  searchForm.value.province = (c.province as string) ?? ''
  searchForm.value.city = (c.city as string) ?? ''
  searchForm.value.minRegisteredCapital = c.minRegisteredCapital as number | undefined
  searchForm.value.maxRegisteredCapital = c.maxRegisteredCapital as number | undefined
  searchForm.value.minEmployeeCount = c.minEmployeeCount as number | undefined
  searchForm.value.maxEmployeeCount = c.maxEmployeeCount as number | undefined
}

async function handleSaveTemplate() {
  if (!saveTemplateName.value.trim()) {
    ElMessage.warning('请输入模板名称')
    return
  }
  saveTemplateLoading.value = true
  try {
    const conditions: Record<string, unknown> = {}
    const f = searchForm.value
    if (f.keyword) conditions.keyword = f.keyword
    if (f.industry) conditions.industry = f.industry
    if (f.province) conditions.province = f.province
    if (f.city) conditions.city = f.city
    if (f.minRegisteredCapital != null) conditions.minRegisteredCapital = f.minRegisteredCapital
    if (f.maxRegisteredCapital != null) conditions.maxRegisteredCapital = f.maxRegisteredCapital
    if (f.minEmployeeCount != null) conditions.minEmployeeCount = f.minEmployeeCount
    if (f.maxEmployeeCount != null) conditions.maxEmployeeCount = f.maxEmployeeCount
    await searchTemplateApi.create({
      name: saveTemplateName.value.trim(),
      conditions,
      isShared: saveTemplateShared.value,
    })
    ElMessage.success('模板保存成功')
    saveTemplateVisible.value = false
    saveTemplateName.value = ''
    saveTemplateShared.value = false
    await loadSearchTemplates()
  } catch {
    ElMessage.error('保存失败')
  } finally {
    saveTemplateLoading.value = false
  }
}

async function handleDeleteTemplate(id: number) {
  try {
    await ElMessageBox.confirm('确定删除该搜索模板？', '确认删除', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await searchTemplateApi.remove(id)
    ElMessage.success('已删除')
    if (selectedTemplateId.value === id) selectedTemplateId.value = undefined
    await loadSearchTemplates()
  } catch {
    // cancelled or error
  }
}

/* ---- 数据源 ---- */
const dataSources = ref<DataSourceVO[]>([])
const selectedDataSource = ref<string>('mock')

async function loadDataSources() {
  try {
    const res = await dataSourceApi.getAll()
    dataSources.value = (res.data ?? []).filter((d) => d.isEnabled)
  } catch {
    // silently ignore — non-admin users may get 403
  }
}

/* ---- 动态过滤字段 ---- */
const filterConfig = ref<FilterConfigVO>({
  id: 0,
  enabledFilters: ['keyword', 'industry', 'province', 'city', 'registeredCapital', 'employeeCount'],
  customFilters: [],
  updatedBy: 0,
  updatedAt: '',
})
const customFilterValues = ref<Record<string, string | number | null | undefined>>({})

async function loadFilterConfig() {
  try {
    const res = await filterConfigApi.get()
    if (res.data) {
      filterConfig.value = res.data
    }
  } catch {
    // fallback defaults already set
  }
}

function isFilterEnabled(fieldName: string): boolean {
  if (filterConfig.value.enabledFilters.length === 0) return true
  return filterConfig.value.enabledFilters.includes(fieldName)
}

/* ---- 生命周期 ---- */
onMounted(async () => {
  await Promise.all([loadSearchTemplates(), loadDataSources(), loadFilterConfig()])
})

/* ---- 搜索结果 ---- */
const searchLoading = ref(false)
const importLoading = ref(false)
const hasSearched = ref(false)
const searchResults = ref<ProspectSearchResultVO[]>([])
const searchTotal = ref(0)
const searchPage = ref(1)
const searchPageSize = ref(20)
const selectedRows = ref<ProspectSearchResultVO[]>([])

/* ---- 搜索历史 ---- */
const historyVisible = ref(false)
const historyLoading = ref(false)
const searchHistory = ref<ProspectSearchLogVO[]>([])

/* ---- 选项数据 ---- */
const industryOptions = [
  '互联网/IT',
  '制造业',
  '金融',
  '教育',
  '医疗健康',
  '房地产',
  '零售',
  '物流运输',
  '农业',
  '能源',
]

const provinceOptions = [
  '广东',
  '上海',
  '北京',
  '浙江',
  '江苏',
  '四川',
  '湖北',
  '山东',
  '福建',
  '河南',
]

const citiesByProvince: Record<string, string[]> = {
  广东: ['深圳', '广州', '东莞', '佛山'],
  上海: ['上海'],
  北京: ['北京'],
  浙江: ['杭州', '宁波', '温州'],
  江苏: ['南京', '苏州', '无锡'],
  四川: ['成都', '绵阳'],
  湖北: ['武汉', '宜昌'],
  山东: ['济南', '青岛', '烟台'],
  福建: ['福州', '厦门'],
  河南: ['郑州', '洛阳'],
}

const cityOptions = computed(() => {
  if (!searchForm.value.province) return []
  return citiesByProvince[searchForm.value.province] ?? []
})

/* ---- 搜索 ---- */
async function handleSearch() {
  searchLoading.value = true
  hasSearched.value = true
  try {
    const params: ProspectSearchParams & { channel?: string } = {
      ...searchForm.value,
      page: searchPage.value,
      pageSize: searchPageSize.value,
      channel: selectedDataSource.value,
      ...customFilterValues.value,
    }
    // 清除空字符串
    if (!params.keyword) delete params.keyword
    if (!params.industry) delete params.industry
    if (!params.province) delete params.province
    if (!params.city) delete params.city

    const res = await prospectApi.search(params)
    if (res.data) {
      searchResults.value = res.data.results
      searchTotal.value = res.data.total
    }
  } catch {
    ElMessage.error('搜索失败，请重试')
  } finally {
    searchLoading.value = false
  }
}

function handleReset() {
  searchForm.value = {
    keyword: '',
    industry: '',
    province: '',
    city: '',
    minRegisteredCapital: undefined,
    maxRegisteredCapital: undefined,
    minEmployeeCount: undefined,
    maxEmployeeCount: undefined,
  }
  customFilterValues.value = {}
}

/* ---- 选择 ---- */
function handleSelectionChange(rows: ProspectSearchResultVO[]) {
  selectedRows.value = rows
}

function getRowClassName({ row }: { row: ProspectSearchResultVO }): string {
  return row.isDuplicate ? 'duplicate-row' : ''
}

/* ---- 导入 ---- */
async function handleImport() {
  if (selectedRows.value.length === 0) return

  await ElMessageBox.confirm(`确定导入 ${selectedRows.value.length} 条线索到线索池？`, '确认导入', {
    confirmButtonText: '导入',
    cancelButtonText: '取消',
    type: 'info',
  })

  importLoading.value = true
  try {
    const res = await prospectApi.importToPool(selectedRows.value)
    if (res.data) {
      ElMessage.success(`成功导入 ${res.data.imported} 条，跳过 ${res.data.skipped} 条重复线索`)
    }
  } catch {
    ElMessage.error('导入失败')
  } finally {
    importLoading.value = false
  }
}

/* ---- 搜索历史 ---- */

watch(historyVisible, async (visible) => {
  if (visible) {
    historyLoading.value = true
    try {
      const res = await prospectApi.getSearchHistory()
      searchHistory.value = (res.data ?? []) as ProspectSearchLogVO[]
    } finally {
      historyLoading.value = false
    }
  }
})

/* ---- 工具方法 ---- */
function formatSearchQuery(query: Record<string, unknown>): string {
  const parts: string[] = []
  if (query.keyword) parts.push(`关键词: ${query.keyword as string}`)
  if (query.industry) parts.push(`行业: ${query.industry as string}`)
  if (query.province)
    parts.push(`地区: ${query.province as string}${query.city ? ' ' + (query.city as string) : ''}`)
  return parts.length > 0 ? parts.join(', ') : '无条件搜索'
}

function getChannelLabel(channel: string): string {
  const map: Record<string, string> = {
    tianyancha: '天眼查',
    qichacha: '企查查',
    manual: '手动',
    mock: '模拟',
  }
  return map[channel] ?? channel
}
</script>

<style scoped>
.prospect-search-page {
  padding: 20px;
}

.search-card {
  margin-bottom: 16px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.template-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.template-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.template-delete-icon {
  color: var(--el-color-danger);
  cursor: pointer;
  margin-left: 8px;
}

.search-form {
  margin-bottom: -18px;
}

.range-inputs {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
}

.range-sep {
  color: #999;
  flex-shrink: 0;
}

.result-card {
  margin-bottom: 16px;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  padding: 16px 0 0;
}

:deep(.duplicate-row) {
  background-color: #fdf6ec !important;
}

:deep(.duplicate-row:hover > td) {
  background-color: #faecd8 !important;
}
</style>
