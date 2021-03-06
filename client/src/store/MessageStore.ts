import { makeAutoObservable, action } from "mobx"
import colorPicker from '../ColorPicker';
import Message, { NO_RESPONSE } from '../common/Message';
import pickIcon from '../PickIcon';
import Util from '../Util';

export default class MessageStore {
    private message: Message = new Message();
    private url = '';
    private _isError = false;
    private visited = false;
    private color = '';
    private iconClass = '';
    private tooltip = '';

    public constructor(message: Message) {
        this.message = message;
        this.url = this.formatUrl(message.url!);
        this._isError = this.isErrorResponse(message);
        this.visited = false;
        this.color = colorPicker(message);
        if (message.requestHeaders['middleman_proxy'] === 'resend') {
            this.iconClass = 'fa-clone';
            this.iconClass += ' resend-icon';
        }
        else {
            this.iconClass = pickIcon(message.protocol);
        }
        this.tooltip = message.method ? 'Click to resend request' : '';
        makeAutoObservable(this);
    }

    public getMessage(): Message {
        return this.message!;
    }

    public getUrl(): string {
        return this.url;
    }

    public isError(): boolean {
        return this._isError;
    }

    public getColor(): string {
        return this.color;
    }

    public getIconClass(): string {
        return this.iconClass;
    }

    public getTooltip(): string {
        return this.tooltip;
    }

    public getVisited(): boolean {
        return this.visited;
    }

    @action public setVisited(value: boolean) {
        this.visited = true;
    }

    public getRequestBody(): string {
        let body = this.message.method!.length > 0 ? this.url + '\n' : '';

        if(this.message.requestBody) {
            let jsonBody = (this.message.requestBody as any);
            if(jsonBody['middleman_inner_body']) {
                body += jsonBody['middleman_inner_body'];
            }
            else {
                body += JSON.stringify(this.message.requestBody, null, 2);
            }
            body = Util.fixNewlines(body);
        }
        return body;
    }

    private formatUrl(urlStr: string): string {
        //var url = urlStr.indexOf('?') !== -1 ? urlStr.split('?')[0] : urlStr;
        let url = unescape(urlStr);
        url = Util.fixNewlines(url);
        return url.split(/\s+/).join(' ');
    }

    private isErrorResponse(message: Message): boolean {
        // Set error class to make text red
        return message.status >= 400
            || Util.isGraphQlError(message)
            || message.responseBody === NO_RESPONSE;
    }
}