export interface BikeData {
  device: string
  name: string
  voltage: number
  current: number
  percent: number
  remainingAh: number
  consumedAh: number
  cycles: number
  maxCycles: number
  charging: boolean
  timestamp: number
}

export const MOCK_BIKE_DATA: BikeData = {
  device: "eBikeBattery",
  name: "Confi Bike",
  voltage: 38.45,
  current: 2.134,
  percent: 75.3,
  remainingAh: 3.01,
  consumedAh: 0.99,
  cycles: 15,
  maxCycles: 100,
  charging: false,
  timestamp: 123456789,
}
