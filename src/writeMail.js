import React, { Component } from 'react'

import Box from 'grommet/components/Box'
import Layer from 'grommet/components/Layer'
import Form from 'grommet/components/Form'
import Heading from 'grommet/components/Heading'
import TextInput from 'grommet/components/TextInput'
import FormField from 'grommet/components/FormField'
import CheckBox from 'grommet/components/CheckBox'
import Button from 'grommet/components/Button'
import Markdown from 'grommet/components/Markdown'

import Store from './store.js'
import { observer } from 'mobx-react'

@observer
class ModalMail extends Component {
  constructor (props) {
    super(props)

    this.state = {
      from: Store.defaultMail,
      confirm: false
    }
  }

  confirmModal () {
    this.setState({ confirm: true })
  }

  closeConfirmModal () {
    this.setState({ confirm: false })
  }

  handle (name, evt) {
    const t = {}
    t[name] = evt.target.value
    this.setState(t)
  }

  prepareObj () {
    return {
      from: this.state.from,
      to: this.state.to,
      cc: this.state.cc,
      subject: this.state.subject,
      markdown: this.state.content
    }
  }

  sendMail () {
    Store.instance.post('/msg', this.prepareObj())
  }

  render () {
    return (
      <div>
        <Box pad='big'>
          <Form pad='large' plain={true}>
            <Heading tag='h1'>Write a mail</Heading>
            <Box pad={{ vertical: 'small' }}>
              <FormField label='From'><TextInput value={this.state.from} onDOMChange={e => this.handle('from', e)} /></FormField>
              <FormField label='To'><TextInput onDOMChange={e => this.handle('to', e)} /></FormField>
              <FormField label='Cc'><TextInput onDOMChange={e => this.handle('cc', e)} /></FormField>
            </Box>
            <Box pad={{ vertical: 'small' }}>
              <FormField label='Subject'><TextInput onDOMChange={e => this.handle('subject', e)} /></FormField>
            </Box>
            <Box pad={{ vertical: 'small' }}>
              <FormField label='Content'>
                <textarea onChange={e => this.handle('content', e)} />
              </FormField>
            </Box>
            <FormField>
              <CheckBox label='Add tracking pixel' />
            </FormField>
            <p></p>
            <Button label='Check before send' onClick={this.confirmModal.bind(this)}></Button>
          </Form>
        </Box>
        { this.state.confirm ?
        <Layer closer={true} onClose={this.closeConfirmModal.bind(this)}>
          <Form pad={{vertical: 'large'}} plain={true}>
            <Heading tag='h1'>Confirmation</Heading>
            <Box colorIndex='light-2' pad='small' margin={{ vertical: 'small' }} size='xxlarge'>
              <Markdown content={this.state.content} />
            </Box>
            <Box colorIndex='light-2' pad='small' margin={{ vertical: 'small' }} size='xxlarge'>
              <pre>{JSON.stringify(this.prepareObj(), null, 2)}</pre>
            </Box>
            <Button label='Send' onClick={this.sendMail.bind(this)} />
          </Form>
        </Layer>
        : null}
      </div>
    )
  }
}

export default ModalMail