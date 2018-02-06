import React, { Component } from 'react'
import logo from './logo.svg'
import 'grommet/grommet.min.css'
import './app.css'
import axios from 'axios'
import { Route } from 'react-router-dom'
import Store from './store.js'

import MailList from './maillist.js'
import Mail from './mail.js'

import GApp from 'grommet/components/App'
import Split from 'grommet/components/Split'
import Sidebar from 'grommet/components/Sidebar'
import Header from 'grommet/components/Header'
import Box from 'grommet/components/Box'
import Menu from 'grommet/components/Menu'
import Anchor from 'grommet/components/Anchor'
import Title from 'grommet/components/Title'
import Footer from 'grommet/components/Footer'
import Button from 'grommet/components/Button'
import Heading from 'grommet/components/Heading'
import TextInput from 'grommet/components/TextInput'
import Search from 'grommet/components/Search'

import UserIcon from 'grommet/components/icons/base/User'
import ActionsIcon from 'grommet/components/icons/base/Actions'
import PrintIcon from 'grommet/components/icons/base/Print'


class App extends Component {

  constructor (props) {
    super(props)
    this.state = {
      new: [],
      read: [],
      done: [],
      newP: [],
      readP: [],
      doneP: []
    }
  }

  componentWillMount () {
    console.log(localStorage.getItem('token'))
    if (localStorage.getItem('token') === null) {
      window.location = "https://auth.fruitice.fr/oauth/interface?response_type=token&scope=infos%20mails&redirect_uri=https%3A%2F%2Fmail.fruitice.fr%3A3000%2FoauthCallback&client_id=mail-web"
    }

    Store.instance.get('/v2/folders').then(res => {
      res.data.newP = res.data.new
      res.data.readP = res.data.read
      res.data.doneP = res.data.done
      this.setState(res.data)
    })

  }

  searchChange (event) {
    let d = event.target.value
    let obj = {
      newP: [],
      readP: [],
      doneP: []
    }
    this.state.new.forEach(folder => {
      if (folder.name.indexOf(d) !== -1) {
        obj.newP.push(folder)
      }
    })
    this.state.read.forEach(folder => {
      if (folder.name.indexOf(d) !== -1) {
        obj.readP.push(folder)
      }
    })
    this.state.done.forEach(folder => {
      if (folder.name.indexOf(d) !== -1) {
        obj.doneP.push(folder)
      }
    })
    this.setState(obj)
  }

  render() {
    return (
      <GApp centered={false}>
        <Split flex='right' priority='left'>
          <Sidebar colorIndex='neutral-1'>
            <Header pad='medium'
              justify='between'>
              <Title>
                Fruit'mail
              </Title>
            </Header>
            <Box flex='grow'
              justify='start'>
              <Box pad='medium'><TextInput placeHolder='Folder' onDOMChange={this.searchChange.bind(this)} /></Box>
              <Menu primary={true}>
                <Box pad='medium'><Heading tag='h3'>Fresh</Heading></Box>
                {
                  this.state.newP.map(folder => {
                    return (
                      <Anchor key={'new_' + folder.name} label={`${folder.name} (${folder.count})`} path={'/new/' + folder.name} />
                    )
                  })
                }
              </Menu>
              <Menu primary={true}>
                <Box pad='medium'><Heading tag='h3'>Read</Heading></Box>
                {
                  this.state.readP.map(folder => {
                    return (
                      <Anchor key={'read_' + folder.name} label={`${folder.name} (${folder.count})`} path={'/read/' + folder.name} />
                    )
                  })
                }
              </Menu>
              <Menu primary={true}>
                <Box pad='medium'><Heading tag='h3'>Done</Heading></Box>
                {
                  this.state.doneP.map(folder => {
                    return (
                      <Anchor key={'done_' + folder.name} label={`${folder.name} (${folder.count})`} path={'/done/' + folder.name} />
                    )
                  })
                }
              </Menu>
            </Box>
            <Footer pad='medium'>
              <Button icon={<UserIcon />} />
            </Footer>
          </Sidebar>
          <Box full={true}>
            <Header>
              <Box flex={true}
                justify='end'
                direction='row'
                separator='bottom'
                pad='small'
                responsive={false}>
                <Search inline={true}
                  fill={true}
                  size='medium'
                  placeHolder='Search'
                  dropAlign={{"right": "right"}} />
                <Button icon={<PrintIcon />}
                  onClick={() => {
                    let orig = document.title
                    let title = document.getElementById('iframe-mail-content').contentDocument.title
                    document.title = title.replace(/ /g, '_').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                    document.getElementById('iframe-mail-content').contentWindow.print()
                    document.title = orig
                  }} />
                <Menu icon={<ActionsIcon />}
                  dropAlign={{"right": "right"}}>
                  <Anchor href='#'
                    className='active'>
                    First
                  </Anchor>
                  <Anchor href='#'>
                    Second
                  </Anchor>
                  <Anchor href='#'>
                    Third
                  </Anchor>
                </Menu>
              </Box>
            </Header>
            <Box>
              <Split fixed={false} flex='right'>
                <Route exact path='/:type/:folder/:id?' component={MailList} />
                <Route exact path='/:type/:folder/:id?' component={Mail} />
              </Split>
            </Box>
          </Box>
        </Split>
      </GApp>
    )
  }
}

export default App
