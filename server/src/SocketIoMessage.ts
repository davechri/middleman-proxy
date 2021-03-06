const decompressResponse = require('decompress-response');
import Message from '../../common/Message';
import { IncomingHttpHeaders, IncomingMessage } from 'http';
import dns from 'dns';
import querystring from 'querystring';

export default class SocketMessage {
	/**
	 * Parse request data
	 */
	static async parseRequest(client_req: IncomingMessage, startTime: number, sequenceNumber: number, host: string, path: string)
		: Promise<Message>
	{

		return new Promise(async function(resolve) {

			client_req.setEncoding('utf8');
			var rawData = '';
			client_req.on('data', function(chunk) {
				rawData += chunk;
			});

			var requestBody: string|{};
			client_req.on('end', async function() {

				try {
					requestBody = JSON.parse(rawData)
				} catch (e) {
					const contentType = client_req.headers['content-type'];
					if (contentType && contentType.indexOf('application/x-www-form-urlencoded') !== -1) {
						requestBody = querystring.parse(rawData);
					} else {
						requestBody = rawData;
					}
				}

				var endpoint = client_req.url?.split('?')[0];
				var tokens = endpoint?.split('/');
				endpoint = tokens ? tokens[tokens.length - 1] : '';
				if (!isNaN(+endpoint) && tokens && tokens.length > 1) {
					endpoint = tokens[tokens.length - 2] + '/' + tokens[tokens.length - 1];
				}

				if(client_req.url?.endsWith('/graphql')) {
					endpoint = '';
					if(requestBody && Array.isArray(requestBody)) {
						requestBody.forEach((entry) => {
							if(entry.operationName) {
								if(endpoint && endpoint.length > 0) endpoint += ', '
								endpoint += entry.operationName;
							}
						})
						if (endpoint.length > 0) {
							endpoint = 'GQL ' + endpoint;
						}
					}
				}
				if('/'+endpoint === client_req.url) endpoint = '';

				let message = await buildRequest(Date.now(),
											sequenceNumber,
											client_req.headers,
											client_req.method,
											client_req.url,
											endpoint,
											requestBody,
											client_req.socket.remoteAddress,
											host, // server host
											path,
											Date.now() - startTime);

				resolve(message);
			});

		});
	}

	static buildRequest(timestamp: number, sequenceNumber: number, requestHeaders: IncomingHttpHeaders, method: string, url: string, endpoint: string, requestBody:string|{}, clientIp: string, serverHost: string, path:string, elapsedTime:number)
		: Promise<Message>
	{
		return buildRequest(timestamp, sequenceNumber, requestHeaders, method, url, endpoint, requestBody, clientIp, serverHost, path, elapsedTime);
	}

	/**
	 * Parse response
	 */
	static parseResponse(proxyRes: any, startTime: number, message: Message): Promise<Message> {

		return new Promise((resolve) => {

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
			proxyRes.on('data', function(chunk: string) {
				rawData += chunk;
			});
			proxyRes.on('end', () => {
				var parsedData;
				try {
					parsedData = JSON.parse(rawData); // assume JSON
				}
				catch(e) {
					parsedData = rawData;
				}

				this.appendResponse(message, proxyRes.headers, parsedData, proxyRes.statusCode, Date.now() - startTime);

				resolve(message);
			});
		});
	}

	static appendResponse(message: Message, responseHeaders: {}, responseBody:{}|string, status:number, elapsedTime:number) {
		appendResponse(message, responseHeaders, responseBody, status, elapsedTime);
	}

};

async function buildRequest(timestamp:number, sequenceNumber:number, requestHeaders:{}, method:string|undefined, url:string|undefined, endpoint:string, requestBody:{}|string, clientIp:string|undefined, serverHost:string, path:string, elapsedTime:number)
	: Promise<Message>
{
	return new Promise<Message>((resolve) => {
		if (clientIp) {
			try {
				clientIp = clientIp.replace('::ffff:', '');
				dns.reverse(clientIp, (err, hosts) => {
					if (err === null && hosts.length > 0) {
						clientIp = hosts[0];
						const host = clientIp.split('.')[0]; // un-qualify host name
						if (isNaN(+host)) {
							clientIp = host;
						}
					}
					resolve(initMessage());
				});
			} catch (e) {
				resolve(initMessage());
			}
		} else {
			clientIp = 'unknown';
			resolve(initMessage());
		}
	});

	function initMessage() {
		var message = {
			timestamp,
			sequenceNumber,
			requestHeaders,
			method,
			protocol: 'http:',
			url,
			endpoint,
			requestBody,
			clientIp,
			serverHost,
			path,
			elapsedTime,
			responseHeaders: {},
			responseBody: {},
			status: 0,
		};
		return message;
	}
}

function appendResponse(message: Message, responseHeaders: {}, responseBody: {}, status:number, elapsedTime:number) {
	message.responseHeaders = responseHeaders;
	message.responseBody = responseBody;
	message.status = status;
	message.elapsedTime = elapsedTime;
	return message;
}