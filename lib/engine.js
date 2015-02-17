// require packages
var async  = require('async'),
    domain = require('domain'),
    http   = require('http'),
    uuid   = require('node-uuid');

// require maintenance
var router = require('./router'),
    utils  = require('./maintenance/utils');

function Application() {
    this.params = {};
    this.router = router();

    /**
     * Proxy method of routing "addRoute"
     *
     * @method addRoute
     * @param {Object} route New rule for routing, url parameters, possible query parameters, type of method
     * @param {Mixed} layers Use layer(s) for special route rule
     * @param {Function} callback Method for processing the request and returning result to the client
     */
    this.addRoute = function(route, layers, callback) {
        if (!callback) {
            callback = layers;
            layers = null;
        }

        if (!route || !route.url) throw new TypeError('invalid route');

        var unique_id = uuid.v4();

        route.id = unique_id;

        this.router.addRoute(route, callback);

        this.router.layers.addLocal(route.id, layers);
    };

    /**
     * Start new server, in other words, run application
     *
     * @method startServer
     * @param {Object} params Parameters for starting new server, such like port, host, use cluster
     */
    this.startServer = function(params) {
        var that = this;

        if (!params) params = {};

        for (var name in params) {
            that.params[name] = params[name];
        };

        // default server parameters
        if (!that.params.port) that.params.port = 80;
        if (!that.params.host) that.params.host = 'localhost';

        if (that.params.cluster) {
            var cluster = require('cluster'),
                os = require('os');

            if (cluster.isMaster) {
                for (var i = 0, cpus = os.cpus().length; i < cpus; i++) {
                    cluster.fork();
                };
            } else that.runApplication();
        } else that.runApplication();
    };

    /**
     * Proxy method of layers "addGlobal"
     *
     * @method useLayer
     * @param {Mixed} args New middleware function(s)
     */
    this.useLayer = function(args) {
        this.router.layers.addGlobal(args);
    };

    /**
     * Check settings, start server, add other logic
     *
     * @method runApplication
     */
    this.runApplication = function() {
        var that = this;

        // create server
        http.createServer(function(req, res) {
            var dom = domain.create();

            // set response functionality
            res.json = function(code, content) {
                this.statusCode = code || 200;
                this.setHeader('content-type', 'application/json; charset=utf-8');
                this.end(JSON.stringify(content));
            };

            res.html = function(code, content) {
                this.statusCode = code || 200;
                this.setHeader('content-type', 'text/html; charset=utf-8');
                this.end(content);
            };

            // set simple redirect functionality
            res.redirect = function(url, code) {
                if (!url) throw new TypeError('invalid url for redirecting');
                if (code !== 301 && code !== 302) throw new TypeError('invalid code for redirecting');

                this.statusCode = code;
                this.setHeader('location', (req.connection.encrypted ? 'https' : 'http') + '://' + req.headers.host + url);
                this.end();
            };

            // receive unhandled errors
            dom.on('error', function(err) {
                console.error(err.stack);

                res.html(500);
            });

            dom.add(req);
            dom.add(res);

            // execute method
            dom.run(function() {
                that.router.parseQuery(req, res, function(err, found) {
                    if (found && found.callback) {
                        // add middleware layers
                        async.mapSeries(that.router.layers.getLocal(found.id), function(layer, next) {
                            layer(req, res, next);
                        }, function(err) {
                            async.mapSeries(that.router.layers.getGlobal(), function(layer, next) {
                                layer(req, res, next);
                            }, function(err) {
                                found.callback(req, res);
                            });
                        });
                    } else res.html(500);
                });
            });
        }).listen(that.params.port, that.params.host);
    };
}

module.exports = function() {
    return new Application;
};