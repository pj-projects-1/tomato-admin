/**
 * 高德地图 API 工具类
 * 文档: https://lbs.amap.com/api/javascript-api-v2/summary
 */

export interface AmapConfig {
  key: string
  securityJsCode?: string
}

export interface Location {
  lng: number
  lat: number
}

export interface RoutePoint {
  id: string
  name: string
  address: string
  location: Location
  quantity?: number
}

export interface RouteResult {
  distance: number // 米
  duration: number // 秒
  polyline: string
  steps: RouteStep[]
  taxiCost?: number
}

export interface RouteStep {
  instruction: string
  road: string
  distance: number
  duration: number
  polyline: string
  action: string
  assistAction: string
}

export interface MultiRouteResult {
  routes: {
    strategy: number
    strategyName: string
    distance: number
    duration: number
    polyline: string
    steps: RouteStep[]
  }[]
  optimizedOrder: number[]
}

const AMAP_WEB_API_BASE = 'https://restapi.amap.com/v3'

/**
 * 高德地图 Web 服务 API 调用
 */
export class AmapService {
  private key: string
  private securityJsCode?: string

  constructor(config: AmapConfig) {
    this.key = config.key
    this.securityJsCode = config.securityJsCode
  }

  /**
   * 地址转坐标（地理编码）
   */
  async geocode(address: string, city?: string): Promise<Location | null> {
    const params = new URLSearchParams({
      key: this.key,
      address,
      output: 'json',
    })
    if (city) params.append('city', city)

    const response = await fetch(`${AMAP_WEB_API_BASE}/geocode/geo?${params}`)
    const data = await response.json()

    if (data.status === '1' && data.geocodes?.length > 0) {
      const [lng, lat] = data.geocodes[0].location.split(',')
      return { lng: parseFloat(lng), lat: parseFloat(lat) }
    }
    return null
  }

  /**
   * 坐标转地址（逆地理编码）
   */
  async reverseGeocode(location: Location): Promise<string | null> {
    const params = new URLSearchParams({
      key: this.key,
      location: `${location.lng},${location.lat}`,
      output: 'json',
    })

    const response = await fetch(`${AMAP_WEB_API_BASE}/geocode/regeo?${params}`)
    const data = await response.json()

    if (data.status === '1') {
      return data.regeocode?.formatted_address || null
    }
    return null
  }

  /**
   * 驾车路线规划 - 多策略
   * @param origin 起点
   * @param destination 终点（顺路规划时起点和终点相同）
   * @param waypoints 途经点（最多16个）
   * @param strategies 策略列表 [0-10]
   *
   * 策略说明:
   * 0: 速度优先（时间）
   * 1: 费用优先（不走收费路段的最快道路）
   * 2: 距离优先（最短距离）
   * 3: 不走高速
   * 4: 躲避拥堵
   * 5: 多策略（同时使用速度优先、费用优先、距离优先）
   * 6: 不走高速且避免收费
   * 7: 躲避收费和拥堵
   * 8: 躲避拥堵且不走高速
   * 9: 不走收费路段且躲避拥堵
   * 10: 不收费且躲避拥堵（推荐）
   */
  async drivingRoute(
    origin: Location,
    destination: Location,
    waypoints?: Location[],
    strategies: number[] = [0, 2, 4]
  ): Promise<MultiRouteResult | null> {
    const routes: MultiRouteResult['routes'] = []
    let optimizedOrder: number[] = []

    // 如果有途经点，先获取最优顺序
    if (waypoints && waypoints.length > 0) {
      optimizedOrder = await this.getOptimizedOrder(origin, waypoints)
    }

    for (const strategy of strategies) {
      const params = new URLSearchParams({
        key: this.key,
        origin: `${origin.lng},${origin.lat}`,
        destination: `${destination.lng},${destination.lat}`,
        output: 'json',
        strategy: strategy.toString(),
        extensions: 'all',
      })

      if (waypoints && waypoints.length > 0) {
        const orderedWaypoints = optimizedOrder.map(i => waypoints[i]).filter((w): w is Location => w !== undefined)
        params.append('waypoints', orderedWaypoints.map(w => `${w.lng},${w.lat}`).join(';'))
      }

      try {
        const response = await fetch(`${AMAP_WEB_API_BASE}/direction/driving?${params}`)
        const data = await response.json()

        if (data.status === '1' && data.route?.paths?.length > 0) {
          const path = data.route.paths[0]
          routes.push({
            strategy,
            strategyName: this.getStrategyName(strategy),
            distance: parseInt(path.distance),
            duration: parseInt(path.duration),
            polyline: path.steps.map((s: any) => s.polyline).join(';'),
            steps: path.steps.map((s: any) => ({
              instruction: s.instruction,
              road: s.road || '',
              distance: parseInt(s.distance),
              duration: parseInt(s.duration),
              polyline: s.polyline,
              action: s.action || '',
              assistAction: s.assist_action || '',
            })),
          })
        }
      } catch (error) {
        console.error(`Route planning failed for strategy ${strategy}:`, error)
      }
    }

    return routes.length > 0 ? { routes, optimizedOrder } : null
  }

  /**
   * 获取途经点最优顺序 - 使用贪心算法
   * 基于直线距离优化（对于同城配送足够准确）
   */
  private async getOptimizedOrder(
    origin: Location,
    waypoints: Location[]
  ): Promise<number[]> {
    if (waypoints.length === 0) return []
    if (waypoints.length === 1) return [0]

    // 使用贪心算法找到近似最优顺序
    return this.greedyOrder(origin, waypoints)
  }

