<template>
  <div class="page-container" ref="pageContainerRef">
    <!-- Pull to refresh indicator -->
    <PullRefreshIndicator
      :pull-distance="pullDistance"
      :is-refreshing="isRefreshing"
      :threshold="THRESHOLD"
    />

    <div class="page-header">
      <h1 class="page-title">配送规划</h1>
      <div class="header-actions">
        <el-button
          @click="handleExport"
          :disabled="exportCount === 0"
        >
          <el-icon><Download /></el-icon>
          <span class="btn-text-full">导出 ({{ exportCount }}条)</span>
          <span class="btn-text-short">导出</span>
        </el-button>
      </div>
    </div>

    <el-tabs v-model="activeTab" class="delivery-tabs" @tab-change="handleTabChange">
      <!-- Tab 1: 自送配送 -->
      <el-tab-pane label="自送配送" name="self">
        <!-- Header buttons - only for self delivery -->
        <div class="tab-header-actions">
          <div class="location-buttons">
            <el-button @click="showDepartureDialog" :title="departure.address ? '出发地: ' + departure.address : '设置出发地'">
              <el-icon><Location /></el-icon>
              <span class="btn-text-full">出发地{{ departure.address ? ': ' + departure.address : '' }}</span>
              <span class="btn-text-short">出发地</span>
            </el-button>
            <el-button @click="showDestinationDialog" :disabled="isRoundTrip" :title="!isRoundTrip && destination.address ? '结束地: ' + destination.address : '设置结束地'">
              <el-icon><Flag /></el-icon>
              <span class="btn-text-full">结束地{{ !isRoundTrip && destination.address ? ': ' + destination.address : '' }}</span>
              <span class="btn-text-short">结束地</span>
            </el-button>
            <el-checkbox v-model="isRoundTrip" class="roundtrip-checkbox">
              环形
            </el-checkbox>
            <el-button
              type="primary"
              @click="showCreateTaskDialog"
              :disabled="selectedDeliveries.length === 0 || !isLocationsValid"
            >
              <el-icon><Plus /></el-icon>
              <span class="btn-text-full">创建任务 ({{ selectedDeliveries.length }})</span>
              <span class="btn-text-short">创建({{ selectedDeliveries.length }})</span>
            </el-button>
          </div>
        </div>

        <!-- Filters -->
        <div class="express-filters">
          <el-select
            v-model="selfDeliveryFilter"
            placeholder="状态筛选"
            clearable
            style="width: 120px"
          >
            <el-option label="待配送" value="pending" />
            <el-option label="已分配" value="assigned" />
            <el-option label="配送中" value="delivering" />
            <el-option label="已送达" value="delivered" />
          </el-select>
        </div>

        <el-row :gutter="20">
          <!-- Pending Deliveries -->
          <el-col :xs="24" :lg="12">
            <el-card shadow="never">
              <template #header>
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                  <span>配送订单</span>
                  <span class="pickup-count-tag">{{ filteredSelfDeliveries.length }}</span>
                </div>
              </template>
              <!-- Desktop: Table view -->
              <el-table
                :data="filteredSelfDeliveries"
                v-loading="deliveryStore.loading"
                class="desktop-table"
                @selection-change="handleSelectionChange"
                style="width: 100%"
                ref="tableRef"
              >
                <el-table-column type="selection" width="40" :selectable="(row: OrderDelivery) => row.status === 'pending'" />
                <el-table-column prop="order" label="买家" min-width="100">
                  <template #default="{ row }">
                    <span>{{ row.order?.customer?.name || '-' }}</span>
                  </template>
                </el-table-column>
                <el-table-column label="收件人" min-width="100">
                  <template #default="{ row }">
                    <div class="recipient-info">
                      <span>{{ row.recipient_name || row.order?.customer?.name || '-' }}</span>
                      <el-icon v-if="row.recipient_name && row.recipient_name !== row.order?.customer?.name"
                        class="diff-icon" color="#D4A574" title="收件人与买家不同"
                      >
                        <Warning />
                      </el-icon>
                    </div>
                  </template>
                </el-table-column>
                <el-table-column prop="address" label="地址" min-width="180" show-overflow-tooltip>
                  <template #default="{ row }">
                    <div class="address-cell">
                      <span>{{ row.address }}</span>
                      <el-icon v-if="!row.location" color="#CF4B3F" size="14" title="未获取坐标">
                        <Location />
                      </el-icon>
                      <el-icon v-else color="#7D9D6C" size="14" title="已获取坐标">
                        <LocationFilled />
                      </el-icon>
                    </div>
                  </template>
                </el-table-column>
                <el-table-column prop="quantity" label="数量" width="60" align="center" />
                <el-table-column prop="recipient_phone" label="电话" width="120">
                  <template #default="{ row }">
                    <PhoneField :phone="row.recipient_phone || row.order?.customer?.phone" />
                  </template>
                </el-table-column>
                <el-table-column prop="status" label="状态" width="90">
                  <template #default="{ row }">
                    <el-tag
                      size="small"
                      :class="'status-tag--' + row.status"
                    >{{ getSelfDeliveryStatusText(row.status) }}</el-tag>
                  </template>
                </el-table-column>
              </el-table>
              <!-- Mobile: Card view for pending deliveries -->
              <div class="mobile-card-list" v-loading="deliveryStore.loading">
                <div
                  v-for="row in filteredSelfDeliveries"
                  :key="row.id"
                  class="delivery-mobile-card"
                  :class="{ selected: selectedDeliveries.includes(row) }"
                  @click="toggleDeliverySelection(row)"
                >
                  <div class="card-header-row">
                    <el-checkbox
                      :model-value="selectedDeliveries.includes(row)"
                      @click.stop
                      @change="toggleDeliverySelection(row)"
                    />
                    <span class="customer-name">{{ row.order?.customer?.name || '-' }}</span>
                    <el-tag size="small">{{ row.quantity }}箱</el-tag>
                  </div>
                  <div class="card-address">
                    <el-icon v-if="!row.location" color="#CF4B3F" size="14"><Location /></el-icon>
                    <el-icon v-else color="#7D9D6C" size="14"><LocationFilled /></el-icon>
                    <span>{{ row.address }}</span>
                  </div>
                  <div class="card-footer">
                    <PhoneField :phone="row.recipient_phone || row.order?.customer?.phone" />
                    <span v-if="row.recipient_name && row.recipient_name !== row.order?.customer?.name" class="recipient">
                      收件: {{ row.recipient_name }}
                    </span>
                  </div>
                </div>
                <el-empty v-if="filteredSelfDeliveries.length === 0" description="暂无待配送订单" />
              </div>
            </el-card>
          </el-col>

          <!-- Delivery Tasks -->
          <el-col :xs="24" :lg="12">
            <el-card shadow="never">
              <template #header>配送任务</template>

              <el-collapse v-model="activeCollapse">
                <!-- 未完成任务 -->
                <el-collapse-item name="active">
                  <template #title>
                    <div class="collapse-title">
                      <span>进行中的任务</span>
                      <span class="pickup-count-tag">{{ activeTasks.length }}</span>
                    </div>
                  </template>

                  <!-- Desktop: Table view -->
                  <el-table :data="activeTasks" style="width: 100%" class="desktop-table" v-if="activeTasks.length > 0">
                    <el-table-column prop="name" label="任务名称" min-width="150">
                      <template #default="{ row }">
                        <el-button text type="primary" @click="viewTask(row)">
                          {{ row.name || '未命名任务' }}
                        </el-button>
                      </template>
                    </el-table-column>
                    <el-table-column prop="status" label="状态" width="90">
                      <template #default="{ row }">
                        <el-tag size="small" :class="getTaskStatusClass(row.status)">
                          {{ getTaskStatusText(row.status) }}
                        </el-tag>
                      </template>
                    </el-table-column>
                    <el-table-column prop="total_distance" label="距离" width="80">
                      <template #default="{ row }">
                        {{ row.total_distance ? `${row.total_distance}km` : '-' }}
                      </template>
                    </el-table-column>
                    <el-table-column prop="created_at" label="创建时间" width="100">
                      <template #default="{ row }">
                        {{ formatDate(row.created_at) }}
                      </template>
                    </el-table-column>
                    <el-table-column label="操作" width="160">
                      <template #default="{ row }">
                        <div class="task-actions">
                          <el-button
                            v-if="row.status === 'planning'"
                            text
                            type="success"
                            @click="startTask(row)"
                          >
                            开始
                          </el-button>
                          <el-button
                            v-if="row.status === 'in_progress'"
                            text
                            type="warning"
                            @click="cancelTask(row)"
                          >
                            撤销
                          </el-button>
                          <el-button text type="primary" @click="viewTask(row)">详情</el-button>
                          <el-button
                            v-if="row.status !== 'in_progress'"
                            text
                            type="danger"
                            @click="deleteTask(row)"
                          >
                            删除
                          </el-button>
                        </div>
                      </template>
                    </el-table-column>
                  </el-table>

                  <!-- Mobile: Card view for active tasks -->
                  <div class="mobile-card-list">
                    <div
                      v-for="row in activeTasks"
                      :key="row.id"
                      class="task-mobile-card"
                      @click="viewTask(row)"
                    >
                      <div class="card-header-row">
                        <span class="task-name">{{ row.name || '未命名任务' }}</span>
                        <el-tag size="small" :class="getTaskStatusClass(row.status)">
                          {{ getTaskStatusText(row.status) }}
                        </el-tag>
                      </div>
                      <div class="card-info-row">
                        <span v-if="row.total_distance">{{ row.total_distance }}km</span>
                        <span>{{ formatDate(row.created_at) }}</span>
                      </div>
                      <div class="card-actions">
                        <el-button
                          v-if="row.status === 'planning'"
                          size="small"
                          type="success"
                          @click.stop="startTask(row)"
                        >
                          开始
                        </el-button>
                        <el-button
                          v-if="row.status === 'in_progress'"
                          size="small"
                          type="warning"
                          @click.stop="cancelTask(row)"
                        >
                          撤销
                        </el-button>
                        <el-button
                          v-if="row.status !== 'in_progress'"
                          size="small"
                          type="danger"
                          @click.stop="deleteTask(row)"
                        >
                          删除
                        </el-button>
                      </div>
                    </div>
                    <el-empty v-if="activeTasks.length === 0" description="暂无进行中的任务" :image-size="60" />
                  </div>
                </el-collapse-item>

                <!-- 已完成任务 -->
                <el-collapse-item name="completed">
                  <template #title>
                    <div class="collapse-title">
                      <span>已完成的任务</span>
                      <span class="pickup-count-tag pickup-count-tag--done">{{ completedTasks.length }}</span>
                    </div>
                  </template>

                  <!-- Desktop: Table view -->
                  <el-table :data="completedTasks" style="width: 100%" class="desktop-table" v-if="completedTasks.length > 0">
                    <el-table-column prop="name" label="任务名称" min-width="150">
                      <template #default="{ row }">
                        <el-button text type="primary" @click="viewTask(row)">
                          {{ row.name || '未命名任务' }}
                        </el-button>
                      </template>
                    </el-table-column>
                    <el-table-column prop="status" label="状态" width="90">
                      <template #default="{ row }">
                        <el-tag size="small" :class="getTaskStatusClass(row.status)">
                          {{ getTaskStatusText(row.status) }}
                        </el-tag>
                      </template>
                    </el-table-column>
                    <el-table-column prop="total_distance" label="距离" width="80">
                      <template #default="{ row }">
                        {{ row.total_distance ? `${row.total_distance}km` : '-' }}
                      </template>
                    </el-table-column>
                    <el-table-column prop="created_at" label="创建时间" width="100">
                      <template #default="{ row }">
                        {{ formatDate(row.created_at) }}
                      </template>
                    </el-table-column>
                    <el-table-column label="操作" width="120">
                      <template #default="{ row }">
                        <div class="task-actions">
                          <el-button text type="primary" @click="viewTask(row)">详情</el-button>
                          <el-button
                            text
                            type="danger"
                            @click="deleteTask(row)"
                          >
                            删除
                          </el-button>
                        </div>
                      </template>
                    </el-table-column>
                  </el-table>

                  <!-- Mobile: Card view for completed tasks -->
                  <div class="mobile-card-list">
                    <div
                      v-for="row in completedTasks"
                      :key="row.id"
                      class="task-mobile-card"
                      @click="viewTask(row)"
                    >
                      <div class="card-header-row">
                        <span class="task-name">{{ row.name || '未命名任务' }}</span>
                        <el-tag size="small" :class="getTaskStatusClass(row.status)">
                          {{ getTaskStatusText(row.status) }}
                        </el-tag>
                      </div>
                      <div class="card-info-row">
                        <span v-if="row.total_distance">{{ row.total_distance }}km</span>
                        <span>{{ formatDate(row.created_at) }}</span>
                      </div>
                      <div class="card-actions">
                        <el-button
                          size="small"
                          type="danger"
                          @click.stop="deleteTask(row)"
                        >
                          删除
                        </el-button>
                      </div>
                    </div>
                    <el-empty v-if="completedTasks.length === 0" description="暂无已完成的任务" :image-size="60" />
                  </div>
                </el-collapse-item>
              </el-collapse>
            </el-card>
          </el-col>
        </el-row>
      </el-tab-pane>

      <!-- Tab 2: 快递发货 -->
      <el-tab-pane label="快递发货" name="express">
        <el-card shadow="never">
          <template #header>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span>快递订单</span>
            </div>
          </template>

          <!-- Filters -->
          <div class="express-filters">
            <el-select
              v-model="expressFilters.status"
              placeholder="状态筛选"
              clearable
              style="width: 140px; margin-right: 12px;"
            >
              <el-option label="待包装" value="pending_pack" />
              <el-option label="待打印面单" value="pending_label" />
              <el-option label="待寄件" value="pending_dropoff" />
              <el-option label="运输中" value="in_transit" />
              <el-option label="已签收" value="delivered" />
              <el-option label="异常" value="exception" />
            </el-select>

            <el-select
              v-model="expressFilters.company"
              placeholder="快递公司"
              clearable
              style="width: 140px; margin-right: 12px;"
            >
              <el-option
                v-for="company in expressCompanies"
                :key="company.id"
                :label="company.name"
                :value="company.code"
              />
            </el-select>

            <el-button @click="refreshExpressList" :loading="expressLoading">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
          </div>

          <!-- Desktop: Table view -->
          <el-table
            :data="filteredExpressDeliveries"
            v-loading="expressLoading"
            class="desktop-table"
            style="width: 100%; margin-top: 16px;"
            :row-class-name="getExpressRowClass"
          >
            <el-table-column prop="order" label="客户" min-width="100">
              <template #default="{ row }">
                <span class="col-customer">{{ row.order?.customer?.name || '-' }}</span>
              </template>
            </el-table-column>

            <el-table-column prop="order" label="订单号" min-width="130">
              <template #default="{ row }">
                <span class="col-order-number">{{ row.order?.order_number || '-' }}</span>
              </template>
            </el-table-column>

            <el-table-column prop="express_status" label="状态" min-width="130">
              <template #default="{ row }">
                <el-dropdown trigger="click" @command="(cmd: string) => changeExpressStatus(row.id, cmd as ExpressStatus)">
                  <span :class="'status-pill status-pill--' + row.express_status">
                    {{ getExpressStatusText(row.express_status) }}
                    <el-icon :size="12"><ArrowDown /></el-icon>
                  </span>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <template v-for="status in EXPRESS_STATUS_FLOW" :key="status">
                        <el-dropdown-item
                          :command="status"
                          :class="{ 'is-active': row.express_status === status }"
                          :disabled="row.express_status === status"
                        >
                          <span v-if="row.express_status === status" style="font-weight: 600;">✓ </span>
                          <span v-else style="margin-left: 14px;" />
                          {{ getExpressStatusText(status) }}
                        </el-dropdown-item>
                      </template>
                      <el-dropdown-item divided command="exception">
                        <span style="color: var(--status-cancelled);">⚠ 标记异常</span>
                      </el-dropdown-item>
                      <template v-if="row.express_status === 'exception'">
                        <el-dropdown-item
                          v-for="status in EXPRESS_STATUS_FLOW"
                          :key="'reset-' + status"
                          :command="status"
                        >
                          恢复为{{ getExpressStatusText(status) }}
                        </el-dropdown-item>
                      </template>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </template>
            </el-table-column>

            <el-table-column prop="quantity" label="数量" width="70" align="center">
              <template #default="{ row }">
                <span class="col-quantity">{{ row.quantity }}箱</span>
              </template>
            </el-table-column>

            <el-table-column prop="express_company" label="快递公司" width="100">
              <template #default="{ row }">
                <span>{{ getCompanyName(row.express_company) }}</span>
              </template>
            </el-table-column>

            <el-table-column prop="tracking_number" label="运单号" min-width="150">
              <template #default="{ row }">
                <div class="tracking-numbers-cell">
                  <template v-if="getTrackingNumbers(row).length > 0">
                    <a
                      :href="getTrackingUrlFromItem(getTrackingNumbers(row)[0]!, row.express_company)"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="tracking-link"
                    >{{ getTrackingNumbers(row)[0]!.number }}</a>
                    <template v-if="getTrackingNumbers(row).length > 1">
                      <a
                        v-for="(tn, idx) in getTrackingNumbers(row).slice(1)"
                        v-show="isTrackingExpanded(row.id)"
                        :key="idx"
                        :href="getTrackingUrlFromItem(tn, row.express_company)"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="tracking-link"
                      >{{ tn.number }}</a>
                      <el-button
                        text
                        size="small"
                        class="tracking-toggle"
                        @click.stop="toggleTrackingExpanded(row.id)"
                      >
                        {{ isTrackingExpanded(row.id) ? '收起' : `+${getTrackingNumbers(row).length - 1}` }}
                      </el-button>
                    </template>
                  </template>
                  <span v-else style="color: #909399;">未填写</span>
                </div>
              </template>
            </el-table-column>

            <el-table-column prop="recipient_name" label="收件人/地址" min-width="180">
              <template #default="{ row }">
                <div class="express-recipient-info">
                  <div>{{ row.recipient_name || row.order?.customer?.name || '-' }}</div>
                  <div class="express-address">{{ row.address }}</div>
                </div>
              </template>
            </el-table-column>

            <el-table-column prop="created_at" label="创建时间" width="100">
              <template #default="{ row }">
                <span class="col-time">{{ formatDate(row.created_at) }}</span>
              </template>
            </el-table-column>

            <el-table-column label="操作" width="120">
              <template #default="{ row }">
                <div class="express-actions">
                  <el-button
                    text
                    :type="getTrackingNumbers(row).length === 0 ? 'primary' : 'default'"
                    @click="openTrackingDialog(row)"
                  >
                    {{ getTrackingNumbers(row).length === 0 ? '输入运单号' : '编辑运单号' }}
                  </el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>

          <!-- Mobile: Card view for express deliveries -->
          <div class="mobile-card-list" v-loading="expressLoading" style="margin-top: 16px;">
            <div
              v-for="row in filteredExpressDeliveries"
              :key="row.id"
              class="express-mobile-card"
              :class="{ highlighted: highlightDeliveryId === row.id }"
            >
              <div class="card-header-row">
                <span class="card-customer">{{ row.order?.customer?.name || '-' }}</span>
                <el-dropdown trigger="click" @command="(cmd: string) => changeExpressStatus(row.id, cmd as ExpressStatus)">
                  <span :class="'status-pill status-pill--' + row.express_status">
                    {{ getExpressStatusText(row.express_status) }}
                    <el-icon :size="12"><ArrowDown /></el-icon>
                  </span>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <template v-for="status in EXPRESS_STATUS_FLOW" :key="status">
                        <el-dropdown-item
                          :command="status"
                          :class="{ 'is-active': row.express_status === status }"
                          :disabled="row.express_status === status"
                        >
                          <span v-if="row.express_status === status" style="font-weight: 600;">✓ </span>
                          <span v-else style="margin-left: 14px;" />
                          {{ getExpressStatusText(status) }}
                        </el-dropdown-item>
                      </template>
                      <el-dropdown-item divided command="exception">
                        <span style="color: var(--status-cancelled);">⚠ 标记异常</span>
                      </el-dropdown-item>
                      <template v-if="row.express_status === 'exception'">
                        <el-dropdown-item
                          v-for="status in EXPRESS_STATUS_FLOW"
                          :key="'reset-' + status"
                          :command="status"
                        >
                          恢复为{{ getExpressStatusText(status) }}
                        </el-dropdown-item>
                      </template>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
              <div class="card-key-info">
                <span class="card-order-number">{{ row.order?.order_number || '-' }}</span>
                <span class="card-quantity">{{ row.quantity }}箱</span>
              </div>
              <div class="card-detail">
                <span v-if="row.express_company">{{ getCompanyName(row.express_company) }}</span>
              </div>
              <div v-if="getTrackingNumbers(row).length > 0" class="card-tracking-list">
                <a
                  :href="getTrackingUrlFromItem(getTrackingNumbers(row)[0]!, row.express_company)"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="tracking-link card-tracking-num"
                >{{ getTrackingNumbers(row)[0]!.number }}</a>
                <template v-if="getTrackingNumbers(row).length > 1">
                  <a
                    v-for="(tn, idx) in getTrackingNumbers(row).slice(1)"
                    v-show="isTrackingExpanded(row.id)"
                    :key="idx"
                    :href="getTrackingUrlFromItem(tn, row.express_company)"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="tracking-link card-tracking-num"
                  >{{ tn.number }}</a>
                  <span
                    class="tracking-toggle-mobile"
                    @click.stop="toggleTrackingExpanded(row.id)"
                  >
                    {{ isTrackingExpanded(row.id) ? '收起' : `+${getTrackingNumbers(row).length - 1}个运单号` }}
                  </span>
                </template>
              </div>
              <div class="card-detail card-address">{{ row.address }}</div>
              <div class="card-footer">
                <span class="card-time">{{ formatDate(row.created_at) }}</span>
                <div class="card-actions">
                  <el-button
                    size="small"
                    :type="getTrackingNumbers(row).length === 0 ? 'primary' : 'default'"
                    @click="openTrackingDialog(row)"
                  >
                    {{ getTrackingNumbers(row).length === 0 ? '输入运单号' : '编辑' }}
                  </el-button>
                </div>
              </div>
            </div>
            <el-empty v-if="filteredExpressDeliveries.length === 0" description="暂无快递订单" />
          </div>
        </el-card>
      </el-tab-pane>

      <!-- Tab 3: 自提管理 -->
      <el-tab-pane label="自提管理" name="pickup">
        <el-card shadow="never">
          <template #header>
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
              <span>自提订单</span>
              <div style="display: flex; gap: 8px;">
                <span
                  class="pickup-count-tag"
                  :class="{ active: pickupFilter === 'pending' }"
                  @click="pickupFilter = pickupFilter === 'pending' ? '' : 'pending'"
                >待自提 {{ pendingPickups.length }}</span>
                <span
                  class="pickup-count-tag pickup-count-tag--done"
                  :class="{ active: pickupFilter === 'picked_up' }"
                  @click="pickupFilter = pickupFilter === 'picked_up' ? '' : 'picked_up'"
                >已自提 {{ pickedUpDeliveries.length }}</span>
              </div>
            </div>
          </template>

          <!-- Filters -->
          <div class="express-filters">
            <el-select
              v-model="pickupFilter"
              placeholder="状态筛选"
              clearable
              style="width: 120px; margin-right: 12px;"
            >
              <el-option label="待自提" value="pending" />
              <el-option label="已自提" value="picked_up" />
            </el-select>

            <el-radio-group v-model="pickupDateFilter" size="default" style="margin-right: 12px;">
              <el-radio-button value="today">今天</el-radio-button>
              <el-radio-button value="week">本周</el-radio-button>
              <el-radio-button value="">全部</el-radio-button>
            </el-radio-group>

            <el-button @click="refreshPickupList" :loading="pickupLoading">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
          </div>

          <!-- Desktop: Table view -->
          <el-table
            :data="filteredPickupDeliveries"
            v-loading="pickupLoading"
            class="desktop-table"
            style="width: 100%; margin-top: 16px;"
          >
                        <el-table-column prop="order" label="客户" min-width="100">
              <template #default="{ row }">
                <span class="col-customer">{{ row.order?.customer?.name || '-' }}</span>
              </template>
            </el-table-column>

            <el-table-column prop="order" label="订单号" min-width="130">
              <template #default="{ row }">
                <span class="col-order-number">{{ row.order?.order_number || '-' }}</span>
              </template>
            </el-table-column>

            <el-table-column prop="pickup_status" label="状态" width="100">
              <template #default="{ row }">
                <el-dropdown trigger="click" @command="(cmd: string) => changePickupStatus(row.id, cmd as PickupStatus)">
                  <span :class="'status-pill status-pill--' + row.pickup_status">
                    {{ getPickupStatusText(row.pickup_status) }}
                    <el-icon :size="12"><ArrowDown /></el-icon>
                  </span>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="pending" :disabled="row.pickup_status === 'pending'" :class="{ 'is-active': row.pickup_status === 'pending' }">
                        <span v-if="row.pickup_status === 'pending'" style="font-weight: 600;">✓ </span>
                        <span v-else style="margin-left: 14px;" />
                        待自提
                      </el-dropdown-item>
                      <el-dropdown-item command="picked_up" :disabled="row.pickup_status === 'picked_up'" :class="{ 'is-active': row.pickup_status === 'picked_up' }">
                        <span v-if="row.pickup_status === 'picked_up'" style="font-weight: 600;">✓ </span>
                        <span v-else style="margin-left: 14px;" />
                        已自提
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </template>
            </el-table-column>

            <el-table-column prop="quantity" label="数量" width="70" align="center">
              <template #default="{ row }">
                <span class="col-quantity">{{ row.quantity }}箱</span>
              </template>
            </el-table-column>

            <el-table-column prop="order" label="联系电话" min-width="115">
              <template #default="{ row }">
                <PhoneField :phone="row.order?.customer?.phone" />
              </template>
            </el-table-column>

            <el-table-column prop="created_at" label="创建时间" width="100">
              <template #default="{ row }">
                <span class="col-time">{{ formatDate(row.created_at) }}</span>
              </template>
            </el-table-column>

            <el-table-column prop="picked_up_at" label="自提时间" width="100">
              <template #default="{ row }">
                <span class="col-time">{{ row.picked_up_at ? formatDate(row.picked_up_at) : '-' }}</span>
              </template>
            </el-table-column>

            <el-table-column label="操作" width="120">
              <template #default="{ row }">
                <div class="pickup-actions">
                  <el-button
                    text
                    type="primary"
                    size="small"
                    @click="viewPickupOrder(row)"
                  >
                    订单
                  </el-button>
                  <el-button
                    text
                    type="info"
                    size="small"
                    @click="callCustomer(row.order?.customer?.phone)"
                  >
                    联系
                  </el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>

          <!-- Mobile: Card view for pickup deliveries -->
          <div class="mobile-card-list" v-loading="pickupLoading" style="margin-top: 16px;">
            <div
              v-for="row in filteredPickupDeliveries"
              :key="row.id"
              class="pickup-mobile-card"
            >
              <div class="card-header-row">
                <span class="card-customer">{{ row.order?.customer?.name || '-' }}</span>
                <el-dropdown trigger="click" @command="(cmd: string) => changePickupStatus(row.id, cmd as PickupStatus)">
                  <span :class="'status-pill status-pill--' + row.pickup_status">
                    {{ getPickupStatusText(row.pickup_status) }}
                    <el-icon :size="12"><ArrowDown /></el-icon>
                  </span>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="pending" :disabled="row.pickup_status === 'pending'" :class="{ 'is-active': row.pickup_status === 'pending' }">
                        <span v-if="row.pickup_status === 'pending'" style="font-weight: 600;">✓ </span>
                        <span v-else style="margin-left: 14px;" />
                        待自提
                      </el-dropdown-item>
                      <el-dropdown-item command="picked_up" :disabled="row.pickup_status === 'picked_up'" :class="{ 'is-active': row.pickup_status === 'picked_up' }">
                        <span v-if="row.pickup_status === 'picked_up'" style="font-weight: 600;">✓ </span>
                        <span v-else style="margin-left: 14px;" />
                        已自提
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
              <div class="card-key-info">
                <span class="card-order-number">{{ row.order?.order_number || '-' }}</span>
                <span class="card-quantity">{{ row.quantity }}箱</span>
              </div>
              <div class="card-detail">
                <PhoneField :phone="row.order?.customer?.phone" />
                <span class="card-time">{{ formatDate(row.created_at) }}</span>
              </div>
              <div class="card-footer">
                <span v-if="row.picked_up_at" class="card-time">已提: {{ formatDate(row.picked_up_at) }}</span>
                <span v-else />
                <div class="card-actions">
                  <el-button
                    size="small"
                    @click="viewPickupOrder(row)"
                  >
                    订单
                  </el-button>
                  <el-button
                    size="small"
                    @click="callCustomer(row.order?.customer?.phone)"
                  >
                    联系
                  </el-button>
                </div>
              </div>
            </div>
            <el-empty v-if="filteredPickupDeliveries.length === 0" description="暂无自提订单" />
          </div>
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <!-- Departure Location Dialog -->
    <el-dialog v-model="departureDialogVisible" title="设置出发地点" width="500px">
      <el-form :model="departureForm" label-width="80px">
        <el-form-item label="出发地址">
          <AddressInput
            v-model="departureForm.address"
            v-model:location="departureForm.location"
            placeholder="输入出发地址搜索..."
          />
        </el-form-item>
        <el-form-item label="常用地点">
          <div class="quick-locations">
            <el-tag
              v-for="loc in quickLocations"
              :key="loc.name"
              :type="departureForm.address === loc.address ? 'primary' : 'info'"
              @click="selectQuickLocation(loc)"
              style="cursor: pointer; margin: 4px;"
            >
              {{ loc.name }}
            </el-tag>
          </div>
        </el-form-item>
        <el-form-item label="坐标">
          <el-input
            :value="departureForm.location ? `${departureForm.location.lng}, ${departureForm.location.lat}` : '未获取'"
            disabled
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="departureDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveDeparture">保存</el-button>
      </template>
    </el-dialog>

    <!-- Destination Dialog -->
    <el-dialog v-model="destinationDialogVisible" title="设置结束地点" width="500px">
      <el-form :model="destinationForm" label-width="80px">
        <el-form-item label="结束地址">
          <AddressInput
            v-model="destinationForm.address"
            v-model:location="destinationForm.location"
            placeholder="输入结束地址搜索..."
          />
        </el-form-item>
        <el-form-item label="常用地点">
          <div class="quick-locations">
            <el-tag
              v-for="loc in quickLocations"
              :key="loc.name"
              :type="destinationForm.address === loc.address ? 'primary' : 'info'"
              @click="selectQuickLocationForDestination(loc)"
              style="cursor: pointer; margin: 4px;"
            >
              {{ loc.name }}
            </el-tag>
          </div>
        </el-form-item>
        <el-form-item label="坐标">
          <el-input
            :value="destinationForm.location ? `${destinationForm.location.lng}, ${destinationForm.location.lat}` : '未获取'"
            disabled
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="destinationDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveDestination">保存</el-button>
      </template>
    </el-dialog>

    <!-- Create Task Dialog -->
    <el-dialog
      v-model="createTaskDialogVisible"
      title="创建配送任务"
      width="800px"
      destroy-on-close
    >
      <el-steps :active="currentStep" finish-status="success" style="margin-bottom: 20px;">
        <el-step title="选择配送点" />
        <el-step title="路线规划" />
        <el-step title="确认创建" />
      </el-steps>

      <!-- Step 1: Delivery Points -->
      <div v-show="currentStep === 0">
        <el-alert
          v-if="deliveriesWithoutLocation.length > 0"
          type="warning"
          :closable="false"
          style="margin-bottom: 12px;"
        >
          有 {{ deliveriesWithoutLocation.length }} 个配送点未获取坐标，将自动尝试解析地址
        </el-alert>
        <div class="selected-deliveries">
          <div
            v-for="(d, index) in selectedDeliveries"
            :key="d.id"
            class="delivery-card"
          >
            <div class="delivery-index">{{ index + 1 }}</div>
            <div class="delivery-content">
              <div class="delivery-main">
                <span class="buyer">{{ d.order?.customer?.name }}</span>
                <span class="arrow">→</span>
                <span class="recipient">{{ d.recipient_name || d.order?.customer?.name }}</span>
              </div>
              <div class="delivery-address">{{ d.address }}</div>
              <div class="delivery-meta">
                <span>{{ d.quantity }} 箱</span>
                <PhoneField :phone="d.recipient_phone || d.order?.customer?.phone" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 2: Route Planning -->
      <div v-show="currentStep === 1" v-loading="planningRoute">
        <el-alert
          v-if="!amapKey"
          title="未配置高德地图 API Key，无法使用路线规划功能"
          type="error"
          :closable="false"
          style="margin-bottom: 12px;"
        />

        <div class="route-options">
          <h4>选择路线策略</h4>
          <el-radio-group v-model="selectedStrategy">
            <el-radio
              v-for="route in routeResults"
              :key="route.strategy"
              :value="route.strategy"
              border
              style="margin: 4px;"
            >
              <div class="route-option">
                <span class="route-name">{{ route.strategyName }}</span>
                <span class="route-info">
                  {{ (route.distance / 1000).toFixed(1) }} km /
                  {{ Math.round(route.duration / 60) }} 分钟
                </span>
              </div>
            </el-radio>
          </el-radio-group>
        </div>

        <!-- 地图预览 -->
        <div v-if="routeResults.length > 0 && selectedStrategy >= 0" class="route-map-preview">
          <h4>路线预览</h4>
          <div id="route-map-container" ref="mapContainer" class="route-map-container">
            <div v-if="!mapLoaded" class="map-placeholder">
              <el-icon size="48"><MapLocation /></el-icon>
              <p>{{ amapJsKey ? '地图加载中...' : '请配置高德地图 JS API Key' }}</p>
            </div>
          </div>
        </div>

        <div v-if="routeResults.length === 0 && !planningRoute" class="no-routes">
          点击"开始规划"按钮获取推荐路线
        </div>
      </div>

      <!-- Step 3: Confirm -->
      <div v-show="currentStep === 2">
        <el-form :model="taskForm" label-width="80px">
          <el-form-item label="任务名称">
            <el-input v-model="taskForm.name" placeholder="例如：2024-01-15 上午配送" />
          </el-form-item>
          <el-form-item label="出发地点">
            <el-input :value="departureName" disabled />
          </el-form-item>
          <el-form-item label="配送点数">
            <el-input :value="selectedDeliveries.length + ' 个'" disabled />
          </el-form-item>
          <el-form-item label="预计距离">
            <el-input :value="selectedRoute ? `${(selectedRoute.distance / 1000).toFixed(1)} km` : '-'" disabled />
          </el-form-item>
          <el-form-item label="预计时间">
            <el-input :value="selectedRoute ? `${Math.round(selectedRoute.duration / 60)} 分钟` : '-'" disabled />
          </el-form-item>
        </el-form>
      </div>

      <template #footer>
        <el-button v-if="currentStep > 0" @click="currentStep--">上一步</el-button>
        <el-button v-if="currentStep === 0" @click="startRoutePlanning" type="primary" :loading="planningRoute">
          开始规划
        </el-button>
        <el-button v-if="currentStep === 1" @click="currentStep++" type="primary" :disabled="selectedStrategy < 0">
          下一步
        </el-button>
        <el-button
          v-if="currentStep === 2"
          type="primary"
          :loading="submitting"
          @click="createTask"
        >
          创建任务
        </el-button>
      </template>
    </el-dialog>

    <!-- Tracking Number Dialog -->
    <el-dialog v-model="trackingDialogVisible" title="运单号管理" width="500px">
      <el-form :model="trackingForm" label-width="80px">
        <el-form-item label="快递公司">
          <el-select
            v-model="trackingForm.expressCompany"
            placeholder="选择快递公司"
            style="width: 100%"
          >
            <el-option
              v-for="company in expressCompanies"
              :key="company.code"
              :label="company.name"
              :value="company.code"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="运单号">
          <div class="tracking-numbers-input">
            <div
              v-for="(tn, idx) in trackingForm.trackingNumbers"
              :key="idx"
              class="tracking-number-row"
            >
              <el-input
                v-model="tn.number"
                placeholder="请输入运单号"
                clearable
                style="flex: 1"
              />
              <el-button
                v-if="trackingForm.trackingNumbers.length > 1"
                type="danger"
                text
                @click="removeTrackingNumber(idx)"
              >
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
            <el-button
              type="primary"
              text
              @click="addTrackingNumber"
            >
              <el-icon><Plus /></el-icon>
              添加运单号
            </el-button>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="trackingDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveTrackingNumber">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import dayjs from 'dayjs'
