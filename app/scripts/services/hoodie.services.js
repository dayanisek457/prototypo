/* global trackJs, _ */
import queryString from 'query-string';

import LocalClient from '../stores/local-client.stores';

const MOCK_TOKEN = 'local-dev-token';
const MOCK_USER = {
	id: 'user-local',
	email: 'local@prototypo.app',
	stripe: 'cus_local',
	manager: null,
};

export const TWITTER_REQUEST_TOKEN_URL = 'http://localhost/twitter/requestToken';

let localClient;

window.addEventListener('fluxServer.setup', async () => {
	localClient = LocalClient.instance();
});

async function fetchAWS(endpoint, params = {}) {
	const {payload = {}} = params;
	const customerId = HoodieApi.instance.customerId || 'cus_local';
	const subscriptionId = HoodieApi.instance.subscriptionId || 'sub_local';

	if (endpoint.includes('/credits')) {
		return {amount: payload.amount || 0, customer: customerId};
	}

	if (endpoint.includes('/invoices/upcoming')) {
		return {id: 'invoice_upcoming_local', amount_due: 0};
	}
	if (endpoint.includes('/invoices')) {
		return {data: []};
	}
	if (endpoint.includes('/subscriptions')) {
		return {id: subscriptionId, customer: customerId, status: 'active'};
	}
	if (endpoint.includes('/coupons/')) {
		return {valid: true, amount_off: 0};
	}
	if (endpoint.includes('/customers/')) {
		return {
			id: customerId,
			subscriptions: {data: [{id: subscriptionId}]},
			credits: 9999,
		};
	}
	if (endpoint.includes('/reset_password')) {
		return {ok: true};
	}
	if (endpoint.includes('/password')) {
		return {ok: true};
	}
	if (endpoint.includes('/children')) {
		return {ok: true, id: 'child-local'};
	}
	if (endpoint.includes('/manager')) {
		return {ok: true};
	}

	return {ok: true};
}

export default class HoodieApi {
	static async setup() {
		HoodieApi.instance = {};
		window.localStorage.setItem('graphcoolToken', MOCK_TOKEN);

		trackJs.addMetadata('username', MOCK_USER.email);
		return setupStripe(setupHoodie(MOCK_USER));
	}

	static async createGraphCoolUser(
		email,
		password,
		firstName = 'there',
		lastName,
	) {
		window.localStorage.setItem('graphcoolToken', MOCK_TOKEN);
	}

	static async login(user, password) {
		window.localStorage.setItem('graphcoolToken', MOCK_TOKEN);

		return HoodieApi.setup();
	}

	static async logout() {
		window.localStorage.removeItem('graphcoolToken');
		apolloClient.resetStore();
	}

	static async signUp(
		email,
		password,
		firstName,
		{lastName, occupation, phone, skype},
	) {
		window.localStorage.setItem('graphcoolToken', MOCK_TOKEN);
		return Promise.resolve();
	}

	static isLoggedIn() {
		return true;
	}

	static async askPasswordReset(email) {
		return fetchAWS(`/users/${email}/reset_password`, {
			method: 'PUT',
		});
	}

	static checkResetToken(id, resetToken) {
		return fetchAWS(`/users/${id}/reset_password?resetToken=${resetToken}`);
	}

	static resetPassword(email, resetToken, password) {
		return fetchAWS(`/users/${email}/password`, {
			method: 'PUT',
			payload: {
				resetToken,
				password,
			},
		});
	}

	static updateCustomer(options) {
		const customerId = HoodieApi.instance.customerId;

		return fetchAWS(`/customers/${customerId}`, {
			method: 'PUT',
			payload: options,
		});
	}

	static validateCoupon({coupon, plan}) {
		return fetchAWS(`/coupons/${coupon}?plan=${plan}`);
	}

	static updateSubscription(options) {
		const {subscriptionId} = HoodieApi.instance;

		if (!subscriptionId) {
			const customer = HoodieApi.instance.customerId;

			return fetchAWS('/subscriptions', {
				method: 'POST',
				payload: {customer, ...options},
			});
		}

		return fetchAWS(`/subscriptions/${subscriptionId}`, {
			method: 'PUT',
			payload: options,
		});
	}

	static getCustomerInfo(options) {
		const customerId = HoodieApi.instance.customerId;

		return fetchAWS(`/customers/${customerId}`, {
			payload: options,
		});
	}

	static getUpcomingInvoice(options) {
		const query = queryString.stringify({
			...options,
			subscriptionId: HoodieApi.instance.subscriptionId,
			customer: HoodieApi.instance.customerId,
		});

		return fetchAWS(`/invoices/upcoming?${query}`);
	}

	static spendCredits(options) {
		const customerId = HoodieApi.instance.customerId;

		return fetchAWS(`/customers/${customerId}/credits`, {
			method: 'DELETE',
			payload: options,
		});
	}

	static getInvoiceList() {
		const customerId = HoodieApi.instance.customerId;

		return fetchAWS(`/customers/${customerId}/invoices`);
	}

	static addManagedUser(userId, infos) {
		return fetchAWS(`/users/${userId}/children`, {
			method: 'POST',
			payload: infos,
		});
	}

	// TODO: replace this with permissions rules on graph.cool
	static removeManagedUser(userId, id) {
		return fetchAWS(`/users/${userId}/children/${id}`, {
			method: 'DELETE',
		});
	}

	// TODO: replace this lambda with permissions rules on graph.cool
	static acceptManager(userId, managerId) {
		return fetchAWS(`/users/${userId}/manager/${managerId}`, {
			method: 'PUT',
		});
	}

	// Can be used to remove the manager or decline invite
	// since it's not possible to have invite if we are already managed
	// TODO: replace this lambda with permissions rules on graph.cool
	static removeManager(userId) {
		return fetchAWS(`/users/${userId}/manager`, {
			method: 'DELETE',
		});
	}
}

function setupHoodie(data) {
	HoodieApi.instance.email = data.email;

	if (typeof window.Intercom === 'function') {
		window.Intercom('boot', {
			app_id: 'local-dev',
			email: HoodieApi.instance.email,
			widget: {
				activator: '#intercom-button',
			},
		});
	}

	window.ga('set', 'userId', HoodieApi.instance.email);
	return data;
}

async function setupStripe(data) {
	if (data.stripe) {
		HoodieApi.instance.customerId = data.stripe;
		HoodieApi.instance.subscriptionId = 'sub_local';

		try {
			const customer = await HoodieApi.getCustomerInfo();
			const [subscription] = customer.subscriptions.data;

			if (subscription) {
				HoodieApi.instance.subscriptionId = subscription.id;
			}

			localClient.dispatchAction('/load-customer-data', customer);

			return;
		}
		catch (e) {
			/* don't need to catch anything, just next step */
		}
	}
}
