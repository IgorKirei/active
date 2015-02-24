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
    var fields = {}, files = [];

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

    // parse lines according rfc
    for (var i = 0, field, text, name, file, strs, max = lines.length; i < max; i++) {
        field = text = name = file = null;
        strs = utils.split(lines[i], /\r\n/);

        if (strs.length === 2) {
            field = strs.shift().replace(/((.*)name=|\")/g, '');
            text = strs.pop();

            if (field && text) fields[field] = text;
        } else if (strs.length === 4) {
            name = strs.shift().replace(/((.*)filename=|\")/g, '');
            file = strs.pop();

            if (name && file) files.push({'name': name, 'file': file});
        }
    };

    callback(null, fields, files);
};