import { useDeliveryStore } from '@/stores/deliveries'
import { useOrderStore } from '@/stores/orders'
import { getAmapService, DEFAULT_DEPARTURE, DEFAULT_DEPARTURE_ADDRESS, type Location } from '@/api/amap'
import { exportSelfDeliveries, exportExpressDeliveries, exportPickupDeliveries } from '@/api/export'
import {
  fetchExpressDeliveries,
  fetchExpressCompanies,
  getExpressStatusText,
  getExpressStatusColor,
  getExpressBgColor,
  updateExpressStatus,
  getNextExpressStatus,
  EXPRESS_STATUS_FLOW,
  getTrackingUrl,
  getTrackingNumbers,
  buildTrackingNumbersData,
  getTrackingUrlFromItem,
  fetchPickupDeliveries,
  updatePickupStatus,
  getPickupStatusText,
  getPickupStatusColor,
  getPickupBgColor,
} from '@/api/express'
import type { TrackingNumberItem } from '@/types'
import { usePullRefresh } from '@/composables/usePullRefresh'
import PullRefreshIndicator from '@/components/PullRefreshIndicator.vue'
import PhoneField from '@/components/PhoneField.vue'
import AddressInput from '@/components/AddressInput.vue'
import type { DeliveryTask, DeliveryTaskStatus, OrderDelivery, OptimizedRoute, RouteStep, ExpressCompany, ExpressStatus, PickupStatus } from '@/types'
import type { TableInstance } from 'element-plus'

