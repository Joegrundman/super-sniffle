var http = require('http');
var mongo = require('mongodb').MongoClient;
var connectionString = 'mongodb://localhost:27017/shorturl';
var port = process.env.PORT || 3000;

var info = 'There will be an introduction to the purpose of the site';

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
    console.log('mongo connected on:', connectionString);

    http.createServer(function (req, res) {
        if (req.url === '/') {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end(info);
        } else {
            var thisUrl = req.url.replace(/^\//, "")

            if (!/[\.\/]/.test(thisUrl)) {
                db.collection('urls').findOne({ short_url: thisUrl }, { _id: 0 }, function (err, doc) {
                    if (err) throw err;
                    res.writeHead(301, {Location: doc.original_url})
                    res.end()
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
                                short_url: convert(1000 + count)
                            }, function (err, data) {
                                if (err) throw err;
                                db.collection('urls').findOne({ original_url: thisUrl }, { _id: 0 }, function(err, doc) {
                                    if(err) throw err;
                                    res.writeHead(200, { 'Content-Type': 'text/plain' });
                                    res.end(JSON.stringify(JSON.stringify(doc)));                                    
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

