'use strict';
let http = require('http');
let fs = require('fs');
let url = require('url');
let path = require('path');
let request = require('request');
let stream = require('stream');
let argv = require('yargs')
					.argv;
let LEVEL = {
	EME: 0,//{val: 0, name: 'EME'},
	ALE: 1,//{val: 1, name: 'ALE'},
	CRI: 2,//{val: 2, name: 'CRI'},
	ERR: 3,//{val: 3, name: 'ERR'},
	WAR: 4,//{val: 4, name: 'WAR'},
	NOT: 5,//{val: 5, name: 'NOT'},
	INF: 6,//{val: 6, name: 'INF'},
	DBG: 7//{val: 7, name: 'DBG'},
};
let loglevel = argv.loglevel && LEVEL[argv.loglevel] ?  LEVEL[argv.loglevel] : LEVEL['EME'];
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
let log = (level, msg) => {	
	if(level >= loglevel) {
		if(typeof msg === 'string') {
			logStream.write(msg)
		} else if(msg instanceof stream.Stream) {
			msg.pipe(logStream, {end: false});
		}
	}
}
let echoServer = http.createServer((req, res) => {

	log(LEVEL.INF, 'echoServer\n');
	for(let header in req.headers) {
		res.setHeader(header, req.headers[header]);
	}
	log(LEVEL.INF, JSON.stringify(req.headers)+'\n');
	req.pipe(res);	
}).on('error', console.error);
echoServer.listen(8000);
// console.log('Proxy server listening @ 127.0.0.1:8000');

let proxyServer = http.createServer((req, res) => {
	log(LEVEL.INF, 'proxyServer\n');
	// x-destination-url
	log(LEVEL.INF, JSON.stringify(req.headers)+'\n');
	let url = destinationUrl;
	let forwardHeaders = req.headers;
	if(req.headers['x-destination-url']) {
		url = 'http://' + req.headers['x-destination-url'];
		delete forwardHeaders['x-destination-url'];
	}
	log(LEVEL.INF, 'Forward to url: ' + url +'\n');
	let options = {
		headers: req.forwardHeaders,
		url: url + req.url,
		method: req.method
	};
	//req.pipe(request(options)).pipe(res);
	let outboundReq = request(options);
	req.pipe(outboundReq);
	//req.pipe(logStream, {end: false});
	log(LEVEL.INF, req);
	outboundReq.pipe(res);
	//outboundReq.pipe(logStream, {end: false});
	log(LEVEL.INF, outboundReq);
}).on('error', console.error);

proxyServer.listen(9000);
console.log('Proxy server listening @ 127.0.0.1:9000 ' + loglevel); 