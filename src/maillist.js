import React, { Component } from 'react'
import Store from './store.js'

import Card from 'grommet/components/Card'
import Box from 'grommet/components/Box'
import Anchor from 'grommet/components/Anchor'
import Heading from 'grommet/components/Heading'
import Timestamp from 'grommet/components/Timestamp'

class MailList extends Component {
  constructor (props) {
    super(props)

    this.state = {
      msgs: [],
      charged: false
    }
  }

  componentWillReceiveProps (next) {
    if (this.props.match.params.type === next.match.params.type && this.props.match.params.folder === next.match.params.folder && this.state.charged) {
      return
    }
    this.setState({
      msgs: [],
      charged: true
    })
    Store.instance.get(`/msgs/${next.match.params.type}/${next.match.params.folder}?nb=15&direction=past`).then(res => {
      this.setState({
        msgs: res.data
      })
    })
  }

  render () {
    return (
      <Box size={{width: 'large'}}>
        <div style={{height: 'calc(100vh - 77px)', overflowY: 'scroll'}}>
          <Box>
            {
              this.state.msgs.map(msg => {
                let from = ''
                msg.from.forEach(f => {
                  from += (f.name || f.address) + ' '
                })
                return (
                  <Box key={msg.id} margin='small'>
                    <Anchor path={`/${this.props.match.params.type}/${this.props.match.params.folder}/${msg.id}`}>
                      <Box pad='medium' colorIndex='light-2'>
                        <Heading tag='h3' style={{textDecoration: 'none'}}>{msg.subject}</Heading>
                        <Heading tag='h4'>{from}</Heading>
                        <Timestamp value={new Date(msg.date).toString()} />
                      </Box>
                    </Anchor>
                  </Box>
                )
              })
            }
          </Box>
        </div>
      </Box>
    )
  }
}

export default MailList
