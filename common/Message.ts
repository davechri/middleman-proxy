import ProxyConfig from "./ProxyConfig";

export const NO_RESPONSE = 'No Response';

export default class Message  {
	timestamp: number = 0;
	sequenceNumber: number = 0;
	requestHeaders: {[key: string]: string} = {};
	responseHeaders: {[key: string]: string} = {};
	method: string | undefined = '';
	protocol: string = '';
	url: string|undefined = '';
	endpoint: string = '';
	requestBody: string|{[key: string]:any} = '';
	responseBody: {[key: string]:any}|string = '';
	clientIp: string|undefined = '';
	serverHost: string = '';
	path: string = '';
	elapsedTime: number = 0;
	status: number = 0;
	proxyConfig?: ProxyConfig = undefined;
};