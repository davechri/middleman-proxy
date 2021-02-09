const decompressResponse = require('decompress-response');

module.exports = {
		
	/**
	 * Parse request data
	 */
	parseRequest : function(client_req, startTime, sequenceNumber, host, path) {	
		
		return new Promise(function(resolve, reject) {
			
			client_req.setEncoding('utf8');
			var rawData = '';
			client_req.on('data', function(chunk) {
				rawData += chunk;
			});
			
			var requestBody;
			client_req.on('end', function() {
				
				try {
					requestBody = JSON.parse(rawData)
				} catch (e) {
					//console.error(e.message);
				}

				var endpoint = client_req.url.split('?')[0];
				var tokens = endpoint.split('/');
				endpoint = tokens[tokens.length-1];	
									
				if(client_req.url === '/graphql') {
					endpoint = '';
					if(requestBody && Array.isArray(requestBody)) {					
						requestBody.forEach((entry) => {						
							if(entry.operationName) {
								if(endpoint.length > 0) endpoint += ', '					
								endpoint += entry.operationName;
							}							
						})
					}
				}
				if('/'+endpoint === client_req.url) endpoint = '';					
				
				let message = buildRequest(sequenceNumber,											
											client_req.headers, 
											client_req.method,
											client_req.url,
											endpoint, 
											requestBody, 
											client_req.connection.remoteAddress,
											host, // server host
											path, 
											Date.now() - startTime);	
				
				resolve(message);
			});						
			
		});
	},

	buildRequest : function(sequenceNumber, requestHeaders, method, url, endpoint, requestBody, clientIp, serverHost, path, elapsedTime) {
		return buildRequest(sequenceNumber, requestHeaders, method, url, endpoint, requestBody, clientIp, serverHost, path, elapsedTime);
	},
	
	/**
	 * Parse response
	 */
	parseResponse : function(proxyRes, startTime, message) {	
		
		return new Promise(function(resolve, reject) {
			
			if(proxyRes.headers) {
				if(proxyRes.headers['content-encoding']) {
					proxyRes = decompressResponse(proxyRes);
					//delete proxyRes.headers['content-encoding'];
				}
				
				if(proxyRes.headers['content-type'] && 
						proxyRes.headers['content-type'].indexOf('utf-8') != -1) {
					proxyRes.setEncoding('utf8');
				}
			}
			
			var rawData = '';
			proxyRes.on('data', function(chunk) {
				rawData += chunk;
			});
			proxyRes.on('end', function() {	
				var parsedData;
				try {
					parsedData = JSON.parse(rawData); // assume JSON					
				}
				catch(e) {
					//console.log('JSON.parse exception');
					parsedData = rawData;
				}							
				
				appendResponse(message, proxyRes.headers, parsedData, proxyRes.statusCode, Date.now() - startTime);
								
				resolve(message);
			});	
		});						
	},

	appendResponse(message, responseHeaders, responseBody, status, elapsedTime) {
		appendResponse(message, responseHeaders, responseBody, status, elapsedTime);
	},

};

function buildRequest(sequenceNumber, requestHeaders, method, url, endpoint, requestBody, clientIp, serverHost, path, elapsedTime) {
	var message = {
		timestamp: Date.now(),
		sequenceNumber,		
		requestHeaders,
		method,
		url,
		endpoint,
		requestBody,
		clientIp,
		serverHost,
		path, 
		elapsedTime
	};	
	
	return message;
}

function appendResponse(message, responseHeaders, responseBody, status, elapsedTime) {
	message.responseHeaders = responseHeaders;
	message.responseBody = responseBody;
	message.status = status;
	message.elapsedTime = elapsedTime;
	return message;
}