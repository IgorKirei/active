// require packages
var querystring = require('querystring');

// require maintenance
var utils = require('./utils');

/**
 * Parse body with content-type "application/json"
 *
 * @param {String} body Content of request body
 * @param {Function} callback Execute after finish parsing
 */
exports.json = function(body, callback) {
    if (utils.validate.json(body)) callback(null, JSON.parse(body));
    else callback(new TypeError('invalid json'), {});
};

/**
 * Parse body with content-type "application/x-www-form-urlencoded"
 *
 * @param {String} body Content of request body
 * @param {Function} callback Execute after finish parsing
 */
exports.form = function(body, callback) {
    callback(null, querystring.parse(body));
};

/**
 * Parse body with content-type "multipart/form-data"
 *
 * @param {Object} headers Request headers
 * @param {String} body Content of request body
 * @param {Function} callback Execute after finish parsing
 */
exports.multipart = function(headers, body, callback) {
    var fields = {}, files = {};

    // search boundary
    var parts = headers['content-type'].split(';'), boundary;

    for (var i = 0, max = parts.length; i < max; i++) {
        if (/boundary/.test(parts[i])) {
            var parsed = parts[i].split('=');

            if (parsed.length === 2) boundary = '--' + parsed[1];
        }
    };

    if (!boundary) return callback(new Error('invalid headers, need boundary'));

    var lines = body.split(boundary);

    // remove empty lines
    lines.shift();
    lines.pop();

    // parse lines
    for (var i = 0, type, field, val, strs, max = lines.length; i < max; i++) {
        type = field = val = null;

        strs = lines[i].split(/\r\n/);
        strs = utils.clean(strs);

        if (strs.length === 2) {
            // parse simple text fields
            type = 'text';

            for (var k = 0; k < strs.length; k++) {
                if (strs[k].indexOf('name=') >= 0) field = strs[k].replace(/((.*)name=|\")/g, '');
                else val = strs[k];
            };
        } else if (strs.length === 4) {
            // parse fields with files
            type = 'file';

            for (var k = 0; k < strs.length; k++) {
                if (strs[k].indexOf('filename=') >= 0) field = strs[k].replace(/((.*)filename=|\")/g, '');
            };
        }

        if (field && val) {
            if (type === 'file') files[field] = val;
            else if (type === 'text') fields[field] = val;
        }
    };

    callback(null, fields, files);
};