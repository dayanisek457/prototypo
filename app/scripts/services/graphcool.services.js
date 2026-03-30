import {ApolloClient, createBatchingNetworkInterface} from 'react-apollo';

const LOCAL_DB_KEY = 'prototypo.local.db.v1';
const LOCAL_UPLOAD_KEY = 'prototypo.local.uploads.v1';
const LOCAL_TOKEN = 'local-dev-token';

function createDefaultDb() {
	const now = new Date().toISOString();
	const defaultVariant = {
		id: 'variant-local-regular',
		name: 'Regular',
		values: {},
		width: 5,
		weight: 400,
		italic: false,
		updatedAt: now,
	};
	const defaultFamily = {
		id: 'family-local-sandbox',
		name: 'Sandbox',
		template: 'venus.ptf',
		tags: [],
		designer: 'Local User',
		designerUrl: '',
		foundry: 'Local',
		foundryUrl: '',
		from: null,
		variants: [defaultVariant],
	};

	return {
		nextId: 1,
		user: {
			id: 'user-local',
			email: 'local@prototypo.app',
			firstName: 'Local',
			lastName: 'User',
			stripe: 'cus_local',
			manager: null,
			academyProgress: {lastCourse: null},
			firstContactMade: true,
			appValues: {},
			library: [defaultFamily],
			favourites: [],
			fontInUses: [],
			hostedDomains: [],
			subUsers: [],
			accessToken: {
				id: 'access-local',
				domains: 'localhost',
				token: 'local-library-token',
			},
		},
		presets: [
			{
				id: 'preset-local-default',
				ownerInitials: 'LC',
				template: 'venus.ptf',
				baseValues: {},
				isPrototypoPreset: true,
				published: true,
				variant: {
					name: 'Regular',
					family: {name: 'Sandbox'},
				},
				abstractedFont: {id: 'abstracted-template-venus'},
			},
		],
		abstractedFonts: [
			{
				id: 'abstracted-template-venus',
				type: 'TEMPLATE',
				template: 'venus.ptf',
				name: 'Venus Template',
			},
		],
	};
}

function loadDb() {
	try {
		const raw = window.localStorage.getItem(LOCAL_DB_KEY);

		if (!raw) {
			const db = createDefaultDb();

			window.localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(db));
			return db;
		}

		const db = JSON.parse(raw);

		if (!db.user || !db.user.library || db.user.library.length === 0) {
			const freshDb = createDefaultDb();

			window.localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(freshDb));
			return freshDb;
		}

		return db;
	} catch (e) {
		const db = createDefaultDb();

		window.localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(db));
		return db;
	}
}

function saveDb(db) {
	window.localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(db));
}

function nextId(db, prefix) {
	const id = `${prefix}-${db.nextId || 1}`;

	db.nextId = (db.nextId || 1) + 1;
	return id;
}

function clone(value) {
	return JSON.parse(JSON.stringify(value));
}

function getLibraryCount(db) {
	return db.user.library.length;
}

function getVariantsCount(db) {
	return db.user.library.reduce(
		(count, family) =>
			count + (family.variants ? family.variants.length : 0),
		0,
	);
}

function findFamily(db, familyId) {
	return db.user.library.find((family) => family.id === familyId);
}

function findVariant(db, variantId) {
	for (let i = 0; i < db.user.library.length; i++) {
		const family = db.user.library[i];
		const variant = (family.variants || []).find((v) => v.id === variantId);

		if (variant) {
			return {family, variant};
		}
	}

	return null;
}

function buildUserPayload(db) {
	return {
		...db.user,
		_libraryMeta: {count: getLibraryCount(db)},
		library: db.user.library.map((family) => ({
			...family,
			_variantsMeta: {count: (family.variants || []).length},
			variantsmeta: {count: (family.variants || []).length},
		})),
		manager: db.user.manager,
	};
}

