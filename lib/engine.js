// require packages
var async  = require('async'),
    domain = require('domain'),
    http   = require('http');

// require maintenance
var router = require('./router'),
    utils  = require('./utils');

function Application() {
    this.router = router();
    this.params = {};
    this.layers = [];

    this.addRoute = function(route, callback) {
        if (!route || !route.url) throw new TypeError('invalid route');

        this.router.addRoute(route, callback);
    };

    this.startServer = function(params) {
        for (var name in params) {
            this.params[name] = params[name];
        };

        if (this.params.cluster) {
            var cluster = require('cluster'),
                os = require('os');

            if (cluster.isMaster) {
                for (var i = 0, cpus = os.cpus().length; i < cpus; i++) {
                    cluster.fork();
                };
            } else startServer(this.router, this.params, this.layers);
        } else startServer(this.router, this.params, this.layers);
    };

    this.useLayer = function(args) {
        var that = this;

        if (!utils.validate.array(args)) args = [args];

        args.forEach(function(arg) {
            if (typeof arg !== 'function') throw new TypeError('need function for middleware layer');

            if (!arg.length || arg.length !== 3) throw new TypeError('invalid function arguments');

            that.layers.push(arg);
        });
    };
}

module.exports = function() {
    return new Application;
};

/******** private methods ********/

function startServer(router, params, layers) {
    if (!params.port) throw new TypeError('invalid port');
    if (!params.host) throw new TypeError('invalid host');

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
            router.parseQuery(req, res, function(err, found) {
                if (found && found.callback) {
                    // add layers
                    async.each(layers, function(layer, next) {
                        layer(req, res, next);
                    }, function(err) {
                        found.callback(req, res);
                    });
                } else res.html(500);
            });
        });
    }).listen(params.port, params.host);
}