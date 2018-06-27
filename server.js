const express = require('express');
const server = express();

server.use(express.static('public'));
server.get('/', (req, res) => res.send('Hello World!'));

server.listen(8080, () => console.log('Example app listening on port 3000!'));

/*
var http = require('http');
var url = require('url');
var fs = require('fs');

http.createServer(function(req, res) {
    var q = url.parse(req.url, true);
    var filename = "." + q.pathname;
    fs.readFile(filename, function(err, data) {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            return res.end("404 Not Found");
        }
        res.write(data);
        return res.end();
    });
}).listen(8080);
*/