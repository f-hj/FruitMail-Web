import React, { Component } from 'react'
import Store from './store.js'

import Box from 'grommet/components/Box'
import Animate from 'grommet/components/Animate'
import Spinning from 'grommet/components/icons/Spinning'

class Mail extends Component {

  constructor (props) {
    super(props)

    this.state = {
      msg: {}
    }
  }

  componentWillReceiveProps (next) {
    if (this.props.match.params.id === next.match.params.id && this.state.charged) {
      return
    }
    this.setState({
      msg: {},
      charged: true
    })
    Store.instance.get(`/msg/${next.match.params.id}`).then(res => {
      this.setState({
        msg: res.data
      })
    })
  }

  componentDidUpdate() {
    if (!this.state.msg || !this.state.msg.text) {
      return
    }
    document.getElementById('iframe-mail-content').contentWindow.location = "about:blank"
    setTimeout(() => {
      document.getElementById('iframe-mail-content').contentWindow.document.write(`
        <style>
				body {
					font-family: sans-serif;
				}
				</style>
        ` + (this.state.msg.html || ('<body>' + this.state.msg.text + '</body>')))
    }, 0)
  }

  render () {
    if (!this.props.match.params.id) {
      return (
        <Box pad='small'>
          No message selected
        </Box>
      )
    }
    if (!this.state.msg || !this.state.msg.text) {
      return (
        <Box pad='large'>
          <Spinning size='large' />
        </Box>
      )
    }
    return (
      <Animate style={{height: 'calc(100vh - 77px)'}} enter={{"animation": "fade", "duration": 400, "delay": 0}} leave={{"animation": "fade", "duration": 400, "delay": 0}} keep={true}>
        <Box full='vertical' style={{height: 'calc(100vh - 77px)'}}>
          <iframe id='iframe-mail-content'></iframe>
        </Box>
      </Animate>
    )
  }
}

export default Mail