const router = useRouter()
const route = useRoute()
const deliveryStore = useDeliveryStore()
const orderStore = useOrderStore()

// Tab state
const activeTab = ref('self')

// Self delivery filter
const selfDeliveryFilter = ref<string>('')

// Express shipping state
const expressDeliveries = ref<any[]>([])
const expressCompanies = ref<ExpressCompany[]>([])
const expressFilters = reactive({
  status: '' as ExpressStatus | '',
  company: '',
})
const expressLoading = ref(false)
const trackingDialogVisible = ref(false)
const expandedTrackingIds = ref(new Set<string>())
const trackingForm = reactive({
  deliveryId: '',
  trackingNumbers: [] as TrackingNumberItem[],
  expressCompany: '' as string,
})

// Pickup state
const pickupDeliveries = ref<any[]>([])
const pickupFilter = ref<'pending' | 'picked_up' | ''>('')
const pickupDateFilter = ref<'today' | 'week' | ''>('')
const pickupLoading = ref(false)

// Highlight delivery from URL
const highlightDeliveryId = ref<string | null>(null)

// Pull to refresh setup
const pageContainerRef = ref<HTMLElement | null>(null)
const {
  isRefreshing,
  pullDistance,
  setupListeners,
  cleanupListeners,
  THRESHOLD,
} = usePullRefresh(async () => {
  await deliveryStore.fetchPendingDeliveries()
  await deliveryStore.fetchDeliveryTasks()
  await loadExpressDeliveries()
  await loadPickupDeliveries()
})

