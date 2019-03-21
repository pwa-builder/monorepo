'use strict';

var manifoldjsLib = require('manifoldjs-lib');

var imageGroupValidation =  manifoldjsLib.manifestTools.imageGroupValidation;

var constants = require('../constants');

module.exports = function (manifestContent, callback) {
  var description = 'A small tile logo of any of the following sizes is required for Windows Phone: 71x71, 99x99, 170x170',
      platform = constants.platform.id,
      validIconSizes = ['71x71', '99x99', '170x170'];

  imageGroupValidation(manifestContent, description, platform, validIconSizes, callback);
};
