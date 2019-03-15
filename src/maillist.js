import React, { Component } from 'react'
import ReactDOM from 'react-dom'
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
      charged: false,
      loading: false
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
    console.log(Store.instance.defaults.headers)
  }

  infiniteScroll (node) {
    const domNode = ReactDOM.findDOMNode(node)

    if (domNode) {
      domNode.onscroll = () => {
        if (!this.state.loading && parseInt(domNode.scrollHeight - domNode.scrollTop - domNode.offsetHeight, 10) === 0) {
          this.setState({ loading: true })
          console.log('Get new')
          Store.instance.get(`/msgs/${this.props.match.params.type}/${this.props.match.params.folder}?nb=15&direction=past&from=${this.state.msgs[this.state.msgs.length - 1].date}`).then(res => {
            this.state.msgs.push(...res.data)
            this.setState({
              msgs: this.state.msgs,
              loading: false
            })
          }).catch(err => {
            console.log(err)
            this.setState({ loading: false })
          })
        }
      }
    }
  }

  render () {
    return (
      <Box size={{width: 'large'}}>
        <div style={{height: '100vh', overflowY: 'scroll'}} ref={this.infiniteScroll.bind(this)}>
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
                        <Heading tag='h3' truncate style={{textDecoration: 'none'}}>{msg.subject}</Heading>
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