const tableRef = ref<TableInstance>()
const selectedDeliveries = ref<OrderDelivery[]>([])
const createTaskDialogVisible = ref(false)
const departureDialogVisible = ref(false)
const destinationDialogVisible = ref(false)
const submitting = ref(false)
const planningRoute = ref(false)
const currentStep = ref(0)
const isRoundTrip = ref(true) // 默认环形路线
const activeCollapse = ref(['active']) // 默认展开进行中的任务

const taskForm = reactive({
  name: '',
})

// 出发地点相关
const departure = reactive<Location & { address: string }>({
  lng: 0,
  lat: 0,
  address: '',
})

const departureForm = reactive({
  address: '',
  location: null as Location | null,
})

// 结束地点相关
const destination = reactive<Location & { address: string }>({
  lng: 0,
  lat: 0,
  address: '',
})

const destinationForm = reactive({
  address: '',
  location: null as Location | null,
})

// Recent departure locations (persisted to localStorage)
const RECENT_LOCATIONS_KEY = 'tomato-admin-recent-locations'
const MAX_RECENT_LOCATIONS = 5

interface SavedLocation {
  name: string
  address: string
  location: Location
}

const quickLocations = ref<SavedLocation[]>([])

function isValidLocation(loc: unknown): loc is Location {
  return (
    typeof loc === 'object' &&
    loc !== null &&
    typeof (loc as Location).lng === 'number' &&
    typeof (loc as Location).lat === 'number' &&
    !isNaN((loc as Location).lng) &&
    !isNaN((loc as Location).lat)
  )
}

function isValidSavedLocation(item: unknown): item is SavedLocation {
  return (
    typeof item === 'object' &&
    item !== null &&
    typeof (item as SavedLocation).name === 'string' &&
    typeof (item as SavedLocation).address === 'string' &&
    isValidLocation((item as SavedLocation).location)
  )
}

function loadRecentLocations() {
  try {
    const saved = localStorage.getItem(RECENT_LOCATIONS_KEY)
    if (saved) {
      const parsed: unknown = JSON.parse(saved)
      if (Array.isArray(parsed) && parsed.every(isValidSavedLocation)) {
        quickLocations.value = parsed
      } else {
        localStorage.removeItem(RECENT_LOCATIONS_KEY)
        console.warn('Invalid recent locations data cleared from localStorage')
      }
    }
  } catch (e) {
    console.error('Failed to load recent locations:', e)
  }
}

function saveRecentLocation(name: string, address: string, location: Location) {
  const filtered = quickLocations.value.filter(l => l.address !== address)
  const updated = [{ name, address, location }, ...filtered].slice(0, MAX_RECENT_LOCATIONS)
  quickLocations.value = updated
  try {
    localStorage.setItem(RECENT_LOCATIONS_KEY, JSON.stringify(updated))
  } catch (e) {
    console.error('Failed to save recent locations:', e)
  }
}

// 路线规划结果
const routeResults = ref<{
  strategy: number
  strategyName: string
  distance: number
  duration: number
  polyline: string
  steps: RouteStep[]
}[]>([])
const selectedStrategy = ref(-1)

// 地图相关
const mapContainer = ref<HTMLElement>()
const mapLoaded = ref(false)
const mapInstance = ref<any>(null)
const currentPolyline = ref<any>(null)

const amapKey = computed(() => import.meta.env.VITE_AMAP_KEY)
const amapJsKey = computed(() => import.meta.env.VITE_AMAP_JS_KEY)
const amapJsSecurityKey = computed(() => import.meta.env.VITE_AMAP_JS_SECURITY_KEY)
const departureName = computed(() => departure.address || '未设置')
const destinationName = computed(() => isRoundTrip.value ? departure.address || '未设置' : destination.address || '未设置')
const selectedRoute = computed(() => routeResults.value.find(r => r.strategy === selectedStrategy.value))

// 检查位置是否有效配置
const isLocationsValid = computed(() => {
  const hasDeparture = departure.address && departure.lng !== 0 && departure.lat !== 0
  if (!hasDeparture) return false
  if (!isRoundTrip.value) {
    return destination.address && destination.lng !== 0 && destination.lat !== 0
  }
  return true
})

const deliveriesWithoutLocation = computed(() =>
  selectedDeliveries.value.filter((d: OrderDelivery) => !d.location)
)

// 分类配送任务：未完成（planning, in_progress）和已完成（completed, cancelled）
const activeTasks = computed(() =>
  deliveryStore.deliveryTasks.filter((t: DeliveryTask) =>
    t.status === 'planning' || t.status === 'in_progress'
  )
)

const completedTasks = computed(() =>
  deliveryStore.deliveryTasks.filter((t: DeliveryTask) =>
    t.status === 'completed' || t.status === 'cancelled'
  )
)

// Pickup computed
const pendingPickups = computed(() =>
  pickupDeliveries.value.filter(d => d.pickup_status === 'pending')
)

const pickedUpDeliveries = computed(() =>
  pickupDeliveries.value.filter(d => d.pickup_status === 'picked_up')
)

const filteredPickupDeliveries = computed(() => {
  let result = pickupDeliveries.value
  if (pickupFilter.value) {
    result = result.filter(d => d.pickup_status === pickupFilter.value)
  }
  if (pickupDateFilter.value) {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(todayStart)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1) // Monday
    const cutoff = pickupDateFilter.value === 'today' ? todayStart : weekStart
    result = result.filter(d => new Date(d.created_at) >= cutoff)
  }
  return result
})

// Handle URL query parameters
function handleQueryParams() {
  const { tab, highlight } = route.query

  if (tab === 'express' || tab === 'pickup' || tab === 'self') {
    activeTab.value = tab
  }

  if (highlight && typeof highlight === 'string') {
    highlightDeliveryId.value = highlight
  }
}

function handleTabChange(tabName: string) {
  // Clear highlight when switching tabs
  if (tabName !== 'express') {
    highlightDeliveryId.value = null
  }

  // Update URL without navigation
  const newQuery = { ...route.query }
  newQuery.tab = tabName
  if (tabName !== 'express') {
    delete newQuery.highlight
  }
  router.replace({ query: newQuery })
}

