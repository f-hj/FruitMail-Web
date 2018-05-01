import React, { Component } from 'react'
import ReactDOM from 'react-dom'
import { BrowserRouter as Router, Route, Switch, Redirect } from 'react-router-dom'
import Anchor from 'grommet/components/Anchor'

import App from './app.js'
// import registerServiceWorker from './registerServiceWorker'
import store from './store.js'

class Index extends Component {
  render () {
    return (
      <Router>
        <Switch>
          <Redirect exact path='/' to='/new/inbox' />
          <Route exact path='/oauthCallback' component={Callback} />
          <Route path='/:all' component={App} />
        </Switch>
      </Router>
    )
  }
}

class Callback extends Component {
  componentWillMount () {
    this.token = this.props.location.hash.replace('#access_token=', '').replace('&token_type=Bearer', '')
    localStorage.setItem('token', this.token)
    store.instance.defaults.headers['Authorization'] = 'Bearer ' + this.token
  }

  render () {
    return (
      <div>
        <p>{this.token}</p>
        <Anchor path='/'>Go to home</Anchor>
      </div>
    )
  }
}

ReactDOM.render(<Index />, document.getElementById('root'))
// registerServiceWorker()
