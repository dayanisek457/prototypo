import React from 'react';
import {graphql, gql, compose} from 'react-apollo';
import {withRouter} from 'react-router';
import pleaseWait from 'please-wait';
import Lifespan from 'lifespan';
import classNames from 'classnames';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';

import LocalClient from '../stores/local-client.stores.jsx';

import Topbar from './topbar/topbar.components.jsx';
import Toolbar from './toolbar/toolbar.components.jsx';
import Workboard from './workboard.components.jsx';
import ExportAs from './export-as.components.jsx';
import HostVariantModal from './familyVariant/host-variant-modal.components';
import CreateVariantModal from './familyVariant/create-variant-modal.components.jsx';
import ChangeNameFamily from './familyVariant/change-name-family.components.jsx';
import ChangeNameVariant from './familyVariant/change-name-variant.components.jsx';
import DuplicateVariant from './familyVariant/duplicate-variant.components.jsx';
import GoProModal from './go-pro-modal.components.jsx';

const tutorialsEnabled = process.env.ENABLE_TUTORIALS === 'true';

class Dashboard extends React.PureComponent {
	constructor(props) {
		super(props);
		this.state = {
			joyrideSteps: [],
			uiJoyrideTutorialValue: false,
			firstTimeFile: undefined,
			firstTimeCollection: undefined,
			firstTimeIndivCreate: undefined,
			firstTimeIndivEdit: undefined,
			firstTimeAcademyModal: undefined,
			firstTimeAcademyJoyride: undefined,
		};

		// function bindings
		this.joyrideCallback = this.joyrideCallback.bind(this);
	}

	async componentWillMount() {
		pleaseWait.instance.finish();

		this.client = LocalClient.instance();
		this.lifespan = new Lifespan();

		const prototypoStore = await this.client.fetch('/prototypoStore');

		this.setState({
			joyrideSteps: [],
			firstTimeFile: tutorialsEnabled && prototypoStore.head.toJS().firstTimeFile,
			firstTimeCollection:
				tutorialsEnabled && prototypoStore.head.toJS().firstTimeCollection,
			firstTimeIndivCreate:
				tutorialsEnabled && prototypoStore.head.toJS().firstTimeIndivCreate,
			firstTimeIndivEdit:
				tutorialsEnabled && prototypoStore.head.toJS().firstTimeIndivEdit,
			firstTimeAcademyModal: false,
			firstTimeAcademyJoyride: false,
		});

		let firstContactTimeoutMade = false;

		this.client
			.getStore('/prototypoStore', this.lifespan)
			.onUpdate((head) => {
				if (this.props.library && this.props.library.length <= 0) {
					this.props.router.push('/library/home');
					return;
				}

				if (!firstContactTimeoutMade && !this.props.firstContactMade) {
					firstContactTimeoutMade = true;
					setTimeout(() => {
						window.Intercom('update', {
							first_session_at: new Date(),
						});
						this.props.setFirstContact();
					}, 300000);
				}

				this.setState({
					openVariantModal: head.toJS().d.openVariantModal,
					familySelectedVariantCreation: head.toJS().d
						.familySelectedVariantCreation,
					openChangeFamilyNameModal: head.toJS().d.openChangeFamilyNameModal,
					openHostVariantModal: head.toJS().d.openHostVariantModal,
					openChangeVariantNameModal: head.toJS().d.openChangeVariantNameModal,
					openDuplicateVariantModal: head.toJS().d.openDuplicateVariantModal,
					openGoProModal: head.toJS().d.openGoProModal,
					step: head.toJS().d.uiOnboardstep,
					indiv: head.toJS().d.indivMode,
					exportAs: head.toJS().d.exportAs,
					uiJoyrideTutorialValue: head.toJS().d.uiJoyrideTutorialValue,
					firstTimeFile: tutorialsEnabled && head.toJS().d.firstTimeFile,
					firstTimeIndivCreate:
						tutorialsEnabled && head.toJS().d.firstTimeIndivCreate,
					firstTimeIndivEdit: tutorialsEnabled && head.toJS().d.firstTimeIndivEdit,
					firstTimeAcademyModal: false,
					firstTimeAcademyJoyride: false,
				});
			})
			.onDelete(() => {
				this.setState(undefined);
			});
	}

	componentWillUnmount() {
		this.lifespan.release();
	}

	componentDidUpdate() {
		if (!tutorialsEnabled) {
			return;
		}
	}

	/**
	 *	adds given steps to the state
	 *	@param {array} steps - an array containing joyride steps objects
	 */
	addSteps(steps) {
		const joyride = this.refs.joyride;

		if (!steps.length || !joyride || typeof joyride.parseSteps !== 'function') {
			return false;
		}

		this.setState((currentState) => {
			if (currentState.joyrideSteps) {
				currentState.joyrideSteps = currentState.joyrideSteps.concat(
					joyride.parseSteps(steps),
				);
			}
			return currentState;
		});
	}

