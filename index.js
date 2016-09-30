'use strict';
let http = require('http');
let fs = require('fs');
let url = require('url');
let path = require('path');
let request = require('request');
let argv = require('yargs')
					.argv;

let logPath = argv.logfile && path.join(__dirname, argv.logfile);
let logStream = logPath ? fs.createWriteStream(logPath): process.stdout;
let localhost = '127.0.0.1';  
let scheme = 'http://';
let host = argv.host || localhost
let port = argv.port || (host===localhost?8000:80)
let destinationUrl = argv.url || url.format({
					protocol: 'http',
					host,
					//port 	<< why this not work \/
					}) +':'+ port; 					//	| Have to do this

console.log(process.argv);
console.log(argv);

// process.stdin process.stdout

let echoServer = http.createServer((req, res) => {

	logStream.write('echoServer\n');
	for(let header in req.headers) {
		res.setHeader(header, req.headers[header]);
	}
	logStream.write(JSON.stringify(req.headers)+'\n');
	req.pipe(res);	
}).on('error', console.error);
echoServer.listen(8000);
// console.log('Proxy server listening @ 127.0.0.1:8000');

let proxyServer = http.createServer((req, res) => {
	logStream.write('proxyServer\n');
	// x-destination-url
	logStream.write(JSON.stringify(req.headers)+'\n');
	let url = destinationUrl;
	let forwardHeaders = req.headers;
	if(req.headers['x-destination-url']) {
		url = 'http://' + req.headers['x-destination-url'];
		delete forwardHeaders['x-destination-url'];
	}
	logStream.write('Forward to url: ' + url +'\n');
	let options = {
		headers: req.forwardHeaders,
		url: url + req.url,
		method: req.method
	};
	req.pipe(request(options)).pipe(res);
}).on('error', console.error);

proxyServer.listen(9000);
console.log('Proxy server listening @ 127.0.0.1:9000');