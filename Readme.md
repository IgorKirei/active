## Installation

```bash
$ npm install active
```

## Quick start

```js
var active = require('active');
var app = active();

app.addRoute({
    'url': '/'
}, function(req, res) {
    res.statusCode = 200;
    res.end(content);
});

app.startServer({
    'port': 80,
    'host': 'localhost',
    'cluster': true
});
```

## Routing

Examples of application routes.

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
    res.html(http_code, content);
});
```

## License

The Active JS framework is open-source software licensed under the [MIT](LICENSE)