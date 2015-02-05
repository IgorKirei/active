// require modules
var url = require('url');

// require maintenance
var utils = require('./utils');

/**
 * @method addRoute(route, callback) add new rule for routing
 * @method parseQuery(req, res, callback) parse incoming query
 * @method isMatch(path, match, method, query) compare query and routing rule
 * @method getParams(path, match) get incoming parameters
 * @method addAdditional(req, res) add additional data
 */
function Router() {
    // routing rules
    this.routes = [];

    // url parameters
    this.params = {};

    // parsed query information
    this.parsed_query;

    // full request uri
    this.request_uri;

    // request path without query parameters
    this.request_path;

    // request method
    this.request_method;

    this.addRoute = function(route, callback) {
        var methods = ['GET', 'POST', 'PUT', 'DELETE'];

        // get method by default
        if (!route.method) route.method = 'GET';

        if (methods.indexOf(route.method) < 0) throw new Error('invalid method in route');

        for (var i = 0; i < this.routes.length; i++) {
            if (this.routes[i].url === route.url && this.routes[i].method === route.method) throw new Error('same url in route');
        };

        route.callback = callback;

        this.routes.push(route);
    };

    this.parseQuery = function(req, res, callback) {
        var that = this, matched;

        this.parsed_query = url.parse(req.url, true);
        this.request_uri = this.parsed_query.href;
        this.request_path = this.parsed_query.pathname;
        this.request_method = req.method;

        for (var i = 0, max = that.routes.length; i < max; i++) {
            var route = that.routes[i],
                path = route.url.replace(/\/+$/g, ''),
                match = route.match || [],
                method = route.method.toUpperCase(),
                query = route.query || {};

            if (that.isMatch(path, match, method, query)) {
                that.getParams(path, match);

                matched = route;

                break;
            }
        };

        that.addAdditional(req, res);

        callback(null, matched);
    };

    this.isMatch = function(path, match, method, query) {
        if (/\?/.test(path)) path = path.replace('?', '\?');

        var tags = path.match(/{([a-z]{2,25})}/g) || [];

        tags.forEach(function(tag) {
            var name = tag.replace(/({|})/g, '');

            if (match[name]) path = path.replace(tag, utils.val2regexp(match[name]));
        });

        // compare query parameters in route rule and in fact
        if (!utils.compare(query, this.parsed_query.query)) return false;

        var rule = new RegExp('^' + path + '/?$', 'g');

        // need check also with trailing slash
        var changed_path = this.request_path;

        if (!/\/$/.test(changed_path)) changed_path += '/';

        return changed_path.match(rule) && method === this.request_method;
    };

    this.getParams = function(path, match) {
        var query_keys = path.split('/'),
            request_keys = this.request_path.split('/');

        for (var i = 0; i < query_keys.length; i++) {
            var key = query_keys[i];

            if (!/({|})/.test(key)) continue;

            key = key.replace(/({|})/g, '');

            if (request_keys[i] && !this.params[key]) this.params[key] = request_keys[i];
        };
    };

    this.addAdditional = function(req, res) {
        // get client ip
        req.client_ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress;

        // get referer info
        req.referer = req.headers['referer'] ? url.parse(req.headers['referer'], true) : null;

        // get path parameters
        req.params = this.params;

        // get query parameters
        req.query = this.parsed_query.query;
    };
}

module.exports = function() {
    return new Router;
};