onMounted(() => {
  loadRecentLocations()
  handleQueryParams()
  deliveryStore.fetchPendingDeliveries()
  deliveryStore.fetchDeliveryTasks()
  loadExpressDeliveries()
  loadPickupDeliveries()
  // Setup pull-to-refresh listeners
  if (pageContainerRef.value) {
    setupListeners(pageContainerRef.value)
  }
})

onUnmounted(() => {
  cleanupListeners()
  if (mapInstance.value) {
    mapInstance.value.destroy()
    mapInstance.value = null
  }
})


function handleSelectionChange(selection: OrderDelivery[]) {
  selectedDeliveries.value = selection
}

const exportCount = computed(() => {
  if (activeTab.value === 'self') return filteredSelfDeliveries.value.length
  if (activeTab.value === 'express') return filteredExpressDeliveries.value.length
  if (activeTab.value === 'pickup') return filteredPickupDeliveries.value.length
  return 0
})

function handleExport() {
  if (activeTab.value === 'self') {
    exportSelfDeliveries(filteredSelfDeliveries.value)
    ElMessage.success(`已导出 ${filteredSelfDeliveries.value.length} 条自送配送`)
  } else if (activeTab.value === 'express') {
    exportExpressDeliveries(filteredExpressDeliveries.value)
    ElMessage.success(`已导出 ${filteredExpressDeliveries.value.length} 条快递发货`)
  } else if (activeTab.value === 'pickup') {
    exportPickupDeliveries(filteredPickupDeliveries.value)
    ElMessage.success(`已导出 ${filteredPickupDeliveries.value.length} 条自提`)
  }
}

function toggleDeliverySelection(delivery: OrderDelivery) {
  // Only pending deliveries can be selected for tasks
  if (delivery.status !== 'pending') return
  const index = selectedDeliveries.value.findIndex(d => d.id === delivery.id)
  if (index >= 0) {
    selectedDeliveries.value.splice(index, 1)
  } else {
    selectedDeliveries.value.push(delivery)
  }
}

function formatDate(date: string) {
  return dayjs(date).format('MM-DD HH:mm')
}

function getTaskStatusType(status: DeliveryTaskStatus) {
  const map: Record<DeliveryTaskStatus, string> = {
    planning: 'info',
    in_progress: 'primary',
    completed: 'success',
    cancelled: 'danger',
  }
  return map[status] || 'info'
}

function getTaskStatusText(status: DeliveryTaskStatus) {
  const map: Record<DeliveryTaskStatus, string> = {
    planning: '规划中',
    in_progress: '进行中',
    completed: '已完成',
    cancelled: '已取消',
  }
  return map[status] || status
}

function getTaskStatusClass(status: DeliveryTaskStatus): string {
  const map: Record<DeliveryTaskStatus, string> = {
    planning: 'status-tag--planning',
    in_progress: 'status-tag--in_progress',
    completed: 'status-tag--completed_task',
    cancelled: 'status-tag--cancelled_task',
  }
  return map[status] || ''
}

function getSelfDeliveryStatusText(status: string): string {
  const map: Record<string, string> = {
    pending: '待配送',
    assigned: '已分配',
    delivering: '配送中',
    delivered: '已送达',
  }
  return map[status] || status
}

// 出发地点设置
function showDepartureDialog() {
  departureForm.address = departure.address
  departureForm.location = { lng: departure.lng, lat: departure.lat }
  departureDialogVisible.value = true
}

function selectQuickLocation(loc: SavedLocation) {
  departureForm.address = loc.address
  departureForm.location = { ...loc.location }
}

function saveDeparture() {
  if (!departureForm.location) {
    ElMessage.warning('请选择或输入出发地点')
    return
  }
  departure.address = departureForm.address
  departure.lng = departureForm.location.lng
  departure.lat = departureForm.location.lat
  const shortName = departureForm.address.split(/[省市县区]/)[0] || departureForm.address.slice(0, 10)
  saveRecentLocation(shortName, departureForm.address, departureForm.location)
  if (isRoundTrip.value) {
    destination.address = departure.address
    destination.lng = departure.lng
    destination.lat = departure.lat
  }
  departureDialogVisible.value = false
  ElMessage.success('出发地点已更新')
}

// 结束地点设置
function showDestinationDialog() {
  if (isRoundTrip.value) {
    ElMessage.info('环形路线模式下，结束地自动与出发地相同')
    return
  }
  destinationForm.address = destination.address
  destinationForm.location = { lng: destination.lng, lat: destination.lat }
  destinationDialogVisible.value = true
}

function selectQuickLocationForDestination(loc: SavedLocation) {
  destinationForm.address = loc.address
  destinationForm.location = { ...loc.location }
}

function saveDestination() {
  if (!destinationForm.location) {
    ElMessage.warning('请选择或输入结束地点')
    return
  }
  destination.address = destinationForm.address
  destination.lng = destinationForm.location.lng
  destination.lat = destinationForm.location.lat
  destinationDialogVisible.value = false
  ElMessage.success('结束地点已更新')
}

// 监听环形路线选项
watch(isRoundTrip, (isRound) => {
  if (isRound) {
    destination.address = departure.address
    destination.lng = departure.lng
    destination.lat = departure.lat
  }
})

// 创建任务流程
function showCreateTaskDialog() {
  if (selectedDeliveries.value.length === 0) {
    ElMessage.warning('请先选择要配送的订单')
    return
  }

  if (!departure.address || departure.lng === 0 || departure.lat === 0) {
    ElMessage.warning('请先设置出发地点')
    return
  }

  if (!isRoundTrip.value && (!destination.address || destination.lng === 0 || destination.lat === 0)) {
    ElMessage.warning('请先设置结束地点')
    return
  }

  currentStep.value = 0
  taskForm.name = dayjs().format('YYYY-MM-DD') + ' 配送任务'
  routeResults.value = []
  selectedStrategy.value = -1
  mapLoaded.value = false
  if (mapInstance.value) {
    mapInstance.value.destroy()
    mapInstance.value = null
  }
  createTaskDialogVisible.value = true
}

async function startRoutePlanning() {
  if (!amapKey.value) {
    ElMessage.error('未配置高德地图 API Key')
    return
  }

  if (!departure.address || departure.lng === 0 || departure.lat === 0) {
    ElMessage.warning('请先设置出发地点')
    return
  }

  if (!isRoundTrip.value && (!destination.address || destination.lng === 0 || destination.lat === 0)) {
    ElMessage.warning('请先设置结束地点')
    return
  }

  planningRoute.value = true
  try {
    const amap = getAmapService()
    if (!amap) throw new Error('Amap service not available')

    for (const d of deliveriesWithoutLocation.value) {
      const loc = await amap.geocode(d.address, '苏州')
      if (loc) {
        d.location = { lat: loc.lat, lng: loc.lng }
      }
    }

    const waypoints: Location[] = selectedDeliveries.value
      .filter(d => d.location)
      .map(d => ({
        lng: d.location!.lng,
        lat: d.location!.lat,
      }))

    if (waypoints.length === 0) {
      ElMessage.error('没有可用的配送点坐标')
      return
    }

    const departureLocation: Location = { lng: departure.lng, lat: departure.lat }
    const destinationLocation: Location = isRoundTrip.value
      ? departureLocation
      : { lng: destination.lng, lat: destination.lat }

    const result = await amap.drivingRoute(
      departureLocation,
      destinationLocation,
      waypoints,
      [0, 2, 4, 10]
    )

    if (result && result.routes.length > 0) {
      routeResults.value = result.routes
      selectedStrategy.value = -1

      if (result.optimizedOrder && result.optimizedOrder.length > 0) {
        const optimizedDeliveries = result.optimizedOrder
          .map(i => selectedDeliveries.value.filter(d => d.location)[i])
          .filter((d): d is OrderDelivery => d !== undefined)
        selectedDeliveries.value = optimizedDeliveries
      }

      currentStep.value = 1
      ElMessage.success(`获取到 ${result.routes.length} 条推荐路线`)
    } else {
      ElMessage.error('路线规划失败')
    }
  } catch (error) {
    ElMessage.error('路线规划失败，请重试')
  } finally {
    planningRoute.value = false
  }
}

async function createTask() {
  if (!selectedRoute.value) {
    ElMessage.error('请选择一条路线')
    return
  }

  submitting.value = true
  try {
    const deliveryIds = selectedDeliveries.value.map((d: OrderDelivery) => d.id)

    const optimizedRoute: OptimizedRoute = {
      distance: selectedRoute.value.distance,
      duration: selectedRoute.value.duration,
      polyline: selectedRoute.value.polyline,
      steps: selectedRoute.value.steps,
    }

    const departureData = departure.address ? {
      lng: departure.lng,
      lat: departure.lat,
      address: departure.address,
    } : undefined

    const destinationData = isRoundTrip.value ? departureData : (
      destination.address ? {
        lng: destination.lng,
        lat: destination.lat,
        address: destination.address,
      } : undefined
    )

    const result = await deliveryStore.createDeliveryTask(
      taskForm.name || undefined,
      deliveryIds,
      optimizedRoute,
      departureData,
      destinationData
    )

    if (result.success) {
      ElMessage.success('配送任务创建成功')
      createTaskDialogVisible.value = false
      selectedDeliveries.value = []
      await deliveryStore.fetchPendingDeliveries()
    } else {
      ElMessage.error(result.error || '创建失败')
    }
  } catch (error) {
    ElMessage.error('创建失败，请重试')
  } finally {
    submitting.value = false
  }
}

async function startTask(task: DeliveryTask) {
  try {
    await ElMessageBox.confirm('开始配送后，相关订单状态将变为"配送中"，确定开始？', '开始配送')
    const result = await deliveryStore.startDeliveryTask(task.id)
    if (result.success) {
      ElMessage.success('配送任务已开始')
    } else {
      ElMessage.error(result.error || '操作失败')
    }
  } catch (e: any) {
    if (e === 'cancel' || e === 'close') return
    console.error('Error:', e)
    ElMessage.error(e.message || '操作失败')
  }
}

async function cancelTask(task: DeliveryTask) {
  try {
    await ElMessageBox.confirm(
      '撤销后，配送任务将取消，相关订单将返回待配送状态。确定撤销？',
      '撤销配送任务',
      { type: 'warning' }
    )
    const result = await deliveryStore.cancelDeliveryTask(task.id)
    if (result.success) {
      ElMessage.success('配送任务已撤销')
      await deliveryStore.fetchPendingDeliveries()
    } else {
      ElMessage.error(result.error || '操作失败')
    }
  } catch (e: any) {
    if (e === 'cancel' || e === 'close') return
    console.error('Error:', e)
    ElMessage.error(e.message || '操作失败')
  }
}

function viewTask(task: DeliveryTask) {
  router.push(`/deliveries/${task.id}`)
}

async function deleteTask(task: DeliveryTask) {
  try {
    await ElMessageBox.confirm('确定删除此配送任务？已分配的订单将返回待配送状态。', '确认删除')
    const result = await deliveryStore.deleteDeliveryTask(task.id)
    if (result.success) {
      ElMessage.success('删除成功')
      await deliveryStore.fetchPendingDeliveries()
    } else {
      ElMessage.error(result.error || '删除失败')
    }
  } catch (e: any) {
    if (e === 'cancel' || e === 'close') return
    console.error('Error:', e)
    ElMessage.error(e.message || '操作失败')
  }
}

