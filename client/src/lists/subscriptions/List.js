'use strict';

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-i18next';
import {requiresAuthenticatedUser, withPageHelpers, Title, Toolbar, NavButton} from '../../lib/page';
import {withAsyncErrorHandler, withErrorHandling} from '../../lib/error-handling';
import { Table } from '../../lib/table';
import { SubscriptionStatus } from '../../../../shared/lists';
import moment from 'moment';
import {
    Dropdown, Form,
    withForm
} from '../../lib/form';
import {Icon} from "../../lib/bootstrap-components";
import axios from '../../lib/axios';
import {getFieldTypes, getSubscriptionStatusLabels} from './helpers';

@translate()
@withForm
@withPageHelpers
@withErrorHandling
@requiresAuthenticatedUser
export default class List extends Component {
    constructor(props) {
        super(props);

        const t = props.t;

        this.state = {};

        this.subscriptionStatusLabels = getSubscriptionStatusLabels(t);
        this.fieldTypes = getFieldTypes(t);

        this.initForm({
            onChange: {
                segment: (newState, key, oldValue, value) => {
                    this.navigateTo(`/lists/${this.props.list.id}/subscriptions` + (value ? '?segment=' + value : ''));
                }
            }
        });
    }

    static propTypes = {
        list: PropTypes.object,
        segments: PropTypes.array,
        segmentId: PropTypes.string
    }

    updateSegmentSelection(props) {
        this.populateFormValues({
            segment: props.segmentId || ''
        });
    }

    componentDidMount() {
        this.updateSegmentSelection(this.props);
    }

    componentWillReceiveProps(nextProps) {
        this.updateSegmentSelection(nextProps);
    }

    @withAsyncErrorHandler
    async deleteSubscription(id) {
        await axios.delete(`/rest/subscriptions/${this.props.list.id}/${id}`);
        this.subscriptionsTable.refresh();
    }

    @withAsyncErrorHandler
    async unsubscribeSubscription(id) {
        await axios.post(`/rest/subscriptions-unsubscribe/${this.props.list.id}/${id}`);
        this.subscriptionsTable.refresh();
    }

    @withAsyncErrorHandler
    async blacklistSubscription(id) {
        await axios.post(`/rest/XXX/${this.props.list.id}/${id}`); // FIXME - add url one the blacklist functionality is in
        this.subscriptionsTable.refresh();
    }

    render() {
        const t = this.props.t;
        const list = this.props.list;
        const segments = this.props.segments;

        const columns = [
            { data: 2, title: t('Email') },
            { data: 3, title: t('Status'), render: data => this.subscriptionStatusLabels[data] },
            { data: 4, title: t('Created'), render: data => data ? moment(data).fromNow() : '' }
        ];

        let colIdx = 5;

        for (const fld of list.listFields) {

            const indexable = this.fieldTypes[fld.type].indexable;

            columns.push({
                data: colIdx,
                title: fld.name,
                sortable: indexable,
                searchable: indexable
            });

            colIdx += 1;
        }

        if (list.permissions.includes('manageSubscriptions')) {
            columns.push({
                actions: data => {
                    const actions = [];

                    actions.push({
                        label: <Icon icon="edit" title={t('Edit')}/>,
                        link: `/lists/${this.props.list.id}/subscriptions/${data[0]}/edit`
                    });

                    if (data[3] === SubscriptionStatus.SUBSCRIBED) {
                        actions.push({
                            label: <Icon icon="off" title={t('Unsubscribe')}/>,
                            action: () => this.unsubscribeSubscription(data[0])
                        });
                    }

                    // FIXME - add condition here to show it only if not blacklisted already
                    actions.push({
                        label: <Icon icon="ban-circle" title={t('Blacklist')}/>,
                        action: () => this.blacklistSubscription(data[0])
                    });

                    actions.push({
                        label: <Icon icon="remove" title={t('Remove')}/>,
                        action: () => this.deleteSubscription(data[0])
                    });

                    return actions;
                }
            });
        }

        const segmentOptions = [
            {key: '', label: t('All subscriptions')},
            ...segments.map(x => ({ key: x.id.toString(), label: x.name}))
        ];


        let dataUrl = '/rest/subscriptions-table/' + list.id;
        if (this.props.segmentId) {
            dataUrl += '/' + this.props.segmentId;
        }

        return (
            <div>
                <Toolbar>
                    <NavButton linkTo={`/lists/${this.props.list.id}/subscriptions/create`} className="btn-primary" icon="plus" label={t('Add Subscriber')}/>
                </Toolbar>

                <Title>{t('Subscribers')}</Title>

                {list.description &&
                    <div className="well well-sm">{list.description}</div>
                }

                <div className="well well-sm">
                    <Form format="inline" stateOwner={this}>
                        <Dropdown format="inline" className="input-sm" id="segment" label={t('Segment')} options={segmentOptions}/>
                    </Form>
                </div>


                <Table ref={node => this.subscriptionsTable = node} withHeader dataUrl={dataUrl} columns={columns} />
            </div>
        );
    }
}