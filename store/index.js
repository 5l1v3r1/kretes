// Copyright 2018 Zaiste & contributors. All rights reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
const debug = require('debug')('huncwot:store');

import HTTP from 'axios';
import install from './install';
import { make } from './helpers';
import { prepareGet, prepareSync } from './fields';

import { getKeys } from './util';
import ValueObject from './value_object';
import { Model } from './model';

import Container from './container';

const getStateKeys = state =>
  getKeys(state instanceof Function ? state() : state);

const createMutations = state =>
  getStateKeys(state).reduce((obj, key) => {
    const mutation = key;
    obj[mutation] = (state, value) => {
      state[key] =
        value instanceof ValueObject ? value.update(state[key]) : value;
    };
    return obj;
  }, {});

export const generate = ({ resource, type }) => ({ state }) => {
  const _state = Object.assign(
    {},
    {
      collection: [],
      error: '',
      loading: true
    },
    state
  );

  const mutations = createMutations(_state);

  const actions = {
    async create({ commit, state }, item) {
      const collection = state.collection;
      collection.push(item);

      const result = await HTTP.post(`/rest/${resource}`, item);

      commit('collection', collection);
    },
    async fetch({ commit }, { id, filter, sort, page } = {}) {
      const path = id ? `/rest/${resource}/${id}` : `/rest/${resource}`;

      try {
        if (id) {
          const { data: item } = await HTTP.get(path);
          commit('item', item);
        } else {
          const { data: collection } = await HTTP.get(path);
          commit('collection', collection);
        }
      } catch (error) {
        commit('error', error.message);
      }
    },
    async update({ commit, state }, item) {
      const result = await HTTP.put(`/rest/${resource}/${item.id}`, item);
      const { data: collection } = await HTTP.get(`/rest/${resource}`);
      commit('collection', collection);
    },
    async destroy({ commit, state }, id) {
      try {
        const result = await HTTP.delete(`/rest/${resource}/${id}`);

        const index = state.collection.findIndex(t => t.id === id);
        const collection = state.collection;
        collection.splice(index, 1);

        commit('collection', collection);
      } catch (error) {
        commit('error', error.message);
      }
    }
  };

  return { namespaced: true, mutations, actions, state: _state };
};

export const get = (path, props) =>
  make(path, props, prepareGet, path =>
    expandGet(path, Container.store.state, Container.store.getters)
  );

export const sync = (path, props) =>
  make(path, props, prepareSync, path =>
    expandSync(path, Container.store.state)
  );

export { Model, install };