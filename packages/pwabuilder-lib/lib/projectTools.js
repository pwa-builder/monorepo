﻿'use strict';

var fs = require('fs'),
    path = require('path'),
    Q = require('q');

var constants = require('./constants'),
    CustomError = require('./customError'),
    exec = require('./processTools').exec,
    log = require('./log'),
    platformTools = require('./platformTools');

function openVisualStudioProject (visualStudioFilePath, callback) {
  log.info('Opening the Visual Studio project \'' + visualStudioFilePath + '\'...');
  return exec('cmd', ['/c', visualStudioFilePath], { statusMessage: 'Opening project ' }).catch(function (err) {
    return Q.reject(new CustomError('Failed to open the Visual Studio file "' + visualStudioFilePath + '".', err));
  })
  .nodeify(callback);
}

// searches for the telemetry file present in every platform project
function searchForTelemetryFile (dir) {
  var telemetryFile = path.join(dir, constants.TELEMETRY_FILE_NAME);
  return Q.nfcall(fs.stat, telemetryFile).then(function (info) {
    // return current directory if the name matches and it's a file
    if (info.isFile()) {
      return dir;
    }
  })
  .catch (function (err) {
    // report any error other than not found
    if (err.code !== 'ENOENT') {
      throw err;
    }
  })
  .then (function (root) {
    // if a result was found, return it
    if (root) {
      return root;
    }

    // search parent directory unless we are already at the root
    var parentPath = path.resolve(dir, '..');
    if (parentPath !== dir) {
      return searchForTelemetryFile(parentPath);
    }
  });
}

function isProjectRoot (dir) {
  // get available app categories
  var appTypes = [ constants.PWA_FOLDER, constants.POLYFILLS_FOLDER ];

  // get available platform IDs
  var platforms = platformTools.listPlatforms();

  // search child platform folders
  return Q.nfcall(fs.readdir, dir).then(function (files) {
    var searchTasks = files.map(function (file) {

      // if we have PWA or Polyfills folders we are in root
      if (appTypes.indexOf(file) >= 0) {
        return Q.resolve(true);
      }

      // skip folders not matching any platform to continue
      if (platforms.indexOf(file) < 0) {
        return Q.resolve(false);
      }

      // search for telemetry file in the platform folder
      var platformDir = path.join(dir, file);
      return searchForTelemetryFile(platformDir).then(function (result) {
        return result;
      });
    });

    return Q.all(searchTasks).then (function (values) {
      // verify if any platform folder contained a telemetry file
      return values.some(function (result) {
        return result;
      });
    });
  });
}

// given a path within a pwabuilder project, returns its root
function getProjectRoot (dir) {
  var insidePWA = new RegExp(constants.PWA_FOLDER + '$');
  var insidePolyfills = new RegExp(constants.POLYFILLS_FOLDER + '$');

  // check if this is the project root
  return isProjectRoot(dir).then(function (isRoot) {
    if (isRoot) {
      return dir;
    } else if (dir.match(insidePWA) || dir.match(insidePolyfills)) {
      return getProjectRoot(path.resolve(dir, '..'));
    }

    // search for a platform folder containing telemetry file
    return searchForTelemetryFile(dir).then(function (filePath) {
      if (filePath) {
        // start search for project root from the platform folder
        var parentPath = path.resolve(filePath, '..');
        if (parentPath !== dir) {
          return getProjectRoot(parentPath);
        }
      }
    });
  })
  .then(function (rootPath) {
    // could be a false positive (e.g. 'cordova/platforms' folder)
    // search parent directories unless already at the root
    if (rootPath) {
      var parentPath = path.resolve(rootPath, '..');
      if (parentPath !== dir) {
        return getProjectRoot(parentPath).then(function (result) {
          return result || rootPath;
        });
      }
    }
  });
}

function getProjectPlatformsRecursivelly (dir, configuredPlatforms, foundPlatforms) {
    if (!foundPlatforms) { foundPlatforms = []; }

    // search recursivelly for telemetry files or known platform folders with telemetry matching info inside
    return Q.nfcall(fs.readdir, dir).then(function (files) {
      var searchPlatformTasks = files.map(function (file) {
        var extendedDir = path.join(dir, file);
        return Q.nfcall(fs.stat, extendedDir).then(function (info) {
          if (info.isFile()) {
            if (file.match(constants.TELEMETRY_FILE_NAME)) {
              return Q.nfcall(fs.readFile, extendedDir, 'utf8').then(function(data) {
                var generationInfo = JSON.parse(data);
                if (foundPlatforms.indexOf(generationInfo.platformId) < 0 &&
                      configuredPlatforms[generationInfo.platformId]) {
                  foundPlatforms.push(generationInfo.platformId);
                }
              });
            }
          } else if (configuredPlatforms[file]) {
            // try to open telemetry file within folder (if exists - otherwise not interesting folder)
            var telemetryFile = path.join(extendedDir, constants.TELEMETRY_FILE_NAME);
            return Q.nfcall(fs.readFile, telemetryFile, 'utf8').then(function(data) {
              var generationInfo = JSON.parse(data);
              if (foundPlatforms.indexOf(file) < 0 &&
                    configuredPlatforms[file] &&
                    configuredPlatforms[file].packageName.match(generationInfo.platformPackage)) {
                foundPlatforms.push(file);
              }
            });
          } else {
            return getProjectPlatformsRecursivelly(extendedDir, configuredPlatforms, foundPlatforms);
          }
        });
      });

      return Q.allSettled(searchPlatformTasks).then(function() {
        return foundPlatforms;
      });
    });
}

function getProjectPlatforms (dir) {
  // get available platform IDs
  var configuredPlatforms = platformTools.getConfiguredPlatforms();

  return getProjectRoot(dir || process.cwd()).then(function (rootDir) {
    if (!rootDir) {
      return Q.reject(new Error('The specified directory does not appear to contain a valid pwabuilder project.'));
    }

    return getProjectPlatformsRecursivelly(rootDir, configuredPlatforms);
  });
}

module.exports = {
  openVisualStudioProject: openVisualStudioProject,
  isProjectRoot: isProjectRoot,
  getProjectRoot: getProjectRoot,
  getProjectPlatforms: getProjectPlatforms
};
