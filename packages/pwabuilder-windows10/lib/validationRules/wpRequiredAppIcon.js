'use strict';

var manifoldjsLib = require('manifoldjs-lib');

var imageGroupValidation =  manifoldjsLib.manifestTools.imageGroupValidation;

var constants = require('../constants');

module.exports = function (manifestContent, callback) {
  var description = 'An app icon of any of the following sizes is required for Windows Phone: 44x44, 62x62, 106x106',
      platform = constants.platform.id,
      validIconSizes = ['44x44', '62x62', '106x106'];

  imageGroupValidation(manifestContent, description, platform, validIconSizes, callback);
};
