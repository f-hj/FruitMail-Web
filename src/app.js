import React, { Component } from 'react'
import 'grommet/grommet.min.css'
import './app.css'
import { Route } from 'react-router-dom'
import Store from './store.js'
import { observer } from 'mobx-react'

import MailList from './maillist.js'
import Mail from './mail.js'
import WriteMail from './writeMail.js'

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
import NewIcon from 'grommet/components/icons/base/New'
import RefreshIcon from 'grommet/components/icons/base/Refresh'

@observer
class App extends Component {
  componentWillMount () {
    console.log(localStorage.getItem('token'))
    if (localStorage.getItem('token') === null) {
      return this.redirectToOauth()
    }

    Store.getFolders().catch(err => {
      if (!err.response) {
        // TODO: show notification (no connection)
        return
      }
      if (err.response.data.err === 'invalid token') this.redirectToOauth()
      console.log(err.response.data.err)
    })

    Store.instance.get('/userConfig').then(res => {
      Store.user = res.data
    })
  }
  
  writeMail () {
    // push history
  }

  redirectToOauth () {
    if (window.location.hostname === 'localhost') {
      window.location = 'https://auth.fruitice.fr/oauth/interface?response_type=token&scope=infos%20mails&redirect_uri=http%3A%2F%2Flocalhost:3000%2FoauthCallback&client_id=test-localhost-3000'
    
    } else {
      window.location = 'https://auth.fruitice.fr/oauth/interface?response_type=token&scope=infos%20mails&redirect_uri=https%3A%2F%2Fmail.fruitice.fr%2FoauthCallback&client_id=mail-web'
    }
  }

  searchChange (event) {
    let d = event.target.value
    let obj = {
      newP: [],
      readP: [],
      doneP: []
    }
    Store.folders.new.forEach(folder => {
      if (folder.name.indexOf(d) !== -1) {
        obj.newP.push(folder)
      }
    })
    Store.folders.read.forEach(folder => {
      if (folder.name.indexOf(d) !== -1) {
        obj.readP.push(folder)
      }
    })
    Store.folders.done.forEach(folder => {
      if (folder.name.indexOf(d) !== -1) {
        obj.doneP.push(folder)
      }
    })
    Store.folders.newP = obj.newP
    Store.folders.readP = obj.readP
    Store.folders.doneP = obj.doneP
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
              <div>
                <Anchor icon={<NewIcon />} path='/writeMail' />
                <Button onClick={Store.getFolders}><Heading tag='h5'><RefreshIcon /></Heading></Button>
              </div>
            </Header>
            <Box flex='grow'
              justify='start'>
              <Box pad='medium'>
                <TextInput placeHolder='Folder' onDOMChange={this.searchChange.bind(this)} />
              </Box>
              <Box pad='medium'>
                <Box pad='small'></Box>
                <Menu primary={true}>
                  <Heading tag='h3'>Fresh</Heading>
                  {
                    Store.folders.newP.map(folder => {
                      return <SidebarItem type='new' folder={folder} />
                    })
                  }
                </Menu>
                <Box pad='small'></Box>
                <Menu primary={true}>
                  <Heading tag='h3'>Read</Heading>
                  {
                    Store.folders.readP.map(folder => {
                      return <SidebarItem type='read' folder={folder} />
                    })
                  }
                </Menu>
                <Box pad='small'></Box>
                <Menu primary={true}>
                  <Heading tag='h3'>Done</Heading>
                  {
                    Store.folders.doneP.map(folder => {
                      return <SidebarItem type='done' folder={folder} />
                    })
                  }
                </Menu>
              </Box>
            </Box>
            <Footer pad='medium'>
              <Button icon={<UserIcon />} />
            </Footer>
          </Sidebar>
          <Box full={true}>
            <Box>
              <Route exact path='/writeMail/:inReplyTo?' component={WriteMail} />
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
