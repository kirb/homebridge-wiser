"use strict";

var Service, Characteristic, uuid;

var WiserShutter = function (homebridge, log, wiser, wisergroup) {

    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    uuid = homebridge.hap.uuid;

    this.lastPosition = 0; // last known position of the blinds, down by default
    this.currentTargetPosition = this.lastPosition;
    this.log = log;
    this._group = wisergroup;
    this._wiser = wiser;
    this._service = new Service.WindowCovering(wisergroup.name);
    this.name = wisergroup.name;
    var id = wisergroup.name + ":" + wisergroup.groupAddress;
    this.uuid_base = id;
    this._informationService = new Service.AccessoryInformation();
    this._informationService.setCharacteristic(Characteristic.Manufacturer, 'Clipsal')
        .setCharacteristic(Characteristic.Model, 'Shutter')
        .setCharacteristic(Characteristic.SerialNumber, this._group.groupAddress);
    this._service.getCharacteristic(Characteristic.CurrentPosition).on('get', this.getCurrentPosition.bind(this));
    this._service.getCharacteristic(Characteristic.TargetPosition).on('get', this.getTargetPosition.bind(this)).on('set', this.setTargetPosition.bind(this));
    this._service.getCharacteristic(Characteristic.PositionState).updateValue(Characteristic.PositionState.STOPPED);

    this._group.on('levelSet', this._levelSet.bind(this));
}


WiserShutter.prototype.getCurrentPosition = function (callback) {
    if (this.verbose) {
        this.log(`Requested CurrentPosition: ${this.lastPosition}%`);
    }
    callback(null, this.lastPosition);
};

WiserShutter.prototype.getTargetPosition = function (callback) {
    if (this.verbose) {
        this.log(`Requested TargetPosition: ${this.currentTargetPosition}%`);
    }
    callback(null, this.currentTargetPosition);
};

WiserShutter.prototype.setTargetPosition = function (pos, callback, context) {
    if (context === `event`) {
        if (this._service.getCharacteristic(Characteristic.CurrentPosition) != pos) {
            this._service.getCharacteristic(Characteristic.CurrentPosition).updateValue(this.currentTargetPosition);
        }
        callback()
    } else {
        this.currentTargetPosition = pos;

        var level = 0; //Open
        if (pos == 0) {
            level = 255; //Closed
        }

        if (level == 0) {
            this._service.getCharacteristic(Characteristic.PositionState).updateValue(Characteristic.PositionState.INCREASING);
        } else {
            this._service.getCharacteristic(Characteristic.PositionState).updateValue(Characteristic.PositionState.DECREASING);
        }

        this._wiser.setGroupLevel(this._group, level, 0);

        setTimeout(() => { // delay stopped position for little bit
            this._service.getCharacteristic(Characteristic.CurrentPosition).updateValue(this.currentTargetPosition);
            this._service.getCharacteristic(Characteristic.PositionState).updateValue(Characteristic.PositionState.STOPPED);
        }, 10000);

        callback();
    }

};

WiserShutter.prototype._levelSet = function () {
    this.log.debug("Setting shutter " + this._group.name + "(" + this._group.groupAddress + ") to " + this._group.level);
    var level = 0;
    if (this._group.level == 0) {
        level = 0; //Closed
    } else {
        level = 100; //Open
    }
    this._service.getCharacteristic(Characteristic.TargetPosition).setValue(level, undefined, `event`);

}

WiserShutter.prototype.getServices = function () {
    return [this._service, this._informationService];
}


module.exports = WiserShutter;