// 地图初始化和渲染
function initRouteMap() {
  if (!mapContainer.value || !amapJsKey.value) return

  // @ts-ignore
  window._AMapSecurityConfig = {
    securityJsCode: amapJsSecurityKey.value,
  }

  // @ts-ignore
  if (window.AMap) {
    createRouteMap()
    return
  }

  const existingScript = document.querySelector('script[src*="webapi.amap.com/maps"]')
  if (existingScript) {
    if (existingScript.getAttribute('data-loaded') === 'true') {
      createRouteMap()
    } else {
      existingScript.addEventListener('load', createRouteMap)
    }
    return
  }

  const script = document.createElement('script')
  script.src = `https://webapi.amap.com/maps?v=2.0&key=${amapJsKey.value}`
  script.onload = () => {
    script.onload = null
    script.onerror = null
    script.setAttribute('data-loaded', 'true')
    createRouteMap()
  }
  script.onerror = () => {
    script.onload = null
    script.onerror = null
    console.error('Map script load failed')
  }

  document.head.appendChild(script)
}

function createRouteMap() {
  try {
    // @ts-ignore
    const AMap = window.AMap
    if (!AMap) return

    mapInstance.value = new AMap.Map('route-map-container', {
      zoom: 11,
      center: [departure.lng || DEFAULT_DEPARTURE.lng, departure.lat || DEFAULT_DEPARTURE.lat],
    })

    mapLoaded.value = true
    renderRouteOnMap()
  } catch (e) {
    console.error('Map init error:', e)
  }
}

function renderRouteOnMap() {
  if (!mapInstance.value || !selectedRoute.value) return

  // @ts-ignore
  const AMap = window.AMap

  if (currentPolyline.value) {
    mapInstance.value.remove(currentPolyline.value)
  }

  mapInstance.value.clearMap()

  const startMarker = new AMap.Marker({
    position: [departure.lng, departure.lat],
    title: '出发地',
    content: '<div class="route-marker start"><span>起</span></div>',
  })
  mapInstance.value.add(startMarker)

  selectedDeliveries.value.forEach((delivery, index) => {
    if (delivery.location) {
      const marker = new AMap.Marker({
        position: [delivery.location.lng, delivery.location.lat],
        title: delivery.address,
        content: `<div class="route-marker delivery"><span>${index + 1}</span></div>`,
      })
      mapInstance.value.add(marker)
    }
  })

  if (selectedRoute.value.polyline) {
    const path = selectedRoute.value.polyline.split(';').map((p: string) => {
      const parts = p.split(',')
      const lng = parts[0] || '0'
      const lat = parts[1] || '0'
      return [parseFloat(lng), parseFloat(lat)]
    })

    currentPolyline.value = new AMap.Polyline({
      path,
      strokeColor: '#C84B31',
      strokeWeight: 6,
      strokeOpacity: 0.8,
    })
    mapInstance.value.add(currentPolyline.value)
    mapInstance.value.setFitView([currentPolyline.value])
  }
}

// 监听路线策略变化
watch(selectedStrategy, () => {
  if (mapInstance.value && selectedRoute.value) {
    renderRouteOnMap()
  }
})

// 监听步骤变化
watch(currentStep, async (newStep) => {
  if (newStep === 1 && routeResults.value.length > 0 && amapJsKey.value) {
    await nextTick()
    setTimeout(() => {
      if (!mapInstance.value) {
        initRouteMap()
      } else {
        renderRouteOnMap()
      }
    }, 300)
  }
})

// ============ Express Shipping Functions ============

async function loadExpressDeliveries() {
  expressLoading.value = true
  try {
    const companies = await fetchExpressCompanies()
    expressCompanies.value = companies

    const filters: { status?: ExpressStatus; company?: string } = {}
    if (expressFilters.status) {
      filters.status = expressFilters.status
    }
    if (expressFilters.company) {
      filters.company = expressFilters.company
    }
    const deliveries = await fetchExpressDeliveries(Object.keys(filters).length > 0 ? filters : undefined)
    expressDeliveries.value = deliveries
  } catch (error) {
    console.error('Load express deliveries error:', error)
  } finally {
    expressLoading.value = false
  }
}

async function refreshExpressList() {
  await loadExpressDeliveries()
}

async function changeExpressStatus(deliveryId: string, newStatus: ExpressStatus) {
  // Find the current delivery to check status
  const delivery = expressDeliveries.value.find((d: any) => d.id === deliveryId)
  if (!delivery) return

  const currentStatus = delivery.express_status as ExpressStatus
  const nextStatus = getNextExpressStatus(currentStatus)

  // Same status — do nothing
  if (currentStatus === newStatus) return

  // Advancing to next status — no confirmation needed
  if (newStatus === nextStatus) {
    await updateExpressDeliveryStatus(deliveryId, newStatus)
    return
  }

  // Marking as exception
  if (newStatus === 'exception') {
    try {
      await ElMessageBox.confirm(
        `确定将状态标记为异常？`,
        '标记异常',
        { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
      )
      await updateExpressDeliveryStatus(deliveryId, newStatus)
    } catch { /* cancelled */ }
    return
  }

  // Jumping to non-adjacent status or resetting from exception
  try {
    const isReset = currentStatus === 'exception'
    await ElMessageBox.confirm(
      isReset
        ? `确定将状态从 异常 恢复为 ${getExpressStatusText(newStatus)}？`
        : `确定将状态从 ${getExpressStatusText(currentStatus)} 改为 ${getExpressStatusText(newStatus)}？`,
      isReset ? '恢复状态' : '修改状态',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )
    await updateExpressDeliveryStatus(deliveryId, newStatus)
  } catch { /* cancelled */ }
}

async function updateExpressDeliveryStatus(deliveryId: string, newStatus: ExpressStatus) {
  try {
    const result = await updateExpressStatus(deliveryId, newStatus)
    if (result.success) {
      ElMessage.success('状态已更新')
      await orderStore.onExpressStatusChanged(deliveryId, newStatus)
      await refreshExpressList()
    } else {
      ElMessage.error(result.error || '更新失败')
    }
  } catch (error) {
    ElMessage.error('更新失败')
  }
}

function openTrackingDialog(delivery: any) {
  trackingForm.deliveryId = delivery.id
  trackingForm.expressCompany = delivery.express_company || ''
  // Load existing tracking numbers or start with one empty slot
  const existingNumbers = getTrackingNumbers(delivery)
  trackingForm.trackingNumbers = existingNumbers.length > 0
    ? existingNumbers.map(tn => ({ number: tn.number, carrier: tn.carrier, index: tn.index }))
    : [{ number: '', carrier: '', index: 0 }]
  trackingDialogVisible.value = true
}

function addTrackingNumber() {
  const nextIndex = trackingForm.trackingNumbers.length
  trackingForm.trackingNumbers.push({ number: '', carrier: '', index: nextIndex })
}

function removeTrackingNumber(idx: number) {
  trackingForm.trackingNumbers.splice(idx, 1)
  // Re-index remaining items
  trackingForm.trackingNumbers.forEach((tn, i) => {
    tn.index = i
  })
}

function toggleTrackingExpanded(deliveryId: string) {
  if (expandedTrackingIds.value.has(deliveryId)) {
    expandedTrackingIds.value.delete(deliveryId)
  } else {
    expandedTrackingIds.value.add(deliveryId)
  }
}

function isTrackingExpanded(deliveryId: string): boolean {
  return expandedTrackingIds.value.has(deliveryId)
}

async function saveTrackingNumber() {
  // Filter out empty tracking numbers
  const validNumbers = trackingForm.trackingNumbers.filter(tn => tn.number.trim() !== '')

  if (validNumbers.length === 0) {
    ElMessage.warning('请至少输入一个运单号')
    return
  }

  try {
    // Build the tracking_numbers JSON structure
    const trackingNumbersData = buildTrackingNumbersData(validNumbers)

    // For backwards compatibility, also set the primary tracking_number
    const primaryNumber = validNumbers[0]!.number.trim()

    const result = await updateExpressStatus(trackingForm.deliveryId, 'pending_dropoff', {
      tracking_number: primaryNumber,
      tracking_numbers: trackingNumbersData,
      express_company: trackingForm.expressCompany,
    })

    if (result.success) {
      ElMessage.success(`已保存 ${validNumbers.length} 个运单号`)
      trackingDialogVisible.value = false
      await refreshExpressList()
    } else {
      ElMessage.error(result.error || '保存失败')
    }
  } catch (error) {
    ElMessage.error('保存失败')
  }
}

// Computed for filtered express deliveries
// Filtered self deliveries
// All self deliveries: pending (unassigned) + those in delivery tasks
const allSelfDeliveries = computed(() => {
  const pending = deliveryStore.pendingDeliveries as any[]
  const inTasks = deliveryStore.deliveryTasks.flatMap((t: DeliveryTask) =>
    (t.deliveries || [])
      .filter((d: any) => !d.delivery_method || d.delivery_method === 'self')
      .map((d: any) => ({ ...d, _taskName: t.name, _taskStatus: t.status }))
  )
  return [...pending, ...inTasks]
})

const filteredSelfDeliveries = computed(() => {
  if (!selfDeliveryFilter.value) return allSelfDeliveries.value
  return allSelfDeliveries.value.filter((d: any) => d.status === selfDeliveryFilter.value)
})

const filteredExpressDeliveries = computed(() => {
  let result = expressDeliveries.value
  if (expressFilters.status) {
    result = result.filter(d => d.express_status === expressFilters.status)
  }
  if (expressFilters.company) {
    result = result.filter(d => d.express_company === expressFilters.company)
  }
  return result
})

// Get company name by code
function getCompanyName(code: string): string {
  const company = expressCompanies.value.find(c => c.code === code)
  return company?.name || code || '-'
}

// Get express row class for highlighting
function getExpressRowClass({ row }: { row: any }): string {
  return highlightDeliveryId.value === row.id ? 'highlighted-row' : ''
}

// Watch express filters to reload
watch([() => expressFilters.status, () => expressFilters.company], () => {
  loadExpressDeliveries()
})

// ============ Pickup Functions ============

async function loadPickupDeliveries() {
  pickupLoading.value = true
  try {
    const deliveries = await fetchPickupDeliveries()
    pickupDeliveries.value = deliveries
  } catch (error) {
    console.error('Load pickup deliveries error:', error)
  } finally {
    pickupLoading.value = false
  }
}

async function refreshPickupList() {
  await loadPickupDeliveries()
}

async function handlePickupConfirm(delivery: any) {
  try {
    await ElMessageBox.confirm(
      `确认客户 "${delivery.order?.customer?.name || '未知'}" 已自提 ${delivery.quantity} 箱？`,
      '确认自提'
    )
    const result = await updatePickupStatus(delivery.id, 'picked_up')
    if (result.success) {
      ElMessage.success('已确认自提')
      await refreshPickupList()
    } else {
      ElMessage.error(result.error || '操作失败')
    }
  } catch (e: any) {
    if (e === 'cancel' || e === 'close') return
    console.error('Error:', e)
    ElMessage.error(e.message || '操作失败')
  }
}

async function changePickupStatus(deliveryId: string, newStatus: PickupStatus) {
  const delivery = pickupDeliveries.value.find((d: any) => d.id === deliveryId)
  if (!delivery || delivery.pickup_status === newStatus) return

  // Reverting from picked_up to pending needs confirmation
  if (delivery.pickup_status === 'picked_up' && newStatus === 'pending') {
    try {
      await ElMessageBox.confirm(
        `确认将客户 "${delivery.order?.customer?.name || '未知'}" 的自提状态恢复为待自提？`,
        '恢复状态'
      )
    } catch {
      return
    }
  }

  const result = await updatePickupStatus(deliveryId, newStatus)
  if (result.success) {
    ElMessage.success(newStatus === 'picked_up' ? '已确认自提' : '已恢复为待自提')
    await refreshPickupList()
  } else {
    ElMessage.error(result.error || '操作失败')
  }
}

// View pickup order details
function viewPickupOrder(delivery: any) {
  if (delivery.order_id) {
    router.push(`/orders/${delivery.order_id}`)
  }
}

// Call customer
function callCustomer(phone: string | undefined) {
  if (phone) {
    window.location.href = `tel:${phone}`
  } else {
    ElMessage.warning('该客户没有电话号码')
  }
}
</script>

<style scoped>
/* ========================================
   🍅 ORGANIC HARVEST THEME
   Deliveries Page - Distinctive Design
   ======================================== */

/* CSS Custom Properties - Brand Colors (now in global theme.css) */
.page-container {

  position: relative;
  min-height: 100%;
  background: linear-gradient(180deg, #FFFBF5 0%, #FFF8F0 100%);
  animation: pageEnter 0.6s ease-out;
}

@keyframes pageEnter {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Page Title - Distinctive Typography */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--earth-brown);
  letter-spacing: -0.5px;
  position: relative;
  display: inline-block;
}

.page-title::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 0;
  width: 40px;
  height: 3px;
  background: linear-gradient(90deg, var(--tomato-red), var(--harvest-gold));
  border-radius: 2px;
}

