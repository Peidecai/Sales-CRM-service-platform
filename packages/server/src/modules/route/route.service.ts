import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In } from 'typeorm'
import { Customer } from '../customer/customer.entity'

interface RoutePoint {
  customerId: number
  customerName: string
  address: string
  latitude: number
  longitude: number
  distanceFromPrev: number
  order: number
}

interface OptimizedRoute {
  points: RoutePoint[]
  totalDistance: number
}

@Injectable()
export class RouteService {
  private readonly logger = new Logger(RouteService.name)

  constructor(
    @InjectRepository(Customer)
    private customerRepo: Repository<Customer>,
  ) {}

  /**
   * Optimize visit route using greedy nearest-neighbor algorithm.
   *
   * 1. Load customer addresses/coordinates
   * 2. Start from current location (or first customer)
   * 3. At each step, pick the nearest unvisited customer
   * 4. Return ordered list with distances
   */
  async optimizeRoute(
    customerIds: number[],
    startLatitude?: number,
    startLongitude?: number,
  ): Promise<OptimizedRoute> {
    // Load customers with addresses
    const customers = await this.customerRepo.find({
      where: { id: In(customerIds), deleted: false },
      select: ['id', 'name', 'address', 'region'],
    })

    if (customers.length < 2) {
      return { points: [], totalDistance: 0 }
    }

    // For demo: generate pseudo-coordinates from customer data
    // In production, use a geocoding service
    const nodes = customers.map((c, i) => ({
      customerId: c.id,
      customerName: c.name,
      address: c.address || c.region || `地址${i + 1}`,
      latitude: this.pseudoLat(c.id),
      longitude: this.pseudoLng(c.id),
      visited: false,
    }))

    // Starting point
    let currentLat = startLatitude ?? nodes[0].latitude
    let currentLng = startLongitude ?? nodes[0].longitude

    const result: RoutePoint[] = []
    let totalDistance = 0

    // Greedy nearest-neighbor TSP
    for (let step = 0; step < nodes.length; step++) {
      let nearestIdx = -1
      let nearestDist = Infinity

      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].visited) continue
        const dist = this.haversine(currentLat, currentLng, nodes[i].latitude, nodes[i].longitude)
        if (dist < nearestDist) {
          nearestDist = dist
          nearestIdx = i
        }
      }

      if (nearestIdx >= 0) {
        const node = nodes[nearestIdx]
        node.visited = true

        const distFromPrev = step === 0 && !startLatitude ? 0 : nearestDist

        result.push({
          customerId: node.customerId,
          customerName: node.customerName,
          address: node.address,
          latitude: node.latitude,
          longitude: node.longitude,
          distanceFromPrev: Math.round(distFromPrev),
          order: step + 1,
        })

        totalDistance += distFromPrev
        currentLat = node.latitude
        currentLng = node.longitude
      }
    }

    return {
      points: result,
      totalDistance: Math.round(totalDistance),
    }
  }

  /**
   * Haversine distance in meters between two GPS points
   */
  private haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000 // Earth radius in meters
    const toRad = (deg: number) => (deg * Math.PI) / 180
    const dLat = toRad(lat2 - lat1)
    const dLon = toRad(lon2 - lon1)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  /**
   * Generate pseudo-latitude from customer ID (for demo when no geocoding)
   * Centers around Beijing (39.9N, 116.4E) with small offsets
   */
  private pseudoLat(id: number): number {
    return 39.9 + ((id * 17) % 100) / 1000
  }

  private pseudoLng(id: number): number {
    return 116.4 + ((id * 31) % 100) / 1000
  }
}
