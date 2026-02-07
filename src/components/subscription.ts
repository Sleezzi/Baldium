import { v4 as uuid } from "uuid";

const subscriptions = new Map<string, {
	username: string,
	channel: string,
	timeout: NodeJS.Timeout,
	callback: (args: any) => void | Promise<void>,
	unsubscribed?: () => void | Promise<void>
}>();

export function Subscribe(username: string, channel: string, expire: number, callback: (args: any) => void | Promise<void>, unsubscribed?: () => void | Promise<void>): string {
	try {
		for (const [id, subscription] of subscriptions.entries()) { // Check if the user has already subscribed to the channel
			if (subscription.channel !== channel) continue;
			if (subscription.username !== username) continue;
			Unsubscribe(id); // Unsubscribe the user if they are already subscribed
		}
		const id = uuid(); // Generates a unique ID for each user subscription
		const timeout = setTimeout(() => Unsubscribe(id), expire); // Cancel subscription after a delay
		subscriptions.set(id, {
			username,
			channel,
			timeout,
			callback,
			unsubscribed
		});
		return id;
	} catch (err) {
		console.error(err);
		return "";
	}
}

export function Trigger(channel: string, args: any): void {
	try {
		for (const [id, subscription] of subscriptions.entries()) {
			if (subscription.channel !== channel) continue;
			subscription.callback(args);
		}
	} catch (err) {
		console.error(err);
	}
}

export function Unsubscribe(id: string): void {
	try {
		const exist = subscriptions.has(id);
		if (!exist) return;
		const subscription = subscriptions.get(id)!;
		clearInterval(subscription.timeout);
		if (subscription.unsubscribed) {
			subscription.unsubscribed();
		}
		subscriptions.delete(id);
	} catch (err) {
		console.error(err);
	}
}
export function UnsubscribeClient(username: string): void {
	try {
		for (const [id, subscription] of subscriptions.entries()) {
			if (subscription.username !== username) continue;
			clearInterval(subscription.timeout);
			subscriptions.delete(id);
		}
	} catch (err) {
		console.error(err);
	}
}

export default subscriptions;