/* ========================================
   TABS - Warm, Distinctive Styling
   ======================================== */

.delivery-tabs {
  margin-top: 20px;
}

:deep(.el-tabs__header) {
  margin-bottom: 24px;
}

:deep(.el-tabs__nav-wrap::after) {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(107, 91, 80, 0.15), transparent);
}

:deep(.el-tabs__item) {
  font-size: 16px;
  font-weight: 500;
  color: var(--warm-gray);
  padding: 0 28px;
  height: 48px;
  line-height: 48px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

:deep(.el-tabs__item:hover) {
  color: var(--tomato-red);
}

:deep(.el-tabs__item.is-active) {
  color: var(--tomato-red);
  font-weight: 600;
}

:deep(.el-tabs__active-bar) {
  height: 3px;
  background: linear-gradient(90deg, var(--tomato-red), var(--tomato-red-light));
  border-radius: 2px;
}

:deep(.el-tabs__content) {
  animation: tabContentFade 0.3s ease-out;
}

@keyframes tabContentFade {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ========================================
   HEADER ACTIONS - Self Delivery Tab
   ======================================== */

.tab-header-actions {
  margin-bottom: 20px;
  padding: 16px 20px;
  background: linear-gradient(135deg, #FFF9F4 0%, #FFF6ED 100%);
  border-radius: 16px;
  border: 1px solid rgba(200, 75, 49, 0.08);
  box-shadow: 0 2px 12px rgba(92, 64, 51, 0.04);
}

.location-buttons {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: nowrap;
}

/* Desktop: show full text, hide short text */
.location-buttons .btn-text-short {
  display: none;
}
.location-buttons .btn-text-full {
  display: inline;
}

.location-buttons .el-button {
  white-space: nowrap;
  max-width: 180px;
  border-radius: 10px;
  font-weight: 500;
  border-color: rgba(200, 75, 49, 0.2);
  color: var(--earth-brown);
  background: white;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.location-buttons .el-button:hover {
  background: var(--tomato-red);
  border-color: var(--tomato-red);
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(200, 75, 49, 0.25);
}

.location-buttons .el-button--primary {
  background: linear-gradient(135deg, var(--tomato-red) 0%, var(--tomato-red-light) 100%);
  border-color: transparent;
  color: white;
  box-shadow: 0 2px 8px rgba(200, 75, 49, 0.3);
}

.location-buttons .el-button--primary:hover {
  background: linear-gradient(135deg, var(--tomato-red-dark) 0%, var(--tomato-red) 100%);
  box-shadow: 0 4px 16px rgba(200, 75, 49, 0.4);
}

.location-buttons .el-button span {
  overflow: hidden;
  text-overflow: ellipsis;
}

.roundtrip-checkbox {
  margin: 0 12px;
  white-space: nowrap;
  font-weight: 500;
  color: var(--warm-gray);
}

.roundtrip-checkbox :deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
  background-color: var(--tomato-red);
  border-color: var(--tomato-red);
}

/* ========================================
   CARDS - Organic, Warm Feel
   ======================================== */

:deep(.el-card) {
  border-radius: 16px;
  border: 1px solid rgba(107, 91, 80, 0.08);
  background: white;
  box-shadow: 0 2px 16px rgba(92, 64, 51, 0.04);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

:deep(.el-card:hover) {
  box-shadow: 0 4px 24px rgba(92, 64, 51, 0.08);
}

:deep(.el-card__header) {
  display: flex;
  align-items: center;
  padding: 18px 24px;
  border-bottom: 1px solid rgba(107, 91, 80, 0.06);
  font-weight: 600;
  color: var(--earth-brown);
  font-size: 16px;
}

:deep(.el-card__body) {
  padding: 20px 24px;
}

/* ========================================
   STATUS BADGES - Distinctive Colors
   ======================================== */

/* Collapse title styles */
.collapse-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
  color: var(--earth-brown);
}

/* Custom status tag styling */
:deep(.el-tag) {
  border-radius: 8px;
  font-weight: 500;
  border: none;
  padding: 4px 12px;
  font-size: 12px;
}

/* Pending/Warning tag - warm amber */
:deep(.el-tag--warning) {
  background: linear-gradient(135deg, #FDE68A 0%, #FCD34D 100%);
  color: #92400E;
}

/* Success tag - organic sage green */
:deep(.el-tag--success) {
  background: linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%);
  color: #065F46;
}

/* Info tag - soft blue-gray */
:deep(.el-tag--info) {
  background: linear-gradient(135deg, #E2E8F0 0%, #CBD5E1 100%);
  color: #475569;
}

/* Danger tag - tomato red */
:deep(.el-tag--danger) {
  background: linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%);
  color: #B91C1C;
}

/* ========================================
   TABLE STYLES - Refined Details
   ======================================== */

:deep(.el-table) {
  border-radius: 12px;
  overflow: hidden;
}

:deep(.el-table th.el-table__cell) {
  background: linear-gradient(180deg, #FAFAF8 0%, #F5F5F0 100%);
  color: var(--earth-brown);
  font-weight: 600;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

:deep(.el-table td.el-table__cell) {
  border-bottom: 1px solid rgba(107, 91, 80, 0.06);
}

:deep(.el-table__row) {
  transition: all 0.2s ease;
}

:deep(.el-table__row:hover > td) {
  background: rgba(253, 246, 227, 0.5) !important;
}

:deep(.el-table__body tr.highlighted-row > td) {
  background: linear-gradient(90deg, rgba(251, 191, 36, 0.15), rgba(251, 191, 36, 0.05)) !important;
}

/* ========================================
   TASK ACTIONS - Compact & Clean
   ======================================== */

.task-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.task-actions .el-button {
  margin: 0;
  padding: 5px 10px;
  border-radius: 6px;
  font-size: 12px;
}

.express-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

/* Status pill — custom trigger for express status dropdown */
.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  line-height: 20px;
  cursor: pointer;
  white-space: nowrap;
  transition: opacity 0.15s;
}
.status-pill:hover {
  opacity: 0.8;
}
.status-pill .el-icon {
  margin-left: 1px;
}

.status-pill--pending {
  color: var(--status-pending);
  background-color: var(--status-pending-bg);
}
.status-pill--picked_up {
  color: var(--status-delivered);
  background-color: var(--status-delivered-bg);
}

.status-pill--pending_pack,
.status-pill--pending_label {
  color: var(--status-pending);
  background-color: var(--status-pending-bg);
}
.status-pill--pending_dropoff {
  color: var(--status-confirmed);
  background-color: var(--status-confirmed-bg);
}
.status-pill--in_transit {
  color: var(--status-delivering);
  background-color: var(--status-delivering-bg);
}
.status-pill--delivered {
  color: var(--status-delivered);
  background-color: var(--status-delivered-bg);
}
.status-pill--exception {
  color: var(--status-cancelled);
  background-color: var(--status-cancelled-bg);
}

:deep(.el-dropdown) {
  display: inline-flex;
}

.express-actions .el-button {
  margin: 0;
  padding: 5px 10px;
  border-radius: 6px;
  font-size: 12px;
}

/* ========================================
   MOBILE CARDS - Hidden on Desktop
   ======================================== */

.mobile-card-list {
  display: none;
}

.delivery-mobile-card,
.task-mobile-card,
.express-mobile-card,
.pickup-mobile-card {
  display: none;
}

/* ========================================
   MISC STYLES
   ======================================== */

.customer-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.recipient-info {
  display: flex;
  align-items: center;
  gap: 4px;
}

.diff-icon {
  margin-left: 4px;
}

.address-cell {
  display: flex;
  align-items: center;
  gap: 4px;
}

.quick-locations {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.quick-locations .el-tag {
  cursor: pointer;
  border-radius: 16px;
  transition: all 0.2s ease;
}

.quick-locations .el-tag:hover {
  transform: scale(1.05);
}

.selected-deliveries {
  max-height: 300px;
  overflow-y: auto;
  padding-right: 8px;
}

.selected-deliveries::-webkit-scrollbar {
  width: 6px;
}

.selected-deliveries::-webkit-scrollbar-track {
  background: rgba(107, 91, 80, 0.05);
  border-radius: 3px;
}

.selected-deliveries::-webkit-scrollbar-thumb {
  background: rgba(168, 152, 136, 0.5);
  border-radius: 3px;
}

.delivery-card {
  display: flex;
  align-items: flex-start;
  padding: 14px 16px;
  margin-bottom: 10px;
  background: linear-gradient(135deg, #FFF9F4 0%, #FFF6ED 100%);
  border-radius: 12px;
  border: 1px solid rgba(200, 75, 49, 0.06);
  transition: all 0.2s ease;
}

.delivery-card:hover {
  border-color: rgba(200, 75, 49, 0.15);
}

.delivery-index {
  width: 30px;
  height: 30px;
  background: linear-gradient(135deg, var(--tomato-red) 0%, var(--tomato-red-light) 100%);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  margin-right: 14px;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(200, 75, 49, 0.3);
}

.delivery-content {
  flex: 1;
}

.delivery-main {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.buyer {
  font-weight: 600;
  color: var(--earth-brown);
}

.arrow {
  color: var(--warm-gray-light);
}

.recipient {
  color: var(--soft-sage);
  font-weight: 500;
}

.delivery-address {
  color: var(--warm-gray);
  font-size: 13px;
  margin-bottom: 6px;
  line-height: 1.5;
}

.delivery-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--warm-gray-light);
}

.route-options {
  margin-bottom: 20px;
}

.route-options h4 {
  margin-bottom: 16px;
  color: var(--earth-brown);
  font-weight: 600;
}

.route-option {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.route-name {
  font-weight: 600;
  color: var(--earth-brown);
}

.route-info {
  font-size: 13px;
  color: var(--warm-gray);
}

.no-routes {
  text-align: center;
  color: var(--warm-gray-light);
  padding: 48px 24px;
  background: linear-gradient(135deg, #FFFBF5 0%, #FFF8F0 100%);
  border-radius: 12px;
}

:deep(.el-radio.is-bordered) {
  height: auto;
  padding: 14px 18px;
  border-radius: 12px;
  border-color: rgba(107, 91, 80, 0.12);
  transition: all 0.25s ease;
}

:deep(.el-radio.is-bordered:hover) {
  border-color: var(--tomato-red);
}

:deep(.el-radio.is-bordered.is-checked) {
  border-color: var(--tomato-red);
  background: rgba(200, 75, 49, 0.04);
}

.route-map-preview {
  margin-top: 20px;
  border-top: 1px solid rgba(107, 91, 80, 0.08);
  padding-top: 20px;
}

.route-map-preview h4 {
  margin-bottom: 16px;
  color: var(--earth-brown);
  font-weight: 600;
}

.route-map-container {
  width: 100%;
  height: 350px;
  border-radius: 16px;
  overflow: hidden;
  position: relative;
  box-shadow: 0 4px 20px rgba(92, 64, 51, 0.08);
}

.map-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #FFFBF5 0%, #FFF8F0 100%);
  color: var(--warm-gray);
}

.map-placeholder p {
  margin-top: 12px;
  font-size: 14px;
}

/* Route map markers */
:deep(.route-marker) {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
}

:deep(.route-marker.start) {
  background: linear-gradient(135deg, var(--soft-sage) 0%, #5A7D4A 100%);
}

:deep(.route-marker.delivery) {
  background: linear-gradient(135deg, var(--tomato-red) 0%, var(--tomato-red-light) 100%);
}

/* ========================================
   EXPRESS SHIPPING - Special Styling
   ======================================== */

.express-filters {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.express-filters :deep(.el-select) {
  --el-select-border-color-hover: var(--tomato-red);
}

.express-filters :deep(.el-button) {
  border-radius: 10px;
  font-weight: 500;
}

.express-recipient-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.express-address {
  font-size: 12px;
  color: var(--warm-gray);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tracking-link {
  color: var(--tomato-red);
  text-decoration: none;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  font-weight: 500;
  padding: 2px 6px;
  background: rgba(200, 75, 49, 0.08);
  border-radius: 4px;
  transition: all 0.2s ease;
}

.tracking-link:hover {
  background: rgba(200, 75, 49, 0.15);
  text-decoration: none;
}

/* Multiple tracking numbers display */
.tracking-numbers-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tracking-numbers-cell .tracking-link {
  display: inline-block;
}

.tracking-toggle {
  font-size: 11px;
  padding: 2px 6px;
  color: var(--tomato-red);
  min-height: auto;
  margin-top: 2px;
}

.tracking-toggle:hover {
  background: rgba(200, 75, 49, 0.1);
}

.tracking-toggle-mobile {
  font-size: 11px;
  color: var(--tomato-red);
  cursor: pointer;
  padding: 2px 6px;
  background: rgba(200, 75, 49, 0.08);
  border-radius: 4px;
  user-select: none;
}

.tracking-toggle-mobile:active {
  background: rgba(200, 75, 49, 0.15);
}

/* Tracking numbers input dialog */
.tracking-numbers-input {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tracking-number-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tracking-number-row .el-input {
  flex: 1;
}

/* Highlighted row styles */
:deep(.highlighted-row) {
  background: linear-gradient(90deg, rgba(212, 165, 116, 0.2) 0%, rgba(212, 165, 116, 0.05) 100%) !important;
}

.highlighted {
  background: linear-gradient(135deg, rgba(212, 165, 116, 0.15) 0%, rgba(212, 165, 116, 0.05) 100%);
  border-color: var(--harvest-gold) !important;
}

/* ========================================
   MOBILE RESPONSIVE - Organic Touch
   ======================================== */

@media (max-width: 767px) {
  .mobile-card-list {
    display: block;
  }

  /* Hide desktop table */
  .desktop-table {
    display: none !important;
  }

  /* Location buttons */
  .location-buttons {
    flex-wrap: wrap;
    gap: 8px;
    width: 100%;
    justify-content: flex-start;
  }

  /* Show short text on mobile, hide full text */
  .location-buttons .btn-text-short {
    display: inline;
  }
  .location-buttons .btn-text-full {
    display: none;
  }

  .location-buttons .el-button {
    padding: 8px 12px;
    font-size: 13px;
    flex-shrink: 0;
    max-width: none;
    border-radius: 10px;
  }

  .roundtrip-checkbox {
    margin: 0 6px;
    font-size: 13px;
    flex-shrink: 0;
  }

  .roundtrip-checkbox :deep(.el-checkbox__label) {
    font-size: 13px;
    padding-left: 6px;
  }

  /* Mobile card styles - pending deliveries */
  .delivery-mobile-card {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px 16px;
    margin-bottom: 10px;
    background: white;
    border: 1px solid rgba(107, 91, 80, 0.1);
    border-radius: 14px;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 2px 8px rgba(92, 64, 51, 0.04);
  }

  .delivery-mobile-card:active {
    transform: scale(0.99);
    background: #FFFBF5;
  }

  .delivery-mobile-card.selected {
    border-color: var(--tomato-red);
    background: linear-gradient(135deg, #FFF5F2 0%, #FFF0EB 100%);
    box-shadow: 0 4px 16px rgba(200, 75, 49, 0.12);
  }

  .delivery-mobile-card .card-header-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .delivery-mobile-card .customer-name {
    flex: 1;
    font-weight: 600;
    font-size: 15px;
    color: var(--earth-brown);
  }

  .delivery-mobile-card .card-address {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    font-size: 13px;
    color: var(--warm-gray);
    line-height: 1.5;
  }

  .delivery-mobile-card .card-footer {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: var(--warm-gray-light);
  }

  .delivery-mobile-card .recipient {
    color: var(--soft-sage);
    font-weight: 500;
  }

  /* Mobile card styles - tasks */
  .task-mobile-card {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px 16px;
    margin-bottom: 10px;
    background: white;
    border: 1px solid rgba(107, 91, 80, 0.1);
    border-radius: 14px;
    cursor: pointer;
    transition: all 0.25s ease;
    box-shadow: 0 2px 8px rgba(92, 64, 51, 0.04);
  }

  .task-mobile-card:active {
    transform: scale(0.99);
    background: #FFFBF5;
  }

  .task-mobile-card .card-header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .task-mobile-card .task-name {
    font-weight: 600;
    font-size: 15px;
    color: var(--tomato-red);
  }

  .task-mobile-card .card-info-row {
    display: flex;
    gap: 16px;
    font-size: 13px;
    color: var(--warm-gray);
  }

  .task-mobile-card .card-actions {
    display: flex;
    gap: 8px;
    margin-top: 4px;
  }

  /* Mobile card styles - express */
  .express-mobile-card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 14px 16px;
    margin-bottom: 10px;
    background: white;
    border: 1px solid rgba(107, 91, 80, 0.1);
    border-radius: 14px;
    box-shadow: 0 2px 8px rgba(92, 64, 51, 0.04);
    transition: all 0.25s ease;
  }

  .express-mobile-card.highlighted {
    border-color: var(--harvest-gold);
    background: linear-gradient(135deg, #FFFAF3 0%, #FFF8ED 100%);
  }

  .express-mobile-card .card-header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .express-mobile-card .card-address {
    font-size: 13px;
    color: var(--warm-gray-light);
    line-height: 1.4;
  }

  /* Mobile card styles - pickup */
  .pickup-mobile-card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 14px 16px;
    margin-bottom: 10px;
    background: white;
    border: 1px solid rgba(107, 91, 80, 0.1);
    border-radius: 14px;
    box-shadow: 0 2px 8px rgba(92, 64, 51, 0.04);
  }

  .pickup-mobile-card .card-header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .pickup-mobile-card .card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  /* Dialog responsive */
  :deep(.el-dialog) {
    width: 95% !important;
    margin: 5vh auto !important;
    border-radius: 20px;
  }

  :deep(.el-form-item__label) {
    float: none;
    text-align: left;
    padding-bottom: 6px;
    color: var(--earth-brown);
    font-weight: 500;
  }

  .route-options :deep(.el-radio.is-bordered) {
    padding: 10px 14px;
    margin: 4px !important;
  }

  .route-map-container {
    height: 200px;
    border-radius: 12px;
  }

  :deep(.el-steps) {
    transform: scale(0.8);
    transform-origin: left center;
  }
}

/* Tablet styles */
@media (min-width: 768px) and (max-width: 1024px) {
  .route-map-container {
    height: 300px;
  }
}

/* ========================================
   SHARED TABLE COLUMN STYLING
   Used by both express & pickup desktop tables
   ======================================== */

.col-customer {
  font-weight: 600;
  color: var(--earth-brown);
}

.col-order-number {
  font-size: 12px;
  color: var(--warm-gray);
  font-family: 'SF Mono', 'Menlo', monospace;
  letter-spacing: 0.02em;
}

.col-quantity {
  font-weight: 600;
  color: var(--tomato-red);
}

.col-time {
  font-size: 13px;
  color: var(--warm-gray);
}

/* ========================================
   PICKUP TAB - Specific Styling
   ======================================== */

.pickup-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}

.pickup-actions .el-button {
  margin: 0;
  padding: 4px 8px;
}

/* Clickable count tags in pickup header */
.pickup-count-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: 4px;
  font-size: 12px;
  line-height: 18px;
  height: 22px;
  cursor: pointer;
  transition: all 0.15s;
  color: var(--status-pending);
  background-color: var(--status-pending-bg);
  border: 1px solid transparent;
  flex-shrink: 0;
}
.pickup-count-tag--done {
  color: var(--status-delivered);
  background-color: var(--status-delivered-bg);
}
.pickup-count-tag.active {
  border-color: currentColor;
  font-weight: 600;
}
.pickup-count-tag:hover {
  opacity: 0.8;
}

/* ========================================
   SHARED MOBILE CARD STYLING
   Used by both express & pickup mobile cards
   ======================================== */

.card-customer {
  font-weight: 600;
  font-size: 15px;
  color: var(--earth-brown);
}

.card-key-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.card-order-number {
  font-size: 12px;
  color: var(--warm-gray);
  font-family: 'SF Mono', 'Menlo', monospace;
  letter-spacing: 0.02em;
}

.card-quantity {
  font-weight: 600;
  font-size: 13px;
  color: var(--tomato-red);
  background: linear-gradient(135deg, rgba(200, 75, 49, 0.1) 0%, rgba(200, 75, 49, 0.05) 100%);
  padding: 1px 8px;
  border-radius: 10px;
}

.card-detail {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
  color: var(--warm-gray);
}

.card-tracking-num {
  color: var(--tomato-red);
  font-family: 'SF Mono', 'Monaco', monospace;
  font-weight: 500;
}

.card-tracking-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.card-tracking-list .card-tracking-num {
  word-break: break-all;
}

.card-time {
  font-size: 12px;
  color: var(--warm-gray-light);
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-actions {
  display: flex;
  gap: 8px;
}

.card-actions .el-button {
  border-radius: 8px;
}

/* ========================================
   ANIMATIONS & MICRO-INTERACTIONS
   ======================================== */

/* Stagger animation for cards loading */
@keyframes cardSlideIn {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

:deep(.el-card) {
  animation: cardSlideIn 0.4s ease-out;
}

/* Button press feedback */
:deep(.el-button:active) {
  transform: scale(0.97);
}

/* Tag hover pop */
:deep(.el-tag) {
  transition: transform 0.15s ease;
}

:deep(.el-tag:hover) {
  transform: scale(1.03);
}

/* Smooth collapse transitions */
:deep(.el-collapse-item__wrap) {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

:deep(.el-collapse-item__header) {
  transition: all 0.2s ease;
  font-weight: 500;
}

:deep(.el-collapse-item__header:hover) {
  background: rgba(253, 246, 227, 0.3);
}
</style>
