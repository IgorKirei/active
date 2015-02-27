// require packages
var querystring = require('querystring');

// require maintenance
var utils = require('./utils');

function Query() {
    /**
     * List with text fields
     *
     * @var {Object}
     */
    this.fields = {};

    /**
     * List with files
     *
     * @var {Array}
     */
    this.files = [];

    /**
     * Parse content of request body
     *
     * @param {Object} req Standart NodeJS request object
     * @param {Function} callback Execute after finish parsing
     */
    this.parse = function(req, callback) {
        var self = this;

        switch (req.method) {
            case 'GET':
            case 'HEAD':
                callback(null, this.fields, this.files);
            break;
            case 'PUT':
            case 'POST':
            case 'DELETE':
                var body;

                // get full body of request
                req.on('data', function(chunk) {
                    if (!body) body = chunk;
                    else body = Buffer.concat([body, chunk]);
                });

                // body received, start parse
                req.on('end', function() {
                    body = body.toString('utf8');

                    if (/application\/json/.test(req.headers['content-type'])) {
                        self.json(body, callback);
                    } else if (/application\/x-www-form-urlencoded/.test(req.headers['content-type'])) {
                        self.form(body, callback);
                    } else if (/multipart\/form-data/.test(req.headers['content-type'])) {
                        self.multipart(body, callback);
                    } else {
                        callback(new Error('unsupported header content type'));
                    }
                });
                break;
            default:
                callback(new Error('unsupported http method'));
            break;
        };
    };

    /**
     * Parse body with content-type "application/json"
     *
     * @param {String} body Content of request body
     * @param {Function} callback Execute after finish parsing
     */
    this.json = function(body, callback) {
        if (utils.validate.json(body)) {
            this.fields = JSON.parse(body);

            callback(null, this.fields, this.files);
        } else callback(new TypeError('invalid json'), this.fields, this.files);
    };

    /**
     * Parse body with content-type "application/x-www-form-urlencoded"
     *
     * @param {String} body Content of request body
     * @param {Function} callback Execute after finish parsing
     */
    this.form = function(body, callback) {
        this.fields = querystring.parse(body);

        callback(null, this.fields, this.files);
    };

    /**
     * Parse body with content-type "multipart/form-data"
     *
     * @param {String} body Content of request body
     * @param {Function} callback Execute after finish parsing
     */
    this.multipart = function(body, callback) {
        callback(null, this.fields, this.files);
    };
}

module.exports = function() {
    return new Query;
};