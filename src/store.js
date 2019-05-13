import { observable, action, computed } from 'mobx'
import axios from 'axios'

const server = 'https://mail-2.fruitice.fr'

class Store {
  @observable server = server
  @observable instance = axios.create({
    baseURL: server,
    timeout: 12000,
    headers: {
      'Authorization': 'Bearer ' + localStorage.getItem('token')
    }
  })
  @observable msgId = ''
  @observable user = {}

  @observable isGettingFolders = false
  @action getFolders = _ => {
    this.isGettingFolders = true
    return this.instance.get('/v2/folders').then(res => {
      res.data.newP = res.data.new
      res.data.readP = res.data.read
      res.data.doneP = res.data.done 
      this.folders = res.data

      this.isGettingFolders = false
    })
  }
  @observable folders = {
    new: [],
    read: [],
    done: [],
    newP: [],
    readP: [],
    doneP: []
  }

  @action getMails = (type, folder, push) => {
    if (type) this.currentType = type
    if (folder) this.currentFolder = folder

    let from = 0
    if (push && this.currentFolderMails.length > 0) {
      from = this.currentFolderMails[this.currentFolderMails.length - 1].date
    }

    return this.instance.get(`/msgs/${this.currentType}/${this.currentFolder}?nb=15&direction=past&from=${from}`).then(res => {
      if (push) {
        this.currentFolderMails.push(...res.data)
        return
      }
      this.currentFolderMails = res.data
    })
  }
  @observable currentType = 'new'
  @observable currentFolder = 'inbox'
  @observable currentFolderMails = []

  @computed get defaultMail() {
    const defaultMail = this.user.mails === undefined ? {} : this.user.mails[0]
    return `${this.user.defaultName} <${defaultMail.name}@${defaultMail.domain}>`
  }
}

const store = new Store()
window.store = store
export default store
