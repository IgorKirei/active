// require packages
var url = require('url');

// require maintenance
var utils      = require('./maintenance/utils'),
    middleware = require('./maintenance/middleware'),
    query      = require('./maintenance/query');

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

    /**
     * Parsed query files
     *
     * @var {Object}
     */
    this.parsed_files;

    // full request uri
    this.request_uri;

    // request path without query parameters
    this.request_path;

    // request method
    this.request_method;

    /**
     * Add new rule for routing, set callback
     *
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
     * Parse url for query parameters
     *
     * @param {Object} req Standart NodeJS request object
     * @param {Object} res Standart NodeJS response object
     * @param {Function} callback Execute after finish parsing
     */
    this.parseQuery = function(req, res, callback) {
        var self = this;

        self.params = {};
        self.parsed_query = url.parse(req.url, true);
        self.parsed_files = {};
        self.request_uri = self.parsed_query.href;
        self.request_path = self.parsed_query.pathname;
        self.request_method = req.method;

        // parse content of request body
        query().parse(req, function(err, fields, files) {
            if (err) return callback(err);

            self.parsed_all = utils.merge(self.parsed_query.query, fields);
            self.parsed_files = files;

            for (var i = 0, max = self.routes.length; i < max; i++) {
                var route = self.routes[i],
                    path = route.url.replace(/\/+$/g, ''),
                    match = route.match || [],
                    method = route.method.toUpperCase(),
                    query = route.query || {};

                if (self.isMatch(path, match, method, query)) {
                    self.getParams(path);
                    self.getAdditional(req, res);

                    return callback(null, route);
                }
            };

            callback();
        });
    };

    /**
     * Compare query and routing rule
     *
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

        // set incoming text fields
        req.query = this.parsed_all;

        // set incoming files
        req.files = this.parsed_files;
    };
}

module.exports = function() {
    return new Router;
};