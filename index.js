var http = require('http');
var mongo = require('mongodb').MongoClient;
var connectionString = process.env.MONGO || 'mongodb://localhost:27017/shorturl';
var port = process.env.PORT || 3000;

var info = '<html>' +
    '<head>' +
    '<style>' +
    'body { margin-left: 5em; margin-top: 5em;}' +
    'h1, h3 {font-family: sans-serif;}' +
    'code {background-color: #ddd; color: #de1345; padding: 5px; border-radius: 3px;}' +
    '</style>' +
    '</head>' +
    '<body>' +
    '<h1> URL Shortener Microservice</h1>' +
    '<br>' +
    '<h3>To request a new short url, add the url as a parameter to the request</h3>' +
    '<code>https://rs-tiny.herokuapp.com/www.google.com</code>' +
    '<h3>Will output</h3>' +
    '<code>{ "original_url":"http://www.google.com", "short_url":"https://rs-tiny.herokuapp.com/Fe" }</code>' +
    '<h3>Usage</h3>' +
    '<code>https://rs-tiny.herokuapp.com/Fe</code>' +
    '<h3>Will redirect to</h3>' +
    '<code>http://www.google.com</code>' +
    '</body>' +
    '</html>';

var convert = function (num) {
    var base62 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var i = 0;
    var powers = []
    while (Math.pow(64, i) <= num) {
        powers.unshift(Math.pow(64, i));
        i++
    }
    return powers.map(function (n) {
        var res = base62[Math.floor(num / n)];
        num = num % n;
        return res
    }).join('')
}

mongo.connect(connectionString, function (err, db) {
    if (err) throw err;
    console.log('mongo connected on:', connectionString)
    http.createServer(function (req, res) {
        if (req.url === '/') {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(info);
        } else {
            var thisUrl = req.url.replace(/^\//, "")

            if (!/[\.\/]/.test(thisUrl)) {
                db.collection('urls').findOne({ short_url: thisUrl }, { _id: 0 }, function (err, doc) {
                    if (err) throw err;
                    if (!doc) {
                        res.writeHead(404, { 'Content-Type': 'text/plain' })
                        res.end('File Not Found')
                    } else {
                        res.writeHead(301, { Location: doc.original_url })
                        res.end()
                    }
                })
            } else {
                db.collection('urls').findOne({ original_url: thisUrl }, { _id: 0 }, function (err, doc) {
                    if (err) throw err;
                    if (doc) {
                        res.writeHead(200, { 'Content-Type': 'text/plain' });
                        res.end(JSON.stringify(doc))
                    } else {
                        db.collection('urls').count({}, function (err, count) {
                            if (err) throw err
                            db.collection('urls').insert({
                                original_url: thisUrl,
                                short_url: 'https://rs-tiny.herokuapp.com/' + (convert(100 + count))
                            }, function (err, data) {
                                if (err) throw err;
                                db.collection('urls').findOne({ original_url: thisUrl }, { _id: 0 }, function (err, doc) {
                                    if (err) throw err;
                                    res.writeHead(200, { 'Content-Type': 'text/plain' });
                                    res.end(JSON.stringify(doc));
                                })
                            })
                        })
                    }
                })
            }
        }
    }).listen(port)
    console.log('node server listening on port:', port);

})