function mutationDataFromQuery(query) {
	if (query.includes('authenticateEmailUser')) {
		return {auth: {token: LOCAL_TOKEN}};
	}
	if (query.includes('signupEmailUser')) {
		return {
			signupEmailUser: {id: 'user-local'},
			auth: {token: LOCAL_TOKEN},
		};
	}

	return null;
}

function handleOperation(operation) {
	const db = loadDb();
	const query = operation.query || '';
	const variables = operation.variables || {};

	const authMutation = mutationDataFromQuery(query);

	if (authMutation) {
		window.localStorage.setItem('graphcoolToken', LOCAL_TOKEN);
		return {data: authMutation};
	}

	if (query.includes('query setupStripe')) {
		return {data: {user: {id: db.user.id, stripe: db.user.stripe}}};
	}

	if (query.includes('query setup')) {
		return {
			data: {
				user: {
					id: db.user.id,
					email: db.user.email,
					stripe: db.user.stripe,
					manager: db.user.manager,
				},
			},
		};
	}

	if (query.includes('query getVariantsCount')) {
		return {
			data: {
				user: {
					id: db.user.id,
					libraryMeta: {count: getLibraryCount(db)},
				},
			},
		};
	}

	if (query.includes('query getvariantscount')) {
		return {
			data: {
				user: {
					id: db.user.id,
					library: db.user.library.map((family) => ({
						variantsmeta: {
							count: (family.variants || []).length,
						},
					})),
				},
			},
		};
	}

	if (query.includes('query getFamilyValues')) {
		const family = findFamily(db, variables.id);

		return {data: {family: family ? clone(family) : null}};
	}

	if (query.includes('query getFonts')) {
		return {
			data: {
				user: {
					id: db.user.id,
					library: clone(db.user.library),
				},
			},
		};
	}

	if (
		query.includes('allPresets') &&
		query.includes('published: true') &&
		!query.includes('isPrototypoPreset')
	) {
		return {
			data: {
				allPresets: clone(
					db.presets.filter((preset) => preset.published !== false),
				),
			},
		};
	}

	if (
		query.includes('allPresets') &&
		query.includes('isPrototypoPreset: true')
	) {
		return {
			data: {
				allPresets: clone(
					db.presets.filter(
						(preset) => preset.isPrototypoPreset !== false,
					),
				),
			},
		};
	}

	if (query.includes('query getAcademyValues')) {
		return {
			data: {
				user: {
					id: db.user.id,
					academyProgress: db.user.academyProgress,
					manager: db.user.manager,
				},
			},
		};
	}

	if (query.includes('query getUserFonts')) {
		return {
			data: {
				user: {
					id: db.user.id,
					firstContactMade: db.user.firstContactMade,
					library: clone(db.user.library),
				},
			},
		};
	}

	if (query.includes('query getAccessToken')) {
		return {
			data: {
				user: {
					id: db.user.id,
					manager: db.user.manager,
					accessToken: clone(db.user.accessToken),
				},
			},
		};
	}

	if (query.includes('query getLibraryUserInfos')) {
		return {
			data: {
				user: {
					id: db.user.id,
					firstName: db.user.firstName,
					lastName: db.user.lastName,
					fontInUses: clone(db.user.fontInUses),
					favourites: clone(db.user.favourites),
					hostedDomains: clone(db.user.hostedDomains),
				},
			},
		};
	}

	if (query.includes('query getUserId')) {
		return {
			data: {
				user: {
					id: db.user.id,
					values: clone(db.user.appValues || {}),
				},
			},
		};
	}

	if (query.includes('query getUserLibrary')) {
		return {
			data: {
				user: {
					id: db.user.id,
					library: clone(db.user.library),
				},
			},
		};
	}

	if (
		query.includes('query getLibraryUserInfos') ||
		query.includes('query {')
	) {
		return {data: {user: clone(buildUserPayload(db))}};
	}

	if (query.includes('allAbstractedFonts')) {
		const allAbstractedFonts = clone(db.abstractedFonts || []);
		const where = variables.where || {};

		if (where.variant && where.variant.id) {
			return {
				data: {
					allAbstractedFonts: allAbstractedFonts.filter(
						(font) =>
							font.variant &&
							font.variant.id === where.variant.id,
					),
				},
			};
		}
		if (where.preset && where.preset.id) {
			return {
				data: {
					allAbstractedFonts: allAbstractedFonts.filter(
						(font) =>
							font.preset && font.preset.id === where.preset.id,
					),
				},
			};
		}

		return {data: {allAbstractedFonts}};
	}

	if (query.includes('Variant(id: $id)')) {
		const found = findVariant(db, variables.id);

		return {
			data: {
				Variant: found
					? {
							id: found.variant.id,
							values: clone(found.variant.values || {}),
					  }
					: null,
			},
		};
	}

	if (query.includes('mutation updateFontValues')) {
		const found = findVariant(db, variables.id);

		if (found) {
			found.variant.values = clone(variables.values || {});
			found.variant.updatedAt = new Date().toISOString();
			saveDb(db);
		}

		return {data: {updateVariant: {id: variables.id}}};
	}

	if (query.includes('mutation updateAppValues')) {
		db.user.appValues = clone(variables.values || {});
		saveDb(db);
		return {data: {updateUser: {id: db.user.id}}};
	}

	if (query.includes('mutation setFirstContact')) {
		db.user.firstContactMade = true;
		saveDb(db);
		return {data: {updateUser: {id: db.user.id}}};
	}

	if (query.includes('mutation createVariant')) {
		const family = findFamily(db, variables.familyId);

		if (!family) {
			return {data: {variant: null}};
		}

		const variant = {
			id: nextId(db, 'variant-local'),
			name: variables.name,
			values: clone(variables.values || {}),
			width: 5,
			weight: 400,
			italic: false,
			updatedAt: new Date().toISOString(),
		};

		family.variants.push(variant);
		saveDb(db);

		return {
			data: {
				variant: {
					id: variant.id,
					name: variant.name,
					updatedAt: variant.updatedAt,
				},
			},
		};
	}

	if (query.includes('mutation deleteVariant')) {
		let deletedId = variables.id;

		db.user.library.forEach((family) => {
			family.variants = (family.variants || []).filter((variant) => {
				if (variant.id === variables.id) {
					deletedId = variant.id;
					return false;
				}
				return true;
			});
		});

		saveDb(db);
		return {data: {deleteVariant: {id: deletedId}}};
	}

	if (query.includes('mutation createFamily')) {
		const family = {
			id: nextId(db, 'family-local'),
			name: variables.name,
			template: variables.template,
			tags: [],
			designer: '',
			designerUrl: '',
			foundry: 'Prototypo',
			foundryUrl: 'https://prototypo.io/',
			from: null,
			variants: [
				{
					id: nextId(db, 'variant-local'),
					name: 'Regular',
					values: clone(variables.values || {}),
					width: 'normal',
					weight: 400,
					italic: false,
					updatedAt: new Date().toISOString(),
					abstractedFont: null,
				},
			],
		};

		db.user.library.push(family);
		saveDb(db);
		return {data: {createFamily: clone(family)}};
	}

	if (query.includes('mutation deleteFamily')) {
		db.user.library = db.user.library.filter(
			(family) => family.id !== variables.id,
		);
		saveDb(db);
		return {data: {deleteFamily: {id: variables.id}}};
	}

	if (query.includes('mutation updateVariant($id: ID!, $values: Json)')) {
		const found = findVariant(db, variables.id);

		if (found) {
			found.variant.values = clone(variables.values || {});
			found.variant.updatedAt = new Date().toISOString();
			saveDb(db);
			return {
				data: {
					updateVariant: {
						id: found.variant.id,
						values: clone(found.variant.values),
						family: {id: found.family.id},
					},
				},
			};
		}

		return {data: {updateVariant: null}};
	}

	if (query.includes('mutation updateTags')) {
		const family = findFamily(db, variables.id);

		if (family) {
			family.tags = clone(variables.newTags || []);
			saveDb(db);
		}

		return {
			data: {
				updateFamily: {
					id: variables.id,
					tags: clone((family && family.tags) || []),
				},
			},
		};
	}

	if (query.includes('mutation createAbstractedFont')) {
		const id = nextId(db, 'abstracted-local');
		const abstractedFont = {
			id,
			type: variables.type,
			name: variables.name,
			template: variables.template || null,
			preset: variables.presetId ? {id: variables.presetId} : null,
			variant: variables.variantId
				? {
						id: variables.variantId,
						family: {
							id: (
								findVariant(db, variables.variantId) || {
									family: {id: null},
								}
							).family.id,
						},
				  }
				: null,
		};

		db.abstractedFonts = db.abstractedFonts || [];
		db.abstractedFonts.push(abstractedFont);
		saveDb(db);

		return {data: {createAbstractedFont: clone(abstractedFont)}};
	}

	if (query.includes('mutation addFavourite')) {
		const abstractedFont = (db.abstractedFonts || []).find(
			(font) => font.id === variables.abstractedFontID,
		);

		if (abstractedFont) {
			db.user.favourites.push(clone(abstractedFont));
			saveDb(db);
		}

		return {
			data: {
				addToUserOnAbstractedFont: {
					favouritesAbstractedFont: clone(abstractedFont),
				},
			},
		};
	}

	if (query.includes('mutation deleteFavourite')) {
		db.user.favourites = db.user.favourites.filter(
			(font) => font.id !== variables.abstractedFontID,
		);
		saveDb(db);

		return {
			data: {
				removeFromUserOnAbstractedFont: {
					favouritesAbstractedFont: {id: variables.abstractedFontID},
				},
			},
		};
	}

	if (query.includes('mutation createTokenForUser')) {
		db.user.accessToken = {
			id: nextId(db, 'access-local'),
			domains: variables.domainNames,
			token: `local-token-${db.nextId}`,
		};
		saveDb(db);
		return {data: {createAccessToken: clone(db.user.accessToken)}};
	}

	if (query.includes('mutation addAccessToken')) {
		db.user.accessToken = {
			...(db.user.accessToken || {
				id: variables.id,
				token: `local-token-${db.nextId}`,
			}),
			domains: variables.domainNames,
		};
		saveDb(db);
		return {data: {updateAccessToken: clone(db.user.accessToken)}};
	}

	return {data: {}};
}

