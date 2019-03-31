[![ActiveJS framework](http://s1.oboiki.net/files/images/active_logo.png)](http://activejs.info/)

[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][downloads-url]
[![Linux Build][travis-image]][travis-url]

## Features
- **high performance**, our main target is high performance, minimum of hidden unnecessary functionality, why? because you know better what you need and nobody knows what stack is the best in your unique case
- **extendable**, we provide a way to extend your future app with middlewares, so you can use modules from other developers

## Docs
- [Website and Documentation](http://activejs.info/)

## Installation

```bash
$ npm install active --save
```

## Create and Start application

```js
const active = require("active");
const app = active();

app.addRoute(options, callback);

http.createServer(app).listen();
```

## Settings
Next method needs for changing application settings, method isn't required:
```js
app.tune({
  "routing": String // default "nonstrict", also can be "strict"
  "cors": Boolean // default false
  "debug": Boolean // default false
});
```
##### Parameters
- **routing**, strict routing is mean, that if some of your application method needs special parameters (set by route rule), these parameters must be received, if they don't, client will receive error
- **cors**, cross-origin resource sharing, read details [here](https://developer.mozilla.org/en-US/docs/Web/HTTP/Access_control_CORS)
- **debug**, application with enabled debug mode prints speed for each request

## Routing
For adding new routing rule, you should use "addRoute" method:

```js
app.addRoute(options, callback);
```

Available options:

```js
{
  "method": String, // GET by default, also can be POST, PUT, DELETE
  "url": String, // pattern for request url
  "match": Object, // patterns for special params in request url
  "query": Object // query parameters, after question mark
}
```

Examples of application routes:

```js
app.addRoute({
  "url": "/{category}",
  "match": {
    "category": ["phones", "stuff"]
  }
}, (req, res) => {});

app.addRoute({
  "url": "/{category}/{item}",
  "match": {
    "category": ["phones", "stuff"],
    "item": "([a-z0-9-]{2,63}\.[a-z]{4})"
  }
}, (req, res) => {});
```

## Callbacks

Helpful information about callbacks.

##### Request parameters

Examples of application callbacks:

```js
app.addRoute({
  "url": "/{category}/{item}",
  "match": {
    "category": ["phones", "stuff"],
    "item": "([a-z0-9-]{2,63}\.[a-z]{4})"
  }
}, (req, res) => {
  console.log(req.params); // {category: String, item: String}
});
```

## Response

You can choose how to return result to the client. Below you can find both examples.

##### Standard
Use standard capabilities of Node using "res" object:
```js
app.addRoute(route, (req, res) => {
  res.statusCode = 200;
  res.end(content);
});
```

##### Custom
Use custom capabilities of framework:
```js
app.addRoute(route, (req, res) => {
  res.html(http_code, html); // show html
});
```

```js
app.addRoute(route, (req, res) => {
  res.json(http_code, json); // show json
});
```

##### Redirect
Framework provides easy way for redirecting queries:
```js
app.addRoute(options, (req, res) => {
  res.redirect("/path/", 301);
});
```

## Layers
Another name for this feature is Middleware. Basically this is a simple way to do something with **req** and **res** objects, e.g. add authorization logic before API callback runs.

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
Will be executed for each request:
```js
app.useLayer((req, res, next) => {
  // do something with "req" and "res" objects and run callback
  next();
});
```
If you want to use few layers, you must send array with functions, instead of one function, e.g.:
```js
// for local layer
app.addRoute(options, [Function, Function, Function], callback);

// for global layer
app.useLayer([Function, Function, Function]);
```

## Tips
Below you can find some advices.

##### Page not found
If some client request doesn't match your routing rules, our framework will shows blank page with 404 http status. Of course for production we need more intelligent solution, so here is example how you can show your custom "not found" page:
```js
app.addRoute({
  "url": "/{url}",
  "match": {
    "url": "(.*)"
  }
}, callback);
```
You see? Just need add new routing rule for processing all requests. This rule must be last one - just in case to overwrite previous, it's very important.

## Testing
Guys, sometimes we implement some new functionality, like uploading files. It works without any packages from other developers, so we need help to test how it works. If you found some error, please open new issue on Github or send email to us. Thanks!

## Contributing
You can help to improve "Active" framework, there is lot of work to do:
- review [pull requests](https://github.com/IgorKirei/active/pulls)
- find new [issue](https://github.com/IgorKirei/active/issues) or fix existing
- add new feature or improve some old
- update documentation
Advice, criticism, help are much appreciated :)


## License

The Active JS framework is open-source software licensed under the [MIT](LICENSE)

[npm-image]: https://img.shields.io/npm/v/active.svg?style=flat
[npm-url]: https://npmjs.org/package/active
[downloads-image]: https://img.shields.io/npm/dm/active.svg?style=flat
[downloads-url]: https://npmjs.org/package/active
[travis-image]: https://img.shields.io/travis/IgorKirei/active.svg?style=flat
[travis-url]: https://travis-ci.org/IgorKirei/active