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
import PrintIcon from 'grommet/components/icons/base/Print'
import CheckmarkIcon from 'grommet/components/icons/base/Checkmark'

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
      return this.redirectToOauth()
    }

    Store.instance.get('/v2/folders').then(res => {
      res.data.newP = res.data.new
      res.data.readP = res.data.read
      res.data.doneP = res.data.done
      this.setState(res.data)
    }).catch(err => {
      if (err.response.data.err === 'invalid token') this.redirectToOauth()
      console.log(err.response.data.err)
    })
  }

  redirectToOauth () {
    window.location = 'https://auth.fruitice.fr/oauth/interface?response_type=token&scope=infos%20mails&redirect_uri=https%3A%2F%2Fmail.fruitice.fr%2FoauthCallback&client_id=mail-web'
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

  render () {
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
                    return <SidebarItem type='new' folder={folder} />
                  })
                }
              </Menu>
              <Menu primary={true}>
                <Box pad='medium'><Heading tag='h3'>Read</Heading></Box>
                {
                  this.state.readP.map(folder => {
                    return <SidebarItem type='read' folder={folder} />
                  })
                }
              </Menu>
              <Menu primary={true}>
                <Box pad='medium'><Heading tag='h3'>Done</Heading></Box>
                {
                  this.state.doneP.map(folder => {
                    return <SidebarItem type='done' folder={folder} />
                  })
                }
              </Menu>
            </Box>
            <Footer pad='medium'>
              <Button icon={<UserIcon />} />
            </Footer>
          </Sidebar>
          <Box full={true}>
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

class SidebarItem extends React.Component {
  render () {
    return (
      <Anchor
        key={this.props.type + '_' + this.props.folder.name}
        label={`${this.props.folder.name} (${this.props.folder.count})`}
        path={'/' + this.props.type + '/' + this.props.folder.name}>
        <span>{`${this.props.folder.name}`}</span>
        <span style={{float: 'right', fontWeight: 200}}>{`${this.props.folder.count}`}</span>
      </Anchor>
    )
  }
}

export default App
