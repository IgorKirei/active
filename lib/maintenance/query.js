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
     * Request headers
     *
     * @var {Object}
     */
    this.headers;

    /**
     * Multipart boundary
     *
     * @var {Buffer}
     */
    this.boundary;

    /**
     * Parse content of request body
     *
     * @param {Object} req Standart NodeJS request object
     * @param {Function} callback Execute after finish parsing
     */
    this.parse = function(req, callback) {
        var self = this;

        self.headers = req.headers;

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
                    if (/application\/json/.test(req.headers['content-type'])) {
                        self.json(body, callback);
                    } else if (/application\/octet-stream/.test(req.headers['content-type'])) {
                        self.octet(body, callback);
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
     * @param {Buffer} body Content of request body
     * @param {Function} callback Execute after finish parsing
     */
    this.json = function(body, callback) {
        body = body.toString('utf8');

        if (utils.validate.json(body)) {
            this.fields = JSON.parse(body);

            callback(null, this.fields, this.files);
        } else callback(new TypeError('invalid json'), this.fields, this.files);
    };

    /**
     * Parse body with content-type "application/octet-stream"
     *
     * @param {Buffer} body Content of request body
     * @param {Function} callback Execute after finish parsing
     */
    this.octet = function(body, callback) {
        callback(null, this.fields, this.files);
    };

    /**
     * Parse body with content-type "application/x-www-form-urlencoded"
     *
     * @param {Buffer} body Content of request body
     * @param {Function} callback Execute after finish parsing
     */
    this.form = function(body, callback) {
        body = body.toString('utf8');

        this.fields = querystring.parse(body);

        callback(null, this.fields, this.files);
    };

    /**
     * Parse body with content-type "multipart/form-data"
     *
     * @param {Buffer} body Content of request body
     * @param {Function} callback Execute after finish parsing
     */
    this.multipart = function(body, callback) {
        var self = this;

        // get boundary
        if (self.headers['content-type'].indexOf('boundary') < 0) throw new Error('invalid headers, need boundary');

        self.boundary = new Buffer('--' + self.headers['content-type'].replace(/(.*)boundary=/, ''));

        // convert buffers
        var aBody = utils.buff2arr(body),
            aBoundary = utils.buff2arr(self.boundary);

        // get body content parts
        var positions = utils.subPositions(aBody, aBoundary);

        // get arrays with parts, exclude boundaries
        for (var i = 0, parts = [], max = positions.length; i < max; i++) {
            if (positions[i].start === undefined || positions[i].end === undefined) continue;

            if (positions[i + 1] === undefined) continue;

            parts.push(aBody.slice((positions[i].end + 1), ((positions[i + 1].start) - 1)));
        };

        callback(null, this.fields, this.files);
    };
}

module.exports = function() {
    return new Query;
};