// require modules
var cookies = require('cookies'),
    domain  = require('domain'),
    http    = require('http');

// require maintenance
var router = require('./router'),
    utils  = require('./utils');

function Application() {
    this.router = router();
    this.params = {};

    this.addRoute = function(route, callback) {
        if (!route || !route.url) throw new Error('invalid route');

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
            } else run(this.router, this.params);
        } else run(this.router, this.params);
    };
}

module.exports = function() {
    return new Application;
};

/******** private methods ********/

function run(router, params) {
    if (!params.port) throw new Error('invalid port');
    if (!params.host) throw new Error('invalid host');

    // create server
    http.createServer(function(req, res) {
        var dom = domain.create();

        // set response functionality
        res.json = function(status, content) {
            this.statusCode = status || 200;
            this.setHeader('content-type', 'application/json; charset=utf-8');
            this.end(JSON.stringify(content));
        };

        res.html = function(status, content) {
            this.statusCode = status || 200;
            this.setHeader('content-type', 'text/html; charset=utf-8');
            this.end(content);
        };

        // receive unhandled errors
        dom.on('error', function(err) {
            console.error(err.stack);

            res.html(500);
        });

        // get client ip
        req.client_ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress;

        // get referer info
        req.referer = req.headers['referer'] ? url.parse(req.headers['referer'], true) : null;

        dom.add(req);
        dom.add(res);

        // execute method
        dom.run(function() {
            router.parseQuery(req, res, function(err, found) {
                if (found && found.callback) found.callback(req, res);
                else res.html(500);
            });
        });
    }).listen(params.port, params.host);
}