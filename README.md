[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][downloads-url]
[![Linux Build][travis-image]][travis-url]
[![Coverage Status](https://coveralls.io/repos/github/IgorKirei/active/badge.svg?branch=master)](https://coveralls.io/github/IgorKirei/active?branch=master)

# ActiveJS
High performance, extendable solution with less unnecessary features. Achieve the maximum possible speed of NodeJS framework!

## Docs
- [Website and Documentation](http://activejs.pro/)

## Installation

```bash
$ npm install active --save
```

## New Application

```js
const active = require("active");
const app = active();

http.createServer(app).listen();
```

## Configuration
Using next method you can change application settings. All settings are optional.
```js
app.tune({
    strictRouting: Boolean, // default false
    cors: Boolean, // default false
    debug: Boolean // default false
});
```

##### Parameters
- **strictRouting** - strict routing is mean, that if some of your application method needs special parameters (set by route rule), these parameters must be received, if they don't, client will receive error
- **cors** - cross-origin resource sharing, read details [here](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- **debug** - application with enabled debug mode prints speed for each request

## Routes
For adding new routing rule, you should use **addRoute** method:

```js
app.addRoute({
    method: String, // default GET
    url: String,
    match: Object,
    query: Object,
    fileParsing: Boolean // default true
}, (req, res) => {});
```

##### Options
- **method** - HTTP method, can be GET, POST, PUT, DELETE (optional)
- **url** - pattern for request url (required)
- **match** - patterns for special parameters in request url (optional)
- **query** - patterns for query string parameters, after question mark (optional)
- **fileParsing** - framework parses (if true) or doesn't parse (if false) request's body for uploaded files (optional)

##### Callback
This is how you can handle client's requests.

You can do it with typical way:
```js
app.addRoute(options, (req, res) => {
    res.statusCode = http_code;
    res.end(content);
});
```
Or with custom way which is provided by ActiveJS:

```js
app.addRoute(options, (req, res) => {
    res.html(http_code, html); // return HTML content
});
```
```js
app.addRoute(options, (req, res) => {
    res.json(http_code, json); // return JSON object
});
```
```js
app.addRoute(options, (req, res) => {
    res.redirect("/path/", 301); // redirect user to another page or website
});
```
Few examples how you can use it:

```js
app.addRoute({
    url: "/{category}",
    match: {
        category: ["phones", "tablets"]
    }
}, (req, res) => {
    res.json(200, req.params);
});
```
```js
app.addRoute({
    url: "/{category}/{name}",
    match: {
        category: ["phones", "tablets"],
        name: "([a-z0-9]{3,50}"
    }
}, (req, res) => {
    res.json(200, req.params);
});
```
```js
app.addRoute({
    url: "/{category}/{name}",
    query: {
        password: "[a-z0-9]{3,50}"
    }
}, (req, res) => {
    res.json(200, req.query);
});
```

## Variables
While processing client's request you can get access to internal variables in **req** object:

- **req.client_ip** - client's IP address
- **req.referer** - client's referrer, identifies URL that linked to resource being requested
- **req.params** - URL parameters
- **req.query** - query string parameters
- **req.files** - name, extension, mime and content of uploaded file

## Middleware
Basically this is a simple way to do something with **req** and **res** objects while processing client's requests, e.g. add authorization logic before API callback runs. In ActiveJS we know this feature as **layers**.

You can define layers using two ways:

##### Specific
Will be executed for request matched specific route rule:
```js
app.addRoute(options, (req, res, next) => {
    // do something with "req" and "res" objects and run callback
    next();
}, callback);
```

##### Global
Will be executed for each request (all routes):
```js
app.useLayer((req, res, next) => {
    // do something with "req" and "res" objects and run callback
    next();
});
```
If you want to use few layers, you must send array with functions, instead of one function:
```js
app.addRoute(options, [Function, Function, Function], callback);
```
```js
app.useLayer([Function, Function, Function]);
```

## Tips
We collected some advices for you, it can be useful in some cases.

##### Page not found
If some client's request doesn't match your routing rules, our framework will shows blank page with 404 http status. Of course for production we need more intelligent solution, so here is example how you can show your custom "not found" page:
```js
app.addRoute({
    url: "/{url}",
    match: {
        url: "(.*)"
    }
}, (req, res) => {
    res.html(404, content);
});
```
Just need add new routing rule for processing all requests. Important thing: this rule must be last one - just in case to overwrite previous, it's very important.

## Tests
After installing of all dependencies you can run tests:
```js
npm test
```

## Contributing
You can help to improve "Active" framework, there is lot of work to do:
- review [pull requests](https://github.com/IgorKirei/active/pulls)
- find new [issue](https://github.com/IgorKirei/active/issues) or fix existing
- add new feature or improve old
- update documentation


## License
The Active JS framework is open-source software licensed under the [MIT](LICENSE)

[npm-image]: https://img.shields.io/npm/v/active.svg?style=flat
[npm-url]: https://npmjs.org/package/active
[downloads-image]: https://img.shields.io/npm/dm/active.svg?style=flat
[downloads-url]: https://npmjs.org/package/active
[travis-image]: https://img.shields.io/travis/IgorKirei/active.svg?style=flat
[travis-url]: https://travis-ci.org/IgorKirei/active