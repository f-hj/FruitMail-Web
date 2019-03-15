import { observable, action, computed } from 'mobx'
import axios from 'axios'

class Store {
  @observable instance = axios.create({
    baseURL: 'https://mail-2.fruitice.fr',
    timeout: 4000,
    headers: {
      'Authorization': 'Bearer ' + localStorage.getItem('token')
    }
  })
  @observable msgId = ''
  @observable user = {}

  @computed get defaultMail() {
    const defaultMail = this.user.mails === undefined ? {} : this.user.mails[0]
    return `${this.user.defaultName} <${defaultMail.name}@${defaultMail.domain}>`
  }
}

export default new Store()
