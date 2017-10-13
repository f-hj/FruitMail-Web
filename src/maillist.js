import React, { Component } from 'react'

class MailList extends Component {
  render () {
    return (
      <div>
        {JSON.stringify(this.props, null, 2)}
      </div>
    )
  }
}

export default MailList
