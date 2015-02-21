// require packages
var querystring = require('querystring');

// require maintenance
var utils = require('./utils');

exports.json = function(body, callback) {
    if (utils.validate.json(body)) callback(null, JSON.parse(body));
    else callback(new TypeError('invalid json'), {});
};

exports.form = function(body, callback) {
    callback(null, querystring.parse(body));
};

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

        for (var k = 0; k < strs.length; k++) {
            if (!strs[k]) continue;

            if (strs[k].indexOf('filename=') >= 0) {
                // parse fields with files
                field = strs[k].replace(/((.*)filename=|\")/g, '');

                type = 'file';
            } else if (strs[k].indexOf('name=') >= 0) {
                // parse simple text fields
                field = strs[k].replace(/((.*)name=|\")/g, '');

                type = 'text';
            } else {
                if (type === 'file') {

                } else if (type === 'text') val = strs[k];
            }
        };

        if (field && val) {
            if (type === 'file') files[field] = val;
            else if (type === 'text') fields[field] = val;
        }
    };

    callback(null, fields, files);
};