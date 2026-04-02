/* global trackJs */
import {gql} from 'react-apollo';

import apolloClient from './graphcool.services';

function values(prefix) {
	return {
		get(params) {
			if (prefix === 'newfont' || params.variantId) {
				return apolloClient
					.query({
						fetchPolicy: 'network-only',
						query: gql`
							query getValues($id: ID!) {
								Variant(id: $id) {
									id
									values
								}
							}
						`,
						variables: {id: params.variantId},
					})
					.then(({data}) =>
						data && data.Variant
							? data.Variant
							: {id: params.variantId, values: {}},
					)
					.catch((e) => {
						trackJs.track(e);
						return {id: params.variantId, values: {}};
					});
			}
			if (prefix === 'newapp') {
				return apolloClient
					.query({
						fetchPolicy: 'cache-first',
						query: gql`
							query getUserId {
								user {
									id
									values: appValues
								}
							}
						`,
					})
					.then(({data}) => (data && data.user ? data.user : {id: 'user-local', values: {}}))
					.catch(e => trackJs.track(e));
			}

			return undefined;
		},
		save(params) {
			if (prefix === 'newfont' && params.variantId) {
				apolloClient
					.mutate({
						mutation: gql`
							mutation updateFontValues($id: ID!, $values: Json!) {
								updateVariant(id: $id, values: $values) {
									id
								}
							}
						`,
						variables: {
							id: params.variantId,
							values: params.values,
						},
					})
					.catch(e => trackJs.track(e));
			}
			if (prefix === 'newapp') {
				apolloClient
					.query({
						fetchPolicy: 'cache-first',
						query: gql`
							query getUserId {
								user {
									id
								}
							}
						`,
					})
					.then(({data}) => {
						const user = data && data.user;

						if (!user || !user.id) {
							return;
						}

						apolloClient
							.mutate({
								mutation: gql`
									mutation updateAppValues($id: ID!, $values: Json!) {
										updateUser(id: $id, appValues: $values) {
											id
										}
									}
								`,
								variables: {
									id: user.id,
									values: JSON.parse(JSON.stringify(params.values)),
								},
							})
							.catch(e => trackJs.track(e));
					});
			}
			// if (location.hash.indexOf('#/replay') === -1 && HoodieApi.isLoggedIn()) {
			// 	return HoodieApi.instance.store.updateOrAdd(`${prefix}values`, `${params.typeface}`, {
			// 		values: params.values,
			// 	});
			// }
			return true;
		},
		deleteDb() {
			// console.log('deleteDb values', prefix, params);
			// return HoodieApi.instance.store.remove(`${prefix}values`, `${params.typeface}`);
		},
	};
}

export const AppValues = values('newapp');
export const FontValues = values('newfont');
