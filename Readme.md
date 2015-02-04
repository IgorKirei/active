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
    res.html(200, 'HTML code of main');
});

app.addRoute({
    'url': '/{category}',
    'match': {
        'category': ['phones', 'stuff']
    }
}, function(req, res) {
    res.html(200, 'HTML code of category');
});

app.addRoute({
    'url': '/{category}/{item}',
    'match': {
        'category': ['phones', 'stuff'],
        'item': '([a-z0-9-]{2,63}\.[a-z]{4})'
    }
}, function(req, res) {
    res.html(200, 'HTML code of special item');
});

app.startServer({
    'port': 80,
    'host': 'localhost',
    'cluster': true
});
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

## License

  [MIT](LICENSE)