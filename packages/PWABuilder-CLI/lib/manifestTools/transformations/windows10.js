﻿'use strict';

var c = require('../constants'),
    fs = require('fs'),
    path = require('path');

// TODO: implement convertToBase function
function convertToBase(manifestInfo, callback) {
  return callback(new Error('Not yet implemented.'));
}

function convertFromBase(manifestInfo, callback) {
  if (!manifestInfo || !manifestInfo.content) {
    return callback(new Error('Manifest content is empty or not initialized.'));
  }

  var originalManifest = manifestInfo.content;

  if (!originalManifest.start_url) {
    return callback(new Error('Start url is required.'));
  }

  var manifestTemplatePath = path.join(__dirname, '..', 'assets', 'windows10', 'appxmanifest-template.xml');

  fs.readFile(manifestTemplatePath, function (err, data) {
    if (err) {
      return callback(new Error('Could not read the manifest template' + ' (' + err.message + ')'));
    }

    var rawManifest = data.toString();

    rawManifest = rawManifest.replace(/{StartPage}/g, originalManifest.start_url);
    rawManifest = rawManifest.replace(/{DisplayName}/g, originalManifest.short_name);
    rawManifest = rawManifest.replace(/{Description}/g, originalManifest.name || originalManifest.short_name);
    rawManifest = rawManifest.replace(/{RotationPreference}/g, originalManifest.orientation || 'portrait');

    var icons = {};
    if (originalManifest.icons && originalManifest.icons.length) {
      for (var i = 0; i < originalManifest.icons.length; i++) {
        var icon = originalManifest.icons[i];
        var iconDimensions = icon.sizes.split('x');
        if (iconDimensions[0] === '44' && iconDimensions[1] === '44') {
          icons['44x44'] = icon.src;
        } else if (iconDimensions[0] === '150' && iconDimensions[1] === '150') {
          icons['150x150'] = icon.src;
        } else if (iconDimensions[0] === '620' && iconDimensions[1] === '300') {
          icons['620x300'] = icon.src;
        }
      }
    }

    rawManifest = rawManifest.replace(/{Square150x150Logo}/g, icons['150x150'] || '');
    rawManifest = rawManifest.replace(/{Square44x44Logo}/g, icons['44x44'] || '');
    rawManifest = rawManifest.replace(/{SplashScreenImage}/g, icons['620x300'] || '');

    var indentationChars = '\r\n\t\t\t\t';
    var applicationContentUriRules = '';

    if (originalManifest.scope && originalManifest.scope.length) {
      applicationContentUriRules = '<uap:Rule Type="include" Match="' + originalManifest.scope + '" />';
    }

    if (originalManifest.hap_urlAccess && originalManifest.hap_urlAccess.length) {
      for (var j = 0; j < originalManifest.hap_urlAccess.length; j++) {
        var accessUrl = originalManifest.hap_urlAccess[j];
        if (!accessUrl.external) {
          applicationContentUriRules += (applicationContentUriRules ? indentationChars : '') + '<uap:Rule Type="include" Match="' + accessUrl.url + '" />';
        }
      }
    }

    rawManifest = rawManifest.replace(/{ApplicationContentUriRules}/g, applicationContentUriRules);

    var manifest = {
      'rawData': rawManifest,
      'icons': icons,
    };

    var convertedManifestInfo = {
      'content': manifest,
      'format': c.WINDOWS10_MANIFEST_FORMAT
    };

    return callback(undefined, convertedManifestInfo);
  });
}

// TODO: implement matchFormat function
function matchFormat() { //param: manifestObj
  return false;
}

module.exports = {
  convertToBase: convertToBase,
  convertFromBase: convertFromBase,
  matchFormat: matchFormat
};
