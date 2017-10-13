import React, { Component } from 'react'
import logo from './logo.svg'
import 'grommet/grommet.min.css'
import axios from 'axios'

import { Route } from 'react-router-dom'

import MailList from './maillist.js'

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

import UserIcon from 'grommet/components/icons/base/User'

var instance = axios.create({
  baseURL: 'https://mail-2.fruitice.fr',
  timeout: 1000,
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('token')
  }
});

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
      window.location = "https://auth.fruitice.fr/oauth/interface?response_type=token&scope=infos%20mails&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2FoauthCallback&client_id=test-localhost-3000"
    }

    instance.get('/v2/folders').then(res => {
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
        <Split flex='right'>
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
                      <Anchor label={`${folder.name} (${folder.count})`} path={'/new/' + folder.name} />
                    )
                  })
                }
              </Menu>
              <Menu primary={true}>
                <Box pad='medium'><Heading tag='h3'>Read</Heading></Box>
                {
                  this.state.readP.map(folder => {
                    return (
                      <Anchor label={`${folder.name} (${folder.count})`} path={'/read/' + folder.name} />
                    )
                  })
                }
              </Menu>
              <Menu primary={true}>
                <Box pad='medium'><Heading tag='h3'>Done</Heading></Box>
                {
                  this.state.doneP.map(folder => {
                    return (
                      <Anchor label={`${folder.name} (${folder.count})`} path={'/done/' + folder.name} />
                    )
                  })
                }
              </Menu>
            </Box>
            <Footer pad='medium'>
              <Button icon={<UserIcon />} />
            </Footer>
          </Sidebar>
          <Box>
            <Split>
              <Box>
                <Route exact path='/:type/:folder' component={MailList} />
              </Box>
              <Box>Second box</Box>
            </Split>
          </Box>
        </Split>
      </GApp>
    )
  }
}

export default App
