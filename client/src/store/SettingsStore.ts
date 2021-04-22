import { makeAutoObservable, action } from "mobx";
import ProxyConfig from '../common/ProxyConfig';
import { messageQueueStore } from './MessageQueueStore';
import ProxyConfigLocalStorage from './ProxyConfigLocalStorage';

const PROTOCOLS = [
	'http:',
	'https:',
	'grpc:',
	'mongo:',
	'log:',
	'proxy:',
	'sql:',
	'redis:',
	'other:',
];

export default class SettingsStore {
	private changed = false;
	private protocol = 'http:';
	private path = '';
	private targetHost = 'localhost';
	private targetPort = '';

	private entries = ProxyConfigLocalStorage.getProxyConfigs();
	private messageQueueLimit = messageQueueStore.getLimit();
	private error = '';

	public constructor() {
		makeAutoObservable(this);
	}

	@action public reset() {
		this.changed = false;
		this.protocol = 'http:';
		this.path = '';
		this.targetHost = 'localhost';
		this.targetPort = '';
		this.messageQueueLimit = messageQueueStore.getLimit();
		this.entries = ProxyConfigLocalStorage.getProxyConfigs();
		this.error = '';
	}

	public isChanged() {
		return this.changed;
	}

	public getProtocols() {
		return PROTOCOLS;
	}

	public getProtocol() {
		return this.protocol;
	}

	@action public setProtocol(protocol: string) {
		this.protocol = protocol;
		this.error = '';
	}

	public isProxyOrLog() {
		return this.protocol === 'proxy:' || this.protocol === 'log:';
	}

	public getPath() {
		return this.path;
	}

	@action public setPath(path: string) {
		this.path = path;
		this.error = '';
	}

	public getTargetHost() {
		return this.targetHost;
	}

	@action public setTargetHost(host: string) {
		this.targetHost = host;
		this.error = '';
	}

	public getTargetPort() {
		return this.targetPort;
	}

	@action public setTargetPort(port: string) {
		this.targetPort = port;
		this.error = '';
	}

	public isAddDisabled(): boolean {
		if (this.isProxyOrLog()) {
			return this.path.length === 0;
		} else {
			return this.path.length === 0 || this.targetHost.length === 0 || this.targetPort.length === 0;
		}
	}

	@action public addEntry(): void {
		if (this.protocol === 'http:' || this.protocol === 'https:' || this.protocol === 'proxy:') {
			// if (!this.path.startsWith('/')) {
			// 	this.error = `When protocol "${this.protocol}" is selected the path must begin with "/"`;
			// }
		} else if (this.protocol === 'log:') {
		} else {
			if (isNaN(+this.path)) {
				this.error = `'When protocol "${this.protocol}" is selected port number must be specified`;
			}
		}

		if (this.error.length === 0 && this.protocol !== 'proxy:' && this.protocol !== 'log:') {
			if (isNaN(+this.targetPort)) {
				this.error = `Invalid target port number`;
			}
		}

		if (this.error.length === 0) {
			const proxyConfig = new ProxyConfig();
			proxyConfig.protocol = this.protocol;
			proxyConfig.path = this.path;
			proxyConfig.hostname = this.targetHost;
			proxyConfig.port = +this.targetPort;
			this.entries.push(proxyConfig);

			this.path = '';
			this.targetHost = 'localhost';
			this.targetPort = '';
			this.changed = true;
		}
	}

	@action public deleteEntry(index: number) {
		this.entries.splice(index, 1);
		this.changed = true;
	}

	@action public updateEntryProtocol(index: number, value: string) {
		const entry = { ...this.entries[index] };
		entry.protocol = value;
		this.entries.splice(index, 1, entry);
		this.changed = true;
	}

	@action public updateEntryPath(index: number, value: string) {
		const entry = { ...this.entries[index] };
		entry.path = value;
		this.entries.splice(index, 1, entry);
		this.changed = true;
	}

	@action public updateEntryHost(index: number, value: string) {
		const entry = { ...this.entries[index] };
		entry.hostname = value;
		this.entries.splice(index, 1, entry);
		this.changed = true;
	}

	@action public updateEntryPort(index: number, value: string) {
		if (isNaN(+this.targetPort)) {
			this.error = `Invalid port number: ${this.targetPort}`;
		} else {
			const entry = { ...this.entries[index] };
			entry.port = +value;
			this.entries.splice(index, 1, entry);
			this.changed = true;
		}
	}

	@action public toggleEntryCapture(index: number) {
		const entry = { ...this.entries[index] };
		entry.recording = !entry.recording;
		this.entries.splice(index, 1, entry);
		this.changed = true;
	}

	public getEntries(): ProxyConfig[] {
		return this.entries;
	}

	public getMessageQueueLimit() {
		return this.messageQueueLimit;
	}

	@action setMessageQueueLimit(messageQueueLimit: number) {
		this.messageQueueLimit = messageQueueLimit;
		this.changed = true;
	}

	public getError(): string {
		return this.error;
	}

	@action public save() {
		this.changed = false;
		ProxyConfigLocalStorage.setProxyConfigs(this.entries);
		messageQueueStore.setLimit(this.messageQueueLimit);
		ProxyConfigLocalStorage.load();
	}
}

export const settingsStore = new SettingsStore();