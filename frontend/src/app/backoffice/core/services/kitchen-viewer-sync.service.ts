
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface KitchenViewerReloadMessage {
    type: 'KITCHEN_CONFIGURATION_RELOAD';
    configurationName: string;
    requestedAt: string;
}

@Injectable({
    providedIn: 'root'
})
export class KitchenViewerSyncService {

    private readonly channelName = 'laprizza-kitchen-viewer';

    requestReload(configurationName: string): void {
        if (typeof BroadcastChannel === 'undefined') {
            return;
        }

        const channel = new BroadcastChannel(this.channelName);

        const message: KitchenViewerReloadMessage = {
            type: 'KITCHEN_CONFIGURATION_RELOAD',
            configurationName,
            requestedAt: new Date().toISOString()
        };

        channel.postMessage(message);
        channel.close();
    }

    listen(): Observable<KitchenViewerReloadMessage> {
        return new Observable(observer => {

            if (typeof BroadcastChannel === 'undefined') {
                observer.complete();
                return;
            }

            const channel = new BroadcastChannel(this.channelName);

            channel.onmessage = (event: MessageEvent) => {
                const message = event.data;

                if (
                    message?.type === 'KITCHEN_CONFIGURATION_RELOAD' &&
                    typeof message.configurationName === 'string'
                ) {
                    observer.next(message);
                }
            };

            channel.onmessageerror = () => {
                observer.error(
                    new Error('Unable to read kitchen viewer notification.')
                );
            };

            return () => {
                channel.close();
            };
        });
    }
}