	addTooltip(data) {
		if (
			tutorialsEnabled
			&& this.refs.joyride
			&& typeof this.refs.joyride.addTooltip === 'function'
		) {
			this.refs.joyride.addTooltip(data);
		}
	}

	joyrideCallback(joyrideEvent) {
		if (!tutorialsEnabled || !joyrideEvent) {
			return;
		}
	}

	goToNextStep(step) {
		this.client.dispatchAction('/store-value', {uiOnboardstep: step});
	}

	exitOnboarding() {
		this.client.dispatchAction('/store-value', {uiOnboard: true});
	}

	render() {
		/* These are some guidelines about css:
		 * - All these guidelines have to be considered in the scope of SMACSS
		 * - All the first descendant of dashboard are unique layout container
		 * (i.e they have a unique id in there first element preferrably the
		 * lowercased name of the component)
		 * - Layout component should be named with a Capitalized name
		 * (i.e Sidebar, Menubar or Workboard)
		 * - All descendant of layout components are modules
		 * - the modules should have a class that is the name of the component
		 * in kebab-case (YoYoMa -> yo-yo-ma);
		 * - layout styles are prefixed with "l-"
		 * - state styles are prefixed with "is-"
		*/
		if (process.env.__SHOW_RENDER__) {
			console.log('[RENDER] dashboard');
		}

		const classes = classNames({
			indiv: this.state.indiv,
			normal: !this.state.indiv,
		});

		// timeouts : they are also used for tutorial triggering
		const panelTransitionTimeout = 200;

		// here modify ReactJoyride's labels

		const newVariant = this.state.openVariantModal && (
			<CreateVariantModal
				family={this.state.familySelectedVariantCreation}
				propName="openVariantModal"
			/>
		);
		const explainAcademy = null;
		const hostVariantModal = this.state.openHostVariantModal && (
			<HostVariantModal
				family={this.state.familySelectedVariantCreation}
				variant={this.state.collectionSelectedVariant}
				propName="openHostVariantModal"
			/>
		);
		const changeNameFamily = this.state.openChangeFamilyNameModal && (
			<ChangeNameFamily
				family={this.state.familySelectedVariantCreation}
				propName="openChangeFamilyNameModal"
			/>
		);
		const changeNameVariant = this.state.openChangeVariantNameModal && (
			<ChangeNameVariant
				family={this.state.familySelectedVariantCreation}
				variant={this.state.collectionSelectedVariant}
				propName="openChangeVariantNameModal"
			/>
		);
		const duplicateVariant = this.state.openDuplicateVariantModal && (
			<DuplicateVariant
				family={this.state.familySelectedVariantCreation}
				variant={this.state.collectionSelectedVariant}
				propName="openDuplicateVariantModal"
			/>
		);
		const goPro = this.state.openGoProModal && (
			<GoProModal propName="openGoProModal" />
		);

		const exportAs = this.state.exportAs && <ExportAs propName="exportAs" />;

		if (this.props.location.query.showModal) {
			this.client.dispatchAction('/store-value', {
				openGoProModal: true,
				goProModalBilling: this.props.location.query.showModal,
			});
		}

		return (
			<div id="dashboard" className={classes}>
				<Topbar />
				<Toolbar />
				<Workboard />
				<ReactCSSTransitionGroup
					component="span"
					transitionName="modal"
					transitionEnterTimeout={panelTransitionTimeout}
					transitionLeaveTimeout={panelTransitionTimeout}
				>
					{newVariant}
					{hostVariantModal}
					{changeNameFamily}
					{changeNameVariant}
					{duplicateVariant}
					{goPro}
					{exportAs}
					{explainAcademy}
				</ReactCSSTransitionGroup>
			</div>
		);
	}
}

const getUserFontsAndFirstContactMadeQuery = gql`
	query getUserFonts {
		user {
			id
			firstContactMade
			library {
				id
			}
		}
	}
`;

const setFirstContactMadeMutation = gql`
	mutation setFirstContact($id: ID!) {
		updateUser(id: $id, firstContactMade: true) {
			id
		}
	}
`;

export default compose(
	graphql(getUserFontsAndFirstContactMadeQuery, {
		options: {
			fetchPolicy: 'cache-first',
		},
		props({data}) {
			if (data.loading) {
				return {loading: true};
			}
			return {
				library: data.user.library || [],
				firstContactMade: data.user.firstContactMade,
				userID: data.user.id,
			};
		},
	}),
	graphql(setFirstContactMadeMutation, {
		props: ({mutate, ownProps}) => ({
			setFirstContact: () =>
				mutate({
					variables: {
						id: ownProps.userID,
					},
				}),
		}),
	}),
)(withRouter(Dashboard));
