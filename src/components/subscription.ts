import { v4 as uuid } from "uuid";

const subscriptions = new Map<string, {
	userId: number,
	channel: string,
	timeout: NodeJS.Timeout,
	callback: (args: any) => void | Promise<void>,
	unsubscribed?: () => void | Promise<void>
}>();

export function Subscribe(userId: number, channel: string, expire: number, callback: (args: any) => void | Promise<void>, unsubscribed?: () => void | Promise<void>) {
	try {
		for (const [id, subscription] of subscriptions.entries()) { // Check if the user has already subscribed to the channel
			if (subscription.channel !== channel) continue;
			if (subscription.userId !== userId) continue;
			Unsubscribe(id); // Unsubscribe the user if they are already subscribed
		}
		const id = uuid(); // Generates a unique ID for each user subscription
		const timeout = setTimeout(() => Unsubscribe(id), expire); // Cancel subscription after a delay
		subscriptions.set(id, {
			userId,
			channel,
			timeout,
			callback,
			unsubscribed
		});
		return id;
	} catch (err) {
		console.error(err);
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
export function UnsubscribeClient(userId: number): void {
	try {
		for (const [id, subscription] of subscriptions.entries()) {
			if (subscription.userId !== userId) continue;
			clearInterval(subscription.timeout);
			subscriptions.delete(id);
		}
	} catch (err) {
		console.error(err);
	}
}

export default subscriptions;