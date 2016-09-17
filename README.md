[![ActiveJS framework](http://s1.oboiki.net/files/images/active_logo.png)](http://activejs.info/)

[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][downloads-url]
[![Build Status][travis-image]][travis-url]

## Features
- **high performance**, our main target is high performance, minimum of hidden unnecessary functionality
- **strict routing**, we like strict routing system, if method should use some certain parameters, it must get it
- **simple use**, if newbie can use our framework without any problem, this is real cool
- **friendly use**, we provide way for connect packages, modules from other developers

## Docs
- [Website and Documentation](http://activejs.info/)

## Installation

```bash
$ npm install active --save
```

## Create application

```js
var active = require('active');
var app = active();

app.addRoute(options, callback);
app.addRoute(options, callback);
app.addRoute(options, callback);

app.startServer(parameters);
```
##### Server
To start new server you can use default settings:
```js
app.startServer();
```
Or custom settings:
```js
app.startServer({
  'port': Number, // optional, default 80
  'host': String, // optional, default localhost
  'cluster': Boolean // optional, default false
});
```
Also you can use http(s) package:
```js
var app = active();
var http = require('http');
var https = require('https');

// simple http server
http.createServer(app).listen(port);

// secure server with SSL
https.createServer(options, app).listen(port);
```
Check detailed documentation of these modules.

## Settings
Next method needs for changing application settings, method isn't required:
```js
app.tune({
  'routing': String // default "nonstrict", also can be "strict"
  'cors': Boolean // default false
  'debug': Boolean // default false
});
```
##### Parameters
- **routing**, strict routing is mean, that if some of your application method needs special parameters (set by route rule), these parameters must be received, if they don't, client will receive error
- **cors**, cross-origin resource sharing, read details [here](https://developer.mozilla.org/en-US/docs/Web/HTTP/Access_control_CORS)
- **debug**, application with enabled debug mode prints speed for each request

## Routing

For adding new routing rule, you must use "addRoute" method of application object:

```js
app.addRoute(options, callback);
```

##### Options
Settings for special rule.

```js
{
  'method': String, // GET by default, also can be POST, PUT, DELETE
  'url': String, // pattern for request url
  'match': Object, // patterns for special params in request url
  'query': Object // query parameters, after question mark
}
```

Examples of application routes:

```js
app.addRoute({
  'url': '/{category}',
  'match': {
    'category': ['phones', 'stuff']
  }
}, callback);

app.addRoute({
  'url': '/{category}/{item}',
  'match': {
    'category': ['phones', 'stuff'],
    'item': '([a-z0-9-]{2,63}\.[a-z]{4})'
  }
}, callback);
```

## Callbacks

Helpful information about callbacks.

##### Request parameters

You can use path parameters, which been set in route ("url" directive):

```js
app.addRoute(options, function(req, res) {});
```

Examples of application callbacks:

```js
app.addRoute({
  'url': '/{category}/{item}',
  'match': {
    'category': ['phones', 'stuff'],
    'item': '([a-z0-9-]{2,63}\.[a-z]{4})'
  }
}, function(req, res) {
  console.log(req.params); // {category: String, item: String}
});
```

## Response

You can choose how to return result to the client. Below you can see both examples.

##### Standart
Use standard capabilities of Node using "res" object:
```js
app.addRoute(route, function(req, res) {
  res.statusCode = 200;
  res.end(content);
});
```

##### Custom
Use custom capabilities of framework:
```js
app.addRoute(route, function(req, res) {
  res.html(http_code, html); // show html
});
```

```js
app.addRoute(route, function(req, res) {
  res.json(http_code, json); // show json
});
```

##### Redirect
Framework provides custom way for redirecting queries:
```js
app.addRoute(route, function(req, res) {
  res.redirect('/path/', 301);
});
```

## Layers
What you can do using layers:
- implement some specific middleware layer for your application
- connect different packages from other developers

Middleware layer is a function with three arguments: "req", "res" and "next", first and second are standard NodeJS objects, third is callback. There are two types of layers.

##### Local
Will be executed for request matched specific route rule:
```js
app.addRoute(options, function(req, res, next) {
  // do something with "req" and "res" objects and run callback
  next();
}, callback);
```

##### Global
Will be executed for each request:
```js
app.useLayer(function(req, res, next) {
  // do something with "req" and "res" objects and run callback
  next();
});
```
If you want to use few layers, you must send array with functions, instead of function:
```js
// local layer
app.addRoute(options, [Function, Function, Function], callback);

// global layer
app.useLayer([Function, Function, Function]);
```
You can use any number of layers, but remember about your rom ;)
## Tips
Below you can find some advices.
##### Page not found
If some client request doesn't match your routing rules, our framework will shows blank page with 404 status. Of course for production we need more intelligent solution, so here is example how you can show your custom "not found" page:
```js
app.addRoute({
  'url': '/{url}',
  'match': {
    'url': '(.*)'
  }
}, callback);
```
You see? Just need add new routing rule for processing all requests. This rule must be last one, it's very important.

## Testing
Guys, sometimes we implement some new functionality, like uploading files. It works without any packages from other developers, so we need help to test how it works. If you found some error, please open new issue on Github or send email to us. Thanks!

## Contributing
"Active" framework is a new project, there is lot of work to do and you can help:
- review [pull requests](https://github.com/IgorKirey/active/pulls)
- find new [issue](https://github.com/IgorKirey/active/issues) or fix exist
- add new feature or improve some old
- update documentation

## License

The Active JS framework is open-source software licensed under the [MIT](LICENSE)

[npm-image]: https://img.shields.io/npm/v/active.svg?style=flat
[npm-url]: https://npmjs.org/package/active
[downloads-image]: https://img.shields.io/npm/dm/active.svg?style=flat
[downloads-url]: https://npmjs.org/package/active
[travis-image]: https://img.shields.io/travis/IgorKirey/active.svg?style=flat
[travis-url]: https://travis-ci.org/IgorKirey/active