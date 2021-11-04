const Device = require('../device.js')
const VivintDict = require("../vivint_dictionary.json")

class MotionSensor extends Device {
    constructor(accessory, data, config, log, homebridge, vivintApi) {
      
      super(accessory, data, config, log, homebridge, vivintApi)

      this.config_motionDetectedOccupancySensorMs = (config.motionDetectedOccupancySensorMins || 0) * 60 * 1000
      
      this.lastSensedMotion = null //TODO: Check how this variable is used and assigned

      this.service = accessory.getService(this.Service.MotionSensor)

      this.occupancyService = accessory.getService(this.Service.OccupancySensor)
      
      this.batteryService.updateCharacteristic(this.Characteristic.ChargingState, this.Characteristic.ChargingState.NOT_CHARGEABLE)

      this.service
        .getCharacteristic(this.Characteristic.MotionDetected)
        .on('get', callback => callback(null, this.getMotionDetectedState()))

      this.service
        .getCharacteristic(this.Characteristic.StatusTampered)
        .on('get', callback => callback(null, this.getTamperedState()))

      this.notify()

      if (this.occupancyService) {
        this.notifyOccupancy()
        this.occupancyService
          .getCharacteristic(this.Characteristic.OccupancyDetected)
          .on('get', callback => callback(null, this.getOccupancyState()))

        setInterval(() => this.notifyOccupancy(), 60 * 1000)
      }
    }

    getOccupancyState() {
      if (this.lastSensedMotion == null)
        return this.Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED
      let lastSensedDuration = Date.now() - this.lastSensedMotion
      if (lastSensedDuration < this.config_motionDetectedOccupancySensorMs)
        return this.Characteristic.OccupancyDetected.OCCUPANCY_DETECTED
      else
        return this.Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED
    }

    getMotionDetectedState() {
      return Boolean(this.data.Status)
    }

    notifyOccupancy() {
      if (this.occupancyService) {
        this.occupancyService
          .updateCharacteristic(this.Characteristic.OccupancyDetected, this.getOccupancyState())
      }
    }

    notify() {
      super.notify()
      if (this.service) {
        this.service.updateCharacteristic(this.Characteristic.MotionDetected, this.getMotionDetectedState())
        this.service.updateCharacteristic(this.Characteristic.StatusTampered, this.getTamperedState())
        this.notifyOccupancy()
      }
    }

    static appliesTo(data) {
      return (
        (data.Type ==  VivintDict.PanelDeviceType.WirelessSensor) && 
          (
            data.EquipmentCode == VivintDict.EquipmentCode.PIR1_MOTION || 
            data.EquipmentCode == VivintDict.EquipmentCode.PIR2_MOTION || 
            data.EquipmentCode == VivintDict.EquipmentCode.EXISTING_MOTION_DETECTOR
          )
        )
    }

    static inferCategory(data, Accessory) {
      return Accessory.Categories.SENSOR
    }

    static addServices(accessory, Service, config) {
      super.addServices(accessory, Service)
      accessory.addService(new Service.MotionSensor(accessory.context.name))

      if (config.motionDetectedOccupancySensorMins > 0) {
        accessory.addService(new Service.OccupancySensor(accessory.context.name + " Occupancy"))
      }
    }
  }

  module.exports = MotionSensor