  /**
   * 使用贪心算法求解（降级方案）
   */
  private greedyOrder(origin: Location, waypoints: Location[]): number[] {
    const n = waypoints.length
    const visited = new Set<number>()
    const order: number[] = []
    let current: Location = origin

    while (visited.size < n) {
      let minDist = Infinity
      let nextIdx = -1

      for (let i = 0; i < n; i++) {
        if (!visited.has(i)) {
          const wp = waypoints[i]
          if (wp) {
            const dist = this.getDistance(current, wp)
            if (dist < minDist) {
              minDist = dist
              nextIdx = i
            }
          }
        }
      }

      if (nextIdx >= 0) {
        visited.add(nextIdx)
        order.push(nextIdx)
        const nextPoint = waypoints[nextIdx]
        if (nextPoint) {
          current = nextPoint
        }
      }
    }

    return order
  }

  /**
   * 使用贪心+2-opt求解TSP
   * @param matrix 距离矩阵，matrix[i][j]是从i到j的距离
   * @param waypointCount 途经点数量
   */
  private solveTSP(matrix: number[][], waypointCount: number): number[] {
    const n = waypointCount

    // 初始解：从起点出发的贪婪搜索
    const visited = new Set<number>()
    const order: number[] = []
    let current = 0 // 起点

    while (visited.size < n) {
      let minDist = Infinity
      let nextIdx = -1

      // 选择下一个最近的未访问途经点
      for (let i = 0; i < n; i++) {
        if (!visited.has(i)) {
          // 矩阵索引: 0是起点，1~n是途经点
          const dist = matrix[current]?.[i + 1] ?? Infinity
          if (dist < minDist) {
            minDist = dist
            nextIdx = i
          }
        }
      }

      if (nextIdx >= 0) {
        visited.add(nextIdx)
        order.push(nextIdx)
        current = nextIdx + 1 // 下一个点的矩阵索引
      }
    }

    // 2-opt优化
    let improved = true
    let iterations = 0
    const maxIterations = 100

    while (improved && iterations < maxIterations) {
      improved = false
      iterations++

      for (let i = 0; i < n - 1; i++) {
        for (let j = i + 2; j < n; j++) {
          // 计算当前边和交换后的边
          // 当前: order[i] -> order[i+1] 和 order[j] -> order[(j+1)或回起点]
          const orderI = order[i]
          const orderI1 = order[i + 1]
          const orderJ = order[j]
          const orderJ1 = order[j + 1]

          if (orderI === undefined || orderI1 === undefined || orderJ === undefined) continue

          const a = orderI + 1
          const b = orderI1 + 1
          const c = orderJ + 1
          const d = orderJ1 !== undefined ? orderJ1 + 1 : 0 // 最后一个点后面是起点

          const oldDist = (matrix[a]?.[b] ?? Infinity) + (matrix[c]?.[d] ?? Infinity)

          // 交换后: order[i] -> order[j] 和 order[i+1] -> order[(j+1)或回起点]
          // 需要反转中间的路径
          const newDist = (matrix[a]?.[c] ?? Infinity) + (matrix[b]?.[d] ?? Infinity)

          if (newDist < oldDist) {
            // 反转子路径 order[i+1] 到 order[j]
            const reversed = order.slice(i + 1, j + 1).reverse()
            order.splice(i + 1, j - i, ...reversed)
            improved = true
          }
        }
      }
    }

    return order
  }

  /**
   * 计算两点间距离（简化版，直线距离）
   */
  private getDistance(p1: Location, p2: Location): number {
    const dx = p1.lng - p2.lng
    const dy = p1.lat - p2.lat
    return Math.sqrt(dx * dx + dy * dy)
  }

  /**
   * 获取策略名称
   */
  private getStrategyName(strategy: number): string {
    const names: Record<number, string> = {
      0: '速度优先',
      1: '费用优先',
      2: '距离优先',
      3: '不走高速',
      4: '躲避拥堵',
      5: '多策略综合',
      6: '不走高速避免收费',
      7: '躲避收费和拥堵',
      8: '躲避拥堵不走高速',
      9: '不走收费躲避拥堵',
      10: '免费且躲避拥堵',
    }
    return names[strategy] || `策略${strategy}`
  }

  /**
   * 批量地理编码
   */
  async batchGeocode(addresses: string[]): Promise<(Location | null)[]> {
    const results = await Promise.all(
      addresses.map(addr => this.geocode(addr, '苏州'))
    )
    return results
  }
}

// 默认出发地点（吴江）
export const DEFAULT_DEPARTURE: Location = {
  lng: 120.6457,
  lat: 31.1386,
}

export const DEFAULT_DEPARTURE_ADDRESS = '吴江区'

// 创建服务实例
export function createAmapService(): AmapService | null {
  const key = import.meta.env.VITE_AMAP_KEY
  if (!key) return null

  return new AmapService({
    key,
    securityJsCode: import.meta.env.VITE_AMAP_SECURITY_KEY,
  })
}

// 单例
let amapServiceInstance: AmapService | null = null

export function getAmapService(): AmapService | null {
  if (!amapServiceInstance) {
    amapServiceInstance = createAmapService()
  }
  return amapServiceInstance
}
