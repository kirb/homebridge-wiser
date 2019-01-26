"use strict";

var Service, Characteristic, uuid;

var WiserFan = function (homebridge, log, wiser, wisergroup) {

  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  uuid = homebridge.hap.uuid;
  this.log = log;
  this._group = wisergroup;
  this._wiser = wiser;
  this._service = new Service.Fan(wisergroup.name);

  this._informationService = new Service.AccessoryInformation();

  this._informationService.setCharacteristic(Characteristic.Manufacturer, 'Clipsal')
                        .setCharacteristic(Characteristic.Model, 'Fan')
                        .setCharacteristic(Characteristic.SerialNumber, this._group.groupAddress);
  this.name = wisergroup.name;
  var id = wisergroup.name+":"+wisergroup.groupAddress;
  this.uuid_base = id;
  this._isOn = false;
  this._onChar = this._service.getCharacteristic(Characteristic.On);
  this._onChar.on('set', this._setOn.bind(this));
  this._rotationChar = this._service.getCharacteristic(Characteristic.RotationSpeed);
  this._rotationChar.on('get', this.getRotationSpeed.bind(this))
  .on('set', this.setRotationSpeed.bind(this));

  this._group.on('levelSet', this._levelSet.bind(this));
}

WiserFan.prototype._levelSet = function() {
  this.log.debug("Setting group "+this._group.name+"("+this._group.groupAddress+") to "+this._group.level);
  var level = this._group.level;
  var wasOn = this._isOn;
  this._isOn = (level > 0);
  var brightLevel = (level/255) * 100;
  if (this._isOn != wasOn) {
    this._onChar.setValue((level > 0), undefined, `event`);
  }
  this._rotationChar.setValue(brightLevel, undefined, `event`);
}

WiserFan.prototype.getServices = function() {
  return [this._service, this._informationService];
}

WiserFan.prototype._setOn = function(on, callback,context) {
  if (context === `event`) {
    callback()
  } else {
    var wasOn = this._group.level > 0;

    if (wasOn != on) {
      this.log.debug("Setting switch to "+on);
      var level = 0;
      if (on) {
        level = 255;
      }
      this._isOn = on;
      this._wiser.setGroupLevel(this._group,level,0);
    }

    callback();
  }
}

WiserFan.prototype._getOn = function(callback) {
  callback(false,this._group.level > 0);
}

WiserFan.prototype.setRotationSpeed = function(newLevel, callback,context) {
  this.log.debug('New brightness = '+newLevel);
  this.brightness = newLevel;
  this._isOn = (newLevel > 0);
  if (context === `event`) {
    callback()
  } else {
    this.log.debug("Setting dimmer to "+newLevel);

    var level = 255 * newLevel/100;

    this._wiser.setGroupLevel(this._group,level,0);

    callback();
  }
}

WiserFan.prototype.getRotationSpeed = function(callback) {
  var level = (this._group.level / 255) * 100;
  callback(false,level);
}

module.exports= WiserFan;
