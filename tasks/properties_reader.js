/*
 * grunt-properties-reader
 * https://github.com/slawrence/grunt-properties-reader
 *
 * Copyright (c) 2013 Sean Lawrence
 * Licensed under the MIT license.
 */

'use strict';

/**
 * If a string is "true" "TRUE", or "  TrUE" convert to boolean type else
 * leave as is
 */
function _convertStringIfTrue(original) {
    var str;
    if (original && typeof original === "string") {
        str = original.toLowerCase().trim();
        return (str === "true" || str === "false") ? (str === "true") : original;
    }
    return original;
}

/**
 * Convert property-strings into a json object.
 *
 * Nested properties will be converted to nested objects and parseable numeric values to int.
 *
 */
function convertPropsToJson(text) {
    var configObject = {};
    if (text && text.length) {
        // handle multi-line values terminated with a backslash
        text = text.replace(/\\\r?\n\s*/g, '');

        text.split(/\r?\n/g).forEach(function (line) {
            var props,
                name,
                val;

            line = line.trim();

            if (line && line.indexOf("#") !== 0 && line.indexOf("!") !== 0) {
                props = line.split(/\=(.+)?/);

                var nestedProperties = props[0].split('.');

                // if the current property-line is a nested path then objectify it
                if (nestedProperties.length > 1) {

                    var data = configObject,
                        i;

                    while(nestedProperties.length) {

                        i = nestedProperties.shift();

                        if (nestedProperties.length) {

                            if (!data.hasOwnProperty(i)) {
                                // If the current nested property (i) is not in our datastructure, add it
                                data[i] = {};
                            }
                            data = data[i];

                        } else {
                            val = props[1] && props[1].trim();
                            data[i] = isNaN(val) ? val : parseInt(val, 10);
                        }
                    }

                } else {
                    name = props[0] && props[0].trim();
                    val = props[1] && props[1].trim();
                    configObject[name] = isNaN(val) ? _convertStringIfTrue(val) : parseInt(val, 10);
                }

            }
        });
    }

    return configObject;
}

/**
 * Merges the source-file into the target-file
 *
 * @param {object} target the destination-object, where all keys from the source will be added
 * @param {object} source the source-object, which will be merged into the target file
 * @returns {object} the target-object with the merged keys and values
 */
function merge(target, source) {

  if (!source) {
    return target;
  }

  for (var key in source) {
      if (source.hasOwnProperty(key)) {
          target[key] = source[key];
      }
  }

  return target;

}

/**
 * Converts the given value to an array
 *
 * @param {string} value the value which should be put into a new array
 *
 * @returns {Array} an empty array, if the value is null
 *                  the value itself, if the value is an array already
 *                  a new array with the given value, if the value is from another type
 */
function convertToArray(value) {

    if (!value) {
        return [];
    }

    if (value instanceof Array) {
        return value;
    }

    return [ value ];

}

module.exports = function(grunt) {

  // Please see the Grunt documentation for more information regarding task
  // creation: http://gruntjs.com/creating-tasks

  grunt.registerMultiTask('properties', 
    'Reads values from one or more Java style properties into the specified variable', 
    function() {

        var readFile = function(filename, readOptions) {
            return grunt.file.exists(filename) && grunt.file.read(filename, readOptions);
        };

        // Merge task-specific and/or target-specific options with these defaults.
        if (grunt.config.get(this.target)) {
            grunt.log.error("Conflict - property, " + this.target + ", already exists in grunt config");
            return false;
        }

        var filenames = convertToArray(this.data);

        var parsed = {};
        for (var i=0; i < filenames.length; i++) {

          var filename = filenames[i];
          var file = readFile(filename, this.options);

          // Only require the first file ...
          if (!file && i === 0) {
              grunt.log.error("Could not read required properties file: " + filename);
              return false;
          } else if (!file) {
              grunt.log.warn("Could not read optional properties file: " + filename);
          }

          parsed = merge(parsed, convertPropsToJson(file));

       }

       grunt.config.set(this.target, parsed);

    });

};
