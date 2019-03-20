﻿# ManifoldJS

This tool is used to create hosted web applications based on a [W3C Web App manifest](http://www.w3.org/TR/appmanifest/).

## Installation

````
npm install -g manifoldjs
````

## Command Line Interface

### Usage

````
manifoldjs <website-url> [-d <app-directory>] [-s <short-name>] [-p <platforms>] [-l <log-level>] [-b] [-m <manifest-file>]
````

### Parameters

|  **&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Parameter&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;** | **Description** |
| ---------------- | --------------- |
| `<website-url>`  | **(required)** URL of the hosted website |
| `-d|--directory` | **(optional)** Path to the generated project files (default value: current directory) |
| `-s|--shortname` | **(optional)** Application short name. When specified, it overrides the short_name value of the manifest |
| `-l|--loglevel`  | **(optional)** Tracing log level options. Available log levels: _debug,trace,info,warn,error_ (default value: _warn_) |
| `-p|--platforms` | **(optional)** Platforms to generate. Supported platforms: _windows,windows10,android,ios,chrome,web,firefox_ (default value: all platforms) |
| `-b|--build`     | **(optional)** Forces the building process |
| `-m|--manifest`  | **(optional)** Location of the W3C Web App manifest file (URL or local path). If not specified, the tool looks for a manifest in the site URL. Otherwise, a new manifest will be created pointing to the site URL. |
| `-c|--crosswalk` | **(optional)** Enable Crosswalk for Android. Crosswalk is a web runtime that can be used to replace the stock WebView used by Android Cordova apps. Crosswalk is based on Google Chromium with Cordova API support and has better HTML5 feature support compared to the default WebView available in Android. |

### Example

````
manifoldjs http://meteorite.azurewebsites.net -d C:\Projects -l info -p windows10,android -b
````

## Client Library

### Manifest Module

````
var manifesTools = require('manifestTools');
````

#### getManifestFromSite(siteUrl, callback)

Retrieves a manifest from a website. It looks for a manifest meta tag in the HTML content of the specified website URL; if no manifest is found, a new W3C manifest is retrieved with default `start_name` and `short_name` values.

`siteUrl` is the URL of the website that hosts the manifest.

`callback(err, manifestInfo)` returns an error or the manifest object in `manifestInfo`.

#### getManifestFromFile(filePath, callback)

Retrieves a manifest from a local path.

`siteUrl` is the path there the manifest file is located.

`callback(err, manifestInfo)` returns an error or the manifest object in `manifestInfo`.


#### writeToFile(manifestInfo, filePath, callback)

Writes manifest info to the specified path.
`manifestInfo` Manifest data in JSON format.

`filePath` The path to write to.

`callback(err, validationResults)` returns an error or an array of validation results.

#### fetchManifestUrlFromSite(siteUrl, callback)
If found, gets the manifest URL from the specified website URL.

`siteUrl` is the URL of the website.

`callback(err, content)` returns an error or a content object with start_url and short_name members.

#### downloadManifestFromUrl(manifestUrl, callback)
Downloads the manifest from the specified URL.

`manifestUrl` is the URL of the manifest.

`callback(err, manifestInfo)` returns an error or the manifest object in `manifestInfo`.

#### validateAndNormalizeStartUrl(siteUrl, manifestInfo, callback)
Validates the format of the manifest is a W3C manifest format.

`siteUrl` is the URL of the website.

`manifestInfo` is the manifest's data in JSON format.

`callback` returns an error or the manifest object in `manifestInfo`.

#### convertTo(manifestInfo, outputFormat, callback)
Converts the manifest data to the specified output format.

`manifestInfo` is the manifest's data in JSON format.

`outputformat` is the format to which the manifest will be converted.

`callback(err, manifestInfo)` returns an error or the manifest object in `manifestInfo`.

#### validateManifest(manifestInfo, targetPlatforms, callback)
Makes sure the manifest is valid for the specified target platforms.

`manifestInfo` is the manifest's data in JSON format.

`targetPlatforms` are the platforms to validate against.

`callback(err, validationResults)` returns an error or an array of validation results.

#### manifestInfo format

`manifestInfo.content` stores the manifest content.

`manifestInfo.format` specifies the type of manifest (possible values: `W3C`, `undefined`).

---

### Builder Module
````
var projectBuilder = require('projectBuilder');
````
#### createApps(w3cManifestInfo, rootDir, platforms, options, callback)
Generates the applications for the specified platforms.

`w3cManifestInfo` is the manifest's data in JSON format.

`rootDir` is the root directory where the apps will be generated.

`platforms` a string array specifying one or more target platforms: _windows,android,ios,chrome,web,firefox_.

`options` an object with one or more properties that customize the generated application:
- `crosswalk` (boolean) enable Crosswalk in the Cordova Android app
- `build`     (boolean) set to build the generated application

`callback(err)` returns an error, if any.

---

### Project Tools module
````
var projectTools = require('projectTools');
````
#### runApp(platform, callback)
Execute the app for the chosen platform.

`platform` The app will execute for the selected platform.

`callback` returns an error, if any.

#### openVisualStudio(callback)
Opens the Visual Studio project.

`callback` returns an error, if any.

---
## Unit Tests

In the terminal, install the Grunt task runner:

````
npm install -g grunt-cli
````

In order to run tests and jshint, execute the following command:

````
grunt
````

## Supported Input Manifests

- [W3C Web App](http://www.w3.org/TR/appmanifest/)

We plan to support the following manifest files in the future:

- [Web App Template](http://wat-docs.azurewebsites.net/JsonWindows)
- [Chrome Hosted Apps](https://developers.google.com/chrome/apps/docs/developers_guide)
- [Firefox Open Web Apps](https://developer.mozilla.org/Apps/Build/Manifest)

## Navigation Scope

The W3C manifest defines a scope that restricts the URLs to which the application can navigate. ManifoldJS supports the scope setting for the Android, iOS and Windows platforms (more details [here](https://github.com/manifoldjs/ManifoldCordova#url-access-rules)).

## Changelog

Releases are documented in [GitHub](https://github.com/manifoldjs/ManifoldJS/releases).

## Known Issues
- Creating the directory shortcuts to the Cordova platform-specific projects may fail when running in the Windows environment. The tool reports **_"WARNING: Failed to create shortcut for Cordova platform: XXXX."__ where **_XXXX_** is **_ios_**, **_windows_**, or **_android_**.  
  This is caused by an issue in Node.js which has been fixed in more recent releases. To resolve this issue, upgrade Node.js to the latest version.

- Adding the **windows** platform in the Linux and Mac OS environments fails. The tool reports **_"WARNING: Failed to add the Cordova platforms: XXXX."_** where **_XXXX_** includes **_windows_**.  
  This is caused by an issue in the Windows platform for Cordova. Depending on the cordova-windows version, running the tool can show one of two errors: **"_Cannot find module 'Q'."_** or **"_No such file or directory."_**. As a workaround, reinstall manifoldjs to force an update to the latest release of Cordova in case this issue has already been fixed.

- Issues in Visual Studio 2015 RC with the Windows solution generated by Cordova:
  - Opening the **CordovaApp.sln** solution file might hang Visual Studio while loading the Windows 8 project. As a workaround, remove the Windows 8 project file from the solution.
  - When building the solution, Visual Studio reports the following error in the Windows 10 project: **_"'ValidateAppxManifest' failed. Unspecified error"_**. As a workaround, clean and rebuild the solution.


## License

> ManifoldJS

> Copyright (c) Microsoft Corporation

> All rights reserved.

> MIT License

> Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the ""Software""), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

> The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

> THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
