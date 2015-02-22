// require packages
var url = require('url');

// require maintenance
var utils      = require('./maintenance/utils'),
    middleware = require('./maintenance/middleware'),
    parser     = require('./maintenance/parser');

function Router() {
    /**
     * List of routing rules
     *
     * @var {Array}
     */
    this.routes = [];

    /**
     * Middleware layers functionality
     *
     * @var {Object}
     */
    this.layers = middleware();

    // url parameters
    this.params;

    // all parsed parameters
    this.parsed_all;

    // parsed query parameters
    this.parsed_query;

    // parsed body parameters
    this.parsed_body;

    // full request uri
    this.request_uri;

    // request path without query parameters
    this.request_path;

    // request method
    this.request_method;

    /**
     * Add new rule for routing, set callback
     *
     * @method addRoute
     * @param {Object} route New rule for routing, url parameters, possible query parameters, type of method
     * @param {Function} callback Method for processing the request and returning result to the client
     */
    this.addRoute = function(route, callback) {
        var methods = ['GET', 'POST', 'PUT', 'DELETE'];

        if (!route.method) route.method = 'GET';

        if (methods.indexOf(route.method) < 0) throw new Error('invalid method in route');

        for (var i = 0; i < this.routes.length; i++) {
            if (this.routes[i].url === route.url && this.routes[i].method === route.method) throw new Error('same url in route');
        };

        route.callback = callback;

        this.routes.push(route);
    };

    /**
     * Parse content of request body
     *
     * @method parseBody
     * @param {Object} req Standart NodeJS request object
     * @param {Function} callback Execute after finish parsing
     */
    this.parseBody = function(req, callback) {
        var that = this, body = '';

        switch (req.method) {
            case 'HEAD':
            case 'GET':
                callback();
            break;
            case 'POST':
            case 'PUT':
            case 'DELETE':
                // get full body of request
                req.on('data', function(data) {
                    body += data;
                });

                // body received, start parse
                req.on('end', function() {
                    if (/application\/json/.test(req.headers['content-type'])) {
                        parser.json(body, function(err, fields) {
                            if (fields) that.parsed_body = fields;

                            callback(err);
                        });
                    } else if (/application\/x-www-form-urlencoded/.test(req.headers['content-type'])) {
                        parser.form(body, function(err, fields) {
                            if (fields) that.parsed_body = fields;

                            callback(err);
                        });
                    } else if (/multipart\/form-data/.test(req.headers['content-type'])) {
                        parser.multipart(req.headers, body, function(err, fields, files) {
                            if (fields) that.parsed_body = fields;

                            callback(err);
                        });
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
     * Parse url for query parameters
     *
     * @method parseQuery
     * @param {Object} req Standart NodeJS request object
     * @param {Object} res Standart NodeJS response object
     * @param {Function} callback Execute after finish parsing
     */
    this.parseQuery = function(req, res, callback) {
        var that = this, matched;

        that.params = {};
        that.parsed_query = url.parse(req.url, true);
        that.parsed_body = {};
        that.request_uri = that.parsed_query.href;
        that.request_path = that.parsed_query.pathname;
        that.request_method = req.method;

        that.parseBody(req, function(err) {
            if (err) return callback(err);

            that.parsed_all = utils.merge(that.parsed_query.query, that.parsed_body);

            for (var i = 0, max = that.routes.length; i < max; i++) {
                var route = that.routes[i],
                    path = route.url.replace(/\/+$/g, ''),
                    match = route.match || [],
                    method = route.method.toUpperCase(),
                    query = route.query || {};

                if (that.isMatch(path, match, method, query)) {
                    that.getParams(path);
                    that.getAdditional(req, res);

                    matched = route;

                    break;
                }
            };

            callback(null, matched);
        });
    };

    /**
     * Compare query and routing rule
     *
     * @method isMatch
     * @param {String} path "url" parameter of route rule
     * @param {Object} match "match" parameter of route rule
     * @param {Object} method "method" parameter of route rule
     * @param {Object} query "query" parameter of route rule
     *
     * @return {Boolean}
     */
    this.isMatch = function(path, match, method, query) {
        if (/\?/.test(path)) path = path.replace('?', '\?');

        var tags = path.match(/{([a-z]{2,25})}/g) || [];

        tags.forEach(function(tag) {
            var name = tag.replace(/({|})/g, '');

            if (match[name]) path = path.replace(tag, utils.val2regexp(match[name]));
        });

        // compare query parameters in route rule and in fact
        if (!utils.compare(query, this.parsed_all)) return false;

        var rule = new RegExp('^' + path + '/?$', 'g');

        // need check also with trailing slash
        var changed_path = this.request_path;

        if (!/\/$/.test(changed_path)) changed_path += '/';

        return changed_path.match(rule) && method === this.request_method;
    };

    /**
     * Get incoming parameters
     *
     * @method getParams
     * @param {String} path Path "url" of route rule
     */
    this.getParams = function(path) {
        var path_keys    = path.split('/'),
            request_keys = this.request_path.split('/');

        for (var i = 0; i < path_keys.length; i++) {
            var key = path_keys[i];

            if (!/({|})/.test(key)) continue;

            key = key.replace(/({|})/g, '');

            if (request_keys[i] && !this.params[key]) this.params[key] = request_keys[i];
        };
    };

    /**
     * Add additional data
     *
     * @method getAdditional
     * @param {Object} req Standart NodeJS request object
     * @param {Object} res Standart NodeJS response object
     */
    this.getAdditional = function(req, res) {
        // get client ip
        req.client_ip = req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress;

        // get referer info
        req.referer = req.headers['referer'] ? url.parse(req.headers['referer'], true) : null;

        // set path parameters
        req.params = this.params;

        // set incoming parameters
        req.query = this.parsed_all;
    };
}

module.exports = function() {
    return new Router;
};