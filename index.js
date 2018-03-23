// Copyright 2017 Zaiste & contributors. All rights reserved.
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

const debug = require('debug')('huncwot:index');
const { join } = require('path');

const Core = require('./core');

const serve = require('./static');
const security = require('./security');
const { list, translate } = require('./handlers');

const cwd = process.cwd();

class Huncwot extends Core {
  constructor({
    staticDir = join(cwd, 'static'),
    securityOptions = {
      dnsPrefetchControl: false,
      poweredBy: false
    },
    graphql = true,
    handlers = true
  } = {}) {
    super();

    console.log(staticDir);

    this.middlewareList.push(serve(staticDir));
    this.middlewareList.push(security(securityOptions));

    if (graphql) {
      try {
        const { typeDefs, resolvers }  = require(join(cwd, 'graphql'));
        const { graphql, graphiql, makeSchema } = require('./graphql');

        const schema = makeSchema({ typeDefs, resolvers });

        this.post('/graphql', graphql({ schema }));
        this.get('/graphql', graphql({ schema }));
        this.get('/graphiql', graphiql({ endpointURL: 'graphql' }));
      } catch (error) {
        switch (error.code) {
        case 'MODULE_NOT_FOUND':
          console.log('GraphQL is not set up.');
          break;
        default:
          console.error(error);
          throw new Error('Unknown GraphQL error occured');
        }
      }
    }

    if (handlers) {
      list(join(cwd, 'server', 'handlers'), '.js')
        .then(handlers => {
          for (let { resource, operation, path } of handlers) {
            try {
              const handler = require(`${join(cwd, 'server', 'handlers', path)}.js`);
              let { method, route } = translate(operation, resource);
              this[method](route, request => handler(request));
            } catch (error) {
              console.error(error);
            }
          }
        })
        .catch(error => {
          switch (error.code) {
          case 'ENOENT':
            console.log('Handlers are not set up.');
            break;
          default:
            console.error(error);
            throw new Error('Unknown Handler error occured');
          }
        });
    }
  }
}

module.exports = Huncwot;
