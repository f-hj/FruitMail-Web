import React, { Component } from 'react'
import Store from './store.js'

import Box from 'grommet/components/Box'
import Animate from 'grommet/components/Animate'
import Spinning from 'grommet/components/icons/Spinning'

import Header from 'grommet/components/Header'
import Button from 'grommet/components/Button'
import Title from 'grommet/components/Title'

import PrintIcon from 'grommet/components/icons/base/Print'
import CheckmarkIcon from 'grommet/components/icons/base/Checkmark'

class Mail extends Component {
  constructor (props) {
    super(props)

    this.state = {
      msg: null
    }
  }

  componentWillReceiveProps (next) {
    if (this.props.match.params.id === next.match.params.id && this.state.charged) {
      return
    }
    Store.msgId = next.match.params.id
    this.setState({
      msg: null,
      charged: true
    })
    Store.instance.get(`/msg/${next.match.params.id}`).then(res => {
      this.setState({
        msg: res.data
      })
      if (!res.data.read) Store.instance.post(`/msg/${next.match.params.id}/setAsRead`)
    })
  }

  componentDidUpdate () {
    if (!this.state.msg) return
    document.getElementById('iframe-mail-content').contentWindow.location = 'about:blank'
    if (!this.state.msg.text) return
    setTimeout(() => {
      document.getElementById('iframe-mail-content').contentWindow.document.write(`
        <style>
          body {
            font-family: sans-serif;
          }
        </style>
        <title>${this.state.msg.subject}</title>
        ` + (this.state.msg.html || ('<body>' + this.state.msg.text + '</body>')))
    }, 0)
  }

  render () {
    if (!this.props.match.params.id) {
      return (
        <div>
          <Header
            separator='bottom'
            pad='small' />
          <Box pad='small'>
            No message selected
          </Box>
        </div>
      )
    }
    if (!this.state.msg) {
      return (
        <div>
          <Header
            separator='bottom'
            pad='small' />
          <Box pad='large'>
            <Spinning size='large' />
          </Box>
        </div>
      )
    }
    return (
      <div>
        <Header
          separator='bottom'
          pad='small'>
          <Title>
            {this.state.msg.subject}
          </Title>
          <Box flex={true}
            justify='end'
            direction='row'
            responsive={false}>
            <Button icon={<PrintIcon />}
              onClick={() => {
                let orig = document.title
                let title = document.getElementById('iframe-mail-content').contentDocument.title
                document.title = title.replace(/ /g, '_').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                document.getElementById('iframe-mail-content').contentWindow.print()
                document.title = orig
              }} />
            <Button icon={<CheckmarkIcon />}
              onClick={() => {
                Store.instance.post(`/msg/${this.props.match.params.id}/setAsDone`)
              }} />
          </Box>
        </Header>
        <Animate style={{height: 'calc(100vh - 77px)'}}
          enter={{animation: 'fade', duration: 400, delay: 0}}
          leave={{animation: 'fade', duration: 400, delay: 0}}
          keep={true}>
          <Box full='vertical' style={{height: 'calc(100vh - 77px)'}}>
            <iframe id='iframe-mail-content' />
          </Box>
        </Animate>
      </div>
    )
  }
}

export default Mail
