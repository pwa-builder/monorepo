'use strict';

var fs = require('fs'),
    path = require('path'),
    Q = require('q');

var fileTools = require('./fileTools'), 
    packageTools = require('./packageTools'),
    CustomError = require('./customError'),
    log = require('./log');

var platformConfiguration;

function getDefaultConfigPath () {
  return path.resolve(path.dirname(require.main.filename), 'platforms.json');
}

function getPlatformModule(packageName, source) {
  
  if (!packageName) {
      return Q.reject(new Error('Platform name is missing or invalid.'));
  }

  if (!source) {
      return Q.reject(new Error('Platform package source is missing or invalid.'));
  }

  try {
    var module = require(packageName);
    return Q.resolve(module);
  }
  catch (err) {
    if (err.code !== 'MODULE_NOT_FOUND') {
      return Q.reject(new CustomError('Failed to resolve module: \'' + packageName + '\'.', err));
    }

    // queue the installation of the package, it will be installed once installQueuedPackages 
    // is called, then re-attempt to require the package.
    return packageTools.queuePackageInstallation(packageName, source).then(function() {
      var module = require(packageName);
      return Q.resolve(module);              
    });
  }
}

function loadPlatform(packageName, source, callback) {
  log.debug('Loading platform module: ' + packageName);
  return getPlatformModule(packageName, source).then(function(module) {
    return module.Platform;
  })
  .nodeify(callback);
}

// configures the platforms with the provided configuration or attempts to load 
// the configuration from a 'platforms.json' file in the root of the main app
function configurePlatforms(config) {
  if (!config) {
    var configPath = getDefaultConfigPath();
    
    try {
      config = require(configPath);
    }
    catch (err) {
      throw new Error('Platform configuration file is missing or invalid - path: \'' + configPath + '\'.');
    }    
  }
  
  platformConfiguration = config;
}

// returns the modules implementing the requested platforms 
function loadPlatforms(platforms, callback) {

  // if configurePlatforms has not been called yet, loads the default configuration
  configurePlatforms(platformConfiguration);
  
	var platformMap = {};
	// load all platform modules and map the corresponding platforms to each one, taking into account that
	// multiple platforms may map to a single module (e.g. manifoldjs-cordova => android, ios, windows...)
	var tasks = (platforms || []).reduce(function (taskList, platformId) {

		// ensure that the platform is registered and is assigned a package name
    var platformInfo = platformConfiguration[platformId];
		if (platformInfo && platformInfo.packageName) {
      var packageName = platformInfo.packageName;
      
			// check if the module has already been loaded
			var platformList = platformMap[packageName];
      
			if (!platformList) {

				// create a new task to load the platform module
				platformMap[packageName] = platformList = [];
				var task = loadPlatform(packageName, platformInfo.source).then(function(Platform) {
          return { packageName: packageName, Platform: Platform, platforms: platformList };						
        });

				taskList.push(task);
			}

			// assign the current platform to the module
			platformList.push(platformId);
		}
		else {
			taskList.push(Q.reject(new Error('Platform \'' + platformId + '\' is not registered!')));
		}

		return taskList;
	}, []);

  // launch the installation of all queued packages
  packageTools.installQueuedPackages();
  
	// wait for all modules to load
  return Q.allSettled(tasks).then(function (results) {
    return results.map(function (result) {
      if (result.state === 'fulfilled') {
        // create instances of each platform module
        var module = result.value;
        return new module.Platform(module.packageName, module.platforms);
      }
    });
  })
  .nodeify(callback);
}

function updatePlatformConfig (configPath, updateFunction) {
  return fileTools.replaceFileContent(configPath || getDefaultConfigPath(), updateFunction);
}

function addPlatform(platformId, packageName, source, configPath, callback) {
  
  if (arguments.length === 4) {
    if (typeof configPath === 'function') {
      callback = configPath;
      configPath = undefined;      
    }
  }

  return updatePlatformConfig(configPath, function (data) {
      var platforms = JSON.parse(data);
      platforms[platformId] = { packageName: packageName, source: source };
      return JSON.stringify(platforms, null, 4); 
  })
  .nodeify(callback);
}

function removePlatform(platformId, configPath, callback) {
  
  if (arguments.length === 2) {
    if (typeof configPath === 'function') {
      callback = configPath;
      configPath = undefined;      
    }
  }

  return updatePlatformConfig(configPath, function (data) {
      var platforms = JSON.parse(data);
      delete platforms[platformId];
      return JSON.stringify(platforms, null, 4); 
  })
  .nodeify(callback);
}

function listPlatforms(configPath, callback) {
  
  if (arguments.length === 1) {
    if (typeof configPath === 'function') {
      callback = configPath;
      configPath = undefined;      
    }
  }
  
  return fileTools.readFile(configPath || getDefaultConfigPath()).then(function (data) {
      var platforms = JSON.parse(data);
      return Object.keys(platforms);
  })
  .nodeify(callback);
}

function listPlatformsSync(configPath) {
  
  var data = fs.readFileSync(configPath || getDefaultConfigPath(), 'utf8'); 
  var platforms = JSON.parse(data);
  return Object.keys(platforms);
}

module.exports = {
  configurePlatforms: configurePlatforms,
  loadPlatform: loadPlatform,
  loadPlatforms: loadPlatforms,
  addPlatform: addPlatform,
  removePlatform: removePlatform,
  listPlatforms: listPlatforms,
  listPlatformsSync: listPlatformsSync
};
