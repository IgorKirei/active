![ActiveJS framework](http://s1.oboiki.net/files/images/active_logo.png)
## Features
- **high performance**, our main target is high performance, minimum of hidden unnecessary functionality
- **strict routing**, we like strict routing system, if method should use some certain parameters, it must get it
- **simple use**, if newbie can use our framework without any problem, this is real cool
- **friendly use**, we provide way for connect packages, modules from other developers

## Installation

```bash
$ npm install active
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
    'port': Number, // default 80
    'host': String, // default localhost
    'cluster': Boolean, // default false
});
```
All properties isn't required.

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

You can add middleware layer for all queries, it can be your own solution or package of other developer. Middleware layer is a function with three arguments: "req", "res" and "next", first and second are standard NodeJS objects, third is callback. Middleware will be executed for every request to the application.

You can use any number of layers, but remember about your rom ;)

```js
app.useLayer(function(req, res, next) {
    next();
});
```

## Contributing
"Active" framework is a new project, there is lot of work to do and you can help:
- review [pull requests](https://github.com/IgorKirey/active/pulls)
- find new [issue](https://github.com/IgorKirey/active/issues) or fix exist
- add new feature or improve some old
- update documentation

## License

The Active JS framework is open-source software licensed under the [MIT](LICENSE)