// require modules
var url = require('url');

// require maintenance
var utils = require('./utils');

function Router() {
    // routing rules
    this.routes = [];

    // url parameters
    this.params = {};

    // parsed query information
    this.parsed_query;

    // full request uri
    this.request_uri;

    // request method
    this.request_method;

    this.addRoute = function(route, callback) {
        for (var i = 0; i < this.routes.length; i++) {
            if (this.routes[i].url === route.url) throw new Error('same url in route');
        };

        route.callback = callback;

        this.routes.push(route);
    };

    this.parseQuery = function(req, res, callback) {
        var that = this, matched;

        this.parsed_query = url.parse(req.url, true);
        this.request_uri = this.parsed_query.href;
        this.request_method = req.method.toUpperCase();

        that.routes.forEach(function(route) {
            var query = route.url.replace(/\/+$/g, ''),
                match = route.match || [],
                method = route.method ? route.method.toUpperCase() : 'GET';

            if (that.isMatch(query, match, method)) {
                that.getParams(query, match);

                matched = route;
            }
        });

        callback(null, matched);
    };

    this.isMatch = function(query, match, method) {
        if (/\?/.test(query)) query = query.replace('?', '\?');

        var tags = query.match(/{([a-z]{2,25})}/g) || [];

        tags.forEach(function(tag) {
            var name = tag.replace(/({|})/g, '');

            if (match[name]) query = query.replace(tag, utils.val2regexp(match[name]));
        });

        var rule = new RegExp('^' + query + '(/)?$', 'g');

        return this.request_uri.match(rule) && method === this.request_method;
    };

    this.getParams = function(query, match) {
        var query_keys = query.split('/'),
            request_keys = this.request_uri.split('/');

        for (var i = 0; i < query_keys.length; i++) {
            var key = query_keys[i];

            if (!/({|})/.test(key)) continue;

            key = key.replace(/({|})/g, '');

            if (request_keys[i] && !this.params[key]) this.params[key] = request_keys[i];
        };
    };
}

module.exports = function() {
    return new Router;
};