const networkInterface = createBatchingNetworkInterface({
	uri: 'http://localhost/local-graphql',
	batchInterval: 10,
	batchFetchFunction: async (url, opts = {}) => {
		const body = opts.body ? JSON.parse(opts.body) : [];
		const operations = Array.isArray(body) ? body : [body];
		const payload = operations.map(handleOperation);
		const result = Array.isArray(body) ? payload : payload[0];

		return new Response(JSON.stringify(result), {
			status: 200,
			headers: {'Content-Type': 'application/json'},
		});
	},
});

networkInterface.use([
	{
		applyBatchMiddleware(req, next) {
			if (!req.options.headers) {
				req.options.headers = {};
			}

			if (!window.localStorage.getItem('graphcoolToken')) {
				window.localStorage.setItem('graphcoolToken', LOCAL_TOKEN);
			}

			req.options.headers.authorization = `Bearer ${window.localStorage.getItem(
				'graphcoolToken',
			)}`;
			next();
		},
	},
]);

const apolloClient = new ApolloClient({
	networkInterface,
	dataIdFromObject: (o) => o.id,
	connectToDevTools: true,
});

export const tmpUpload = async (file, name = 'font') => {
	const uploads = JSON.parse(
		window.localStorage.getItem(LOCAL_UPLOAD_KEY) || '[]',
	);
	const url = URL.createObjectURL(file);
	const upload = {
		id: `upload-${Date.now()}`,
		name,
		url,
	};

	uploads.push({id: upload.id, name});
	window.localStorage.setItem(LOCAL_UPLOAD_KEY, JSON.stringify(uploads));

	return upload;
};

export default apolloClient;
