var fs = require('fs'),
    os = require('os'),
    path = require('path'),
    url = require('url');
    
var archiver = require('archiver'),
    cloudappx = require('cloudappx-server'),
    Q = require('q'),
    request = require('request');
    
var manifoldjsLib = require('manifoldjs-lib');

var CustomError = manifoldjsLib.CustomError, 
    log = manifoldjsLib.log;

var serviceEndpoint = 'http://cloudappx.azurewebsites.net';

// Quick sanity check to ensure that the placeholder parameters in the manifest 
// have been replaced by the user with their publisher details before generating 
// a package. 
function validateManifestPublisherDetails(appFolder, shouldSign, callback) {
  var manifestPath = path.join(appFolder, 'appxmanifest.xml');
  return Q.nfcall(fs.readFile, manifestPath, 'utf8').then(function (data) {
    if (shouldSign) {
      return;
    }
    
    var packageIdentityPlaceholders = /<Identity.*(Name\s*=\s*"INSERT-YOUR-PACKAGE-IDENTITY-NAME-HERE"|Publisher\s*=\s*"CN=INSERT-YOUR-PACKAGE-IDENTITY-PUBLISHER-HERE")/g;
    var publisherDisplayNamePlaceholder = /<PublisherDisplayName>\s*INSERT-YOUR-PACKAGE-PROPERTIES-PUBLISHERDISPLAYNAME-HERE\s*<\/PublisherDisplayName>/g;
    if (packageIdentityPlaceholders.test(data) || publisherDisplayNamePlaceholder.test(data)) {
      return Q.reject(new Error('The application manifest is incomplete. Register the app in the Windows Store to obtain the Package/Identity/Name, \nPackage/Identity/Publisher, and Package/Properties/PublisherDisplayName details. \nThen, use this information to update the corresponding placeholders in the appxmanifest.xml file before \ncreating the App Store package.'));
    }
  })
  .catch(function (err) {
    return Q.reject(new CustomError('The specified path does not contain a valid app manifest file.', err));      
  })
  .nodeify(callback);
}

function invokeCloudAppX(appName, appFolder, outputPath, operation, callback) {
  var deferred = Q.defer();
  var archive = archiver('zip');
  var zipFile = path.join(os.tmpdir(), appName + '.zip');
  var output = fs.createWriteStream(zipFile);
  
  var endPointValue = '/v2/' + operation;
  
  archive.on('error', function (err) {
    deferred.reject(err);
  });

  archive.pipe(output);

  archive.directory(appFolder, appName);
  archive.finalize();

  var operationUrl = url.resolve(process.env.CLOUDAPPX_SERVICE_ENDPOINT || serviceEndpoint, endPointValue);
  output.on('close', function () {
    var options = {
      method: 'POST',
      url: operationUrl,
      encoding: 'binary'
    };
    
    log.debug('Invoking the CloudAppX service...');

    var req = request.post(options, function (err, resp, body) {
      if (err) {
        return deferred.reject(err);
      }

      if (resp.statusCode !== 200) {
        return deferred.reject(new Error('Failed to create the package. The CloudAppX service returned an error - ' + resp.statusMessage + ' (' + resp.statusCode + '): ' + body));
      }

      fs.writeFile(outputPath, body, { 'encoding': 'binary' }, function (err) {
        if (err) {
          return deferred.reject(err);
        }

        fs.unlink(zipFile, function (err) {
          if (err) { 
            return deferred.reject(err);
          }
            
          return deferred.resolve(); 
        });
      });
    });

    req.form().append('xml', fs.createReadStream(zipFile));
  });
  
  return deferred.promise.nodeify(callback);
}

var makeAppx = function (appFolder, outputPath, shouldSign, callback) {
  var outputData = path.parse(outputPath);
  return validateManifestPublisherDetails(appFolder, shouldSign).then(function () {     
    // call sign endpoint or traditional
    if (shouldSign === true) {
      log.debug('Invoking the CloudAppX service to generate Signed appx');
      return invokeCloudAppX(outputData.name, appFolder, outputPath, 'buildsigned');
    }
    else {
      var options = { 'dir': appFolder, 'name': outputData.name, 'out': outputPath, 'shouldSign': shouldSign };
      return Q(options)
        .then(cloudappx.makePri)
        .thenResolve(options)
        .then(cloudappx.makeAppx)
        .catch(function () {
          log.debug('Unable to create the package locally. Invoking the CloudAppX service instead...');
          return invokeCloudAppX(outputData.name, appFolder, outputPath, 'build');
        });
    }
  })
  .nodeify(callback);
};

var makePri = function (appFolder, outputPath, callback) {
  var outputData = path.parse(outputPath);
  var options = { 'dir': appFolder, 'name': outputData.name, 'out': outputPath };
  return Q(options)
        .then(cloudappx.makePri)
        .catch(function () {
          log.debug('Unable to index resources locally. Invoking the CloudAppX service instead...');
          var priFile = path.resolve(outputPath, 'resources.pri');
          return invokeCloudAppX(outputData.name, appFolder, priFile, 'makepri');
        })
        .nodeify(callback);
};

module.exports = {
  makeAppx: makeAppx,
  makePri: makePri
};